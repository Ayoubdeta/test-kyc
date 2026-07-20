import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateParamUuid } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(notificationController.list));
router.get('/unread-count', asyncHandler(notificationController.unreadCount));
router.post('/read-all', asyncHandler(notificationController.markAllRead));
router.delete('/:id', validateParamUuid('id'), asyncHandler(notificationController.remove));

export default router;
