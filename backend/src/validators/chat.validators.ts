import { z } from 'zod';
import { CHAT_MESSAGE_MAX } from '../config/constants';

// Cuerpo de un mensaje de chat: texto no vacío, longitud acotada.
export const chatMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'El mensaje no puede estar vacío')
    .max(CHAT_MESSAGE_MAX, `Máximo ${CHAT_MESSAGE_MAX} caracteres`),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

// Edición: mismo cuerpo que un mensaje normal.
export const editMessageSchema = chatMessageSchema;
export type EditMessageInput = z.infer<typeof editMessageSchema>;

// Reacción: un emoji (cadena corta). Acotamos longitud para no abusar.
export const reactSchema = z.object({
  emoji: z.string().trim().min(1, 'Emoji requerido').max(16, 'Emoji no válido'),
});
export type ReactInput = z.infer<typeof reactSchema>;
