import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/** 404 para cualquier ruta no encontrada. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

/**
 * Manejador de errores centralizado. Traduce cualquier error en una respuesta
 * JSON coherente. Los AppError (esperados) exponen su mensaje; el resto se
 * tratan como 500 y NO se filtran al cliente (solo se registran).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // Express identifica el error handler por su aridad de 4 argumentos:
  // "next" debe existir aunque no se use.
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Errores de subida de ficheros (multer): tamaño, número, etc.
  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el tamaño máximo permitido'
        : 'Error al subir el archivo';
    res.status(413).json({ error: message });
    return;
  }

  // Error inesperado: lo registramos completo, pero al cliente solo un mensaje genérico.
  console.error('[error] No controlado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(env.NODE_ENV === 'development' && err instanceof Error
      ? { debug: err.message }
      : {}),
  });
}
