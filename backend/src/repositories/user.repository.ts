import type { PoolClient } from 'pg';
import type { ClientType, Role } from '../config/constants';
import { pool, query } from '../database/pool';
import type { ActivationContext, ProfileRow, UserRow } from '../types';

// Acceso a datos de usuarios y perfiles. La lógica de negocio (services)
// habla con este repositorio, nunca con SQL directamente. Todas las
// consultas son parametrizadas (protección contra inyección SQL).

interface CreateUserParams {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  address: string;
  birthDate: string;
}

interface CreateClientParams {
  username: string;
  email: string;
  activationTokenHash: string;
  activationExpiresAt: Date;
  clientType: ClientType;
  razonSocial: string;
  cif: string;
  comercialAsignado: string | null;
}

interface CreateStaffParams {
  username: string;
  email: string;
  role: Role;
  fullName: string;
  activationTokenHash: string;
  activationExpiresAt: Date;
}

export interface UpdateProfileParams {
  fullName: string;
  phone: string;
  address: string;
  birthDate: string;
  bio: string | null;
  avatarUrl: string | null;
}

export interface AdminUpdateParams {
  username: string;
  email: string;
  role: Role;
  fullName: string;
  phone: string;
  address: string;
  birthDate: string;
  bio: string | null;
}

export const userRepository = {
  /** Busca un usuario por email o por username (para el login). */
  async findByIdentifier(identifier: string): Promise<UserRow | null> {
    const rows = await query<UserRow>(
      `SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1`,
      [identifier],
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<UserRow | null> {
    const rows = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async existsByEmailOrUsername(email: string, username: string): Promise<boolean> {
    const rows = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM users WHERE email = $1 OR username = $2
       ) AS exists`,
      [email, username],
    );
    return rows[0]?.exists ?? false;
  },

  /** Comprueba duplicados de email/usuario excluyendo un id (para editar). */
  async existsByEmailOrUsernameExcept(
    email: string,
    username: string,
    exceptId: string,
  ): Promise<boolean> {
    const rows = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM users
          WHERE (email = $1 OR username = $2) AND id <> $3
       ) AS exists`,
      [email, username, exceptId],
    );
    return rows[0]?.exists ?? false;
  },

  /**
   * Crea el usuario y su perfil en una única transacción: o se crean ambos,
   * o no se crea ninguno. Recibe el client de la transacción desde el service.
   */
  async createWithProfile(
    client: PoolClient,
    params: CreateUserParams,
  ): Promise<UserRow> {
    const userResult = await client.query<UserRow>(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [params.username, params.email, params.passwordHash],
    );
    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO profiles (user_id, full_name, phone, address, birth_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, params.fullName, params.phone, params.address, params.birthDate],
    );

    return user;
  },

  /**
   * Alta de un cliente por parte del personal interno (Decal): crea el usuario
   * SIN contraseña (la fija el cliente al activar), su perfil (nombre = razón
   * social) y su expediente (client_profiles) con la información mínima. Guarda
   * el hash del token de activación. Todo en una transacción.
   */
  async createClient(client: PoolClient, params: CreateClientParams): Promise<UserRow> {
    const userResult = await client.query<UserRow>(
      `INSERT INTO users (username, email, activation_token_hash, activation_expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.username, params.email, params.activationTokenHash, params.activationExpiresAt],
    );
    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)`,
      [user.id, params.razonSocial],
    );

    await client.query(
      `INSERT INTO client_profiles (user_id, client_type, razon_social, cif, comercial_asignado)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, params.clientType, params.razonSocial, params.cif, params.comercialAsignado],
    );

    return user;
  },

  /**
   * Alta de un usuario interno (compliance/dirección/admin) por parte del admin:
   * crea el usuario SIN contraseña con el rol indicado y su perfil (nombre). No
   * lleva expediente (client_profiles); recibe el acceso por enlace de activación
   * igual que el cliente. Todo en una transacción.
   */
  async createStaff(client: PoolClient, params: CreateStaffParams): Promise<UserRow> {
    const userResult = await client.query<UserRow>(
      `INSERT INTO users (username, email, role, activation_token_hash, activation_expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        params.username,
        params.email,
        params.role,
        params.activationTokenHash,
        params.activationExpiresAt,
      ],
    );
    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)`,
      [user.id, params.fullName],
    );

    return user;
  },

  /**
   * Busca una cuenta activable por el hash del token: el token debe existir,
   * no haber caducado y la cuenta no estar ya activada (password_hash null).
   * Sirve tanto para clientes (nombre = razón social del expediente) como para
   * personal interno (sin expediente → se usa el nombre del perfil o el email),
   * de ahí los LEFT JOIN y el COALESCE.
   */
  async findActivatableByTokenHash(tokenHash: string): Promise<ActivationContext | null> {
    const rows = await query<ActivationContext>(
      `SELECT u.id, u.email, COALESCE(cp.razon_social, p.full_name, u.email) AS razon_social
         FROM users u
         LEFT JOIN client_profiles cp ON cp.user_id = u.id
         LEFT JOIN profiles p ON p.user_id = u.id
        WHERE u.activation_token_hash = $1
          AND u.activation_expires_at > now()
          AND u.password_hash IS NULL
        LIMIT 1`,
      [tokenHash],
    );
    return rows[0] ?? null;
  },

  /** Activa la cuenta: fija la contraseña, invalida el token y registra la
   *  aceptación de política de privacidad y términos. */
  async activateAccount(
    client: PoolClient,
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await client.query(
      `UPDATE users
          SET password_hash = $2,
              activation_token_hash = NULL,
              activation_expires_at = NULL
        WHERE id = $1`,
      [userId, passwordHash],
    );
    await client.query(
      `UPDATE client_profiles
          SET privacy_accepted_at = now(),
              terms_accepted_at = now()
        WHERE user_id = $1`,
      [userId],
    );
  },

  /** Actualiza el perfil del usuario y devuelve la fila resultante. */
  async updateProfile(
    userId: string,
    params: UpdateProfileParams,
  ): Promise<ProfileRow | null> {
    const rows = await query<ProfileRow>(
      `UPDATE profiles
         SET full_name  = $2,
             phone      = $3,
             address    = $4,
             birth_date = $5,
             bio        = $6,
             avatar_url = $7
       WHERE user_id = $1
       RETURNING *`,
      [
        userId,
        params.fullName,
        params.phone,
        params.address,
        params.birthDate,
        params.bio,
        params.avatarUrl,
      ],
    );
    return rows[0] ?? null;
  },

  async updateLastLogin(id: string): Promise<void> {
    await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [id]);
  },

  async findProfileByUserId(userId: string): Promise<ProfileRow | null> {
    const rows = await query<ProfileRow>(
      `SELECT * FROM profiles WHERE user_id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  },

  /** Lista todos los usuarios (para el panel de administración). */
  async findAll(): Promise<UserRow[]> {
    return query<UserRow>(`SELECT * FROM users ORDER BY created_at ASC`);
  },

  /** Ids de los usuarios con un rol concreto (p. ej. notificar a Dirección). */
  async findIdsByRole(role: Role): Promise<string[]> {
    const rows = await query<{ id: string }>(`SELECT id FROM users WHERE role = $1`, [role]);
    return rows.map((r) => r.id);
  },

  /** Ids de los usuarios con cualquiera de los roles indicados. */
  async findIdsByRoles(roles: Role[]): Promise<string[]> {
    const rows = await query<{ id: string }>(
      `SELECT id FROM users WHERE role = ANY($1)`,
      [roles],
    );
    return rows.map((r) => r.id);
  },

  /** Cambia el rol de un usuario y devuelve la fila actualizada. */
  async updateRole(id: string, role: Role): Promise<UserRow | null> {
    const rows = await query<UserRow>(
      `UPDATE users SET role = $2 WHERE id = $1 RETURNING *`,
      [id, role],
    );
    return rows[0] ?? null;
  },

  /**
   * Edición completa por admin: actualiza cuenta (users) y perfil (profiles)
   * en una sola transacción. No toca el avatar ni la contraseña.
   */
  async adminUpdate(
    client: PoolClient,
    id: string,
    params: AdminUpdateParams,
  ): Promise<void> {
    await client.query(
      `UPDATE users SET username = $2, email = $3, role = $4 WHERE id = $1`,
      [id, params.username, params.email, params.role],
    );
    await client.query(
      `UPDATE profiles
          SET full_name = $2, phone = $3, address = $4, birth_date = $5, bio = $6
        WHERE user_id = $1`,
      [id, params.fullName, params.phone, params.address, params.birthDate, params.bio],
    );
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [id, passwordHash]);
  },

  /** Guarda la preferencia de idioma (i18n) en el perfil del usuario. */
  async updateLanguage(userId: string, language: string): Promise<void> {
    await query(`UPDATE profiles SET language = $2 WHERE user_id = $1`, [userId, language]);
  },

  async deleteById(id: string): Promise<void> {
    await query(`DELETE FROM users WHERE id = $1`, [id]);
  },
};

// Reexport del pool por comodidad de los tests/otros módulos si lo necesitan.
export { pool };
