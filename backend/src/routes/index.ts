import { Router } from 'express';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import documentRoutes from './document.routes';
import logRoutes from './log.routes';
import notificationRoutes from './notification.routes';
import reportRoutes from './report.routes';
import statsRoutes from './stats.routes';
import userRoutes from './user.routes';

const router = Router();

// Healthcheck sencillo (útil para Docker / monitorización).
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/stats', statsRoutes);
router.use('/chat', chatRoutes);
router.use('/reports', reportRoutes);
router.use('/logs', logRoutes);

export default router;
