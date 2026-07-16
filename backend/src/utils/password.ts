import bcrypt from 'bcryptjs';
import { env } from '../config/env';

// Hash y verificación de contraseñas con bcrypt. Nunca almacenamos ni
// comparamos contraseñas en texto plano.

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
