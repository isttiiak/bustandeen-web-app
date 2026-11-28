import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as socialController from '../controllers/social.controller.js';
import {
  connectSchema,
  socialSummarySchema,
  setPrivacySchema,
  sendNudgeSchema,
  dismissNudgesSchema,
} from '../validation/social.schemas.js';
import { socialConnectLimiter, socialNudgeLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// GET /api/social/summary?today=&timezoneOffset= — invite code + the circle (no ranking)
router.get('/summary', requireAuth, validate(socialSummarySchema), socialController.getSummary);

// GET /api/social/alltime?today=&timezoneOffset= — the circle's All time tab (U3)
router.get('/alltime', requireAuth, validate(socialSummarySchema), socialController.getAllTime);

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

// POST /api/social/nudge/:friendUid { message?, today? } — a gentle "come back to the journey"
// to a friend who has been quiet (once a day per friend)
router.post(
  '/nudge/:friendUid',
  requireAuth,
  socialNudgeLimiter,
  validate(sendNudgeSchema),
  socialController.sendNudge
);

// GET /api/social/nudges — nudges I have not dismissed yet
router.get('/nudges', requireAuth, socialController.getNudges);

// POST /api/social/nudges/dismiss { fromUids? } — dismiss what I have seen
router.post(
  '/nudges/dismiss',
  requireAuth,
  validate(dismissNudgesSchema),
  socialController.dismissNudges
);

// GET /api/social/nudges/history — every nudge I have received and not deleted
router.get('/nudges/history', requireAuth, socialController.getNudgeHistory);

// DELETE /api/social/nudges/history — delete my whole nudge history
router.delete('/nudges/history', requireAuth, socialController.clearNudgeHistory);

// DELETE /api/social/nudges/history/:id — delete one nudge from my history
router.delete('/nudges/history/:id', requireAuth, socialController.deleteNudge);

export default router;
