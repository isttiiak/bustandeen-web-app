import CycleLog, { ICycleLog } from '../models/CycleLog.js';
import CycleProfile, { ICycleProfile } from '../models/CycleProfile.js';
import CycleDay, { ICycleDayContent } from '../models/CycleDay.js';
import SocialProfile from '../models/SocialProfile.js';
import { encryptJson, decryptJson } from '../utils/fieldCrypto.js';

const EMPTY_DAY_CONTENT: ICycleDayContent = { flow: null, symptoms: [], moods: [], garden: [] };

/**
 * Rayhanah Cycle — menstrual (hayd) & post-natal (nifas) tracking.
 *
 * Fiqh model (verified references live in the frontend education content):
 * - Salat during hayd/nifas is fully excused and never made up; missed
 *   Ramadan fasts ARE made up (Muslim 335).
 * - Everything else — dhikr, du'a, listening to Quran, knowledge, charity —
 *   remains open (Bukhari 305, Muslim 373).
 * - Bleeding beyond the madhab's maximum is istihada: prayer resumes with
 *   fresh wudu per prayer (Bukhari 306).
 */

export const HAYD_MAX: Record<ICycleProfile['madhab'], number> = {
  hanafi: 10,
  majority: 15,
};
export const NIFAS_MAX = 40; // Abu Dawud 311 (Shafi'i position of 60 noted in UI)

const DAY_STR_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDateStr(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T12:00:00.000Z').getTime() - new Date(a + 'T12:00:00.000Z').getTime()) /
      86_400_000
  );
}

export async function getOrCreateProfile(userId: string): Promise<ICycleProfile> {
  let profile = await CycleProfile.findOne({ userId });
  if (!profile) profile = await CycleProfile.create({ userId });
  return profile;
}

