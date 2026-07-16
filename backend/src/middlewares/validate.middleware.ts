import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Middleware genérico de validación. Valida y NORMALIZA el body contra un
 * esquema Zod; si falla, corta con un 400 y el detalle de los campos. El
 * body queda reemplazado por el dato ya parseado (trim, lowercase, etc.).
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new AppError(400, 'Datos de entrada inválidos', true, fields);
    }
    req.body = result.data;
    next();
  };
}
