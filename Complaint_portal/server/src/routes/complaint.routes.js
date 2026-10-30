import { Router } from 'express';
import * as complaints from '../controllers/complaint.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { allowRoles } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { uploadImages } from '../middleware/upload.js';
import { schemas } from '../utils/validators.js';

const router = Router();
router.use(requireAuth);

router.get('/', complaints.listComplaints);
router.post(
  '/',
  allowRoles('student'),
  uploadImages,
  validate(schemas.createComplaint),
  complaints.createComplaint
);
router.get('/mine', allowRoles('student'), complaints.listMine);
router.get('/:id', complaints.getComplaint);
router.post('/:id/upvote', allowRoles('student'), complaints.toggleUpvote);
router.post('/:id/reopen', allowRoles('student'), validate(schemas.reopen), complaints.reopenComplaint);
router.post('/:id/rate', allowRoles('student'), validate(schemas.rate), complaints.rateComplaint);
router.post('/:id/comments', validate(schemas.comment), complaints.addComment);

export default router;
