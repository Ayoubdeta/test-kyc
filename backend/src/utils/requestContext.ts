import type { Request } from 'express';
import type { Role } from '../config/constants';

/** Contexto del actor de una petición autenticada, para el log de auditoría. */
export interface ActorContext {
  actorId: string | null;
  actorRole: Role | null;
  actorLabel: string | null;
  ip: string | null;
}

/**
 * IP de origen de la petición. Detrás de un proxy/Docker respetamos la primera
 * IP de X-Forwarded-For; en local caemos a req.ip. Es best-effort (solo para
 * el log de auditoría), nunca para decisiones de seguridad.
 */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim() !== '') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? null;
}

/**
 * Deriva el actor del token de acceso ya validado (req.user). No hace ninguna
 * consulta extra: el payload del JWT ya incluye id, email y rol.
 */
export function actorFromReq(req: Request): ActorContext {
  return {
    actorId: req.user?.sub ?? null,
    actorRole: req.user?.role ?? null,
    actorLabel: req.user?.email ?? null,
    ip: getClientIp(req),
  };
}
