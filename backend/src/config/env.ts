import dotenv from 'dotenv';
import { z } from 'zod';

// Carga el archivo .env si existe (ejecución local). En Docker las
// variables ya vienen del entorno, así que esto simplemente no encuentra
// ningún .env y no hace nada.
dotenv.config();

// Esquema de validación de la configuración. Validar al arrancar (fail-fast)
// evita que la app levante en un estado inconsistente por una variable mal
// puesta o ausente: preferimos un error claro al inicio que un fallo raro
// más tarde.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Conexión a PostgreSQL. Dos modos:
  //  - DATABASE_URL: cadena de conexión completa (Supabase / serverless). Tiene
  //    prioridad si está presente.
  //  - PGHOST/PGUSER/PGPASSWORD/PGDATABASE: modo clásico (Docker local).
  DATABASE_URL: z.string().min(1).optional(),
  PGHOST: z.string().min(1).optional(),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGUSER: z.string().min(1).optional(),
  PGPASSWORD: z.string().min(1).optional(),
  PGDATABASE: z.string().min(1).optional(),

  // Los secretos no tienen valor por defecto a propósito: si faltan, la app
  // no debe arrancar.
  JWT_ACCESS_SECRET: z.string().min(20, 'JWT_ACCESS_SECRET debe ser largo y aleatorio'),
  JWT_REFRESH_SECRET: z.string().min(20, 'JWT_REFRESH_SECRET debe ser largo y aleatorio'),
  ACCESS_TOKEN_TTL: z.string().min(1).default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  CORS_ORIGIN: z.string().url(),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  // Almacenamiento de ficheros en Supabase Storage (obligatorio en producción
  // serverless; opcional en local si no se suben ficheros).
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_BUCKET: z.string().min(1).default('kyc-files'),

  // Carpeta donde se guardaban los PDF en disco (se conserva por compatibilidad
  // local; en producción se usa Supabase Storage).
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  // Tamaño máximo por documento, en MB. En Vercel Hobby el payload por petición
  // está limitado a ~4,5 MB, por eso el valor por defecto para la demo es 4.
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(50).default(4),

  // Tiempo real del chat por SSE. En serverless no funciona (sin procesos
  // persistentes): poner 'false' en Vercel para que el chat use polling.
  ENABLE_SSE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  // Credenciales del administrador inicial (usadas por el script de seed).
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_USERNAME: z.string().min(3).optional(),
});

const parsed = envSchema
  .refine(
    (v) => Boolean(v.DATABASE_URL) || Boolean(v.PGHOST && v.PGUSER && v.PGPASSWORD && v.PGDATABASE),
    {
      message:
        'Configura la conexión a la base de datos: DATABASE_URL, o bien PGHOST/PGUSER/PGPASSWORD/PGDATABASE.',
      path: ['DATABASE_URL'],
    },
  )
  .safeParse(process.env);

if (!parsed.success) {
  // Mensaje legible con todas las variables que fallan.
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Configuración de entorno inválida:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;
