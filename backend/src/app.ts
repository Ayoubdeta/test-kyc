import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { apiLimiter } from './middlewares/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import routes from './routes';

export function createApp() {
  const app = express();

  // El orden de los middlewares importa: seguridad y parseo primero, luego
  // rate limiting, después las rutas y, al final, el manejo de errores.

  // Cabeceras de seguridad (CSP básica, X-Content-Type-Options, etc.).
  app.use(helmet());

  // CORS con allowlist explícita y credenciales (necesario para enviar cookies).
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // El parseo de JSON se hace a nivel de cada router, con el límite adecuado
  // (la mayoría de endpoints usan un límite pequeño; solo la edición de perfil,
  // que admite una foto en Base64, usa uno mayor). Así no relajamos el límite
  // de forma global.
  app.use(cookieParser());

  // Rate limiting general de la API.
  app.use('/api', apiLimiter);

  // Rutas de la API (versionadas bajo /api).
  app.use('/api', routes);

  // 404 y manejador de errores al final de la cadena.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
