import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AccessTokenPayload } from '../types';

// ─── Access token (JWT, corto y stateless) ───────────────────────

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  // jwt.verify lanza si el token es inválido o ha expirado; quien llame
  // debe capturarlo y traducirlo a 401.
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

// ─── Refresh token (opaco y persistido para poder revocarlo) ──────

/** Genera un refresh token aleatorio (valor en claro que se envía al cliente). */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Devuelve el hash SHA-256 del refresh token. En la base de datos guardamos
 * solo el hash: si la BD se ve comprometida, los tokens en claro no quedan
 * expuestos (mismo principio que con las contraseñas).
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Token de activación de cuenta (enlace de invitación) ─────────

/** Token de activación aleatorio (viaja en el enlace que recibe el cliente). */
export function generateActivationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Hash SHA-256 del token de activación; en la BD guardamos solo el hash. */
export function hashActivationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
