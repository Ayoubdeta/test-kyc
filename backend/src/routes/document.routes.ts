import express, { Router } from 'express';
import { ROLES, STAFF_ROLES, REVIEW_ROLES, APPROVAL_ROLES } from '../config/constants';
import { documentController } from '../controllers/document.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { uploadDocument } from '../middlewares/upload.middleware';
import { validateBody, validateParamUuid } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { decisionSchema, reviewSchema } from '../validators/document.validators';

const router = Router();

// Todas requieren autenticación.
router.use(requireAuth);

// ─── Cliente ───────────────────────────────────────────────────
// Subir un PDF (solo clientes).
router.post(
  '/',
  requireRole(ROLES.CLIENTE),
  uploadDocument,
  asyncHandler(documentController.upload),
);

// Ver mis propios documentos (solo clientes).
router.get('/mine', requireRole(ROLES.CLIENTE), asyncHandler(documentController.listMine));

// Historial de eventos de mis documentos (solo clientes).
router.get('/history', requireRole(ROLES.CLIENTE), asyncHandler(documentController.history));

// ─── Personal interno (admin / compliance / dirección) ─────────
// Listar todos los documentos subidos (ver por usuario).
router.get('/', requireRole(...STAFF_ROLES), asyncHandler(documentController.listAll));

// Documentos e historial de un usuario concreto (admin, panel de usuarios).
router.get(
  '/user/:id',
  requireRole(ROLES.ADMIN),
  validateParamUuid('id'),
  asyncHandler(documentController.listUserDocuments),
);
router.get(
  '/user/:id/history',
  requireRole(ROLES.ADMIN),
  validateParamUuid('id'),
  asyncHandler(documentController.userHistory),
);

// Compliance/admin abren un documento para revisarlo (pendiente → en revisión).
router.patch(
  '/:id/start-review',
  requireRole(...REVIEW_ROLES),
  validateParamUuid('id'),
  asyncHandler(documentController.startReview),
);

// Decisión de compliance/admin sobre un documento en revisión.
router.patch(
  '/:id/review',
  requireRole(...REVIEW_ROLES),
  validateParamUuid('id'),
  express.json({ limit: '10kb' }),
  validateBody(reviewSchema),
  asyncHandler(documentController.review),
);

// Decisión final de Dirección General (aprobar / rechazar).
router.patch(
  '/:id/decision',
  requireRole(...APPROVAL_ROLES),
  validateParamUuid('id'),
  express.json({ limit: '10kb' }),
  validateBody(decisionSchema),
  asyncHandler(documentController.decide),
);

// ─── Descarga (propietario o personal; la autorización fina va en el service) ──
router.get('/:id/download', validateParamUuid('id'), asyncHandler(documentController.download));

export default router;
