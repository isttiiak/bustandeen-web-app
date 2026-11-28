import mongoose from 'mongoose';
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

interface NudgeSender {
  fromUid: string;
  displayName: string;
  photoUrl?: string;
  avatarId?: string;
}

export interface IncomingNudge extends NudgeSender {
  /** How many times this friend has nudged me (the ones still in my history) */
  count: number;
  /** Their latest short message ('' when they added none) */
  message: string;
  nudgedAt: string;
}

export interface NudgeHistoryItem extends NudgeSender {
  id: string;
  message: string;
  nudgedAt: string;
  /** Still waiting as a pop-up (not dismissed yet) */
  unseen: boolean;
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
  // Hidden (deleted-from-history) nudges still count: the limit is the sender's.
  if (await Nudge.exists({ fromUid, toUid, createdAt: { $gt: cutoff } })) {
    return { ok: false, reason: 'cooldown' };
  }
  const sentToday = await Nudge.countDocuments({ fromUid, createdAt: { $gt: cutoff } });
  if (sentToday >= NUDGE_MAX_PER_DAY) return { ok: false, reason: 'limit' };

  try {
    await Nudge.create({
      fromUid,
      toUid,
      message: cleanNudgeMessage(rawMessage),
      createdAt: now,
      slot: Math.floor(now.getTime() / NUDGE_COOLDOWN_MS),
    });
    return { ok: true, nudgedAt: now.toISOString() };
  } catch (err) {
    // Two taps at once: the unique (pair, window) index lets only one land.
    if ((err as { code?: number }).code === 11000) return { ok: false, reason: 'cooldown' };
    throw err;
  }
}

async function sendersOf(uids: string[]): Promise<Map<string, NudgeSender>> {
  const users = await User.find({ uid: { $in: uids } }).select('uid displayName photoUrl avatarId');
  return new Map(
    users.map((u) => [
      u.uid,
      {
        fromUid: u.uid,
        displayName: u.displayName || 'Bustandeen user',
        ...publicPicture(u),
      },
    ])
  );
}

const unknownSender = (fromUid: string): NudgeSender => ({
  fromUid,
  displayName: 'Bustandeen user',
});

/** Nudges I have not dismissed yet, one entry per friend, with how many times they nudged me. */
export async function getIncomingNudges(userId: string): Promise<IncomingNudge[]> {
  const rows = await Nudge.find({ toUid: userId, seenAt: null, hiddenAt: null })
    .sort({ createdAt: -1 })
    .limit(50);
  if (!rows.length) return [];
  const profile = await getOrCreateProfile(userId);
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (profile.friends.includes(r.fromUid) && !latest.has(r.fromUid)) latest.set(r.fromUid, r);
  }
  const senders = await sendersOf([...latest.keys()]);
  return Promise.all(
    [...latest.entries()].slice(0, 20).map(async ([fromUid, r]) => ({
      ...(senders.get(fromUid) ?? unknownSender(fromUid)),
      count: await Nudge.countDocuments({ fromUid, toUid: userId, hiddenAt: null }),
      message: r.message ?? '',
      nudgedAt: r.createdAt.toISOString(),
    }))
  );
}

/** Dismiss the pop-up for what I have seen (every waiting one, or only these senders'). */
export async function dismissNudges(userId: string, fromUids?: string[]): Promise<void> {
  await Nudge.updateMany(
    {
      toUid: userId,
      seenAt: null,
      ...(fromUids?.length ? { fromUid: { $in: fromUids } } : {}),
    },
    { $set: { seenAt: new Date() } }
  );
}

/** The nudges I have received and not deleted, newest first. */
export async function getNudgeHistory(userId: string): Promise<NudgeHistoryItem[]> {
  const rows = await Nudge.find({ toUid: userId, hiddenAt: null })
    .sort({ createdAt: -1 })
    .limit(100);
  if (!rows.length) return [];
  const senders = await sendersOf([...new Set(rows.map((r) => r.fromUid))]);
  return rows.map((r) => ({
    ...(senders.get(r.fromUid) ?? unknownSender(r.fromUid)),
    id: String(r._id),
    message: r.message ?? '',
    nudgedAt: r.createdAt.toISOString(),
    unseen: r.seenAt === null,
  }));
}

/** Delete one nudge from my history. Returns false when it is not mine or already gone. */
export async function deleteNudge(userId: string, id: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(id)) return false;
  const now = new Date();
  const res = await Nudge.updateOne(
    { _id: id, toUid: userId, hiddenAt: null },
    { $set: { hiddenAt: now, seenAt: now } }
  );
  return res.modifiedCount === 1;
}

/** Delete my whole nudge history. Returns how many were removed. */
export async function clearNudgeHistory(userId: string): Promise<number> {
  const now = new Date();
  const res = await Nudge.updateMany(
    { toUid: userId, hiddenAt: null },
    { $set: { hiddenAt: now, seenAt: now } }
  );
  return res.modifiedCount;
}
