import { Router } from 'express';
import { requireAdminAuth, requireServant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  referenceCheckIdSchema,
  saveReferenceCheckSchema,
} from '../validation/referenceCheck.schemas.js';
import * as referenceCheckController from '../controllers/referenceCheck.controller.js';

const router = Router();

// A mark tells the public that a reference was checked by a person or a
// scholar, so only the Servant sets it. Every save and clear is audit-logged.
router.use(requireAdminAuth, requireServant);

router.get('/checks', referenceCheckController.listAdminHandler);
router.put('/checks', validate(saveReferenceCheckSchema), referenceCheckController.saveHandler);
router.delete(
  '/checks/:refId',
  validate(referenceCheckIdSchema),
  referenceCheckController.clearHandler
);

export default router;
