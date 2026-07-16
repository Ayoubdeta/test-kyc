import type { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { AppError } from '../utils/AppError';

export const notificationController = {
  /** Lista las notificaciones del usuario autenticado. */
  async list(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const notifications = await notificationService.listOwn(req.user.sub);
    res.status(200).json({ notifications });
  },

  /** Nº de notificaciones sin leer (para la campana). */
  async unreadCount(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    const count = await notificationService.unreadCount(req.user.sub);
    res.status(200).json({ count });
  },

  /** Marca todas como leídas. */
  async markAllRead(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    await notificationService.markAllRead(req.user.sub);
    res.status(200).json({ success: true });
  },

  /** Borra una notificación del propio usuario. */
  async remove(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized('No autenticado');
    await notificationService.remove(req.user.sub, req.params.id);
    res.status(204).send();
  },
};
