import express, { Router } from 'express';
import { REVIEW_ROLES, ROLES } from '../config/constants';
import { chatController } from '../controllers/chat.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { uploadChatAttachment } from '../middlewares/chatUpload.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateBody, validateParamUuid } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { editMessageSchema, reactSchema } from '../validators/chat.validators';

const router = Router();
const jsonBody = express.json({ limit: '10kb' });

router.use(requireAuth);

// ─── Tiempo real (SSE) ─────────────────────────────────────────
// Cualquier usuario autenticado abre su stream; el filtrado por conversación
// se hace en el controlador según el rol.
// stream es síncrono (mantiene la conexión abierta); Express captura los
// throws síncronos, así que no necesita asyncHandler.
router.get('/stream', chatController.stream);

// ─── Cliente ───────────────────────────────────────────────────
router.get('/me', requireRole(ROLES.CLIENTE), asyncHandler(chatController.myMessages));
router.get('/me/unread', requireRole(ROLES.CLIENTE), asyncHandler(chatController.myUnread));
// Envío del cliente: multipart (texto y/o adjunto). multer parsea los campos.
router.post(
  '/me',
  requireRole(ROLES.CLIENTE),
  uploadChatAttachment,
  asyncHandler(chatController.sendMine),
);
router.post('/me/typing', requireRole(ROLES.CLIENTE), asyncHandler(chatController.typingMine));

// ─── Personal (compliance/admin) ───────────────────────────────
router.get('/conversations', requireRole(...REVIEW_ROLES), asyncHandler(chatController.conversations));
router.get(
  '/conversations/unread',
  requireRole(...REVIEW_ROLES),
  asyncHandler(chatController.staffUnread),
);
router.get(
  '/conversations/:clientId',
  requireRole(...REVIEW_ROLES),
  validateParamUuid('clientId'),
  asyncHandler(chatController.conversationMessages),
);
router.post(
  '/conversations/:clientId',
  requireRole(...REVIEW_ROLES),
  validateParamUuid('clientId'),
  uploadChatAttachment,
  asyncHandler(chatController.sendToClient),
);
router.post(
  '/conversations/:clientId/typing',
  requireRole(...REVIEW_ROLES),
  validateParamUuid('clientId'),
  asyncHandler(chatController.typingToClient),
);

// ─── Acciones sobre un mensaje (cliente o personal participante) ─
const anyChatRole = [ROLES.CLIENTE, ...REVIEW_ROLES];

router.get(
  '/attachments/:id',
  requireRole(...anyChatRole),
  validateParamUuid('id'),
  asyncHandler(chatController.downloadAttachment),
);
router.patch(
  '/messages/:id',
  requireRole(...anyChatRole),
  validateParamUuid('id'),
  jsonBody,
  validateBody(editMessageSchema),
  asyncHandler(chatController.edit),
);
router.delete(
  '/messages/:id',
  requireRole(...anyChatRole),
  validateParamUuid('id'),
  asyncHandler(chatController.remove),
);
router.post(
  '/messages/:id/react',
  requireRole(...anyChatRole),
  validateParamUuid('id'),
  jsonBody,
  validateBody(reactSchema),
  asyncHandler(chatController.react),
);

export default router;
