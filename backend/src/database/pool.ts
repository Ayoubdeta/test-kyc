import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { env } from '../config/env';

// Pool de conexiones a PostgreSQL. Reutiliza conexiones en lugar de abrir
// una nueva por petición: es la forma correcta y escalable de hablar con
// la base de datos.
//
// Dos modos:
//  - DATABASE_URL (Supabase / serverless): usamos la cadena de conexión con
//    SSL. En funciones serverless conviene un pool pequeño (max: 1) porque cada
//    invocación es efímera y el pooler de Supabase (Supavisor) ya multiplexa.
//  - PG* (Docker local): conexión directa con un pool mayor.
export const pool = env.DATABASE_URL
  ? new Pool({
      connectionString: env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : new Pool({
      host: env.PGHOST,
      port: env.PGPORT,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      database: env.PGDATABASE,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

pool.on('error', (err) => {
  // Un cliente inactivo del pool falló; lo registramos para no perder la traza.
  console.error('[db] Error inesperado en cliente del pool:', err);
});

/**
 * Ejecuta una consulta parametrizada. SIEMPRE usar parámetros ($1, $2, ...)
 * y nunca concatenar valores en el SQL: así evitamos inyección SQL.
 */
export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/**
 * Ejecuta un conjunto de operaciones dentro de una única transacción.
 * Si el callback lanza, se hace ROLLBACK; si termina, COMMIT. Útil cuando
 * varias escrituras deben ser atómicas (p. ej. crear usuario + su perfil).
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
