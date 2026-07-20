import { z } from 'zod';
import {
  DOCUMENT_STATUS,
  MAX_VALIDITY_MONTHS,
  MIN_VALIDITY_MONTHS,
} from '../config/constants';

// Decisión de compliance/admin sobre un documento EN REVISIÓN: enviarlo a
// aprobación (Dirección) o cancelarlo (rechazado; el cliente reenvía).
// Al enviar a aprobación es obligatoria la validez (en meses): la propone el
// revisor y Dirección podrá ajustarla al aprobar. Al cancelar no aplica.
export const reviewSchema = z
  .object({
    action: z.enum(['enviar_aprobacion', 'cancelar']),
    comment: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
    validityMonths: z.coerce
      .number()
      .int()
      .min(MIN_VALIDITY_MONTHS)
      .max(MAX_VALIDITY_MONTHS)
      .optional(),
  })
  .refine(
    (data) => data.action !== 'enviar_aprobacion' || data.validityMonths !== undefined,
    {
      message: 'Debes indicar la validez (en meses) al enviar a aprobación',
      path: ['validityMonths'],
    },
  );

// Dirección decide: aprobado o rechazado. Al aprobar es obligatoria la validez
// (en meses); al rechazar no aplica.
export const decisionSchema = z
  .object({
    status: z.enum([DOCUMENT_STATUS.APPROVED, DOCUMENT_STATUS.REJECTED]),
    comment: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
    validityMonths: z.coerce
      .number()
      .int()
      .min(MIN_VALIDITY_MONTHS)
      .max(MAX_VALIDITY_MONTHS)
      .optional(),
  })
  .refine(
    (data) => data.status !== DOCUMENT_STATUS.APPROVED || data.validityMonths !== undefined,
    { message: 'Debes indicar la validez (en meses) al aprobar', path: ['validityMonths'] },
  );

export type ReviewInput = z.infer<typeof reviewSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
