import express, { Router } from 'express';
import { ROLES } from '../config/constants';
import { userController } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateBody, validateParamUuid } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { updateProfileSchema } from '../validators/profile.validators';
import {
  adminUpdateUserSchema,
  createClientSchema,
  createStaffSchema,
  languageSchema,
  resetPasswordSchema,
  themeSchema,
} from '../validators/user.validators';

const router = Router();

// Todas las rutas de este router requieren estar autenticado.
router.use(requireAuth);

router.get('/me', asyncHandler(userController.me));

// La actualización del propio perfil puede incluir una foto en Base64, que
// ocupa bastante más que el resto de peticiones: le damos un límite de body
// propio y mayor, sin relajar el límite global (más estricto) del resto.
router.patch(
  '/me/profile',
  express.json({ limit: '2mb' }),
  validateBody(updateProfileSchema),
  asyncHandler(userController.updateProfile),
);

// Preferencia de idioma (i18n): cuerpo pequeño; disponible aunque el perfil
// no esté completo (por eso es un endpoint aparte de /me/profile).
router.patch(
  '/me/language',
  express.json({ limit: '1kb' }),
  validateBody(languageSchema),
  asyncHandler(userController.setLanguage),
);

// Preferencia de tema (claro / oscuro / automático). Cuerpo pequeño.
router.patch(
  '/me/theme',
  express.json({ limit: '1kb' }),
  validateBody(themeSchema),
  asyncHandler(userController.setTheme),
);

// ─── Administración de usuarios (solo admin) ───────────────────
const jsonSmall = express.json({ limit: '10kb' });

router.get('/', requireRole(ROLES.ADMIN), asyncHandler(userController.list));

// Alta de un cliente (crea la cuenta + expediente y devuelve el token de activación).
router.post(
  '/clients',
  requireRole(ROLES.ADMIN),
  jsonSmall,
  validateBody(createClientSchema),
  asyncHandler(userController.createClient),
);

// Alta de un usuario interno (compliance/dirección/admin) por enlace de activación.
router.post(
  '/staff',
  requireRole(ROLES.ADMIN),
  jsonSmall,
  validateBody(createStaffSchema),
  asyncHandler(userController.createStaff),
);

router.get(
  '/:id',
  requireRole(ROLES.ADMIN),
  validateParamUuid('id'),
  asyncHandler(userController.getById),
);

// Edición completa (cuenta + perfil + rol).
router.patch(
  '/:id',
  requireRole(ROLES.ADMIN),
  validateParamUuid('id'),
  jsonSmall,
  validateBody(adminUpdateUserSchema),
  asyncHandler(userController.adminUpdate),
);

// Restablecer contraseña.
router.post(
  '/:id/reset-password',
  requireRole(ROLES.ADMIN),
  validateParamUuid('id'),
  jsonSmall,
  validateBody(resetPasswordSchema),
  asyncHandler(userController.resetPassword),
);

// Eliminar usuario.
router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  validateParamUuid('id'),
  asyncHandler(userController.remove),
);

export default router;
