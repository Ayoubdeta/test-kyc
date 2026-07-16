import type { NotificationType } from '../config/constants';
import { query } from '../database/pool';
import type { NotificationRow } from '../types';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  documentId: string | null;
}

export const notificationRepository = {
  async create(params: CreateNotificationParams): Promise<NotificationRow> {
    const rows = await query<NotificationRow>(
      `INSERT INTO notifications (user_id, type, title, message, document_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [params.userId, params.type, params.title, params.message, params.documentId],
    );
    return rows[0];
  },

  async listByUser(userId: string, limit = 50): Promise<NotificationRow[]> {
    return query<NotificationRow>(
      `SELECT * FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [userId, limit],
    );
  },

  async countUnread(userId: string): Promise<number> {
    const rows = await query<{ count: string }>(
      `SELECT count(id) AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );
    return Number(rows[0]?.count ?? 0);
  },

  async markAllRead(userId: string): Promise<void> {
    await query(
      `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );
  },

  /** Borra una notificación del propio usuario. Devuelve true si existía. */
  async deleteOwn(userId: string, id: string): Promise<boolean> {
    const rows = await query<{ id: string }>(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    );
    return rows.length > 0;
  },
};
