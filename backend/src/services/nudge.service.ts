import Nudge, { NUDGE_MESSAGE_MAX } from '../models/Nudge.js';
import User from '../models/User.js';
import { getNoorSummary } from './noor.service.js';
import { getOrCreateProfile, visibleFriendPrivacy, publicPicture } from './social.service.js';
import { DEFAULT_TIMEZONE_OFFSET, getTodayString } from '../utils/timezone-flexible.js';
import { NUDGE_COOLDOWN_MS } from './nudgeStore.service.js';

/** A cap on how many people one person nudges a day (one nudge per friend per day). */
const NUDGE_MAX_PER_DAY = 10;

export type SendNudgeResult =
  { ok: true; nudgedAt: string } | { ok: false; reason: 'unavailable' | 'cooldown' | 'limit' };

export interface IncomingNudge {
  fromUid: string;
  displayName: string;
  photoUrl?: string;
  avatarId?: string;
  /** How many times this friend has nudged me */
  count: number;
  /** Their latest short message ('' when they added none) */
  message: string;
  nudgedAt: string;
}

/** Plain text only: control characters and line breaks become spaces. */
function cleanNudgeMessage(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NUDGE_MESSAGE_MAX);
}

/**
 * Is this friend quiet from where the sender stands? The same picture the
 * circle shows: a friend the sender can see (not hidden) with no active day
 * this week. Secret areas do not count, exactly as in the circle.
 */
async function isFriendQuiet(
  viewerUid: string,
  friendUid: string,
  today: string
): Promise<boolean> {
  const profile = await getOrCreateProfile(viewerUid);
  if (!profile.friends.includes(friendUid) || profile.blocked.includes(friendUid)) return false;
  const privacy = (await visibleFriendPrivacy([friendUid])).get(friendUid);
  if (!privacy) return false; // hidden: not in anyone's circle, so not nudgeable
  const noor = await getNoorSummary(friendUid, today, privacy.secret);
  return noor.weekPast.activeDays + (noor.today.base > 0 ? 1 : 0) === 0;
}

export async function sendNudge(
  fromUid: string,
  toUid: string,
  rawMessage: unknown,
  today?: string,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET
): Promise<SendNudgeResult> {
  if (fromUid === toUid) return { ok: false, reason: 'unavailable' };
  const end = today ?? getTodayString(timezoneOffset);
  if (!(await isFriendQuiet(fromUid, toUid, end))) return { ok: false, reason: 'unavailable' };

  const now = new Date();
  const cutoff = new Date(now.getTime() - NUDGE_COOLDOWN_MS);
  const sentToday = await Nudge.countDocuments({ fromUid, lastNudgedAt: { $gt: cutoff } });
  if (sentToday >= NUDGE_MAX_PER_DAY) return { ok: false, reason: 'limit' };

  const message = cleanNudgeMessage(rawMessage);
  // The cooldown is part of the write, so two quick taps cannot both land.
  const updated = await Nudge.findOneAndUpdate(
    { fromUid, toUid, lastNudgedAt: { $lte: cutoff } },
    { $inc: { count: 1 }, $set: { message, lastNudgedAt: now, seenAt: null } },
    { returnDocument: 'after' }
  );
  if (updated) return { ok: true, nudgedAt: now.toISOString() };
  try {
    await Nudge.create({ fromUid, toUid, count: 1, message, lastNudgedAt: now, seenAt: null });
    return { ok: true, nudgedAt: now.toISOString() };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { ok: false, reason: 'cooldown' };
    throw err;
  }
}

/** Nudges I have not dismissed yet, from people who are still my friends. */
export async function getIncomingNudges(userId: string): Promise<IncomingNudge[]> {
  const rows = await Nudge.find({ toUid: userId, seenAt: null })
    .sort({ lastNudgedAt: -1 })
    .limit(20);
  if (!rows.length) return [];
  const profile = await getOrCreateProfile(userId);
  const mine = rows.filter((r) => profile.friends.includes(r.fromUid));
  if (!mine.length) return [];
  const users = await User.find({ uid: { $in: mine.map((r) => r.fromUid) } }).select(
    'uid displayName photoUrl avatarId'
  );
  const byUid = new Map(users.map((u) => [u.uid, u]));
  return mine.map((r) => {
    const u = byUid.get(r.fromUid);
    return {
      fromUid: r.fromUid,
      displayName: u?.displayName || 'Bustandeen user',
      ...publicPicture(u),
      count: r.count,
      message: r.message ?? '',
      nudgedAt: r.lastNudgedAt.toISOString(),
    };
  });
}

/** Dismiss the nudges I have seen (every waiting one, or only these senders'). */
export async function dismissNudges(userId: string, fromUids?: string[]): Promise<void> {
  await Nudge.updateMany(
    { toUid: userId, seenAt: null, ...(fromUids?.length ? { fromUid: { $in: fromUids } } : {}) },
    { $set: { seenAt: new Date() } }
  );
}
