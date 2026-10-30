import { Router } from 'express';
import * as notifications from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', notifications.listNotifications);
router.patch('/read-all', notifications.markAllRead);
router.patch('/:id/read', notifications.markRead);

export default router;
