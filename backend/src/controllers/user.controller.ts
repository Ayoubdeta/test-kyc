import type { Request, Response } from 'express';
import { LOG_ACTION, LOG_ENTITY } from '../config/constants';
import { logService } from '../services/activityLog.service';
import { userService } from '../services/user.service';
import { AppError } from '../utils/AppError';
import { actorFromReq } from '../utils/requestContext';
import type { UpdateProfileInput } from '../validators/profile.validators';
import type {
  AdminUpdateUserInput,
  CreateClientInput,
  LanguageInput,
  ResetPasswordInput,
} from '../validators/user.validators';

export const userController = {
  /** Devuelve los datos del usuario autenticado (usuario + perfil). */
  async me(req: Request, res: Response): Promise<void> {
    // requireAuth garantiza que req.user existe; esta comprobación es por tipos.
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    const data = await userService.getMe(req.user.sub);
    res.status(200).json(data);
  },

  /** Actualiza el perfil del usuario autenticado. */
  async updateProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    const input = req.body as UpdateProfileInput;
    const profile = await userService.updateProfile(req.user.sub, input);
    res.status(200).json({ profile });
  },

  /** Guarda la preferencia de idioma del usuario autenticado (i18n). */
  async setLanguage(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    const { language } = req.body as LanguageInput;
    await userService.setLanguage(req.user.sub, language);
    res.status(200).json({ language });
  },

  /** Lista de usuarios (solo admin). */
  async list(_req: Request, res: Response): Promise<void> {
    const users = await userService.listUsers();
    res.status(200).json({ users });
  },

  /** Alta de un cliente por el personal interno (solo admin). */
  async createClient(req: Request, res: Response): Promise<void> {
    const input = req.body as CreateClientInput;
    const { user, activationToken } = await userService.createClient(input);
    const actor = actorFromReq(req);
    void logService.record({
      ...actor,
      action: LOG_ACTION.CLIENT_CREATED,
      entityType: LOG_ENTITY.USER,
      entityId: user.id,
      description: `Alta de cliente "${input.razonSocial}" (${user.email})`,
      metadata: { razonSocial: input.razonSocial, cif: input.cif, clientType: input.clientType },
    });
    res.status(201).json({ user, activationToken });
  },

  /** Datos de un usuario concreto, incl. perfil (solo admin). */
  async getById(req: Request, res: Response): Promise<void> {
    const data = await userService.getMe(req.params.id);
    res.status(200).json(data);
  },

  /** Edición completa de un usuario (solo admin). */
  async adminUpdate(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    const input = req.body as AdminUpdateUserInput;
    const data = await userService.adminUpdateUser(req.user.sub, req.params.id, input);
    void logService.record({
      ...actorFromReq(req),
      action: LOG_ACTION.USER_UPDATED,
      entityType: LOG_ENTITY.USER,
      entityId: req.params.id,
      description: `Edición del usuario ${data.user.email}`,
      metadata: { role: input.role },
    });
    res.status(200).json(data);
  },

  /** Restablecer la contraseña de un usuario (solo admin). */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const { password } = req.body as ResetPasswordInput;
    await userService.resetPassword(req.params.id, password);
    void logService.record({
      ...actorFromReq(req),
      action: LOG_ACTION.USER_PASSWORD_RESET,
      entityType: LOG_ENTITY.USER,
      entityId: req.params.id,
      description: `Restablecimiento de contraseña del usuario ${req.params.id}`,
    });
    res.status(200).json({ success: true });
  },

  /** Eliminar un usuario (solo admin). */
  async remove(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw AppError.unauthorized('No autenticado');
    }
    await userService.deleteUser(req.user.sub, req.params.id);
    void logService.record({
      ...actorFromReq(req),
      action: LOG_ACTION.USER_DELETED,
      entityType: LOG_ENTITY.USER,
      entityId: req.params.id,
      description: `Eliminación del usuario ${req.params.id}`,
    });
    res.status(200).json({ success: true });
  },
};
