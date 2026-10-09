import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as socialController from '../controllers/social.controller.js';
import {
  connectSchema,
  socialSummarySchema,
  setInvisibleSchema,
  setPrivacySchema,
} from '../validation/social.schemas.js';
import { socialConnectLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// GET /api/social/summary?today=&timezoneOffset= — invite code + the circle (no ranking)
router.get('/summary', requireAuth, validate(socialSummarySchema), socialController.getSummary);

// GET /api/social/noor?today=&timezoneOffset= — viewer's Noor (today + all-time)
router.get('/noor', requireAuth, validate(socialSummarySchema), socialController.getNoor);

// POST /api/social/connect { code } — connect with the invite link's owner
// UID-keyed limiter after requireAuth so req.user.uid is available
router.post(
  '/connect',
  requireAuth,
  socialConnectLimiter,
  validate(connectSchema),
  socialController.connect
);

// GET /api/social/friends — friend list with connected-since dates (manage view)
router.get('/friends', requireAuth, socialController.getFriendsList);

// DELETE /api/social/friends/:friendUid — mutual disconnect
router.delete('/friends/:friendUid', requireAuth, socialController.unfriend);

// GET /api/social/requests — incoming friend requests awaiting accept/reject
router.get('/requests', requireAuth, socialController.getPendingIncoming);

// POST /api/social/requests/:requesterUid/accept | /reject
router.post('/requests/:requesterUid/accept', requireAuth, socialController.acceptRequest);
router.post('/requests/:requesterUid/reject', requireAuth, socialController.rejectRequest);

// POST/DELETE /api/social/block/:targetUid — block/unblock (same limiter as
// connect: both are UID-driven relationship changes with similar abuse shape)
router.post('/block/:targetUid', requireAuth, socialConnectLimiter, socialController.blockUser);
router.delete('/block/:targetUid', requireAuth, socialController.unblockUser);

// GET /api/social/blocked — manage-blocked-users view
router.get('/blocked', requireAuth, socialController.getBlockedList);

// PATCH /api/social/privacy { visibility?, secret? } — what friends see + secret deeds
router.patch('/privacy', requireAuth, validate(setPrivacySchema), socialController.setPrivacy);

// PATCH /api/social/invisible { invisible } — pre-T3.6 alias of /privacy for
// cached clients (on = hidden, off = detail). Remove in the next release.
router.patch(
  '/invisible',
  requireAuth,
  validate(setInvisibleSchema),
  socialController.setInvisible
);

export default router;
