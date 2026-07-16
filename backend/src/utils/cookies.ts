import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';
import { COOKIE_NAMES, REFRESH_COOKIE_PATH } from '../config/constants';
import type { IssuedTokens } from '../services/auth.service';

// Gestión centralizada de las cookies de sesión. Ambas son HttpOnly (no
// accesibles desde JavaScript → mitiga el robo por XSS) y SameSite=Lax
// (mitiga CSRF). "Secure" se activa por entorno (true en producción/HTTPS).

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
  };
}

export function setAuthCookies(res: Response, tokens: IssuedTokens): void {
  // La cookie del access token vive en todo el sitio y expira pronto.
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, {
    ...baseCookieOptions(),
    path: '/',
    // maxAge en ms: lo dejamos en manos del propio JWT (verificamos su exp),
    // pero damos a la cookie una vida acorde para no dejarla colgada.
    maxAge: 60 * 60 * 1000, // 1 hora como cota superior de la cookie
  });

  // La cookie del refresh token solo se envía a las rutas /api/auth.
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    expires: tokens.refreshExpiresAt,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { ...baseCookieOptions(), path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
  });
}
