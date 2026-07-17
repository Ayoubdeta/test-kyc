import {
  DOCUMENT_EVENT,
  EXPIRY_WARNING_DAYS,
  MS_PER_DAY,
  NOTIFICATION_TYPE,
  type NotificationType,
} from '../config/constants';
import { documentRepository } from '../repositories/document.repository';
import { documentEventRepository } from '../repositories/documentEvent.repository';
import { notificationRepository } from '../repositories/notification.repository';
import type { PublicNotification } from '../types';
import { AppError } from '../utils/AppError';
import { docTypeLabel, toPublicNotification } from '../utils/mappers';

/** Días (redondeados hacia arriba) que faltan hasta una fecha futura. */
function daysUntil(date: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / MS_PER_DAY));
}

export const notificationService = {
  /** Crea una notificación para un usuario. */
  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    documentId?: string | null;
  }): Promise<void> {
    await notificationRepository.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      documentId: params.documentId ?? null,
    });
  },

  /**
   * Genera de forma perezosa las notificaciones de documentos caducados: los
   * documentos aprobados vencidos sin notificación previa reciben una ahora, y
   * se deja constancia en el historial. Evita necesitar un cron.
   */
  async syncExpired(userId: string): Promise<void> {
    const expired = await documentRepository.findExpiredWithoutNotification(userId);
    for (const doc of expired) {
      await notificationRepository.create({
        userId,
        type: NOTIFICATION_TYPE.DOC_EXPIRED,
        title: 'Documento caducado',
        message: `Tu documento "${docTypeLabel(doc.doc_type)}" ha caducado. Vuelve a subirlo para renovarlo.`,
        documentId: doc.id,
      });
      // Historial de auditoría (independiente de la notificación).
      await documentEventRepository.create({
        userId,
        documentId: doc.id,
        docType: doc.doc_type,
        originalName: doc.original_name,
        eventType: DOCUMENT_EVENT.EXPIRED,
        expiresAt: doc.expires_at,
      });
    }
  },

  /**
   * Genera de forma perezosa el aviso previo de caducidad: documentos que
   * caducan dentro de los próximos EXPIRY_WARNING_DAYS días y aún no avisados.
   */
  async syncExpiring(userId: string): Promise<void> {
    const expiring = await documentRepository.findExpiringWithoutNotification(
      userId,
      EXPIRY_WARNING_DAYS,
    );
    for (const doc of expiring) {
      const days = doc.expires_at ? daysUntil(doc.expires_at) : EXPIRY_WARNING_DAYS;
      await notificationRepository.create({
        userId,
        type: NOTIFICATION_TYPE.DOC_EXPIRING,
        title: 'Documento próximo a caducar',
        message: `Tu documento "${docTypeLabel(doc.doc_type)}" caduca en ${days} día${
          days === 1 ? '' : 's'
        }. Renuévalo antes de que caduque.`,
        documentId: doc.id,
      });
    }
  },

  /** Ejecuta las dos comprobaciones perezosas (por caducar + caducado). */
  async sync(userId: string): Promise<void> {
    await this.syncExpiring(userId);
    await this.syncExpired(userId);
  },

  async listOwn(userId: string): Promise<PublicNotification[]> {
    await this.sync(userId);
    const rows = await notificationRepository.listByUser(userId);
    return rows.map(toPublicNotification);
  },

  async unreadCount(userId: string): Promise<number> {
    await this.sync(userId);
    return notificationRepository.countUnread(userId);
  },

  async markAllRead(userId: string): Promise<void> {
    await notificationRepository.markAllRead(userId);
  },

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await notificationRepository.deleteOwn(userId, id);
    if (!deleted) {
      throw AppError.notFound('Notificación no encontrada');
    }
  },
};
