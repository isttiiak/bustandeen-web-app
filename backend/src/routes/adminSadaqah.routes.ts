import { Router } from 'express';
import { requireAdminAuth, requireServant, requireDomain } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminListQuerySchema,
  verifyDonationSchema,
  rejectDonationSchema,
  emailDraftQuerySchema,
  quarterlyParamSchema,
  publishQuarterlySchema,
  donorEmailDraftQuerySchema,
  donorEmailSendSchema,
  addExpenseSchema,
} from '../validation/sadaqah.schemas.js';
import * as adminSadaqahController from '../controllers/adminSadaqah.controller.js';

const router = Router();

// Every route in this file is admin-only — enforced once here rather than
// per-route, so a new endpoint added later can't accidentally skip the gate.
// Also domain-scoped to the sadaqah@bustandeen.com Ansar (Servant bypasses).
router.use(requireAdminAuth, requireDomain('sadaqah'));

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
router.get('/:id/receipt', adminSadaqahController.receiptHandler);
// Verify/reject is the core day-to-day review job (mostly done by
// ansar@bustandeen.com) — open to any admin, not owner-restricted.
router.patch('/:id/verify', validate(verifyDonationSchema), adminSadaqahController.verifyHandler);
router.patch('/:id/reject', validate(rejectDonationSchema), adminSadaqahController.rejectHandler);

// Erroneous/test entries only — not a donor-facing action. Reverses the
// stats impact first if the donation had been verified. Owner-only: a
// permanent delete of a financial record.
router.delete('/:id', requireServant, adminSadaqahController.deleteDonationHandler);

// Financial cross-referencing (which donors are engaged app users, repeat
// patterns, month-over-month trend) — owner-only per TODO-v3.md.
router.get('/donor-analytics', requireServant, adminSadaqahController.donorAnalyticsHandler);
router.get(
  '/donor-email-draft',
  requireServant,
  validate(donorEmailDraftQuerySchema),
  adminSadaqahController.donorEmailDraftHandler
);
router.post(
  '/donor-email-send',
  requireServant,
  validate(donorEmailSendSchema),
  adminSadaqahController.donorEmailSendHandler
);

router.get('/expenses', adminSadaqahController.listExpensesHandler);
router.post('/expenses', validate(addExpenseSchema), adminSadaqahController.addExpenseHandler);
router.delete('/expenses/:id', requireServant, adminSadaqahController.deleteExpenseHandler);

// Owner-only: quarterly numbers are always recomputed fresh from verified
// donations + the expense ledger (never manually typed) — publishing is
// what makes a quarter visible on the public page; unpublish/delete are the
// reversible/permanent ways to take one back down.
router.get('/quarterly', requireServant, adminSadaqahController.listQuarterlyHandler);
router.get(
  '/quarterly/:quarter/preview',
  requireServant,
  validate(quarterlyParamSchema),
  adminSadaqahController.quarterlyPreviewHandler
);
router.post(
  '/quarterly/:quarter/publish',
  requireServant,
  validate(publishQuarterlySchema),
  adminSadaqahController.publishQuarterlyHandler
);
router.patch(
  '/quarterly/:quarter/unpublish',
  requireServant,
  validate(quarterlyParamSchema),
  adminSadaqahController.unpublishQuarterlyHandler
);
router.delete(
  '/quarterly/:quarter',
  requireServant,
  validate(quarterlyParamSchema),
  adminSadaqahController.deleteQuarterlyHandler
);

export default router;