export async function setMadhab(
  userId: string,
  madhab: ICycleProfile['madhab']
): Promise<ICycleProfile> {
  return await CycleProfile.findOneAndUpdate(
    { userId },
    { $set: { madhab } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/** Turning pregnancy ON needs a due date (so a week count can be shown);
 * turning it OFF always succeeds with no validation, same "revoking is never
 * blocked" principle as partner sync. */
export async function setPregnancy(
  userId: string,
  active: boolean,
  dueDate?: string
): Promise<ICycleProfile> {
  if (active && (!dueDate || !DAY_STR_RE.test(dueDate))) {
    const err = Object.assign(new Error('A valid due date is required to start pregnancy mode.'), {
      statusCode: 400,
    });
    throw err;
  }
  return await CycleProfile.findOneAndUpdate(
    { userId },
    { $set: { pregnancy: active ? { active: true, dueDate } : { active: false } } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

/** Weeks pregnant from a 40-week (280-day) gestation ending on `dueDate`,
 * clamped to a sane display range. Null if the numbers don't make sense. */
function weeksAlong(dueDate: string, today: string): number | null {
  const daysUntilDue = daysBetween(today, dueDate);
  const weeks = 40 - Math.ceil(daysUntilDue / 7);
  if (!Number.isFinite(weeks)) return null;
  return Math.max(0, Math.min(42, weeks));
}

export interface CycleStatus {
  active: {
    type: 'hayd' | 'nifas';
    startDate: string;
    dayCount: number;
    maxDays: number;
    /** true once dayCount exceeds maxDays — show istihada guidance */
    beyondMax: boolean;
  } | null;
  prediction: {
    nextStart: string | null;
    avgCycleDays: number;
    avgPeriodDays: number;
    basedOnCycles: number;
  };
  madhab: ICycleProfile['madhab'];
  partnerSync: { enabled: boolean; partnerUid: string | null };
  pregnancy: { active: boolean; dueDate: string | null; weeksAlong: number | null };
}

export async function getStatus(userId: string, today: string): Promise<CycleStatus> {
  const [profile, logs] = await Promise.all([
    getOrCreateProfile(userId),
    CycleLog.find({ userId }).sort({ startDate: -1 }).limit(13),
  ]);

  const activeLog = logs.find((l) => l.endDate === null && l.startDate <= today) ?? null;
  const maxDays = activeLog?.type === 'nifas' ? NIFAS_MAX : HAYD_MAX[profile.madhab];

  let active: CycleStatus['active'] = null;
  if (activeLog) {
    const dayCount = daysBetween(activeLog.startDate, today) + 1;
    active = {
      type: activeLog.type,
      startDate: activeLog.startDate,
      dayCount,
      maxDays,
      beyondMax: dayCount > maxDays,
    };
  }

  // Predictions from completed hayd episodes only (nifas is not cyclical)
  const hayd = logs
    .filter((l) => l.type === 'hayd')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const gaps: number[] = [];
  for (let i = 1; i < hayd.length; i++) {
    const g = daysBetween(hayd[i - 1]!.startDate, hayd[i]!.startDate);
    if (g >= 15 && g <= 60) gaps.push(g); // ignore data-entry outliers
  }
  const lengths = hayd
    .filter((l) => l.endDate)
    .map((l) => daysBetween(l.startDate, l.endDate as string) + 1)
    .filter((n) => n >= 1 && n <= 15);

  const avgCycleDays = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 28;
  const avgPeriodDays = lengths.length
    ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    : 7;
  const lastStart = hayd.length ? hayd[hayd.length - 1]!.startDate : null;
  const isPregnant = !!profile.pregnancy?.active;
  // Predicting a "next period" while she's pregnant would be actively wrong
  // (periods stop during pregnancy) — suppress it rather than show a stale
  // or misleading forecast.
  const nextStart =
    !active && !isPregnant && lastStart ? shiftDateStr(lastStart, avgCycleDays) : null;

  return {
    active,
    prediction: { nextStart, avgCycleDays, avgPeriodDays, basedOnCycles: gaps.length },
    madhab: profile.madhab,
    partnerSync: {
      enabled: profile.partnerSyncEnabled,
      partnerUid: profile.partnerUid ?? null,
    },
    pregnancy: {
      active: isPregnant,
      dueDate: profile.pregnancy?.dueDate ?? null,
      weeksAlong:
        isPregnant && profile.pregnancy?.dueDate
          ? weeksAlong(profile.pregnancy.dueDate, today)
          : null,
    },
  };
}

export interface CycleSummary extends CycleStatus {
  logs: Array<{ _id: string; type: string; startDate: string; endDate: string | null }>;
  /** Wellness notes for the last ~60 days (flow/symptoms/moods/garden) */
  days: Array<{
    date: string;
    flow: string | null;
    symptoms: string[];
    moods: string[];
    garden: string[];
  }>;
}

export async function getSummary(userId: string, today: string): Promise<CycleSummary> {
  const daysSince = shiftDateStr(today, -60);
  const [status, logs, days] = await Promise.all([
    getStatus(userId, today),
    CycleLog.find({ userId }).sort({ startDate: -1 }).limit(24).select('type startDate endDate'),
    CycleDay.find({ userId, date: { $gte: daysSince, $lte: today } }).select('date enc'),
  ]);
  return {
    ...status,
    logs: logs.map((l) => ({
      _id: String(l._id),
      type: l.type,
      startDate: l.startDate,
      endDate: l.endDate,
    })),
    days: days.map((d) => {
      const content = decryptJson<ICycleDayContent>(d.enc) ?? EMPTY_DAY_CONTENT;
      return { date: d.date, ...content };
    }),
  };
}

export interface CycleDayResult extends ICycleDayContent {
  date: string;
}

export async function upsertDay(
  userId: string,
  input: {
    date: string;
    flow?: string | null;
    symptoms?: string[];
    moods?: string[];
    garden?: string[];
  }
): Promise<CycleDayResult> {
  const existing = await CycleDay.findOne({ userId, date: input.date }).select('enc');
  const current = decryptJson<ICycleDayContent>(existing?.enc) ?? EMPTY_DAY_CONTENT;
  const next: ICycleDayContent = {
    flow: input.flow !== undefined ? input.flow : current.flow,
    symptoms: input.symptoms !== undefined ? input.symptoms : current.symptoms,
    moods: input.moods !== undefined ? input.moods : current.moods,
    garden: input.garden !== undefined ? input.garden : current.garden,
  } as ICycleDayContent;
  await CycleDay.findOneAndUpdate(
    { userId, date: input.date },
    { $set: { enc: encryptJson(next) }, $setOnInsert: { userId, date: input.date } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  return { date: input.date, ...next };
}

export async function startCycle(
  userId: string,
  date: string,
  type: 'hayd' | 'nifas'
): Promise<{ ok: boolean; error?: string; log?: ICycleLog }> {
  if (!DAY_STR_RE.test(date)) return { ok: false, error: 'Invalid date' };

  const open = await CycleLog.findOne({ userId, endDate: null });
  if (open) return { ok: false, error: 'A cycle is already active — end it first.' };

  // No overlap with a completed episode
  const overlapping = await CycleLog.findOne({
    userId,
    startDate: { $lte: date },
    endDate: { $gte: date },
  });
  if (overlapping) return { ok: false, error: 'That date is inside an already-logged cycle.' };

  const log = await CycleLog.create({ userId, type, startDate: date, endDate: null });
  return { ok: true, log };
}

/**
 * Log a COMPLETED past episode in one step (history backfill) — start and end
 * together. Rejects overlap with any existing episode and future dates.
 */
export async function addPastCycle(
  userId: string,
  input: { startDate: string; endDate: string; type: 'hayd' | 'nifas'; today: string }
): Promise<{ ok: boolean; error?: string; log?: ICycleLog }> {
  const { startDate, endDate, type, today } = input;
  if (!DAY_STR_RE.test(startDate) || !DAY_STR_RE.test(endDate))
    return { ok: false, error: 'Invalid date' };
  if (endDate < startDate) return { ok: false, error: 'End date is before the start date.' };
  if (endDate >= today)
    return {
      ok: false,
      error: 'Past cycles must end before today — use "My period started" for a current one.',
    };
  const len = daysBetween(startDate, endDate) + 1;
  if (len > 60)
    return { ok: false, error: 'That episode is longer than 60 days — please split it.' };

  // Overlap check against every existing episode (incl. active)
  const clash = await CycleLog.findOne({
    userId,
    startDate: { $lte: endDate },
    $or: [{ endDate: null }, { endDate: { $gte: startDate } }],
  });
  if (clash) return { ok: false, error: 'Those dates overlap an already-logged cycle.' };

  const log = await CycleLog.create({ userId, type, startDate, endDate });
  return { ok: true, log };
}

export async function endCycle(
  userId: string,
  date: string
): Promise<{ ok: boolean; error?: string; log?: ICycleLog }> {
  if (!DAY_STR_RE.test(date)) return { ok: false, error: 'Invalid date' };

  const open = await CycleLog.findOne({ userId, endDate: null });
  if (!open) return { ok: false, error: 'No active cycle to end.' };
  if (date < open.startDate) return { ok: false, error: 'End date is before the start date.' };

  open.endDate = date;
  await open.save();
  return { ok: true, log: open };
}

/**
 * Edit an episode's dates — or REOPEN it (endDate null) when it was ended too
 * early (Istiak: a sister marked the end, the flow returned hours later, and
 * the only path back was deleting the whole cycle WITH its daily notes).
 * Daily wellness notes live in CycleDay docs keyed by date, so editing or
 * reopening here never touches them.
 */
export async function editCycleLog(
  userId: string,
  logId: string,
  input: { startDate?: string; endDate?: string | null }
): Promise<{ ok: boolean; error?: string; log?: ICycleLog }> {
  const log = await CycleLog.findOne({ userId, _id: logId });
  if (!log) return { ok: false, error: 'Cycle not found.' };

  const startDate = input.startDate ?? log.startDate;
  const endDate = input.endDate === undefined ? log.endDate : input.endDate;

  if (!DAY_STR_RE.test(startDate)) return { ok: false, error: 'Invalid start date' };
  if (endDate !== null && !DAY_STR_RE.test(endDate))
    return { ok: false, error: 'Invalid end date' };
  if (endDate !== null && endDate < startDate)
    return { ok: false, error: 'End date is before the start date.' };
  if (endDate !== null && daysBetween(startDate, endDate) + 1 > 60) {
    return { ok: false, error: 'That episode is longer than 60 days — please split it.' };
  }

  if (endDate === null) {
    // Reopening: only ONE cycle may be open, and only the most recent
    // episode can resume (a later episode would contradict it).
    const otherOpen = await CycleLog.findOne({ userId, endDate: null, _id: { $ne: log._id } });
    if (otherOpen) return { ok: false, error: 'Another cycle is already active.' };
    const later = await CycleLog.findOne({
      userId,
      _id: { $ne: log._id },
      startDate: { $gt: log.startDate },
    });
    if (later) return { ok: false, error: 'Only your most recent cycle can be reopened.' };
  }

  // Overlap check against every OTHER episode
  const clash = await CycleLog.findOne({
    userId,
    _id: { $ne: log._id },
    ...(endDate === null
      ? { $or: [{ endDate: null }, { endDate: { $gte: startDate } }] }
      : {
          startDate: { $lte: endDate },
          $or: [{ endDate: null }, { endDate: { $gte: startDate } }],
        }),
  });
  if (clash) return { ok: false, error: 'Those dates overlap another logged cycle.' };

  log.startDate = startDate;
  log.endDate = endDate;
  await log.save();
  return { ok: true, log };
}

export async function deleteLog(userId: string, logId: string): Promise<boolean> {
  const res = await CycleLog.deleteOne({ userId, _id: logId });
  return res.deletedCount > 0;
}

export async function deleteAll(userId: string): Promise<void> {
  await CycleLog.deleteMany({ userId });
  await CycleProfile.deleteMany({ userId });
  await CycleDay.deleteMany({ userId });
}

/**
 * Which of these users are excused (inside an active or logged episode) on
 * `date`? One query for the whole leaderboard. Used ONLY server-side for the
 * Noor substitution — the result must never appear in an API response.
 */
export async function getExcusedSet(userIds: string[], date: string): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const rows = await CycleLog.find({
    userId: { $in: userIds },
    startDate: { $lte: date },
    $or: [{ endDate: null }, { endDate: { $gte: date } }],
  }).select('userId');
  return new Set(rows.map((r) => r.userId));
}

/** All excused day-intervals for one user (for the all-time Noor walk). */
export async function getExcusedIntervals(
  userId: string
): Promise<Array<{ start: string; end: string | null }>> {
  const rows = await CycleLog.find({ userId }).select('startDate endDate');
  return rows.map((r) => ({ start: r.startDate, end: r.endDate }));
}

/**
 * Opt-in, revocable partner status-sharing. Sharing is deliberately narrow:
 * the partner must already be a mutual friend (reuses the existing, proven
 * friend graph rather than a new invite mechanism), and what's ever shared
 * is a single boolean ("on her cycle" / "not") — see statsForUser's use of
 * this in social.service.ts, which only ever reads `enabled`+`partnerUid`
 * and computes the boolean itself from data that already never leaves the
 * server unfiltered.
 */
export async function setPartnerSync(
  userId: string,
  input: { enabled: boolean; partnerUid?: string }
): Promise<{ ok: boolean; error?: string; enabled: boolean; partnerUid: string | null }> {
  if (!input.enabled) {
    // Revoking is always allowed, no validation — a partner must never be
    // able to block her from turning this off.
    await CycleProfile.findOneAndUpdate(
      { userId },
      { $set: { partnerSyncEnabled: false, partnerUid: null } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return { ok: true, enabled: false, partnerUid: null };
  }

  const partnerUid = input.partnerUid;
  if (!partnerUid) {
    return { ok: false, error: 'Choose a friend to share with.', enabled: false, partnerUid: null };
  }
  if (partnerUid === userId) {
    return { ok: false, error: 'You cannot link yourself.', enabled: false, partnerUid: null };
  }

  const mine = await SocialProfile.findOne({ userId }).select('friends');
  if (!mine?.friends.includes(partnerUid)) {
    return {
      ok: false,
      error: 'You can only share with someone already on your friends list.',
      enabled: false,
      partnerUid: null,
    };
  }

  await CycleProfile.findOneAndUpdate(
    { userId },
    { $set: { partnerSyncEnabled: true, partnerUid } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  return { ok: true, enabled: true, partnerUid };
}

/**
 * Which of `uids` are currently sharing their cycle status with `viewerUid`?
 * One query for the whole leaderboard, mirroring getExcusedSet's shape —
 * called from social.service.ts right alongside it.
 */
export async function getPartnerShareSet(uids: string[], viewerUid: string): Promise<Set<string>> {
  if (!uids.length) return new Set();
  const rows = await CycleProfile.find({
    userId: { $in: uids },
    partnerSyncEnabled: true,
    partnerUid: viewerUid,
  }).select('userId');
  return new Set(rows.map((r) => r.userId));
}

export interface BodyStats {
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
}

export async function getBodyStats(userId: string): Promise<BodyStats> {
  const profile = await CycleProfile.findOne({ userId }).select('bodyStatsEncrypted');
  if (!profile?.bodyStatsEncrypted) return { heightCm: null, weightKg: null, bmi: null };
  const raw = decryptJson<{ heightCm?: number; weightKg?: number }>(profile.bodyStatsEncrypted);
  const h = raw?.heightCm ?? null;
  const w = raw?.weightKg ?? null;
  const bmi = h && w ? Math.round((w / ((h / 100) * (h / 100))) * 10) / 10 : null;
  return { heightCm: h, weightKg: w, bmi };
}

export async function updateBodyStats(
  userId: string,
  input: { heightCm?: number; weightKg?: number }
): Promise<BodyStats> {
  const profile = await getOrCreateProfile(userId);
  const existing = profile.bodyStatsEncrypted
    ? (decryptJson<{ heightCm?: number; weightKg?: number }>(profile.bodyStatsEncrypted) ?? {})
    : {};
  const merged = {
    ...existing,
    ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
    ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
  };
  profile.bodyStatsEncrypted = encryptJson(merged);
  await profile.save();
  const h = merged.heightCm ?? null;
  const w = merged.weightKg ?? null;
  const bmi = h && w ? Math.round((w / ((h / 100) * (h / 100))) * 10) / 10 : null;
  return { heightCm: h ?? null, weightKg: w ?? null, bmi };
}
