import { z } from 'zod';

// Validación en cliente (por UX / feedback inmediato). El servidor valida de
// nuevo con reglas equivalentes: la validación de servidor es la única en la
// que se confía por seguridad.

// ─── Piezas de perfil reutilizables (registro y edición) ──────────
export const fullNameField = z
  .string()
  .trim()
  .min(2, 'Mínimo 2 caracteres')
  .max(150, 'Máximo 150 caracteres');

export const phoneField = z
  .string()
  .trim()
  .min(6, 'Teléfono demasiado corto')
  .max(30, 'Teléfono demasiado largo')
  .regex(/^[+()\-\s0-9]+$/, 'Solo números y + ( ) - espacios');

export const addressField = z
  .string()
  .trim()
  .min(5, 'Mínimo 5 caracteres')
  .max(255, 'Máximo 255 caracteres');

export const birthDateField = z
  .string()
  .min(1, 'Introduce tu fecha de nacimiento')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return false;
    return date <= new Date() && date.getUTCFullYear() >= 1900;
  }, 'La fecha no es válida');

// ─── Registro ─────────────────────────────────────────────────────
export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Mínimo 3 caracteres')
      .max(50, 'Máximo 50 caracteres')
      .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guion bajo'),
    fullName: fullNameField,
    email: z.string().trim().email('Email inválido'),
    phone: phoneField,
    address: addressField,
    birthDate: birthDateField,
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[a-z]/, 'Incluye una minúscula')
      .regex(/[A-Z]/, 'Incluye una mayúscula')
      .regex(/[0-9]/, 'Incluye un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

// ─── Login ────────────────────────────────────────────────────────
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Introduce tu usuario o email'),
  password: z.string().min(1, 'Introduce tu contraseña'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
