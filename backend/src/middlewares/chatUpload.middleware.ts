import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request } from 'express';
import multer from 'multer';
import { ALLOWED_CHAT_MIMES } from '../config/constants';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { uploadDir } from './upload.middleware';

// Extensión por tipo MIME (no confiamos en el nombre que envía el cliente).
const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// Los adjuntos del chat se guardan en la carpeta del CLIENTE dueño del hilo,
// en un subdirectorio "chat". Para el personal el cliente viene en la ruta
// (:clientId); para el cliente, es su propio id (del token).
function conversationClientId(req: Request): string | null {
  return req.params.clientId ?? req.user?.sub ?? null;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const clientId = conversationClientId(req);
    if (!clientId) {
      cb(new AppError(400, 'Conversación no válida'), '');
      return;
    }
    const dir = path.join(uploadDir, clientId, 'chat');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(16).toString('hex');
    const ext = EXT_BY_MIME[file.mimetype] ?? 'bin';
    cb(null, `${unique}.${ext}`);
  },
});

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
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
}).single('file');
