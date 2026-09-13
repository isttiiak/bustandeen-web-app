import User from '../models/User.js';
import { sendWelcomeEmail } from './welcomeEmail.service.js';

const MISSING_WELCOME_FILTER = { welcomeEmailSentAt: { $exists: false } };

export const countMissingWelcomeEmail = async (): Promise<number> =>
  User.countDocuments(MISSING_WELCOME_FILTER);

/**
 * One-time backfill for accounts created before the welcome-email feature
 * shipped — never run automatically (sending a batch of real emails is
 * something the admin should trigger deliberately, not something that
 * happens as a side effect of a deploy). Bounded per call so a very large
 * backlog doesn't risk a Vercel function timeout; call again to keep going.
 * Sequential (not Promise.all) — a burst of concurrent sends is more likely
 * to trip Zoho's own rate limiting than a bounded batch sent one at a time.
 */
export const sendWelcomeBackfill = async (
  limit = 200
): Promise<{ sent: number; remaining: number }> => {
  const users = await User.find(MISSING_WELCOME_FILTER)
    .select('uid email displayName')
    .limit(limit);

  let sent = 0;
  for (const u of users) {
    if (!u.email) continue;
    await sendWelcomeEmail(u.uid, u.email, u.displayName || undefined);
    sent++;
  }

  const remaining = await countMissingWelcomeEmail();
  return { sent, remaining };
};
