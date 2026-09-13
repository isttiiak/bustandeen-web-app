import { Router } from 'express';
import { requireAuth, requireAdminEmail, requireAdminSession } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminListZikrRequestsQuerySchema,
  zikrRequestEmailDraftQuerySchema,
  approveZikrRequestSchema,
  rejectZikrRequestSchema,
} from '../validation/zikrRequest.schemas.js';
import * as adminZikrController from '../controllers/adminZikr.controller.js';

const router = Router();

router.use(requireAuth, requireAdminEmail, requireAdminSession);

router.get('/', validate(adminListZikrRequestsQuerySchema), adminZikrController.listHandler);
router.get(
  '/:id/email-draft',
  validate(zikrRequestEmailDraftQuerySchema),
  adminZikrController.emailDraftHandler
);
router.post('/:id/approve', validate(approveZikrRequestSchema), adminZikrController.approveHandler);
router.post('/:id/reject', validate(rejectZikrRequestSchema), adminZikrController.rejectHandler);

export default router;
