// Crea usuarios de demo (uno por rol) de forma idempotente.
// Uso (desde backend/):  node seed-demo-users.mjs
import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { DATABASE_URL } = process.env;
const ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
if (!DATABASE_URL) {
  console.error('Falta DATABASE_URL en backend/.env');
  process.exit(1);
}

// Usuarios de demo. El cliente queda ACTIVADO (con contraseña) y con expediente.
const USERS = [
  { email: 'ana@test.com',        username: 'ana',        role: 'compliance', fullName: 'Ana Compliance',   password: 'Ana_Demo_2026' },
  { email: 'direccion@test.com',  username: 'direccion',  role: 'direccion',  fullName: 'Dirección General', password: 'Direccion_Demo_2026' },
  { email: 'juan@test.com',       username: 'juan',       role: 'cliente',    fullName: 'Juan Cliente',     password: 'Juan_Demo_2026',
    razonSocial: 'Empresa Demo S.L.', cif: 'B00000000' },
];

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function upsertUser(u) {
  const existing = await client.query('SELECT id, role FROM users WHERE email = $1 OR username = $2 LIMIT 1', [u.email, u.username]);
  if (existing.rows[0]) {
    console.log(`• ${u.email} ya existe (rol ${existing.rows[0].role}). Se omite.`);
    return;
  }
  const hash = await bcrypt.hash(u.password, ROUNDS);
  await client.query('BEGIN');
  try {
    const res = await client.query(
      `INSERT INTO users (username, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id`,
      [u.username, u.email, hash, u.role],
    );
    const id = res.rows[0].id;
    await client.query(`INSERT INTO profiles (user_id, full_name) VALUES ($1,$2)`, [id, u.fullName]);
    if (u.role === 'cliente') {
      await client.query(
        `INSERT INTO client_profiles (user_id, client_type, razon_social, cif, expediente_status, privacy_accepted_at, terms_accepted_at)
         VALUES ($1, 'empresa', $2, $3, 'activo', now(), now())`,
        [id, u.razonSocial, u.cif],
      );
    }
    await client.query('COMMIT');
    console.log(`✓ Creado ${u.email}  (rol ${u.role})`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

async function main() {
  await client.connect();
  for (const u of USERS) await upsertUser(u);
  await client.end();
  console.log('\n✔ Usuarios de demo listos.');
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
