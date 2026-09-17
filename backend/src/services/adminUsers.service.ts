import User, { IUser } from '../models/User.js';
import { sendWelcomeEmail } from './welcomeEmail.service.js';
import { deleteAccount } from './user.service.js';
import { sendMail } from './email.service.js';
import { REENGAGEMENT_SUBJECT, reengagementDraft, toSimpleHtml } from './userEmail.templates.js';

const httpError = (status: number, message: string): Error & { status: number } => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

const MISSING_WELCOME_FILTER = { welcomeEmailSentAt: { $exists: false } };

const USER_LIST_FIELDS =
  'uid email displayName firstName lastName gender country city createdAt updatedAt aiEnabled welcomeEmailSentAt disabled';

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
    | 'updatedAt'
    | 'aiEnabled'
    | 'welcomeEmailSentAt'
    | 'disabled'
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

export type UserListSort = 'newest' | 'inactive';

export const listUsers = async (
  search: string | undefined,
  page: number,
  limit: number,
  sortBy: UserListSort = 'newest'
): Promise<UserListResult> => {
  const filter = search
    ? {
        $or: [
          { email: { $regex: escapeRegex(search), $options: 'i' } },
          { displayName: { $regex: escapeRegex(search), $options: 'i' } },
        ],
      }
    : {};
  // 'inactive' sorts oldest-updatedAt-first — the least-recently-active
  // users surface at the top, using the same `updatedAt` "last active" proxy
  // as the user detail view (see getUserDetail's comment).
  const sort: Record<string, 1 | -1> = sortBy === 'inactive' ? { updatedAt: 1 } : { createdAt: -1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(USER_LIST_FIELDS)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, total, page, limit };
};

export const countMissingWelcomeEmail = async (): Promise<number> =>
  User.countDocuments(MISSING_WELCOME_FILTER);

const USER_DETAIL_FIELDS =
  'uid email displayName firstName lastName gender country city createdAt updatedAt aiEnabled welcomeEmailSentAt totalCount zikrTypes salatResetDate disabled disabledAt disabledReason';

export type UserDetail = Pick<
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
  | 'updatedAt'
  | 'aiEnabled'
  | 'welcomeEmailSentAt'
  | 'totalCount'
  | 'zikrTypes'
  | 'salatResetDate'
  | 'disabled'
  | 'disabledAt'
  | 'disabledReason'
>;

/** Single-user profile summary for the Servant-only detail view — not a full
 * data editor (zikr counts, Rayhanah cycle data, etc. stay out of reach
 * without a much more deliberate privacy pass, per TODO-v3.md). `updatedAt`
 * doubles as a free "last active" proxy: zikr increments already bump it via
 * User.totalCount's $inc (see zikr.service.ts), so no new aggregation is
 * needed just to show roughly when someone was last active. */
export const getUserDetail = async (uid: string): Promise<UserDetail> => {
  const user = await User.findOne({ uid }).select(USER_DETAIL_FIELDS);
  if (!user) throw httpError(404, 'User not found');
  return user;
};

export const resendWelcomeEmail = async (uid: string): Promise<void> => {
  const user = await User.findOne({ uid }).select('uid email displayName');
  if (!user) throw httpError(404, 'User not found');
  if (!user.email) throw httpError(400, 'User has no email on file');
  await sendWelcomeEmail(user.uid, user.email, user.displayName || undefined);
};

/** Servant-only — blocks sign-in without touching the account's data (see
 *  User.disabled, requireAuth, and /api/auth/verify). Reversible: use
 *  enableUser to restore access. */
export const disableUser = async (uid: string, reason: string | undefined): Promise<void> => {
  const result = await User.updateOne(
    { uid },
    { $set: { disabled: true, disabledAt: new Date(), disabledReason: reason ?? null } }
  );
  if (result.matchedCount === 0) throw httpError(404, 'User not found');
};

export const enableUser = async (uid: string): Promise<void> => {
  const result = await User.updateOne(
    { uid },
    { $set: { disabled: false, disabledAt: null, disabledReason: null } }
  );
  if (result.matchedCount === 0) throw httpError(404, 'User not found');
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** `updatedAt` doubles as the "last active" proxy app-wide (see
 * getUserDetail's comment) — days-inactive is just today minus that. */
export const getDaysInactive = (updatedAt: Date): number =>
  Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / DAY_MS));

/** Servant-only — drafts a gentle re-engagement email personalized with the
 * user's name and how long they've been away. Never sent from here: the
 * admin reviews/edits the draft first, then calls sendReengagementEmail
 * with the (possibly edited) text, matching the same draft-then-confirm
 * pattern already used for donation/zikr review emails. */
export const getReengagementDraft = async (
  uid: string
): Promise<{ subject: string; body: string }> => {
  const user = await User.findOne({ uid }).select('uid email displayName firstName updatedAt');
  if (!user) throw httpError(404, 'User not found');
  const name = user.displayName || user.firstName || 'there';
  const daysInactive = getDaysInactive(user.updatedAt);
  return { subject: REENGAGEMENT_SUBJECT, body: reengagementDraft({ name, daysInactive }) };
};

export const sendReengagementEmail = async (
  uid: string,
  subject: string,
  body: string
): Promise<void> => {
  if (!subject?.trim() || !body?.trim()) throw httpError(400, 'Subject and body are required');
  const user = await User.findOne({ uid }).select('uid email');
  if (!user) throw httpError(404, 'User not found');
  if (!user.email) throw httpError(400, 'User has no email on file');
  await sendMail({ to: user.email, subject, text: body, html: toSimpleHtml(body), from: 'ansar' });
};

/** Delegates to the same full cross-collection purge + Firebase deleteUser
 * that a user's own account-deletion flow already uses (user.service.ts) —
 * no separate deletion logic to keep in sync. Single-UID only, no bulk
 * variant, per TODO-v3.md's explicit note. */
export const deleteUserByAdmin = async (uid: string): Promise<void> => {
  const user = await User.findOne({ uid }).select('uid');
  if (!user) throw httpError(404, 'User not found');
  await deleteAccount(uid);
};

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
