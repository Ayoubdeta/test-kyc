import { Router } from 'express';
import { ROLES } from '../config/constants';
import { logController } from '../controllers/log.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// El log de auditoría es sensible: SOLO el administrador puede consultarlo.
router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get('/', asyncHandler(logController.list));

export default router;
