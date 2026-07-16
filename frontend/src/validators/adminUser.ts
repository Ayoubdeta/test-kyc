import { z } from 'zod';
import { addressField, birthDateField, fullNameField, phoneField } from './auth';

// Edición de usuario por el admin (cuenta + perfil + rol).
export const adminUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Mínimo 3 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guion bajo'),
  email: z.string().trim().email('Email inválido'),
  role: z.enum(['admin', 'cliente', 'compliance', 'direccion']),
  fullName: fullNameField,
  phone: phoneField,
  address: addressField,
  birthDate: birthDateField,
  bio: z.string().trim().max(500, 'Máximo 500 caracteres'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[a-z]/, 'Incluye una minúscula')
    .regex(/[A-Z]/, 'Incluye una mayúscula')
    .regex(/[0-9]/, 'Incluye un número'),
});

export type AdminUserFormValues = z.infer<typeof adminUserSchema>;
