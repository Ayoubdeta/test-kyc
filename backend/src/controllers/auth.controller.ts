import type { Request, Response } from 'express';
import { COOKIE_NAMES, LOG_ACTION, LOG_ENTITY } from '../config/constants';
import { authService } from '../services/auth.service';
import { logService } from '../services/activityLog.service';
import { AppError } from '../utils/AppError';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies';
import { getClientIp } from '../utils/requestContext';
import type { ActivateInput, LoginInput, RegisterInput } from '../validators/auth.validators';

// Los controladores solo traducen HTTP ↔ dominio: leen la petición, delegan
// en el service y responden. La lógica vive en el service.

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const input = req.body as RegisterInput;
    const { user, tokens } = await authService.register(input);
    setAuthCookies(res, tokens);
    res.status(201).json({ user });
  },

  async login(req: Request, res: Response): Promise<void> {
    const input = req.body as LoginInput;
    const ip = getClientIp(req);
    try {
      const { user, tokens } = await authService.login(input);
      setAuthCookies(res, tokens);
      void logService.record({
        actorId: user.id,
        actorRole: user.role,
        actorLabel: user.email,
        action: LOG_ACTION.AUTH_LOGIN,
        entityType: LOG_ENTITY.AUTH,
        entityId: user.id,
        description: `Inicio de sesión de ${user.email}`,
        ip,
      });
      res.status(200).json({ user });
    } catch (error) {
      // Registramos el intento fallido (seguridad) con el identificador probado,
      // sin filtrar la contraseña. Después dejamos que el error siga su curso.
      void logService.record({
        action: LOG_ACTION.AUTH_LOGIN_FAILED,
        actorLabel: input.identifier,
        entityType: LOG_ENTITY.AUTH,
        description: `Intento de inicio de sesión fallido (${input.identifier})`,
        metadata: { identifier: input.identifier },
        ip,
      });
      throw error;
    }
  },

  /** Info mínima para la pantalla de activación (a quién pertenece el enlace). */
  async activationInfo(req: Request, res: Response): Promise<void> {
    const info = await authService.getActivationInfo(req.params.token);
    res.status(200).json(info);
  },

  /** Activa la cuenta del cliente y lo deja autenticado. */
  async activate(req: Request, res: Response): Promise<void> {
    const input = req.body as ActivateInput;
    const { user, tokens } = await authService.activate(input);
    setAuthCookies(res, tokens);
    void logService.record({
      actorId: user.id,
      actorRole: user.role,
      actorLabel: user.email,
      action: LOG_ACTION.AUTH_ACTIVATE,
      entityType: LOG_ENTITY.USER,
      entityId: user.id,
      description: `El cliente ${user.email} activó su cuenta`,
      ip: getClientIp(req),
    });
    res.status(200).json({ user });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] as string | undefined;
    if (!refreshToken) {
      throw AppError.unauthorized('No hay sesión que renovar');
    }
    const tokens = await authService.refresh(refreshToken);
    setAuthCookies(res, tokens);
    res.status(200).json({ success: true });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] as string | undefined;
    await authService.logout(refreshToken);
    clearAuthCookies(res);
    // La ruta de logout no exige sesión válida (permite cerrar con token
    // caducado), así que el actor puede no estar disponible: registramos
    // best-effort con lo que haya.
    void logService.record({
      actorId: req.user?.sub ?? null,
      actorRole: req.user?.role ?? null,
      actorLabel: req.user?.email ?? null,
      action: LOG_ACTION.AUTH_LOGOUT,
      entityType: LOG_ENTITY.AUTH,
      description: 'Cierre de sesión',
      ip: getClientIp(req),
    });
    res.status(200).json({ success: true });
  },
};
