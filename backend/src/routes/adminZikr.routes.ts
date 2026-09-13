import { Router } from 'express';
import { requireAdminAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminListZikrRequestsQuerySchema,
  zikrRequestEmailDraftQuerySchema,
  approveZikrRequestSchema,
  rejectZikrRequestSchema,
} from '../validation/zikrRequest.schemas.js';
import * as adminZikrController from '../controllers/adminZikr.controller.js';

const router = Router();

// Approve/reject is the core review job here too — open to any admin.
router.use(requireAdminAuth);

router.get('/', validate(adminListZikrRequestsQuerySchema), adminZikrController.listHandler);
router.get(
  '/:id/email-draft',
  validate(zikrRequestEmailDraftQuerySchema),
  adminZikrController.emailDraftHandler
);
router.post('/:id/approve', validate(approveZikrRequestSchema), adminZikrController.approveHandler);
router.post('/:id/reject', validate(rejectZikrRequestSchema), adminZikrController.rejectHandler);

export default router;
