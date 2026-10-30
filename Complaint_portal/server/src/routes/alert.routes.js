import { Router } from 'express';
import * as alerts from '../controllers/alert.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { allowRoles } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { schemas } from '../utils/validators.js';

const router = Router();
router.use(requireAuth);

router.get('/', alerts.listAlerts);
router.post('/', allowRoles('supervisor', 'admin'), validate(schemas.createAlert), alerts.createAlert);
router.patch('/:id', allowRoles('supervisor', 'admin'), validate(schemas.updateAlert), alerts.updateAlert);
router.post('/:id/resolve', allowRoles('supervisor', 'admin'), alerts.resolveAlert);
router.delete('/:id', allowRoles('admin'), alerts.deleteAlert);

export default router;
