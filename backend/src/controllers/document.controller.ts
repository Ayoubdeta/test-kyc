import type { Request, Response } from 'express';
import {
  DOCUMENT_STATUS,
  DOCUMENT_TYPE_KEYS,
  LOG_ACTION,
  LOG_ENTITY,
  type DocumentTypeKey,
} from '../config/constants';
import { logService } from '../services/activityLog.service';
import { documentService } from '../services/document.service';
import { AppError } from '../utils/AppError';
import { docTypeLabel } from '../utils/mappers';
import { actorFromReq } from '../utils/requestContext';
import type {
  DecisionInput,
  ReviewInput,
} from '../validators/document.validators';

export const documentController = {
  /** Subida de un PDF por parte de un cliente (asociado a un tipo KYC). */
  async upload(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    if (!req.file) {
      throw AppError.badRequest('No se recibió ningún archivo (campo "file")');
    }
    // El tipo llega como campo de texto del formulario multipart.
    const docType = req.body?.docType as string | undefined;
    if (!docType || !DOCUMENT_TYPE_KEYS.includes(docType as DocumentTypeKey)) {
      throw AppError.badRequest('Tipo de documento no válido');
    }
    const doc = await documentService.upload(
      req.user.sub,
      docType as DocumentTypeKey,
      req.file,
    );
    void logService.record({
      ...actorFromReq(req),
      action: LOG_ACTION.DOC_UPLOADED,
      entityType: LOG_ENTITY.DOCUMENT,
      entityId: doc.id,
      description: `Subió el documento "${docTypeLabel(doc.docType)}"`,
      metadata: { docType: doc.docType },
    });
    res.status(201).json({ document: doc });
  },

  /** Documentos del propio cliente. */
  async listMine(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    const documents = await documentService.listOwn(req.user.sub);
    res.status(200).json({ documents });
  },

  /** Historial de eventos de los documentos del propio cliente. */
  async history(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    const events = await documentService.listHistory(req.user.sub);
    res.status(200).json({ events });
  },

  /** Todos los documentos (admin/compliance). */
  async listAll(_req: Request, res: Response): Promise<void> {
    const documents = await documentService.listAll();
    res.status(200).json({ documents });
  },

  /** Documentos actuales de un usuario concreto (admin). */
  async listUserDocuments(req: Request, res: Response): Promise<void> {
    const documents = await documentService.listOwn(req.params.id);
    res.status(200).json({ documents });
  },

  /** Historial de eventos de un usuario concreto (admin). */
  async userHistory(req: Request, res: Response): Promise<void> {
    const events = await documentService.listHistory(req.params.id);
    res.status(200).json({ events });
  },

  /** Descarga/visualización del PDF (propietario o revisor). */
  async download(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    const target = await documentService.getForDownload(req.params.id, req.user.sub);
    res.type(target.mimeType);
    res.download(target.absolutePath, target.originalName);
  },

  /** Compliance/Admin abren un documento para revisarlo (pendiente → en revisión). */
  async startReview(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    const document = await documentService.startReview(req.params.id, req.user.sub);
    void logService.record({
      ...actorFromReq(req),
      action: LOG_ACTION.DOC_REVIEW_STARTED,
      entityType: LOG_ENTITY.DOCUMENT,
      entityId: document.id,
      description: `Abrió para revisar el documento "${docTypeLabel(document.docType)}"`,
    });
    res.status(200).json({ document });
  },

  /** Decisión de compliance/admin sobre un documento en revisión: enviar a aprobación o cancelar. */
  async review(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    const input = req.body as ReviewInput;
    const document = await documentService.review(req.params.id, input, req.user.sub);
    const label = docTypeLabel(document.docType);
    const cancelled = input.action === 'cancelar';
    void logService.record({
      ...actorFromReq(req),
      action: cancelled ? LOG_ACTION.DOC_CANCELLED : LOG_ACTION.DOC_SENT_APPROVAL,
      entityType: LOG_ENTITY.DOCUMENT,
      entityId: document.id,
      description: cancelled
        ? `Canceló (rechazó) el documento "${label}"`
        : `Envió a aprobación el documento "${label}"`,
      metadata: input.comment ? { comment: input.comment } : null,
    });
    res.status(200).json({ document });
  },

  /** Decisión final de Dirección General (aprobado / rechazado). */
  async decide(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    const input = req.body as DecisionInput;
    const document = await documentService.decide(req.params.id, input, req.user.sub);
    const label = docTypeLabel(document.docType);
    const approved = input.status === DOCUMENT_STATUS.APPROVED;
    void logService.record({
      ...actorFromReq(req),
      action: approved ? LOG_ACTION.DOC_APPROVED : LOG_ACTION.DOC_REJECTED,
      entityType: LOG_ENTITY.DOCUMENT,
      entityId: document.id,
      description: approved
        ? `Aprobó el documento "${label}"`
        : `Rechazó el documento "${label}"`,
      metadata: input.comment ? { comment: input.comment } : null,
    });
    res.status(200).json({ document });
  },
};
