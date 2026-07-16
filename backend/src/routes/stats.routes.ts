import { Router } from 'express';
import { STAFF_ROLES } from '../config/constants';
import { statsController } from '../controllers/stats.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Solo personal interno (admin / compliance / dirección) ve las estadísticas.
router.use(requireAuth, requireRole(...STAFF_ROLES));

router.get('/overview', asyncHandler(statsController.overview));
router.get('/', asyncHandler(statsController.filtered));

export default router;
