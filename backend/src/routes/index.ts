import { Router } from 'express';
import { query } from '../database/pool';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import documentRoutes from './document.routes';
import logRoutes from './log.routes';
import notificationRoutes from './notification.routes';
import reportRoutes from './report.routes';
import statsRoutes from './stats.routes';
import userRoutes from './user.routes';

const router = Router();

// Healthcheck: comprueba también la conexión a la BD (SELECT 1). Si la BD no
// responde, devuelve 503 para que un monitor externo no lo vea "verde" con la
// base caída. Útil además como ping para evitar la pausa por inactividad.
router.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
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
