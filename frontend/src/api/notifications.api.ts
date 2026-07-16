import type { NotificationItem } from '../types';
import { api } from './client';

export const notificationsApi = {
  async list(): Promise<NotificationItem[]> {
    const { data } = await api.get<{ notifications: NotificationItem[] }>('/notifications');
    return data.notifications;
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  },

  async markAllRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
