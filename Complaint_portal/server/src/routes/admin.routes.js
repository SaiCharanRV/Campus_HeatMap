import { Router } from 'express';
import * as admin from '../controllers/admin.controller.js';
import { listLocations } from '../controllers/map.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { allowRoles } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { schemas } from '../utils/validators.js';

const router = Router();
router.use(requireAuth, allowRoles('admin'));

router.get('/users', admin.listUsers);
router.post('/users', validate(schemas.createUser), admin.createUser);
router.patch('/users/:id', validate(schemas.updateUser), admin.updateUser);
router.delete('/users/:id', admin.deactivateUser);

router.get('/zones', admin.listZones);
router.post('/zones', validate(schemas.zone), admin.createZone);
router.patch('/zones/:id', validate(schemas.zone), admin.updateZone);
router.delete('/zones/:id', admin.deleteZone);

router.get('/locations', listLocations);
router.post('/locations', validate(schemas.location), admin.createLocation);
router.patch('/locations/:id', validate(schemas.location), admin.updateLocation);
router.delete('/locations/:id', admin.deleteLocation);

router.get('/mappings', admin.listMappings);
router.put('/mappings', validate(schemas.mapping), admin.upsertMapping);
router.delete('/mappings/:id', admin.deleteMapping);

router.get('/analytics', admin.analytics);

export default router;
