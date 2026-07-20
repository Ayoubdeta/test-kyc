import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pool } from '../database/pool';

/**
 * Runner de migraciones SQL. Aplica, en orden, los ficheros `db/init/NN_*.sql`
 * que aún no estén registrados en la tabla `schema_migrations`, cada uno dentro
 * de su propia transacción. Sirve tanto para el Docker local como para Supabase
 * (usa la misma conexión que la app: DATABASE_URL o PG*).
 *
 * Uso:
 *   npm run migrate              → aplica las migraciones pendientes
 *   npm run migrate -- --baseline  → marca TODAS las actuales como aplicadas
 *                                    SIN ejecutarlas (para una BD que ya las
 *                                    tenía aplicadas a mano; evita re-ejecutar
 *                                    ALTERs no reentrantes).
 *
 * Nota: `_all_supabase.sql` (bundle concatenado para el arranque manual de
 * Supabase) se ignora a propósito.
 */

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../db/init');

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('_'))
    .sort();
}

async function ensureTable(): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename    TEXT        PRIMARY KEY,
       applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
}

async function appliedSet(): Promise<Set<string>> {
  const { rows } = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  return new Set(rows.map((r) => r.filename));
}

async function baseline(): Promise<void> {
  await ensureTable();
  const files = migrationFiles();
  for (const file of files) {
    await pool.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
      [file],
    );
  }
  console.log(`[migrate] Baseline: ${files.length} migración(es) marcadas como aplicadas (sin ejecutar).`);
}

async function migrate(): Promise<void> {
  await ensureTable();
  const applied = await appliedSet();
  const pending = migrationFiles().filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('[migrate] Sin migraciones pendientes.');
    return;
  }

  for (const file of pending) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[migrate] ✓ ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[migrate] ✗ ${file}: ${(error as Error).message}`);
      throw error;
    } finally {
      client.release();
    }
  }
  console.log(`[migrate] ${pending.length} migración(es) aplicada(s).`);
}

const run = process.argv.includes('--baseline') ? baseline : migrate;

run()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[migrate] Error:', error);
    pool.end().finally(() => process.exit(1));
  });
