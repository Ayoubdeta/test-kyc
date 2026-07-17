import { z } from 'zod';

// Piezas reutilizables de credenciales (edición admin, activación, etc.).
export const usernameField = z
  .string()
  .trim()
  .min(3, 'El usuario debe tener al menos 3 caracteres')
  .max(50, 'El usuario no puede superar 50 caracteres')
  .regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guion bajo');

export const emailField = z.string().trim().toLowerCase().email('Email inválido').max(255);

export const passwordField = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres') // límite de bcrypt
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

// Esquemas de validación de entrada. La validación en servidor es la única
// en la que se puede confiar (el cliente valida también, pero por UX).

export const loginSchema = z.object({
  // Se acepta iniciar sesión con email o con username, en un único campo.
  identifier: z.string().trim().min(1, 'Introduce tu usuario o email'),
  password: z.string().min(1, 'Introduce tu contraseña'),
});

// Activación de la cuenta del cliente: fija la contraseña y acepta las políticas.
export const activateSchema = z.object({
  token: z.string().min(1, 'Token de activación requerido'),
  password: passwordField,
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar la Política de Privacidad' }),
  }),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los Términos y Condiciones' }),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ActivateInput = z.infer<typeof activateSchema>;
