import type { NextFunction, Request, Response } from 'express';
import { z, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

const uuidSchema = z.string().uuid();

/**
 * Valida que un parámetro de ruta sea un UUID válido. Sin esto, un `:id` mal
 * formado llega a un `WHERE id = $1` sobre una columna uuid y Postgres lanza un
 * error de sintaxis que acaba en un 500 genérico; con esto se corta antes con un
 * 400 limpio. Todas las PK del proyecto son UUID.
 */
export function validateParamUuid(param = 'id') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!uuidSchema.safeParse(req.params[param]).success) {
      throw new AppError(400, 'Identificador inválido');
    }
    next();
  };
}

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
