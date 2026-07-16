import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/**
 * Almacenamiento de ficheros en Supabase Storage.
 *
 * En un entorno serverless (Vercel) el disco es efímero/solo lectura, así que
 * los PDFs de documentos y los adjuntos del chat se guardan en un bucket
 * PRIVADO de Supabase Storage. Persistimos en la BD la "clave" (ruta relativa
 * dentro del bucket, p. ej. "<userId>/<random>.pdf") en la columna que antes
 * guardaba la ruta en disco (`stored_name` / `attachment_stored`).
 *
 * El cliente usa la SERVICE ROLE key: solo se instancia en el servidor y
 * permite subir/descargar/borrar saltándose las políticas RLS del bucket.
 */

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase Storage no está configurado: faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function bucket() {
  return getClient().storage.from(env.SUPABASE_BUCKET);
}

export const fileStorage = {
  /** Sube un buffer con su tipo MIME. `upsert` permite reemplazar por la misma clave. */
  async uploadBuffer(key: string, buffer: Buffer, mime: string): Promise<void> {
    const { error } = await bucket().upload(key, buffer, {
      contentType: mime,
      upsert: true,
    });
    if (error) {
      throw new Error(`No se pudo subir el archivo a Storage: ${error.message}`);
    }
  },

  /** Descarga una clave como Buffer. Devuelve null si no existe. */
  async downloadBuffer(key: string): Promise<Buffer | null> {
    const { data, error } = await bucket().download(key);
    if (error || !data) return null;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  },

  /** Borra una clave (best-effort: registra el error pero no rompe el flujo). */
  async remove(key: string): Promise<void> {
    const { error } = await bucket().remove([key]);
    if (error) {
      console.error(`[storage] No se pudo borrar "${key}":`, error.message);
    }
  },
};
