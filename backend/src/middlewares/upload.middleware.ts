import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request } from 'express';
import multer from 'multer';
import { ALLOWED_DOCUMENT_MIME } from '../config/constants';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

// Nos aseguramos de que el directorio de subidas existe al arrancar.
const uploadDir = path.resolve(env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

// Guardado en disco con un nombre único (evita colisiones y no confía en el
// nombre que envía el cliente, que podría contener rutas maliciosas). Cada
// usuario tiene su propia carpeta dentro del volumen de subidas.
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // requireAuth se ejecuta antes que este middleware, así que req.user existe.
    // El id proviene del token (validado), no de datos del cliente.
    const userId = req.user?.sub;
    if (!userId) {
      cb(new AppError(401, 'No autenticado'), '');
      return;
    }
    const userDir = path.join(uploadDir, userId);
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (_req, _file, cb) => {
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${unique}.pdf`);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  // Solo PDF. La comprobación de MIME es una primera barrera (el cliente la
  // envía); el tamaño lo limita multer con "limits".
  if (file.mimetype !== ALLOWED_DOCUMENT_MIME) {
    cb(new AppError(400, 'Solo se admiten archivos PDF'));
    return;
  }
  cb(null, true);
}

export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
}).single('file');

export { uploadDir };
