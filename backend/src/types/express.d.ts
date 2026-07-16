import type { AccessTokenPayload } from './index';

// Aumenta el tipo Request de Express para exponer el usuario autenticado
// que inyecta el middleware de autenticación. Así el resto del código
// accede a req.user con tipos, sin castings.
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
