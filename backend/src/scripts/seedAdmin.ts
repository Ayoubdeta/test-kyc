import { ROLES } from '../config/constants';
import { env } from '../config/env';
import { pool, withTransaction } from '../database/pool';
import { userRepository } from '../repositories/user.repository';
import { hashPassword } from '../utils/password';

/**
 * Crea (o promueve) el administrador inicial a partir de las variables de
 * entorno ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_USERNAME.
 *
 * - Si ya existe un usuario con ese email, lo promociona a 'admin'.
 * - Si no existe, lo crea con su perfil y rol 'admin'.
 *
 * Ejecutar con:  npm run seed:admin   (o dentro del contenedor:
 *   docker compose exec backend node dist/scripts/seedAdmin.js)
 */
async function seedAdmin(): Promise<void> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME } = env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_USERNAME) {
    throw new Error(
      'Faltan ADMIN_EMAIL, ADMIN_PASSWORD y/o ADMIN_USERNAME en el entorno.',
    );
  }

  const existing = await userRepository.findByIdentifier(ADMIN_EMAIL);

  if (existing) {
    if (existing.role === ROLES.ADMIN) {
      console.log(`[seed] ${ADMIN_EMAIL} ya es administrador. Nada que hacer.`);
      return;
    }
    await userRepository.updateRole(existing.id, ROLES.ADMIN);
    console.log(`[seed] ${ADMIN_EMAIL} promovido a administrador.`);
    return;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const user = await withTransaction((client) =>
    userRepository.createWithProfile(client, {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash,
      fullName: 'Administrador',
      phone: '000000000',
      address: 'N/D',
      birthDate: '1970-01-01',
    }),
  );
  await userRepository.updateRole(user.id, ROLES.ADMIN);
  console.log(`[seed] Administrador creado: ${ADMIN_EMAIL}`);
}

seedAdmin()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[seed] Error:', error);
    pool.end().finally(() => process.exit(1));
  });
