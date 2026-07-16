import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { CHAT_SENDER, type ChatSender } from '../config/constants';
import { env } from '../config/env';
import { EXT_BY_MIME } from '../middlewares/chatUpload.middleware';
import { chatService, type OutgoingAttachment } from '../services/chat.service';
import { AppError } from '../utils/AppError';
import { chatBus, type ChatEvent } from '../utils/chatBus';
import { fileStorage } from '../utils/storage';

// Rol de chat del usuario autenticado: el cliente escribe como 'cliente';
// cualquier rol interno, como 'staff'.
function senderRoleOf(req: Request): ChatSender {
  return req.user?.role === 'cliente' ? CHAT_SENDER.CLIENT : CHAT_SENDER.STAFF;
}

// Sube el adjunto (si multer recibió un fichero) a Supabase Storage con la
// clave "<clientId>/chat/<random>.<ext>" y devuelve sus metadatos para persistir.
async function attachmentFrom(req: Request, clientId: string): Promise<OutgoingAttachment | null> {
  if (!req.file) return null;
  const ext = EXT_BY_MIME[req.file.mimetype] ?? 'bin';
  const stored = `${clientId}/chat/${crypto.randomBytes(16).toString('hex')}.${ext}`;
  await fileStorage.uploadBuffer(stored, req.file.buffer, req.file.mimetype);
  return {
    name: req.file.originalname,
    stored,
    mime: req.file.mimetype,
    size: req.file.size,
  };
}

export const chatController = {
  // ─── Tiempo real (SSE) ───────────────────────────────────────
  /**
   * Flujo de eventos del chat. El cliente solo recibe eventos de su propia
   * conversación; el personal, de todas. Mantiene la conexión abierta con un
   * "ping" periódico y se limpia al cerrarse.
   */
  stream(req: Request, res: Response): void {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    // En serverless (Vercel) no hay procesos persistentes: el SSE se desactiva
    // por entorno y el frontend usa polling. Cerramos de inmediato para no dejar
    // la conexión colgada consumiendo invocaciones.
    if (!env.ENABLE_SSE) {
      res.status(204).end();
      return;
    }
    const { sub: userId, role } = req.user;
    const isClient = role === 'cliente';
    const myRole: ChatSender = isClient ? CHAT_SENDER.CLIENT : CHAT_SENDER.STAFF;

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Evita que proxies (nginx) almacenen en búfer el stream.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(': connected\n\n');

    const onEvent = (event: ChatEvent) => {
      // El cliente solo ve su conversación.
      if (isClient && event.clientId !== userId) return;
      // No devolvemos al emisor su propio "escribiendo…".
      if (event.type === 'typing' && event.senderRole === myRole) return;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const unsubscribe = chatBus.subscribe(onEvent);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  },

  // ─── Cliente ─────────────────────────────────────────────────
  async myMessages(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const messages = await chatService.listForClient(req.user.sub);
    res.status(200).json({ messages });
  },

  async sendMine(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const clientId = req.user.sub;
    const message = await chatService.sendAsClient(clientId, {
      body: typeof req.body?.body === 'string' ? req.body.body : '',
      replyToId: req.body?.replyToId || null,
      attachment: await attachmentFrom(req, clientId),
    });
    res.status(201).json({ message });
  },

  async myUnread(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const count = await chatService.unreadForClient(req.user.sub);
    res.status(200).json({ count });
  },

  async typingMine(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    chatService.typing(req.user.sub, CHAT_SENDER.CLIENT, null);
    res.status(204).end();
  },

  // ─── Personal (compliance/admin) ─────────────────────────────
  async conversations(_req: Request, res: Response): Promise<void> {
    const conversations = await chatService.conversations();
    res.status(200).json({ conversations });
  },

  async staffUnread(_req: Request, res: Response): Promise<void> {
    const count = await chatService.unreadForStaff();
    res.status(200).json({ count });
  },

  async conversationMessages(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const messages = await chatService.listConversation(req.params.clientId, req.user.sub);
    res.status(200).json({ messages });
  },

  async sendToClient(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const clientId = req.params.clientId;
    const message = await chatService.sendAsStaff(clientId, req.user.sub, {
      body: typeof req.body?.body === 'string' ? req.body.body : '',
      replyToId: req.body?.replyToId || null,
      attachment: await attachmentFrom(req, clientId),
    });
    res.status(201).json({ message });
  },

  async typingToClient(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    chatService.typing(req.params.clientId, CHAT_SENDER.STAFF, null);
    res.status(204).end();
  },

  // ─── Acciones sobre un mensaje (cliente o personal) ──────────
  async edit(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const body = (req.body as { body: string }).body;
    const message = await chatService.editMessage(
      req.params.id,
      req.user.sub,
      senderRoleOf(req),
      body,
    );
    res.status(200).json({ message });
  },

  async remove(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const message = await chatService.deleteMessage(req.params.id, req.user.sub, senderRoleOf(req));
    res.status(200).json({ message });
  },

  async react(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const emoji = (req.body as { emoji: string }).emoji;
    const message = await chatService.react(req.params.id, req.user.sub, senderRoleOf(req), emoji);
    res.status(200).json({ message });
  },

  async downloadAttachment(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const target = await chatService.getAttachment(req.params.id, req.user.sub, senderRoleOf(req));
    res.type(target.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(target.name)}"`);
    res.send(target.buffer);
  },
};
