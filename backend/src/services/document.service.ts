import crypto from 'node:crypto';
import {
  DOCUMENT_EVENT,
  DOCUMENT_STATUS,
  NOTIFICATION_TYPE,
  REVIEW_ROLES,
  ROLES,
  STAFF_ROLES,
  type DocumentTypeKey,
} from '../config/constants';
import { documentRepository } from '../repositories/document.repository';
import { documentEventRepository } from '../repositories/documentEvent.repository';
import { userRepository } from '../repositories/user.repository';
import type { PublicDocument, PublicDocumentEvent } from '../types';
import { AppError } from '../utils/AppError';
import { fileStorage } from '../utils/storage';
import { docTypeLabel, toPublicDocument, toPublicDocumentEvent } from '../utils/mappers';
import type { DecisionInput, ReviewInput } from '../validators/document.validators';
import { notificationService } from './notification.service';

export interface DownloadTarget {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export const documentService = {
  /**
   * Registra el PDF subido por un cliente para un tipo concreto. Solo hay un
   * documento activo por tipo: si ya existía, se reemplaza (borrando el fichero
   * anterior).
   */
  async upload(
    userId: string,
    docType: DocumentTypeKey,
    file: Express.Multer.File,
  ): Promise<PublicDocument> {
    const existing = await documentRepository.findByUserAndType(userId, docType);
    if (existing) {
      await fileStorage.remove(existing.stored_name);
      await documentRepository.deleteById(existing.id);
    }

    // Clave del objeto en Supabase Storage: "<userId>/<random>.pdf". La guardamos
    // en `stored_name` para poder descargarla/borrarla después.
    const storedName = `${userId}/${crypto.randomBytes(16).toString('hex')}.pdf`;
    await fileStorage.uploadBuffer(storedName, file.buffer, file.mimetype);

    const row = await documentRepository.create({
      userId,
      docType,
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });

    // Historial de auditoría: el cliente sube (o sustituye) el documento.
    await documentEventRepository.create({
      userId,
      documentId: row.id,
      docType: row.doc_type,
      originalName: row.original_name,
      eventType: DOCUMENT_EVENT.UPLOADED,
      actorId: userId,
    });

    // Aviso a compliance/admin: este cliente ha subido documentación a revisar.
    const [uploader, profile, reviewerIds] = await Promise.all([
      userRepository.findById(userId),
      userRepository.findProfileByUserId(userId),
      userRepository.findIdsByRoles(REVIEW_ROLES),
    ]);
    const clientName = profile?.full_name || uploader?.username || 'Un cliente';
    const label = docTypeLabel(row.doc_type);
    for (const reviewerId of reviewerIds) {
      await notificationService.create({
        userId: reviewerId,
        type: NOTIFICATION_TYPE.DOC_UPLOADED,
        title: 'Nueva documentación por revisar',
        message: `${clientName} ha subido el documento "${label}". Revísalo.`,
        documentId: row.id,
      });
    }

    return toPublicDocument(row);
  },

  /** Documentos del propio cliente (uno por tipo). */
  async listOwn(userId: string): Promise<PublicDocument[]> {
    const rows = await documentRepository.findByUser(userId);
    return rows.map((row) => toPublicDocument(row));
  },

  /** Historial de eventos de los documentos del cliente. */
  async listHistory(userId: string): Promise<PublicDocumentEvent[]> {
    const rows = await documentEventRepository.listByUser(userId);
    return rows.map(toPublicDocumentEvent);
  },

  /** Todos los documentos con propietario (admin/compliance). */
  async listAll(): Promise<PublicDocument[]> {
    const rows = await documentRepository.findAllWithOwner();
    return rows.map((row) => toPublicDocument(row, true));
  },

