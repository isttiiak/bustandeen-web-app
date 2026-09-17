import { Router } from 'express';
import { requireAdminAuth, requireDomain, requireServant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminListZikrRequestsQuerySchema,
  zikrRequestEmailDraftQuerySchema,
  approveZikrRequestSchema,
  rejectZikrRequestSchema,
  updateLibraryItemCategorySchema,
} from '../validation/zikrRequest.schemas.js';
import * as adminZikrController from '../controllers/adminZikr.controller.js';

const router = Router();

// Approve/reject is the core review job here too — open to any admin in the
// 'general' domain (ansar@bustandeen.com); Servant always bypasses.
router.use(requireAdminAuth, requireDomain('general'));

router.get('/', validate(adminListZikrRequestsQuerySchema), adminZikrController.listHandler);
router.get(
  '/:id/email-draft',
  validate(zikrRequestEmailDraftQuerySchema),
  adminZikrController.emailDraftHandler
);
router.post('/:id/approve', validate(approveZikrRequestSchema), adminZikrController.approveHandler);
router.post('/:id/reject', validate(rejectZikrRequestSchema), adminZikrController.rejectHandler);

// Editing an already-published library entry is Servant-only, unlike the
// day-to-day approve/reject review job above.
router.patch(
  '/library/:id/category',
  requireServant,
  validate(updateLibraryItemCategorySchema),
  adminZikrController.updateLibraryCategoryHandler
);

export default router;
