import fs from 'node:fs';
import path from 'node:path';
import { CHAT_SENDER, type ChatSender } from '../config/constants';
import { chatRepository } from '../repositories/chat.repository';
import { userRepository } from '../repositories/user.repository';
import type { ChatMessageWithMetaRow, PublicChatConversation, PublicChatMessage } from '../types';
import { AppError } from '../utils/AppError';
import { chatBus } from '../utils/chatBus';
import { uploadDir } from '../middlewares/upload.middleware';
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

// Elimina el fichero de un adjunto del disco (best-effort, no rompe el flujo).
function removeAttachment(stored: string | null): void {
  if (!stored) return;
  const filePath = path.join(uploadDir, stored);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error(`[chat] No se pudo borrar el adjunto ${filePath}:`, error);
  }
}

// Un mensaje debe llevar texto o adjunto (o ambos): no permitimos vacíos.
function ensureNotEmpty(input: SendInput): void {
  if (input.body.trim() === '' && !input.attachment) {
    throw AppError.badRequest('El mensaje no puede estar vacío');
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
    ensureNotEmpty(input);
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
    ensureNotEmpty(input);
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
    if (msg.attachment_stored) removeAttachment(msg.attachment_stored);
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
  ): Promise<{ absolutePath: string; name: string; mime: string }> {
    const msg = await this.requireParticipant(messageId, userId, role);
    if (!msg.attachment_stored || !msg.attachment_name || !msg.attachment_mime) {
      throw AppError.notFound('Este mensaje no tiene adjunto');
    }
    const absolutePath = path.join(uploadDir, msg.attachment_stored);
    if (!fs.existsSync(absolutePath)) {
      throw AppError.notFound('El adjunto ya no está disponible');
    }
    return { absolutePath, name: msg.attachment_name, mime: msg.attachment_mime };
  },
};
