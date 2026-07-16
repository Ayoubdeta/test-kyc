import { z } from 'zod';

// Piezas de validación reutilizables (compartidas por el registro y la
// edición de perfil) para no duplicar reglas.

export const fullNameField = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(150, 'Máximo 150 caracteres');

export const phoneField = z
  .string()
  .trim()
  .min(6, 'Teléfono demasiado corto')
  .max(30, 'Teléfono demasiado largo')
  .regex(/^[+()\-\s0-9]+$/, 'El teléfono solo puede contener números y + ( ) - espacios');

export const addressField = z
  .string()
  .trim()
  .min(5, 'La dirección debe tener al menos 5 caracteres')
  .max(255, 'Máximo 255 caracteres');

// Fecha en formato YYYY-MM-DD, real, no futura y a partir de 1900.
export const birthDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return false;
    const year = date.getUTCFullYear();
    const now = new Date();
    return date <= now && year >= 1900;
  }, 'La fecha de nacimiento no es válida');

export const bioField = z.string().trim().max(500, 'Máximo 500 caracteres');

// Avatar como data URL de imagen (Base64). Acotamos el tamaño para evitar
// que un cliente suba imágenes enormes a la base de datos.
const MAX_AVATAR_CHARS = 1_500_000; // ~1.1 MB de imagen tras compresión
export const avatarField = z
  .string()
  .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/, 'Formato de imagen no válido')
  .max(MAX_AVATAR_CHARS, 'La imagen es demasiado grande');

// Esquema de actualización de perfil. Los datos principales son obligatorios
// (no permitimos dejarlos en blanco una vez creados); bio y avatar opcionales.
export const updateProfileSchema = z.object({
  fullName: fullNameField,
  phone: phoneField,
  address: addressField,
  birthDate: birthDateField,
  bio: bioField.optional().or(z.literal('')),
  // avatarUrl: enviar el data URL para fijar/cambiar la foto, o null para quitarla.
  avatarUrl: avatarField.nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
