import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ACTIVATION_TTL_DAYS, MS_PER_DAY } from '../config/constants';
import { withTransaction } from '../database/pool';
import { uploadDir } from '../middlewares/upload.middleware';
import { documentRepository } from '../repositories/document.repository';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { userRepository } from '../repositories/user.repository';
import type { MeResponse, PublicProfile, PublicUser } from '../types';
import { AppError } from '../utils/AppError';
import { toPublicProfile, toPublicUser } from '../utils/mappers';
import { hashPassword } from '../utils/password';
import { generateActivationToken, hashActivationToken } from '../utils/tokens';
import type { UpdateProfileInput } from '../validators/profile.validators';
import type { AdminUpdateUserInput, CreateClientInput } from '../validators/user.validators';

function normalizeBio(bio: string | undefined): string | null {
  return bio && bio.trim() !== '' ? bio : null;
}

/**
 * Genera un nombre de usuario válido y único a partir del email (el cliente
 * inicia sesión con su email; el username es un identificador interno).
 */
async function generateUniqueUsername(email: string): Promise<string> {
  const raw = (email.split('@')[0] || 'cliente').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40);
  const base = raw.length >= 3 ? raw : `${raw}_cli`;
  let candidate = base;
  for (let i = 0; i < 6; i++) {
    const existing = await userRepository.findByIdentifier(candidate);
    if (!existing) return candidate;
    candidate = `${base}_${crypto.randomBytes(2).toString('hex')}`;
  }
  return `${base}_${crypto.randomBytes(4).toString('hex')}`;
}

export const userService = {
  /** Devuelve los datos combinados (usuario + perfil). */
  async getMe(userId: string): Promise<MeResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('Usuario no encontrado');
    }
    const profile = await userRepository.findProfileByUserId(userId);
    return {
      user: toPublicUser(user),
      profile: toPublicProfile(profile),
    };
  },

  /** Actualiza el perfil del usuario autenticado (incluye avatar). */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicProfile> {
    const updated = await userRepository.updateProfile(userId, {
      fullName: input.fullName,
      phone: input.phone,
      address: input.address,
      birthDate: input.birthDate,
      bio: normalizeBio(input.bio),
      avatarUrl: input.avatarUrl ?? null,
    });
    if (!updated) {
      throw AppError.notFound('Perfil no encontrado');
    }
    return toPublicProfile(updated);
  },

  /** Lista todos los usuarios (panel de administración). */
  async listUsers(): Promise<PublicUser[]> {
    const users = await userRepository.findAll();
    return users.map(toPublicUser);
  },

  /**
   * Alta de un cliente por el personal interno: crea la cuenta (sin contraseña)
   * y su expediente con la información mínima, y devuelve el token de activación
   * para que el admin comparta el enlace con el cliente.
   */
  async createClient(
    input: CreateClientInput,
  ): Promise<{ user: PublicUser; activationToken: string }> {
    const emailTaken = await userRepository.findByIdentifier(input.email);
    if (emailTaken) {
      throw AppError.conflict('Ya existe un usuario con ese email');
    }

    const username = await generateUniqueUsername(input.email);
    const activationToken = generateActivationToken();
    const activationExpiresAt = new Date(Date.now() + ACTIVATION_TTL_DAYS * MS_PER_DAY);
    const comercial =
      input.comercialAsignado && input.comercialAsignado.trim() !== ''
        ? input.comercialAsignado.trim()
        : null;

    const user = await withTransaction((client) =>
      userRepository.createClient(client, {
        username,
        email: input.email,
        activationTokenHash: hashActivationToken(activationToken),
        activationExpiresAt,
        clientType: input.clientType,
        razonSocial: input.razonSocial,
        cif: input.cif,
        comercialAsignado: comercial,
      }),
    );

    return { user: toPublicUser(user), activationToken };
  },

  /** Edición completa (cuenta + perfil + rol) por parte del admin. */
  async adminUpdateUser(
    actingUserId: string,
    targetUserId: string,
    input: AdminUpdateUserInput,
  ): Promise<MeResponse> {
    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw AppError.notFound('Usuario no encontrado');
    }

    // Un admin no puede quitarse a sí mismo el rol de admin.
    if (targetUserId === actingUserId && input.role !== 'admin') {
      throw AppError.badRequest('No puedes cambiar tu propio rol de administrador');
    }

    // Duplicados de email/usuario (excluyendo al propio usuario editado).
    const clash = await userRepository.existsByEmailOrUsernameExcept(
      input.email,
      input.username,
      targetUserId,
    );
    if (clash) {
      throw AppError.conflict('El usuario o el email ya están en uso por otra cuenta');
    }

    await withTransaction((client) =>
      userRepository.adminUpdate(client, targetUserId, {
        username: input.username,
        email: input.email,
        role: input.role,
        fullName: input.fullName,
        phone: input.phone,
        address: input.address,
        birthDate: input.birthDate,
        bio: normalizeBio(input.bio),
      }),
    );

    return this.getMe(targetUserId);
  },

  /** El admin fija una contraseña nueva y revoca las sesiones del usuario. */
  async resetPassword(targetUserId: string, newPassword: string): Promise<void> {
    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw AppError.notFound('Usuario no encontrado');
    }
    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(targetUserId, passwordHash);
    // Forzamos re-login en todas sus sesiones activas.
    await refreshTokenRepository.revokeAllForUser(targetUserId);
  },

  /** Elimina un usuario, sus ficheros en disco y (en cascada) sus datos. */
  async deleteUser(actingUserId: string, targetUserId: string): Promise<void> {
    if (targetUserId === actingUserId) {
      throw AppError.badRequest('No puedes eliminar tu propia cuenta');
    }
    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw AppError.notFound('Usuario no encontrado');
    }

    // Borramos primero los ficheros físicos de sus documentos (la BD los
    // eliminará en cascada, pero los ficheros en disco no).
    const documents = await documentRepository.findByUser(targetUserId);
    for (const doc of documents) {
      const filePath = path.join(uploadDir, doc.stored_name);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (error) {
        // No abortamos el borrado del usuario por un fichero que no se pudo
        // eliminar; lo registramos.
        console.error(`[delete] No se pudo borrar ${filePath}:`, error);
      }
    }

    await userRepository.deleteById(targetUserId);
  },
};
