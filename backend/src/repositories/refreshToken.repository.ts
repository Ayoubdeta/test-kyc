import { query } from '../database/pool';
import type { RefreshTokenRow } from '../types';

// Persistencia de los refresh tokens (guardamos solo el hash). Permite
// renovar la sesión y, sobre todo, revocarla (logout real).

interface CreateRefreshTokenParams {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export const refreshTokenRepository = {
  async create(params: CreateRefreshTokenParams): Promise<RefreshTokenRow> {
    const rows = await query<RefreshTokenRow>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [params.userId, params.tokenHash, params.expiresAt],
    );
    return rows[0];
  },

  /** Devuelve el token si existe, no está revocado y no ha expirado. */
  async findValidByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    const rows = await query<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > now()
       LIMIT 1`,
      [tokenHash],
    );
    return rows[0] ?? null;
  },

  async revokeByHash(tokenHash: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens
       SET revoked_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
  },

  /** Revoca todas las sesiones activas de un usuario (logout global). */
  async revokeAllForUser(userId: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens
       SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  },
};
