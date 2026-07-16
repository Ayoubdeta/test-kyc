import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  DOCUMENT_STATUS,
  DOCUMENT_TYPE_KEYS,
  type DocumentStatus,
  type DocumentTypeKey,
} from '../config/constants';
import { statsService } from '../services/stats.service';
import { AppError } from '../utils/AppError';

// Estados efectivos admitidos como filtro (incluye "caducado", derivado).
const statusValues = [
  DOCUMENT_STATUS.PENDING,
  DOCUMENT_STATUS.IN_REVIEW,
  DOCUMENT_STATUS.APPROVED,
  DOCUMENT_STATUS.REJECTED,
  'caducado',
] as const;

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)');

const filtersSchema = z.object({
  from: dateField.optional(),
  to: dateField.optional(),
  docType: z.enum(DOCUMENT_TYPE_KEYS as [string, ...string[]]).optional(),
  status: z.enum(statusValues).optional(),
});

export const statsController = {
  /** KPIs de cabecera para el panel. */
  async overview(_req: Request, res: Response): Promise<void> {
    const data = await statsService.overview();
    res.status(200).json(data);
  },

  /** Estadísticas completas y filtrables. */
  async filtered(req: Request, res: Response): Promise<void> {
    const parsed = filtersSchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest(parsed.error.issues[0]?.message ?? 'Filtros inválidos');
    }
    const data = await statsService.filtered({
      from: parsed.data.from,
      to: parsed.data.to,
      docType: parsed.data.docType as DocumentTypeKey | undefined,
      status: parsed.data.status as DocumentStatus | undefined,
    });
    res.status(200).json(data);
  },
};