  /** Prepara la descarga comprobando la autorización (propietario o revisor). */
  async getForDownload(documentId: string, requesterId: string): Promise<DownloadTarget> {
    const doc = await documentRepository.findById(documentId);
    if (!doc) {
      throw AppError.notFound('Documento no encontrado');
    }

    const isOwner = doc.user_id === requesterId;
    if (!isOwner) {
      const requester = await userRepository.findById(requesterId);
      const isStaff = requester ? STAFF_ROLES.includes(requester.role) : false;
      if (!isStaff) {
        throw AppError.forbidden('No tienes acceso a este documento');
      }
    }

    const buffer = await fileStorage.downloadBuffer(doc.stored_name);
    if (!buffer) {
      throw AppError.notFound('El archivo ya no está disponible');
    }

    return {
      buffer,
      originalName: doc.original_name,
      mimeType: doc.mime_type,
    };
  },

  /**
   * Compliance o Admin abren un documento pendiente para revisarlo
   * (pendiente → en_revision). Marca quién lo está revisando; no notifica.
   */
  async startReview(documentId: string, reviewerId: string): Promise<PublicDocument> {
    const existing = await documentRepository.findById(documentId);
    if (!existing) {
      throw AppError.notFound('Documento no encontrado');
    }
    // Solo tiene sentido iniciar la revisión de un documento pendiente. Si ya
    // está en otro estado, devolvemos el actual sin tocarlo (operación segura).
    if (existing.status !== DOCUMENT_STATUS.PENDING) {
      return toPublicDocument(existing);
    }

    const updated = await documentRepository.startReview(documentId, reviewerId);
    if (!updated) {
      throw AppError.notFound('Documento no encontrado');
    }
    return toPublicDocument(updated);
  },

  /**
   * Compliance o Admin, sobre un documento EN REVISIÓN, deciden:
   *  - enviarlo a aprobación (en_revision → pendiente_aprobacion): queda a la
   *    espera de la decisión de Dirección, a quien se notifica; o
   *  - cancelarlo (en_revision → rechazado): se notifica al cliente con el
   *    motivo para que reenvíe la documentación correctamente.
   * No aprueban documentos: aprobar es exclusivo de Dirección.
   */
  async review(
    documentId: string,
    input: ReviewInput,
    reviewerId: string,
  ): Promise<PublicDocument> {
    const existing = await documentRepository.findById(documentId);
    if (!existing) {
      throw AppError.notFound('Documento no encontrado');
    }
    if (existing.status !== DOCUMENT_STATUS.IN_REVIEW) {
      throw AppError.badRequest('Solo se puede decidir sobre documentos en revisión');
    }

    const note = input.comment && input.comment.trim() !== '' ? input.comment.trim() : null;

    if (input.action === 'cancelar') {
      const updated = await documentRepository.rejectByReviewer(documentId, {
        reviewerId,
        comment: note,
      });
      if (!updated) {
        throw AppError.notFound('Documento no encontrado');
      }

      const label = docTypeLabel(updated.doc_type);

      // Historial de auditoría: cancelación en la fase de revisión (rechazado).
      await documentEventRepository.create({
        userId: updated.user_id,
        documentId: updated.id,
        docType: updated.doc_type,
        originalName: updated.original_name,
        eventType: DOCUMENT_EVENT.REJECTED,
        comment: note,
        actorId: reviewerId,
      });

      // Notificación al cliente con el motivo para que reenvíe la documentación.
      await notificationService.create({
        userId: updated.user_id,
        type: NOTIFICATION_TYPE.DOC_REJECTED,
        title: 'Documento rechazado',
        message: `Tu documento "${label}" ha sido rechazado.${note ? ` Motivo: ${note}` : ''} Vuelve a subirlo corregido.`,
        documentId: updated.id,
      });

      return toPublicDocument(updated);
    }

    // action === 'enviar_aprobacion'. El revisor propone la validez (meses); se
    // guarda en el documento para calcular la caducidad cuando Dirección apruebe.
    // El validador garantiza que viene informada; se usa 12 como red de seguridad.
    const updated = await documentRepository.sendToApproval(documentId, {
      reviewerId,
      comment: note,
      validityMonths: input.validityMonths ?? 12,
    });
    if (!updated) {
      throw AppError.notFound('Documento no encontrado');
    }

    const label = docTypeLabel(updated.doc_type);

    // Historial de auditoría: revisión previa de compliance/admin.
    await documentEventRepository.create({
      userId: updated.user_id,
      documentId: updated.id,
      docType: updated.doc_type,
      originalName: updated.original_name,
      eventType: DOCUMENT_EVENT.REVIEWED,
      comment: note,
      actorId: reviewerId,
    });

    // Aviso a Dirección General: hay un documento esperando su decisión.
    const direccionIds = await userRepository.findIdsByRole(ROLES.DIRECCION);
    for (const direccionId of direccionIds) {
      await notificationService.create({
        userId: direccionId,
        type: NOTIFICATION_TYPE.DOC_PENDING_APPROVAL,
        title: 'Documento pendiente de aprobar',
        message: `El documento "${label}" ha sido revisado y espera tu aprobación.`,
        documentId: updated.id,
      });
    }

    return toPublicDocument(updated);
  },

