import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  DOCUMENT_STATUS,
  DOCUMENT_TYPE_KEYS,
  type DocumentStatus,
  type DocumentTypeKey,
} from '../config/constants';
import { reportService } from '../services/report.service';
import { AppError } from '../utils/AppError';

// Estados efectivos admitidos como filtro (incluye "caducado", derivado).
const statusValues = [
  DOCUMENT_STATUS.PENDING,
  DOCUMENT_STATUS.IN_REVIEW,
  DOCUMENT_STATUS.PENDING_APPROVAL,
  DOCUMENT_STATUS.APPROVED,
  DOCUMENT_STATUS.REJECTED,
  'caducado',
] as const;

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)');

const querySchema = z.object({
  from: dateField.optional(),
  to: dateField.optional(),
  docType: z.enum(DOCUMENT_TYPE_KEYS as [string, ...string[]]).optional(),
  status: z.enum(statusValues).optional(),
  clientId: z.string().uuid('clientId inválido').optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const reportController = {
  /** Informe detallado de documentos (personal interno). */
  async documents(req: Request, res: Response): Promise<void> {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest(parsed.error.issues[0]?.message ?? 'Filtros inválidos');
    }
    const data = await reportService.documents({
      from: parsed.data.from,
      to: parsed.data.to,
      docType: parsed.data.docType as DocumentTypeKey | undefined,
      status: parsed.data.status as DocumentStatus | undefined,
      clientId: parsed.data.clientId,
      search: parsed.data.search,
    });
    res.status(200).json(data);
  },
};
