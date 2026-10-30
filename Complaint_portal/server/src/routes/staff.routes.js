import { Router } from 'express';
import * as staff from '../controllers/staff.controller.js';
import { getComplaint } from '../controllers/complaint.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { allowRoles } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { uploadImages } from '../middleware/upload.js';
import { schemas } from '../utils/validators.js';

const router = Router();
router.use(requireAuth, allowRoles('supervisor', 'worker', 'admin'));

router.get('/complaints', staff.listStaffComplaints);
router.get('/stats', staff.staffStats);
router.get('/complaints/:id', getComplaint);
router.patch(
  '/complaints/:id/assign',
  allowRoles('supervisor', 'admin'),
  validate(schemas.assign),
  staff.assignWorker
);
router.patch(
  '/complaints/:id/status',
  uploadImages,
  validate(schemas.updateStatus),
  staff.updateStatus
);
router.patch(
  '/complaints/:id/reject',
  allowRoles('supervisor', 'admin'),
  validate(schemas.reject),
  staff.rejectComplaint
);
router.get('/workers', allowRoles('supervisor', 'admin'), staff.listWorkers);
router.get('/recurring', allowRoles('supervisor', 'admin'), staff.listRecurring);
router.patch(
  '/recurring/:id/acknowledge',
  allowRoles('supervisor', 'admin'),
  validate(schemas.acknowledgeRecurring),
  staff.acknowledgeRecurring
);

export default router;
