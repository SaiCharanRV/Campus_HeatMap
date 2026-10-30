import { Router } from 'express';
import * as map from '../controllers/map.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Auth is per route (not router.use) because this router is mounted at /api,
// and a router-wide guard would turn every unknown /api path into a 401.
router.get('/locations', requireAuth, map.listLocations);
router.get('/map/heatmap', requireAuth, map.heatmap);

export default router;
