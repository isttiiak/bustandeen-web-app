import HifzEntry, { IHifzEntry, HifzState, HifzResult } from '../models/HifzEntry.js';
import HifzProfile, { IHifzProfile } from '../models/HifzProfile.js';
import HifzLog, { IHifzLog } from '../models/HifzLog.js';
import { ayahCountOf, nextAyahPosition } from '../utils/surahAyahCounts.js';

function todayDateString(): string {
  return new Date().toISOString().substring(0, 10);
}

function shiftDateStr(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().substring(0, 10);
}

/** Atomic upsert — `summary` and `queue` both call this on page load and can
 * race a plain findOne-then-create, which throws a duplicate-key error when
 * both requests see no profile and both try to insert it. */
export async function getOrCreateProfile(userId: string): Promise<IHifzProfile> {
  return HifzProfile.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function getOrCreateLog(userId: string, date: string): Promise<IHifzLog> {
  return HifzLog.findOneAndUpdate(
    { userId, date },
    { $setOnInsert: { newCount: 0, revisionCount: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ── SM-2 (adapted to a 3-choice self-assessment) ────────────────────────────
// easy → quality 5, hesitant → quality 3, forgot → quality 0 (fail).
const QUALITY = new Map<HifzResult, number>([
  ['easy', 5],
  ['hesitant', 3],
  ['forgot', 0],
]);

/** State is derived from the SM-2 interval after a review — `new` is reserved
 * for an entry that has NEVER been reviewed (set at creation, never produced
 * here). A lapse resets `reps` to 0, but the entry has still been attempted,
 * so it must land in `learning`, not regress all the way back to `new`. */
function deriveState(interval: number): HifzState {
  if (interval <= 3) return 'learning';
  if (interval <= 13) return 'consolidating';
  return 'solid';
}

function applySm2(entry: IHifzEntry, result: HifzResult, today: string): void {
  const quality = QUALITY.get(result) ?? 0;
  if (quality < 3) {
    entry.lapses += 1;
    entry.reps = 0;
    entry.interval = 1;
    entry.easeFactor = Math.max(1.3, entry.easeFactor - 0.2);
  } else {
    if (entry.reps === 0) entry.interval = 1;
    else if (entry.reps === 1) entry.interval = 6;
    else entry.interval = Math.round(entry.interval * entry.easeFactor);
    entry.reps += 1;
    entry.easeFactor = Math.max(
      1.3,
      entry.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  }
  entry.dueDate = shiftDateStr(today, entry.interval);
  entry.lastResult = result;
  entry.lastReviewedAt = new Date();
  entry.state = deriveState(entry.interval);
}

export interface AddEntryResult {
  entry: IHifzEntry;
  alreadyExists: boolean;
}

/** Start memorising a specific ayah (idempotent — re-adding an existing entry
 * is a no-op, not an error, so a double-tap can't corrupt its SRS state). */
export async function addEntry(
  userId: string,
  surah: number,
  ayah: number,
  date?: string
): Promise<AddEntryResult> {
  const today = date ?? todayDateString();
  const existing = await HifzEntry.findOne({ userId, surah, ayah });
  if (existing) return { entry: existing, alreadyExists: true };

  const entry = await HifzEntry.create({
    userId,
    surah,
    ayah,
    state: 'new',
    interval: 0,
    easeFactor: 2.5,
    reps: 0,
    lapses: 0,
    dueDate: today,
    lastResult: null,
    lastReviewedAt: null,
  });
  await HifzLog.findOneAndUpdate(
    { userId, date: today },
    { $inc: { newCount: 1 }, $setOnInsert: { revisionCount: 0 } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  return { entry, alreadyExists: false };
}

export interface AddNextResult extends AddEntryResult {
  cursorExhausted: boolean;
}

/** Add the ayah at the profile's sequential cursor, then advance it — mirrors
 * the khatam bookmark pattern so "add next ayah" needs no picker. */
export async function addNext(userId: string, date?: string): Promise<AddNextResult> {
  const profile = await getOrCreateProfile(userId);
  const surah = profile.nextSurah;
  const ayah = profile.nextAyah;
  const result = await addEntry(userId, surah, ayah, date);
  const next = nextAyahPosition(surah, ayah);
  const cursorExhausted = next.surah === 1 && next.ayah === 1 && !(surah === 1 && ayah === 1);
  profile.nextSurah = next.surah;
  profile.nextAyah = next.ayah;
  await profile.save();
  return { ...result, cursorExhausted };
}

/** Remove an entry entirely (undo a mistaken add) — does not touch the cursor. */
export async function removeEntry(userId: string, surah: number, ayah: number): Promise<boolean> {
  const res = await HifzEntry.deleteOne({ userId, surah, ayah });
  return res.deletedCount > 0;
}

export interface ReviewResult {
  entry: IHifzEntry;
}

/** Record a self-assessment for one ayah's recall attempt and reschedule it. */
export async function review(
  userId: string,
  surah: number,
  ayah: number,
  result: HifzResult,
  date?: string
): Promise<ReviewResult> {
  const today = date ?? todayDateString();
  const entry = await HifzEntry.findOne({ userId, surah, ayah });
  if (!entry) {
    throw Object.assign(new Error('This ayah is not in your memorisation list.'), {
      statusCode: 404,
    });
  }
  applySm2(entry, result, today);
  await entry.save();
  await HifzLog.findOneAndUpdate(
    { userId, date: today },
    { $inc: { revisionCount: 1 }, $setOnInsert: { newCount: 0 } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  return { entry };
}

export interface QueueEntry {
  surah: number;
  ayah: number;
  state: HifzState;
  dueDate: string;
  reps: number;
  lapses: number;
  lastResult: HifzResult | null;
}

export interface QueueResult {
  due: QueueEntry[];
  nextNew: { surah: number; ayah: number } | null;
}

function toQueueEntry(e: IHifzEntry): QueueEntry {
  return {
    surah: e.surah,
    ayah: e.ayah,
    state: e.state,
    dueDate: e.dueDate,
    reps: e.reps,
    lapses: e.lapses,
    lastResult: e.lastResult,
  };
}

/** Today's revision queue: everything due, not yet `solid` (mastered ayat fall
 * out of the daily grind — see TODO spec), oldest-due first. Plus the
 * cursor's next-up ayah for "add new memorisation" — null once every ayah in
 * the mushaf (6236) has an entry. */
export async function getQueue(userId: string, date?: string): Promise<QueueResult> {
  const today = date ?? todayDateString();
  const [dueEntries, profile, totalEntries] = await Promise.all([
    HifzEntry.find({ userId, dueDate: { $lte: today }, state: { $ne: 'solid' } })
      .sort({ dueDate: 1, surah: 1, ayah: 1 })
      .limit(500),
    getOrCreateProfile(userId),
    HifzEntry.countDocuments({ userId }),
  ]);

  const nextNew =
    totalEntries >= 6236 ? null : { surah: profile.nextSurah, ayah: profile.nextAyah };

  return { due: dueEntries.map(toQueueEntry), nextNew };
}

export interface HifzProfileUpdate {
  dailyNewTarget?: number;
  dailyRevisionTarget?: number;
}

export async function updateProfile(
  userId: string,
  input: HifzProfileUpdate
): Promise<IHifzProfile> {
  const profile = await getOrCreateProfile(userId);
  if (input.dailyNewTarget !== undefined) profile.dailyNewTarget = input.dailyNewTarget;
  if (input.dailyRevisionTarget !== undefined)
    profile.dailyRevisionTarget = input.dailyRevisionTarget;
  await profile.save();
  return profile;
}

/** Reset the sequential "add next ayah" cursor back to 1:1. Existing entries
 * and their SRS progress are untouched — this only affects future add-next calls. */
export async function resetCursor(userId: string): Promise<IHifzProfile> {
  const profile = await getOrCreateProfile(userId);
  profile.nextSurah = 1;
  profile.nextAyah = 1;
  await profile.save();
  return profile;
}

export interface HeatmapRow {
  surah: number;
  totalAyat: number;
  memorised: number;
  solid: number;
  consolidating: number;
  learning: number;
  new: number;
}

export interface HifzSummary {
  profile: {
    dailyNewTarget: number;
    dailyRevisionTarget: number;
    nextSurah: number;
    nextAyah: number;
  };
  today: { newCount: number; revisionCount: number };
  newGoalMet: boolean;
  revisionGoalMet: boolean;
  dueCount: number;
  streak: number;
  bestStreak: number;
  totals: { new: number; learning: number; consolidating: number; solid: number; total: number };
  heatmap: HeatmapRow[];
}

export async function getSummary(userId: string, today?: string): Promise<HifzSummary> {
  const end = today ?? todayDateString();
  const windowSince = shiftDateStr(end, -364);

  const [profile, log, allEntries, logsInWindow, dueCount] = await Promise.all([
    getOrCreateProfile(userId),
    getOrCreateLog(userId, end),
    HifzEntry.find({ userId }).select('surah state').lean(),
    HifzLog.find({ userId, date: { $gte: windowSince, $lte: end } })
      .select('date newCount revisionCount')
      .sort({ date: 1 })
      .lean(),
    HifzEntry.countDocuments({ userId, dueDate: { $lte: end }, state: { $ne: 'solid' } }),
  ]);

  const activeByDate = new Map(
    logsInWindow.map((l) => [l.date, (l.newCount ?? 0) + (l.revisionCount ?? 0) > 0])
  );
  const hasActivity = (d: string) => activeByDate.get(d) ?? false;

  // Streak with a single-day grace, same rule as the Quran/zikr streaks.
  let streak = 0;
  {
    let misses = 0;
    let cursor = hasActivity(end) ? end : shiftDateStr(end, -1);
    for (let i = 0; i < 366; i++) {
      if (hasActivity(cursor)) {
        streak++;
        misses = 0;
      } else {
        misses++;
        if (misses >= 2) break;
      }
      cursor = shiftDateStr(cursor, -1);
    }
  }

  let bestStreak = 0;
  let run = 0;
  let bestMisses = 0;
  for (let i = 364; i >= 0; i--) {
    const d = shiftDateStr(end, -i);
    if (hasActivity(d)) {
      run++;
      bestMisses = 0;
    } else {
      bestMisses++;
      if (bestMisses >= 2) run = 0;
    }
    if (run > bestStreak) bestStreak = run;
  }

  const totals = { new: 0, learning: 0, consolidating: 0, solid: 0, total: allEntries.length };
  const bySurah = new Map<number, HeatmapRow>();
  for (const e of allEntries) {
    totals[e.state as HifzState] += 1;
    let row = bySurah.get(e.surah);
    if (!row) {
      row = {
        surah: e.surah,
        totalAyat: ayahCountOf(e.surah),
        memorised: 0,
        solid: 0,
        consolidating: 0,
        learning: 0,
        new: 0,
      };
      bySurah.set(e.surah, row);
    }
    row.memorised += 1;
    row[e.state as HifzState] += 1;
  }
  const heatmap = [...bySurah.values()].sort((a, b) => a.surah - b.surah);

  return {
    profile: {
      dailyNewTarget: profile.dailyNewTarget,
      dailyRevisionTarget: profile.dailyRevisionTarget,
      nextSurah: profile.nextSurah,
      nextAyah: profile.nextAyah,
    },
    today: { newCount: log.newCount, revisionCount: log.revisionCount },
    newGoalMet: profile.dailyNewTarget > 0 && log.newCount >= profile.dailyNewTarget,
    revisionGoalMet:
      profile.dailyRevisionTarget > 0 && log.revisionCount >= profile.dailyRevisionTarget,
    dueCount,
    streak,
    bestStreak,
    totals,
    heatmap,
  };
}

export async function deleteAllUserHifzData(userId: string): Promise<{ deletedCount: number }> {
  const [entries] = await Promise.all([
    HifzEntry.deleteMany({ userId }),
    HifzLog.deleteMany({ userId }),
    HifzProfile.deleteOne({ userId }),
  ]);
  return { deletedCount: entries.deletedCount ?? 0 };
}
