import type { Request } from 'express';
import multer from 'multer';
import { ALLOWED_CHAT_MIMES } from '../config/constants';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

// Extensión por tipo MIME (no confiamos en el nombre que envía el cliente).
// La exporta el controlador para construir la clave del adjunto en Storage.
export const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// Los adjuntos del chat se guardan en Supabase Storage (no en disco): multer
// los mantiene en memoria (req.file.buffer) y el controlador los sube con una
// clave "<clientId>/chat/<random>.<ext>".

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (!(ALLOWED_CHAT_MIMES as readonly string[]).includes(file.mimetype)) {
    cb(new AppError(400, 'Adjunto no admitido (solo PDF, PNG, JPG o WEBP)'));
    return;
  }
  cb(null, true);
}

// Adjunto opcional: los mensajes pueden ser solo texto, solo adjunto o ambos.
export const uploadChatAttachment = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
}).single('file');
