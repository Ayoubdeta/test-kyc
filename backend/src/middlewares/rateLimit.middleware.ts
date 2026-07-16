import rateLimit from 'express-rate-limit';
import { RATE_LIMIT } from '../config/constants';

// Límite general para toda la API.
export const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, inténtalo más tarde' },
});

// Límite estricto para endpoints sensibles (login/register): mitiga ataques
// de fuerza bruta sobre las credenciales.
export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  max: RATE_LIMIT.AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, espera unos minutos' },
});
