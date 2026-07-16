import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../config/constants';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';

/**
 * Autorización por rol. Debe ir DESPUÉS de requireAuth. Consulta el rol
 * ACTUAL en la base de datos (no confía solo en el del token) para que un
 * cambio de rol tenga efecto inmediato y no haya que esperar a renovar el
 * token. Si el rol no está permitido, responde 403.
 *
 * Nota: es async, así que envolvemos la lógica y derivamos cualquier error a
 * next(). Express 4 no captura por sí solo los throws de middlewares async;
 * sin esto, un rechazo dejaría la petición colgada sin respuesta.
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    void (async () => {
      if (!req.user) {
        throw AppError.unauthorized('No autenticado');
      }

      const user = await userRepository.findById(req.user.sub);
      if (!user) {
        throw AppError.unauthorized('Usuario no encontrado');
      }

      if (!allowed.includes(user.role)) {
        throw AppError.forbidden('No tienes permisos para esta acción');
      }

      // Mantenemos req.user.role sincronizado con el valor autoritativo.
      req.user.role = user.role;
      next();
    })().catch(next);
  };
}
