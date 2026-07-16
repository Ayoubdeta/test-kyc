import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAMES } from '../config/constants';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/tokens';

/**
 * Protege rutas privadas. Lee el access token de la cookie HttpOnly, lo
 * verifica y adjunta el usuario a req.user. Si falta o es inválido/expirado,
 * responde 401 y el cliente intentará renovar vía /api/auth/refresh.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN] as string | undefined;
  if (!token) {
    throw AppError.unauthorized('No autenticado');
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    // Token manipulado o expirado.
    throw AppError.unauthorized('Sesión expirada o inválida');
  }
}
