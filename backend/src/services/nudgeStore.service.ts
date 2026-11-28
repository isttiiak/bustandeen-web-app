import Nudge from '../models/Nudge.js';

/** One nudge per friend per day. */
export const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Uids the viewer nudged within the cooldown: their Nudge button waits. */
export async function recentlyNudged(fromUid: string): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - NUDGE_COOLDOWN_MS);
  const rows = await Nudge.find({ fromUid, lastNudgedAt: { $gt: cutoff } }).select('toUid');
  return new Set(rows.map((r) => r.toUid));
}

/** A friendship ended (unfriend, block, deleted account): the nudges between the two go too. */
export async function removeNudgesBetween(a: string, b: string): Promise<void> {
  await Nudge.deleteMany({
    $or: [
      { fromUid: a, toUid: b },
      { fromUid: b, toUid: a },
    ],
  });
}

/** An account was deleted: every nudge it sent or received goes. */
export async function removeNudgesOf(uid: string): Promise<void> {
  await Nudge.deleteMany({ $or: [{ fromUid: uid }, { toUid: uid }] });
}
