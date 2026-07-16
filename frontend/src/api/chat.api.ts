import type { ChatConversation, ChatMessage } from '../types';
import { api } from './client';

export interface SendPayload {
  body?: string;
  file?: File | null;
  replyToId?: string | null;
}

// Construye el FormData del envío (texto y/o adjunto + posible respuesta).
function toForm(payload: SendPayload): FormData {
  const form = new FormData();
  if (payload.body) form.append('body', payload.body);
  if (payload.replyToId) form.append('replyToId', payload.replyToId);
  if (payload.file) form.append('file', payload.file);
  return form;
}

export const chatApi = {
  // ─── Cliente ─────────────────────────────────────────────────
  async myMessages(): Promise<ChatMessage[]> {
    const { data } = await api.get<{ messages: ChatMessage[] }>('/chat/me');
    return data.messages;
  },
  async myUnread(): Promise<number> {
    const { data } = await api.get<{ count: number }>('/chat/me/unread');
    return data.count;
  },
  async sendMine(payload: SendPayload): Promise<ChatMessage> {
    const { data } = await api.post<{ message: ChatMessage }>('/chat/me', toForm(payload));
    return data.message;
  },
  async typingMine(): Promise<void> {
    await api.post('/chat/me/typing');
  },

  // ─── Personal (compliance/admin) ─────────────────────────────
  async conversations(): Promise<ChatConversation[]> {
    const { data } = await api.get<{ conversations: ChatConversation[] }>('/chat/conversations');
    return data.conversations;
  },
  async staffUnread(): Promise<number> {
    const { data } = await api.get<{ count: number }>('/chat/conversations/unread');
    return data.count;
  },
  async conversationMessages(clientId: string): Promise<ChatMessage[]> {
    const { data } = await api.get<{ messages: ChatMessage[] }>(`/chat/conversations/${clientId}`);
    return data.messages;
  },
  async sendToClient(clientId: string, payload: SendPayload): Promise<ChatMessage> {
    const { data } = await api.post<{ message: ChatMessage }>(
      `/chat/conversations/${clientId}`,
      toForm(payload),
    );
    return data.message;
  },
  async typingToClient(clientId: string): Promise<void> {
    await api.post(`/chat/conversations/${clientId}/typing`);
  },

  // ─── Acciones sobre un mensaje ───────────────────────────────
  async edit(id: string, body: string): Promise<ChatMessage> {
    const { data } = await api.patch<{ message: ChatMessage }>(`/chat/messages/${id}`, { body });
    return data.message;
  },
  async remove(id: string): Promise<ChatMessage> {
    const { data } = await api.delete<{ message: ChatMessage }>(`/chat/messages/${id}`);
    return data.message;
  },
  async react(id: string, emoji: string): Promise<ChatMessage> {
    const { data } = await api.post<{ message: ChatMessage }>(`/chat/messages/${id}/react`, {
      emoji,
    });
    return data.message;
  },

  /**
   * Descarga un adjunto como blob a través de axios (envía las cookies de
   * sesión). No usamos <img src> directo porque, al ser cross-origin, la cookie
   * SameSite no viajaría en una subpetición.
   */
  async attachment(messageId: string): Promise<Blob> {
    const { data } = await api.get(`/chat/attachments/${messageId}`, { responseType: 'blob' });
    return data as Blob;
  },
};
