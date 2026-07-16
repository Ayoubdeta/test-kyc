import { z } from 'zod';
import { addressField, birthDateField, fullNameField, phoneField } from './auth';

// Validación del formulario de edición de perfil. Reutiliza las mismas piezas
// que el registro (DRY).
export const profileSchema = z.object({
  fullName: fullNameField,
  phone: phoneField,
  address: addressField,
  birthDate: birthDateField,
  bio: z.string().trim().max(500, 'Máximo 500 caracteres'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
