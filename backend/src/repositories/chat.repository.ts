import { CHAT_SENDER, type ChatSender } from '../config/constants';
import { query } from '../database/pool';
import type { ChatConversationRow, ChatMessageWithMetaRow } from '../types';

interface CreateMessageParams {
  clientId: string;
  senderId: string;
  senderRole: ChatSender;
  body: string;
  replyToId?: string | null;
  attachment?: {
    name: string;
    stored: string;
    mime: string;
    size: number;
  } | null;
}

// SELECT compartido que enriquece cada mensaje con el nombre/avatar del emisor
// y una vista del mensaje citado (para responder/citar). Se reutiliza tanto en
// el listado como al devolver un único mensaje tras crear/editar/reaccionar.
const SELECT_WITH_META = `
  SELECT m.*,
         COALESCE(sp.full_name, su.username) AS sender_name,
         sp.avatar_url                       AS sender_avatar_url,
         r.body                              AS reply_body,
         r.sender_role                       AS reply_sender_role,
         r.deleted_at                        AS reply_deleted_at
    FROM chat_messages m
    JOIN users su          ON su.id = m.sender_id
    LEFT JOIN profiles sp  ON sp.user_id = m.sender_id
    LEFT JOIN chat_messages r ON r.id = m.reply_to_id`;

export const chatRepository = {
  async create(params: CreateMessageParams): Promise<ChatMessageWithMetaRow> {
    const rows = await query<{ id: string }>(
      `INSERT INTO chat_messages
         (client_id, sender_id, sender_role, body, reply_to_id,
          attachment_name, attachment_stored, attachment_mime, attachment_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        params.clientId,
        params.senderId,
        params.senderRole,
        params.body,
        params.replyToId ?? null,
        params.attachment?.name ?? null,
        params.attachment?.stored ?? null,
        params.attachment?.mime ?? null,
        params.attachment?.size ?? null,
      ],
    );
    // Releemos con metadatos para devolver el mensaje ya enriquecido.
    return this.findWithMetaById(rows[0].id) as Promise<ChatMessageWithMetaRow>;
  },

  async findWithMetaById(id: string): Promise<ChatMessageWithMetaRow | null> {
    const rows = await query<ChatMessageWithMetaRow>(
      `${SELECT_WITH_META} WHERE m.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  },

  async listByClient(clientId: string): Promise<ChatMessageWithMetaRow[]> {
    return query<ChatMessageWithMetaRow>(
      `${SELECT_WITH_META} WHERE m.client_id = $1 ORDER BY m.created_at ASC`,
      [clientId],
    );
  },

  /** Edita el cuerpo de un mensaje (marca edited_at). */
  async updateBody(id: string, body: string): Promise<ChatMessageWithMetaRow | null> {
    await query(`UPDATE chat_messages SET body = $2, edited_at = now() WHERE id = $1`, [id, body]);
    return this.findWithMetaById(id);
  },

  /** Borrado lógico: conserva la fila pero marca deleted_at y vacía el cuerpo. */
  async softDelete(id: string): Promise<ChatMessageWithMetaRow | null> {
    await query(
      `UPDATE chat_messages
          SET deleted_at = now(), body = '',
              attachment_name = NULL, attachment_stored = NULL,
              attachment_mime = NULL, attachment_size = NULL,
              reactions = NULL
        WHERE id = $1`,
      [id],
    );
    return this.findWithMetaById(id);
  },

  /** Sustituye el mapa de reacciones (emoji → lista de userIds). */
  async setReactions(
    id: string,
    reactions: Record<string, string[]>,
  ): Promise<ChatMessageWithMetaRow | null> {
    await query(`UPDATE chat_messages SET reactions = $2 WHERE id = $1`, [
      id,
      JSON.stringify(reactions),
    ]);
    return this.findWithMetaById(id);
  },

  /**
   * Marca como leídos los mensajes que ve el espectador y devuelve cuántos
   * cambiaron (para decidir si notificar "read" por SSE al emisor).
   */
  async markRead(clientId: string, viewer: ChatSender): Promise<number> {
    const otherRole = viewer === CHAT_SENDER.CLIENT ? CHAT_SENDER.STAFF : CHAT_SENDER.CLIENT;
    const rows = await query<{ id: string }>(
      `UPDATE chat_messages
          SET read_at = now()
        WHERE client_id = $1 AND sender_role = $2 AND read_at IS NULL
        RETURNING id`,
      [clientId, otherRole],
    );
    return rows.length;
  },

  async unreadForClient(clientId: string): Promise<number> {
    const rows = await query<{ count: number }>(
      `SELECT count(id)::int AS count FROM chat_messages
        WHERE client_id = $1 AND sender_role = 'staff' AND read_at IS NULL`,
      [clientId],
    );
    return rows[0]?.count ?? 0;
  },

  async unreadForStaff(): Promise<number> {
    const rows = await query<{ count: number }>(
      `SELECT count(id)::int AS count FROM chat_messages
        WHERE sender_role = 'cliente' AND read_at IS NULL`,
    );
    return rows[0]?.count ?? 0;
  },

  /** Lista de conversaciones (una por cliente) con último mensaje y no leídos. */
  async conversations(): Promise<ChatConversationRow[]> {
    return query<ChatConversationRow>(
      `SELECT c.client_id,
              COALESCE(p.full_name, u.username) AS name,
              u.email AS email,
              lm.body AS last_body,
              lm.created_at AS last_at,
              COALESCE(un.cnt, 0)::int AS unread
         FROM (SELECT DISTINCT client_id FROM chat_messages) c
         JOIN users u ON u.id = c.client_id
         LEFT JOIN profiles p ON p.user_id = c.client_id
         JOIN LATERAL (
              SELECT body, created_at FROM chat_messages
               WHERE client_id = c.client_id ORDER BY created_at DESC LIMIT 1
         ) lm ON true
         LEFT JOIN LATERAL (
              SELECT count(*) AS cnt FROM chat_messages
               WHERE client_id = c.client_id AND sender_role = 'cliente' AND read_at IS NULL
         ) un ON true
        ORDER BY lm.created_at DESC`,
    );
  },
};
