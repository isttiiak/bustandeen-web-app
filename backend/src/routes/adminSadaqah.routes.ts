import { Router } from 'express';
import { requireAuth, requireAdminEmail, requireAdminSession } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminListQuerySchema,
  verifyDonationSchema,
  rejectDonationSchema,
  emailDraftQuerySchema,
  quarterlyUpsertSchema,
  quarterlyParamSchema,
  addExpenseSchema,
} from '../validation/sadaqah.schemas.js';
import * as adminSadaqahController from '../controllers/adminSadaqah.controller.js';

const router = Router();

// Every route in this file is admin-only — enforced once here rather than
// per-route, so a new endpoint added later can't accidentally skip the gate.
router.use(requireAuth, requireAdminEmail, requireAdminSession);

router.get('/pending', adminSadaqahController.listPendingHandler);
router.get('/all', validate(adminListQuerySchema), adminSadaqahController.listAllHandler);

// :id shape (valid ObjectId) isn't zod-validated — a malformed id throws a
// Mongoose CastError, which the global error handler already turns into a
// clean 400, same as everywhere else in this app that looks up by id.
router.get(
  '/:id/email-draft',
  validate(emailDraftQuerySchema),
  adminSadaqahController.emailDraftHandler
);
router.patch('/:id/verify', validate(verifyDonationSchema), adminSadaqahController.verifyHandler);
router.patch('/:id/reject', validate(rejectDonationSchema), adminSadaqahController.rejectHandler);

// Erroneous/test entries only — not a donor-facing action. Reverses the
// stats impact first if the donation had been verified.
router.delete('/:id', adminSadaqahController.deleteDonationHandler);

router.get('/expenses', adminSadaqahController.listExpensesHandler);
router.post('/expenses', validate(addExpenseSchema), adminSadaqahController.addExpenseHandler);
router.delete('/expenses/:id', adminSadaqahController.deleteExpenseHandler);

router.patch(
  '/quarterly/:quarter',
  validate(quarterlyUpsertSchema),
  adminSadaqahController.upsertQuarterlyHandler
);
router.delete(
  '/quarterly/:quarter',
  validate(quarterlyParamSchema),
  adminSadaqahController.deleteQuarterlyHandler
);

export default router;
