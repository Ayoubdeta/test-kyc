import express, { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimit.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { activateSchema, loginSchema } from '../validators/auth.validators';

const router = Router();

// Cuerpos JSON pequeños: los datos de auth nunca ocupan mucho.
router.use(express.json({ limit: '10kb' }));

// El auto-registro de clientes está deshabilitado: las cuentas las crea el
// personal interno (POST /users/clients). El cliente solo activa la suya.

// Rate limiting estricto en autenticación para frenar fuerza bruta.
router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login),
);

// Activación de cuenta del cliente mediante el token del enlace de invitación.
router.get('/activate/:token', asyncHandler(authController.activationInfo));
router.post(
  '/activate',
  authLimiter,
  validateBody(activateSchema),
  asyncHandler(authController.activate),
);

router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));

export default router;
