import { CHAT_MESSAGE_MAX, CHAT_SENDER, type ChatSender } from '../config/constants';
import { chatRepository } from '../repositories/chat.repository';
import { userRepository } from '../repositories/user.repository';
import type { ChatMessageWithMetaRow, PublicChatConversation, PublicChatMessage } from '../types';
import { AppError } from '../utils/AppError';
import { chatBus } from '../utils/chatBus';
import { fileStorage } from '../utils/storage';
import { toPublicChatConversation, toPublicChatMessage } from '../utils/mappers';

export interface OutgoingAttachment {
  name: string;
  stored: string;
  mime: string;
  size: number;
}

export interface SendInput {
  body: string;
  replyToId?: string | null;
  attachment?: OutgoingAttachment | null;
}

// Un mensaje debe llevar texto o adjunto (o ambos): no permitimos vacíos. El
// texto (opcional si hay adjunto) tiene longitud acotada, igual que en la
// edición (el envío es multipart y no pasa por validateBody con el schema).
function ensureValidBody(input: SendInput): void {
  const body = input.body.trim();
  if (body === '' && !input.attachment) {
    throw AppError.badRequest('El mensaje no puede estar vacío');
  }
  if (body.length > CHAT_MESSAGE_MAX) {
    throw AppError.badRequest(`El mensaje no puede superar ${CHAT_MESSAGE_MAX} caracteres`);
  }
}

// Valida que el mensaje citado exista y pertenezca a la MISMA conversación.
async function resolveReplyTo(clientId: string, replyToId?: string | null): Promise<string | null> {
  if (!replyToId) return null;
  const target = await chatRepository.findWithMetaById(replyToId);
  if (!target || target.client_id !== clientId) {
    throw AppError.badRequest('No se puede responder a ese mensaje');
  }
  return replyToId;
}

