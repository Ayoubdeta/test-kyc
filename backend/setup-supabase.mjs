// Script de configuración inicial de Supabase para la demo KYC.
//
// Lee backend/.env y realiza, de forma idempotente:
//   1. Ejecuta todas las migraciones (db/init/_all_supabase.sql).
//   2. Crea el bucket privado de Storage (SUPABASE_BUCKET, def. "kyc-files").
//
// El usuario administrador se crea aparte con:  npm run seed:admin
//
// Uso (desde la carpeta backend/):  node setup-supabase.mjs
//
// NOTA: no imprime secretos por consola.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const BUCKET = process.env.SUPABASE_BUCKET || 'kyc-files';

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

if (!DATABASE_URL) fail('Falta DATABASE_URL en backend/.env');
if (!SUPABASE_URL) fail('Falta SUPABASE_URL en backend/.env');
if (!SUPABASE_SERVICE_ROLE_KEY) fail('Falta SUPABASE_SERVICE_ROLE_KEY en backend/.env');

const sqlPath = fileURLToPath(new URL('../db/init/_all_supabase.sql', import.meta.url));

async function runMigrations() {
  const sql = readFileSync(sqlPath, 'utf8');
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('• Conectado a PostgreSQL. Ejecutando migraciones...');
  try {
    await client.query(sql); // el fichero es idempotente; múltiples sentencias en una query.
    console.log('✓ Migraciones aplicadas.');
  } finally {
    await client.end();
  }
}

async function createBucket() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (error) {
    if (/already exists/i.test(error.message)) {
      console.log(`✓ El bucket "${BUCKET}" ya existía.`);
      return;
    }
    fail(`No se pudo crear el bucket "${BUCKET}": ${error.message}`);
  }
  console.log(`✓ Bucket privado "${data?.name ?? BUCKET}" creado.`);
}

async function main() {
  await runMigrations();
  await createBucket();
  console.log('\n✔ Supabase listo. Ahora crea el admin con:  npm run seed:admin');
}

main().catch((e) => fail(e.message));
