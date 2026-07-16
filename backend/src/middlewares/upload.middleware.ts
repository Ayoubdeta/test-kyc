import type { Request } from 'express';
import multer from 'multer';
import { ALLOWED_DOCUMENT_MIME } from '../config/constants';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

// Los ficheros se guardan en Supabase Storage (no en disco), así que multer
// mantiene el fichero en memoria (req.file.buffer) y el servicio se encarga de
// subirlo. Esto es lo adecuado para un entorno serverless, donde el disco es
// efímero/solo lectura.

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
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
}).single('file');
