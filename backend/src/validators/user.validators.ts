import { z } from 'zod';
import { CLIENT_TYPE, ROLES, SUPPORTED_LANGUAGES } from '../config/constants';
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

// Roles de personal interno que el admin puede dar de alta (nunca 'cliente':
// el cliente se crea con el flujo de expediente, no aquí).
const staffRoleField = z.enum([ROLES.ADMIN, ROLES.COMPLIANCE, ROLES.DIRECCION]);

// Alta de un usuario interno (compliance/dirección/admin) por parte del admin.
// No lleva expediente; recibe el acceso por enlace de activación como el cliente.
export const createStaffSchema = z.object({
  fullName: z.string().trim().min(2, 'Mínimo 2 caracteres').max(150),
  email: emailField,
  role: staffRoleField,
});

// Alta de un cliente por el personal interno (información mínima del expediente).
export const createClientSchema = z.object({
  razonSocial: z.string().trim().min(2, 'Mínimo 2 caracteres').max(150),
  cif: z.string().trim().min(1, 'CIF / NIF requerido').max(20),
  clientType: z.enum([CLIENT_TYPE.EMPRESA, CLIENT_TYPE.AUTONOMO, CLIENT_TYPE.PARTICULAR]),
  comercialAsignado: z.string().trim().max(120).optional().or(z.literal('')),
  email: emailField,
});

// Preferencia de idioma del usuario autenticado (i18n).
export const languageSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type LanguageInput = z.infer<typeof languageSchema>;
