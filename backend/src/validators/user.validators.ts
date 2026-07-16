import { z } from 'zod';
import { CLIENT_TYPE, ROLES } from '../config/constants';
import { emailField, passwordField, usernameField } from './auth.validators';
import {
  addressField,
  bioField,
  birthDateField,
  fullNameField,
  phoneField,
} from './profile.validators';

// Enum con los literales de rol (conserva el tipo union = Role).
const roleField = z.enum([ROLES.ADMIN, ROLES.CLIENTE, ROLES.COMPLIANCE, ROLES.DIRECCION]);

// Edición completa de un usuario por parte del admin: cuenta + perfil + rol.
export const adminUpdateUserSchema = z.object({
  username: usernameField,
  email: emailField,
  role: roleField,
  fullName: fullNameField,
  phone: phoneField,
  address: addressField,
  birthDate: birthDateField,
  bio: bioField.optional().or(z.literal('')),
});

// Restablecimiento de contraseña por el admin.
export const resetPasswordSchema = z.object({
  password: passwordField,
});

// Alta de un cliente por el personal interno (información mínima del expediente).
export const createClientSchema = z.object({
  razonSocial: z.string().trim().min(2, 'Mínimo 2 caracteres').max(150),
  cif: z.string().trim().min(1, 'CIF / NIF requerido').max(20),
  clientType: z.enum([CLIENT_TYPE.EMPRESA, CLIENT_TYPE.AUTONOMO, CLIENT_TYPE.PARTICULAR]),
  comercialAsignado: z.string().trim().max(120).optional().or(z.literal('')),
  email: emailField,
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
