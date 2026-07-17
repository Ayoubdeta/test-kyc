import { env } from '../config/env';
import { MS_PER_DAY } from '../config/constants';
import { withTransaction } from '../database/pool';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { userRepository } from '../repositories/user.repository';
import type { PublicUser, UserRow } from '../types';
import { AppError } from '../utils/AppError';
import { toPublicUser } from '../utils/mappers';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  generateRefreshToken,
  hashActivationToken,
  hashRefreshToken,
  signAccessToken,
} from '../utils/tokens';
import type { ActivateInput, LoginInput } from '../validators/auth.validators';

// Hash ficticio para verificar contraseñas en ramas "usuario inválido" y no
// filtrar por tiempos de respuesta si el usuario existe (mitiga enumeración).
const DUMMY_HASH = '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  tokens: IssuedTokens;
}

/**
 * Emite un nuevo par de tokens para un usuario y persiste el hash del refresh
 * token (para poder validarlo y revocarlo después).
 */
async function issueTokens(user: UserRow): Promise<IssuedTokens> {
  const accessToken = signAccessToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * MS_PER_DAY);

  await refreshTokenRepository.create({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshExpiresAt,
  });

  return { accessToken, refreshToken, refreshExpiresAt };
}

export const authService = {
  /**
   * Activa la cuenta de un cliente a partir del token del enlace de invitación:
   * fija la contraseña, acepta las políticas y lo deja autenticado.
   */
  async activate(input: ActivateInput): Promise<AuthResult> {
    const ctx = await userRepository.findActivatableByTokenHash(
      hashActivationToken(input.token),
    );
    if (!ctx) {
      throw AppError.badRequest('El enlace de activación no es válido o ha caducado');
    }

    const passwordHash = await hashPassword(input.password);
    await withTransaction((client) =>
      userRepository.activateAccount(client, ctx.id, passwordHash),
    );

    const user = await userRepository.findById(ctx.id);
    if (!user) {
      throw AppError.notFound('Usuario no encontrado');
    }
    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), tokens };
  },

  /** Datos mínimos asociados a un token de activación (para la pantalla de activación). */
  async getActivationInfo(token: string): Promise<{ email: string; razonSocial: string }> {
    const ctx = await userRepository.findActivatableByTokenHash(hashActivationToken(token));
    if (!ctx) {
      throw AppError.badRequest('El enlace de activación no es válido o ha caducado');
    }
    return { email: ctx.email, razonSocial: ctx.razon_social };
  },

  /** Verifica credenciales y, si son correctas, autentica al usuario. */
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await userRepository.findByIdentifier(input.identifier);

    // Mensaje genérico tanto si no existe el usuario como si la contraseña es
    // incorrecta: no damos pistas a un atacante sobre qué parte ha fallado.
    const invalid = AppError.unauthorized('Credenciales inválidas');
    if (!user) {
      await verifyPassword(input.password, DUMMY_HASH);
      throw invalid;
    }

    // Cuenta creada pero aún no activada (sin contraseña): trátala como
    // credenciales inválidas, con la misma verificación ficticia por tiempos.
    if (!user.password_hash) {
      await verifyPassword(input.password, DUMMY_HASH);
      throw invalid;
    }

    const passwordOk = await verifyPassword(input.password, user.password_hash);
    if (!passwordOk) {
      throw invalid;
    }

    await userRepository.updateLastLogin(user.id);
    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), tokens };
  },

  /**
   * Renueva la sesión: valida el refresh token recibido, lo revoca (rotación)
   * y emite un par nuevo. La rotación evita que un refresh token robado se
   * pueda reutilizar indefinidamente.
   */
  async refresh(refreshTokenPlain: string): Promise<IssuedTokens> {
    const tokenHash = hashRefreshToken(refreshTokenPlain);
    const stored = await refreshTokenRepository.findValidByHash(tokenHash);
    if (!stored) {
      throw AppError.unauthorized('Sesión inválida o expirada');
    }

    const user = await userRepository.findById(stored.user_id);
    if (!user) {
      throw AppError.unauthorized('Sesión inválida o expirada');
    }

    // Rotación: revocamos el token usado antes de emitir el nuevo.
    await refreshTokenRepository.revokeByHash(tokenHash);
    return issueTokens(user);
  },

  /** Cierra la sesión revocando el refresh token actual. */
  async logout(refreshTokenPlain: string | undefined): Promise<void> {
    if (!refreshTokenPlain) {
      return; // Sin token, no hay nada que revocar; el logout es idempotente.
    }
    await refreshTokenRepository.revokeByHash(hashRefreshToken(refreshTokenPlain));
  },
};
