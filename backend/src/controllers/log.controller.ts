import type { Request, Response } from 'express';
import { z } from 'zod';
import { LOG_ACTION } from '../config/constants';
import { logService } from '../services/activityLog.service';
import { AppError } from '../utils/AppError';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)');
const actionValues = Object.values(LOG_ACTION) as [string, ...string[]];

const querySchema = z.object({
  from: dateField.optional(),
  to: dateField.optional(),
  action: z.enum(actionValues).optional(),
  actorId: z.string().uuid('actorId inválido').optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

export const logController = {
  /** Listado paginado y filtrable del log de actividad (solo admin). */
  async list(req: Request, res: Response): Promise<void> {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest(parsed.error.issues[0]?.message ?? 'Filtros inválidos');
    }
    const { page, pageSize, ...filters } = parsed.data;
    const data = await logService.list(
      {
        from: filters.from,
        to: filters.to,
        action: filters.action as (typeof LOG_ACTION)[keyof typeof LOG_ACTION] | undefined,
        actorId: filters.actorId,
        search: filters.search,
      },
      page,
      pageSize,
    );
    res.status(200).json(data);
  },
};
