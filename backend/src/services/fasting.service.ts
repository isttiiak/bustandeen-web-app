import FastingLog, {
  FastingCategory,
  FastingStatus,
  IFastingLog,
  VoluntaryKind,
} from '../models/FastingLog.js';
import FastingProfile, { IFastingProfile } from '../models/FastingProfile.js';
import { getExcusedIntervals } from './cycle.service.js';
import { resetDateFor } from './statsReset.service.js';

function todayDateString(): string {
  return new Date().toISOString().substring(0, 10);
}

/** Shift a YYYY-MM-DD date string by `delta` days (pure string math, no TZ). */
function shiftDateStr(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().substring(0, 10);
}

function computeMonThuStreak(monThuDates: Set<string>, today: string): number {
  let streak = 0;
  const d = new Date(today + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  for (let i = 0; i < 365; i++) {
    const dow = d.getUTCDay();
    if (dow === 1 || dow === 4) {
      const dateStr = d.toISOString().substring(0, 10);
      if (monThuDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

/** Longest-ever run of consecutive Mon/Thu fasts (not just the trailing one
 * from today — see computeMonThuStreak for that). Walks every Mon/Thu
 * calendar date from the earliest logged one through `today`, same
 * gap-breaks-the-chain rule as the current streak. */
function computeBestMonThuStreak(monThuDates: Set<string>, today: string): number {
  if (monThuDates.size === 0) return 0;
  const earliest = [...monThuDates].sort()[0]!;
  let best = 0;
  let current = 0;
  const d = new Date(earliest + 'T12:00:00Z');
  const end = today + 'T12:00:00Z';
  while (d.getTime() <= new Date(end).getTime()) {
    const dow = d.getUTCDay();
    if (dow === 1 || dow === 4) {
      const dateStr = d.toISOString().substring(0, 10);
      if (monThuDates.has(dateStr)) {
        current++;
        if (current > best) best = current;
      } else {
        current = 0;
      }
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return best;
}

export interface UpsertLogInput {
  date: string;
  category: FastingCategory;
  voluntaryKind?: VoluntaryKind;
  vowId?: string;
  status: FastingStatus;
  hijri?: string;
  note?: string;
  /** Ramadan nights: tarawih prayed */
  tarawih?: boolean;
}

export async function getLog(userId: string, date?: string): Promise<IFastingLog | null> {
  const d = date ?? todayDateString();
  return FastingLog.findOne({ userId, date: d });
}

export async function upsertLog(userId: string, input: UpsertLogInput): Promise<IFastingLog> {
  const { date, category, voluntaryKind, vowId, status, hijri, note, tarawih } = input;

  // Nadhr logs must reference one of the user's vows
  if (category === 'nadhr') {
    const profile = await getOrCreateProfile(userId);
    const vowExists = profile.vows.some((v) => String(v._id) === vowId);
    if (!vowExists) {
      const err = Object.assign(new Error('Unknown vow'), { statusCode: 400 });
      throw err;
    }
  }

  // Upsert semantics = full replace of the day's fast. Mongoose ignores
  // undefined values inside $set, so stale fields (e.g. voluntaryKind after
  // switching to qada) must be removed with an explicit $unset.
  const set: Record<string, unknown> = { category, status };
  const unset: Record<string, 1> = {};
  if (category === 'voluntary') set['voluntaryKind'] = voluntaryKind ?? 'general';
  else unset['voluntaryKind'] = 1;
  if (category === 'nadhr') set['vowId'] = vowId;
  else unset['vowId'] = 1;
  if (hijri !== undefined) set['hijri'] = hijri;
  else unset['hijri'] = 1;
  if (note !== undefined) set['note'] = note;
  else unset['note'] = 1;
  if (tarawih !== undefined) set['tarawih'] = tarawih;

  const log = await FastingLog.findOneAndUpdate(
    { userId, date },
    { $set: set, $unset: unset },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return log;
}

export async function clearLog(userId: string, date: string): Promise<{ deleted: boolean }> {
  const result = await FastingLog.deleteOne({ userId, date });
  return { deleted: (result.deletedCount ?? 0) > 0 };
}

export async function getHistory(
  userId: string,
  days: number,
  today?: string
): Promise<IFastingLog[]> {
  const end = today ?? todayDateString();
  const since = shiftDateStr(end, -(days - 1));
  // +1 day past "today" so a logged intention for tomorrow shows up too
  const until = shiftDateStr(end, 1);
  return FastingLog.find({ userId, date: { $gte: since, $lte: until } }).sort({ date: 1 });
}

export async function getOrCreateProfile(userId: string): Promise<IFastingProfile> {
  let profile = await FastingProfile.findOne({ userId });
  if (!profile) profile = await FastingProfile.create({ userId });
  return profile;
}

export interface ProfileUpdateInput {
  qadaOwed?: number;
  kaffarah?: { active: boolean; targetDays: number; startDate?: string };
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput
): Promise<IFastingProfile> {
  const profile = await getOrCreateProfile(userId);
  if (input.qadaOwed !== undefined) profile.qadaOwed = input.qadaOwed;
  if (input.kaffarah !== undefined) {
    profile.kaffarah = {
      active: input.kaffarah.active,
      targetDays: input.kaffarah.targetDays,
      startDate: input.kaffarah.startDate ?? profile.kaffarah?.startDate,
    };
  }
  await profile.save();
  return profile;
}

export async function addVow(
  userId: string,
  title: string,
  targetDays: number
): Promise<IFastingProfile> {
  const profile = await getOrCreateProfile(userId);
  profile.vows.push({ title, targetDays } as never);
  await profile.save();
  return profile;
}

export async function deleteVow(userId: string, vowId: string): Promise<IFastingProfile | null> {
  return FastingProfile.findOneAndUpdate(
    { userId },
    { $pull: { vows: { _id: vowId } } },
    { new: true }
  );
}

export interface FastingSummary {
  profile: {
    qadaOwed: number;
    kaffarah: { active: boolean; targetDays: number; startDate?: string };
    vows: Array<{ id: string; title: string; targetDays: number; completed: number }>;
  };
  qadaCompleted: number;
  kaffarah: {
    completed: number;
    /** Length of the consecutive-day run ending at the most recent kaffarah fast */
    currentRun: number;
    /** True when the run is broken relative to `today` (last fast older than yesterday) */
    runStale: boolean;
  };
  stats: {
    total: number;
    thisMonth: number;
    last30: number;
    voluntaryTotal: number;
    monThuStreak: number;
    bestMonThuStreak: number;
    /** Fresh-start day these stats count from (U7), or null. */
    since: string | null;
  };
  /** Last 60 days of logs (plus tomorrow's intention if any) for the calendar strip */
  recentLogs: IFastingLog[];
}

export async function getSummary(userId: string, today?: string): Promise<FastingSummary> {
  const end = today ?? todayDateString();
  const monthPrefix = end.substring(0, 7); // YYYY-MM
  const last30Since = shiftDateStr(end, -29);

  // Auto-complete past intentions: once the day has fully passed, an
  // 'intended' fast counts as completed (the user corrects exceptions from
  // the analytics history). Today's intention is finalised client-side after
  // the local iftar time.
  await FastingLog.updateMany(
    { userId, status: 'intended', date: { $lt: end } },
    { $set: { status: 'completed' } }
  );

  const [profile, completedLogs, monThuLogs, recentLogs, since] = await Promise.all([
    getOrCreateProfile(userId),
    FastingLog.find({ userId, status: 'completed' })
      .select('date category vowId')
      .sort({ date: 1 }),
    FastingLog.find({
      userId,
      status: 'completed',
      category: 'voluntary',
      voluntaryKind: 'mon_thu',
    }).select('date'),
    getHistory(userId, 60, end),
    resetDateFor(userId, 'fasting'),
  ]);
  // A fresh start (U7) bounds the running stats only. Qaḍāʾ made up,
  // kaffārah and vows are obligations and always count every fast.
  const inPhase = (date: string) => !since || date >= since;
  const monThuDateSet = new Set(monThuLogs.map((l) => l.date).filter(inPhase));

  let qadaCompleted = 0;
  let total = 0;
  let voluntaryTotal = 0;
  let thisMonth = 0;
  let last30 = 0;
  const vowCompleted: Record<string, number> = {};
  const kaffarahDates: string[] = [];

  for (const log of completedLogs) {
    if (log.category === 'qada') qadaCompleted++;
    if (log.category === 'kaffarah') kaffarahDates.push(log.date);
    if (log.category === 'nadhr' && log.vowId) {
      vowCompleted[log.vowId] = (vowCompleted[log.vowId] ?? 0) + 1;
    }
    if (!inPhase(log.date)) continue;
    total++;
    if (log.category === 'voluntary') voluntaryTotal++;
    if (log.date.startsWith(monthPrefix) && log.date <= end) thisMonth++;
    if (log.date >= last30Since && log.date <= end) last30++;
  }

  // Kaffarah consecutive run: walk back from the most recent kaffarah fast.
  // The 60-day expiation must be consecutive (Ṣaḥīḥ al-Bukhārī 1936) — a gap
  // restarts the count. The one recognised exception is ḥayḍ/nifās: the
  // majority position is that a mandatory Sharīʿah-imposed break for the
  // menstrual/postpartum period does NOT restart the count — she resumes
  // where she left off once purified. Any other gap (illness, travel,
  // forgetfulness) still breaks the chain; the UI advises consulting a
  // scholar for genuinely disputed cases.
  let currentRun = 0;
  let runStale = false;
  if (kaffarahDates.length > 0) {
    const lastDate = kaffarahDates[kaffarahDates.length - 1]!;
    const dateSet = new Set(kaffarahDates);
    const excusedIntervals = await getExcusedIntervals(userId);
    const isExcused = (date: string): boolean =>
      excusedIntervals.some((iv) => iv.start <= date && (iv.end === null || date <= iv.end));

    let cursor = lastDate;
    while (dateSet.has(cursor) || isExcused(cursor)) {
      if (dateSet.has(cursor)) currentRun++;
      cursor = shiftDateStr(cursor, -1);
    }
    // Broken only if some day between the last fast and today is neither a
    // logged kaffarah fast nor an excused day — a still-ongoing or
    // just-ended cycle doesn't count against her.
    runStale = false;
    for (let d = shiftDateStr(lastDate, 1); d <= shiftDateStr(end, -1); d = shiftDateStr(d, 1)) {
      if (!isExcused(d)) {
        runStale = true;
        break;
      }
    }
  }

  return {
    profile: {
      qadaOwed: profile.qadaOwed,
      kaffarah: {
        active: profile.kaffarah?.active ?? false,
        targetDays: profile.kaffarah?.targetDays ?? 60,
        startDate: profile.kaffarah?.startDate,
      },
      vows: profile.vows.map((v) => ({
        id: String(v._id),
        title: v.title,
        targetDays: v.targetDays,
        completed: vowCompleted[String(v._id)] ?? 0,
      })),
    },
    qadaCompleted,
    kaffarah: {
      completed: kaffarahDates.length,
      currentRun: runStale ? 0 : currentRun,
      runStale,
    },
    stats: {
      total,
      thisMonth,
      last30,
      voluntaryTotal,
      monThuStreak: computeMonThuStreak(monThuDateSet, end),
      bestMonThuStreak: computeBestMonThuStreak(monThuDateSet, end),
      since,
    },
    recentLogs,
  };
}

export async function deleteAllUserFastingData(userId: string): Promise<{ deletedCount: number }> {
  const result = await FastingLog.deleteMany({ userId });
  await FastingProfile.deleteOne({ userId });
  return { deletedCount: result.deletedCount ?? 0 };
}

export type { FastingCategory };

/** Partial deletion (Istiak's unified danger zone): remove one obligation's
 * logs AND its related profile bookkeeping, leaving everything else intact. */
export async function deleteFastingCategory(
  userId: string,
  category: FastingCategory
): Promise<{ deletedCount: number }> {
  const result = await FastingLog.deleteMany({ userId, category });
  if (category === 'qada') {
    await FastingProfile.updateOne({ userId }, { $set: { qadaOwed: 0 } });
  } else if (category === 'kaffarah') {
    await FastingProfile.updateOne(
      { userId },
      { $set: { kaffarah: { active: false, targetDays: 60, startDate: null } } }
    );
  } else if (category === 'nadhr') {
    await FastingProfile.updateOne({ userId }, { $set: { vows: [] } });
  }
  return { deletedCount: result.deletedCount ?? 0 };
}
