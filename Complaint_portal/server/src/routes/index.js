import { Router } from 'express';
import authRoutes from './auth.routes.js';
import complaintRoutes from './complaint.routes.js';
import staffRoutes from './staff.routes.js';
import mapRoutes from './map.routes.js';
import adminRoutes from './admin.routes.js';
import notificationRoutes from './notification.routes.js';
import alertRoutes from './alert.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));
router.use('/auth', authRoutes);
router.use('/complaints', complaintRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/alerts', alertRoutes);
router.use('/', mapRoutes); // /locations, /map/heatmap

export default router;
