import { Router } from 'express';
import { requireAdminAuth, requireServant, requireDomain } from '../middleware/auth.js';
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

router.get('/expenses', adminSadaqahController.listExpensesHandler);
router.post('/expenses', validate(addExpenseSchema), adminSadaqahController.addExpenseHandler);
router.delete('/expenses/:id', requireServant, adminSadaqahController.deleteExpenseHandler);

// Owner-only: directly edits the published financial totals, outside the
// normal donation review flow.
router.patch(
  '/quarterly/:quarter',
  requireServant,
  validate(quarterlyUpsertSchema),
  adminSadaqahController.upsertQuarterlyHandler
);
router.delete(
  '/quarterly/:quarter',
  requireServant,
  validate(quarterlyParamSchema),
  adminSadaqahController.deleteQuarterlyHandler
);

export default router;
