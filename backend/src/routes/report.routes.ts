import { Router } from 'express';
import { STAFF_ROLES } from '../config/constants';
import { reportController } from '../controllers/report.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Los informes son para el personal interno (admin / compliance / dirección).
router.use(requireAuth, requireRole(...STAFF_ROLES));

// Informe detallado de documentos (modular: se filtra por query params).
router.get('/documents', asyncHandler(reportController.documents));

export default router;