  /**
   * Dirección General decide sobre un documento en revisión: lo aprueba (fijando
   * la validez) o lo rechaza (con motivo). Notifica al cliente en ambos casos.
   */
  async decide(
    documentId: string,
    input: DecisionInput,
    deciderId: string,
  ): Promise<PublicDocument> {
    const existing = await documentRepository.findById(documentId);
    if (!existing) {
      throw AppError.notFound('Documento no encontrado');
    }
    if (existing.status !== DOCUMENT_STATUS.PENDING_APPROVAL) {
      throw AppError.badRequest(
        'Solo Dirección puede decidir sobre documentos pendientes de aprobación',
      );
    }

    const approving = input.status === DOCUMENT_STATUS.APPROVED;

    // La validez la propuso el revisor al enviar a aprobación (`validity_months`);
    // Dirección puede ajustarla ahora (`input.validityMonths`). Si por lo que sea
    // no hubiera ninguna, se usa 12 meses. La caducidad cuenta desde la aprobación.
    let expiresAt: Date | null = null;
    let validityMonths: number | null = null;
    if (approving) {
      validityMonths = input.validityMonths ?? existing.validity_months ?? 12;
      const d = new Date();
      d.setMonth(d.getMonth() + validityMonths);
      expiresAt = d;
    }

    const comment = input.comment && input.comment.trim() !== '' ? input.comment.trim() : null;

    const updated = await documentRepository.decide(documentId, {
      status: input.status,
      comment,
      deciderId,
      expiresAt,
      validityMonths,
    });
    if (!updated) {
      throw AppError.notFound('Documento no encontrado');
    }

    // Historial de auditoría: decisión final de Dirección.
    await documentEventRepository.create({
      userId: updated.user_id,
      documentId: updated.id,
      docType: updated.doc_type,
      originalName: updated.original_name,
      eventType: approving ? DOCUMENT_EVENT.APPROVED : DOCUMENT_EVENT.REJECTED,
      comment,
      expiresAt,
      actorId: deciderId,
    });

    // Notificación al cliente (propietario del documento).
    const label = docTypeLabel(updated.doc_type);
    if (approving && expiresAt) {
      await notificationService.create({
        userId: updated.user_id,
        type: NOTIFICATION_TYPE.DOC_APPROVED,
        title: 'Documento aprobado',
        message: `Tu documento "${label}" ha sido aprobado. Válido hasta el ${expiresAt.toLocaleDateString('es-ES')}.`,
        documentId: updated.id,
      });
    } else {
      await notificationService.create({
        userId: updated.user_id,
        type: NOTIFICATION_TYPE.DOC_REJECTED,
        title: 'Documento rechazado',
        message: `Tu documento "${label}" ha sido rechazado.${comment ? ` Motivo: ${comment}` : ''}`,
        documentId: updated.id,
      });
    }

    return toPublicDocument(updated);
  },
};