export const chatService = {
  // ─── Cliente ─────────────────────────────────────────────────
  async listForClient(clientId: string): Promise<PublicChatMessage[]> {
    const marked = await chatRepository.markRead(clientId, CHAT_SENDER.CLIENT);
    if (marked > 0) chatBus.emit({ type: 'read', clientId, reader: CHAT_SENDER.CLIENT });
    const rows = await chatRepository.listByClient(clientId);
    return rows.map((r) => toPublicChatMessage(r, CHAT_SENDER.CLIENT, clientId));
  },

  async sendAsClient(clientId: string, input: SendInput): Promise<PublicChatMessage> {
    ensureValidBody(input);
    const replyToId = await resolveReplyTo(clientId, input.replyToId);
    const row = await chatRepository.create({
      clientId,
      senderId: clientId,
      senderRole: CHAT_SENDER.CLIENT,
      body: input.body.trim(),
      replyToId,
      attachment: input.attachment ?? null,
    });
    chatBus.emit({ type: 'message', clientId });
    return toPublicChatMessage(row, CHAT_SENDER.CLIENT, clientId);
  },

  async unreadForClient(clientId: string): Promise<number> {
    return chatRepository.unreadForClient(clientId);
  },

  // ─── Personal (compliance/admin) ─────────────────────────────
  async conversations(): Promise<PublicChatConversation[]> {
    const rows = await chatRepository.conversations();
    return rows.map(toPublicChatConversation);
  },

  async unreadForStaff(): Promise<number> {
    return chatRepository.unreadForStaff();
  },

  async listConversation(clientId: string, staffId: string): Promise<PublicChatMessage[]> {
    const marked = await chatRepository.markRead(clientId, CHAT_SENDER.STAFF);
    if (marked > 0) chatBus.emit({ type: 'read', clientId, reader: CHAT_SENDER.STAFF });
    const rows = await chatRepository.listByClient(clientId);
    return rows.map((r) => toPublicChatMessage(r, CHAT_SENDER.STAFF, staffId));
  },

  async sendAsStaff(clientId: string, staffId: string, input: SendInput): Promise<PublicChatMessage> {
    ensureValidBody(input);
    const client = await userRepository.findById(clientId);
    if (!client || client.role !== 'cliente') {
      throw AppError.notFound('Cliente no encontrado');
    }
    const replyToId = await resolveReplyTo(clientId, input.replyToId);
    const row = await chatRepository.create({
      clientId,
      senderId: staffId,
      senderRole: CHAT_SENDER.STAFF,
      body: input.body.trim(),
      replyToId,
      attachment: input.attachment ?? null,
    });
    chatBus.emit({ type: 'message', clientId });
    return toPublicChatMessage(row, CHAT_SENDER.STAFF, staffId);
  },

  // ─── Acciones sobre un mensaje (editar / borrar / reaccionar) ─
  /** Comprueba que el usuario participa en la conversación del mensaje. */
  async requireParticipant(
    messageId: string,
    userId: string,
    role: ChatSender,
  ): Promise<ChatMessageWithMetaRow> {
    const msg = await chatRepository.findWithMetaById(messageId);
    if (!msg) throw AppError.notFound('Mensaje no encontrado');
    // El cliente solo participa en su propia conversación; el personal, en todas.
    if (role === CHAT_SENDER.CLIENT && msg.client_id !== userId) {
      throw AppError.forbidden('No tienes acceso a este mensaje');
    }
    return msg;
  },

  async editMessage(
    messageId: string,
    userId: string,
    role: ChatSender,
    body: string,
  ): Promise<PublicChatMessage> {
    const msg = await this.requireParticipant(messageId, userId, role);
    if (msg.sender_id !== userId) throw AppError.forbidden('Solo puedes editar tus mensajes');
    if (msg.deleted_at) throw AppError.badRequest('No se puede editar un mensaje eliminado');
    const trimmed = body.trim();
    if (trimmed === '') throw AppError.badRequest('El mensaje no puede estar vacío');
    const updated = await chatRepository.updateBody(messageId, trimmed);
    chatBus.emit({ type: 'updated', clientId: msg.client_id });
    return toPublicChatMessage(updated!, role, userId);
  },

  async deleteMessage(
    messageId: string,
    userId: string,
    role: ChatSender,
  ): Promise<PublicChatMessage> {
    const msg = await this.requireParticipant(messageId, userId, role);
    if (msg.sender_id !== userId) throw AppError.forbidden('Solo puedes borrar tus mensajes');
    // Borrado del adjunto en Storage (best-effort, no rompe el soft delete).
    if (msg.attachment_stored) await fileStorage.remove(msg.attachment_stored);
    const updated = await chatRepository.softDelete(messageId);
    chatBus.emit({ type: 'updated', clientId: msg.client_id });
    return toPublicChatMessage(updated!, role, userId);
  },

  async react(
    messageId: string,
    userId: string,
    role: ChatSender,
    emoji: string,
  ): Promise<PublicChatMessage> {
    const msg = await this.requireParticipant(messageId, userId, role);
    if (msg.deleted_at) throw AppError.badRequest('No se puede reaccionar a un mensaje eliminado');

    // Toggle: si el usuario ya reaccionó con ese emoji, se quita; si no, se añade.
    const reactions: Record<string, string[]> = { ...(msg.reactions ?? {}) };
    const users = new Set(reactions[emoji] ?? []);
    if (users.has(userId)) users.delete(userId);
    else users.add(userId);
    if (users.size === 0) delete reactions[emoji];
    else reactions[emoji] = [...users];

    const updated = await chatRepository.setReactions(messageId, reactions);
    chatBus.emit({ type: 'updated', clientId: msg.client_id });
    return toPublicChatMessage(updated!, role, userId);
  },

  /** Señal efímera de "escribiendo…" (no se persiste). */
  typing(clientId: string, senderRole: ChatSender, senderName: string | null): void {
    chatBus.emit({ type: 'typing', clientId, senderRole, senderName });
  },

  /** Prepara la descarga de un adjunto comprobando que el usuario participa. */
  async getAttachment(
    messageId: string,
    userId: string,
    role: ChatSender,
  ): Promise<{ buffer: Buffer; name: string; mime: string }> {
    const msg = await this.requireParticipant(messageId, userId, role);
    if (!msg.attachment_stored || !msg.attachment_name || !msg.attachment_mime) {
      throw AppError.notFound('Este mensaje no tiene adjunto');
    }
    const buffer = await fileStorage.downloadBuffer(msg.attachment_stored);
    if (!buffer) {
      throw AppError.notFound('El adjunto ya no está disponible');
    }
    return { buffer, name: msg.attachment_name, mime: msg.attachment_mime };
  },
};
