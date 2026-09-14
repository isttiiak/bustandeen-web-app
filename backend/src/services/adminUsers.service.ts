import User, { IUser } from '../models/User.js';
import { sendWelcomeEmail } from './welcomeEmail.service.js';

const MISSING_WELCOME_FILTER = { welcomeEmailSentAt: { $exists: false } };

const USER_LIST_FIELDS =
  'uid email displayName firstName lastName gender country city createdAt aiEnabled welcomeEmailSentAt';

export interface UserListResult {
  users: Pick<
    IUser,
    | 'uid'
    | 'email'
    | 'displayName'
    | 'firstName'
    | 'lastName'
    | 'gender'
    | 'country'
    | 'city'
    | 'createdAt'
    | 'aiEnabled'
    | 'welcomeEmailSentAt'
  >[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Servant-only user directory — a simple paginated list with an optional
 * email/name search, not a full analytics view (that's future work, see
 * TODO-v3.md). Never returns anything encrypted (groqApiKeyEnc) or otherwise
 * sensitive beyond what's already shown in this field list.
 */
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listUsers = async (
  search: string | undefined,
  page: number,
  limit: number
): Promise<UserListResult> => {
  const filter = search
    ? {
        $or: [
          { email: { $regex: escapeRegex(search), $options: 'i' } },
          { displayName: { $regex: escapeRegex(search), $options: 'i' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(USER_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, total, page, limit };
};

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
