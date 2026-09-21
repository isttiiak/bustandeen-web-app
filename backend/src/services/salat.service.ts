import SalatLog, {
  PRAYER_IDS,
  NAFL_TYPE_IDS,
  MISSED_REASONS,
  PrayerId,
  PrayerStatus,
  PrayerLocation,
  NaflType,
  MissedReason,
} from '../models/SalatLog.js';
import * as salatDebtService from './salatDebt.service.js';
import { getExcusedDaySet } from './cycle.service.js';

export function todayDateString(): string {
  return new Date().toISOString().substring(0, 10);
}

const VALID_STATUSES = new Set<string>(['completed', 'kaza', 'missed', 'pending']);
const VALID_LOCATIONS = new Set<string>(['home', 'mosque', 'jamat']);
const VALID_NAFL_TYPES = new Set<string>(NAFL_TYPE_IDS);

/** Migrate legacy enum values written by older schema versions */
function normaliseLegacyPrayers(log: InstanceType<typeof SalatLog>) {
  for (const pid of PRAYER_IDS) {
    const entry = log.prayers[pid];
    if (!entry) continue;
    const s = entry.status as string;
    if (!VALID_STATUSES.has(s)) {
      entry.status = 'completed';
    }
    const loc = entry.location as string | undefined;
    if (loc !== undefined && !VALID_LOCATIONS.has(loc)) {
      entry.location = 'home';
    }
  }
  // Normalise nafl types array too
  if (log.nafl?.types) {
    log.nafl.types = (log.nafl.types as string[]).filter((t) =>
      VALID_NAFL_TYPES.has(t)
    ) as NaflType[];
  }
}

export async function getOrCreateLog(userId: string, date?: string) {
  const d = date ?? todayDateString();
  let log = await SalatLog.findOne({ userId, date: d });
  if (!log) {
    log = await SalatLog.create({ userId, date: d });
  } else {
    normaliseLegacyPrayers(log);
  }
  return log;
}

const EMPTY_ENTRY = { status: 'pending' as PrayerStatus };

/**
 * Read-only fetch: returns the stored log or a virtual empty one WITHOUT
 * writing to the database. Previously every GET (e.g. browsing back through
 * past dates) created a permanent empty row per day viewed.
 */
export async function getLogReadOnly(userId: string, date?: string) {
  const d = date ?? todayDateString();
  const log = await SalatLog.findOne({ userId, date: d });
  if (log) {
    normaliseLegacyPrayers(log);
    return log;
  }
  return {
    _id: '',
    userId,
    date: d,
    prayers: {
      fajr: EMPTY_ENTRY,
      dhuhr: EMPTY_ENTRY,
      asr: EMPTY_ENTRY,
      maghrib: EMPTY_ENTRY,
      isha: EMPTY_ENTRY,
    },
    nafl: { completed: false, types: [] as NaflType[], rakat: 2 },
  };
}

export async function updatePrayerStatus(
  userId: string,
  prayer: PrayerId,
  status: PrayerStatus,
  date?: string,
  location?: PrayerLocation,
  tasbeeh?: boolean,
  ayatulKursi?: boolean,
  windowStart?: string,
  windowEnd?: string,
  missedReason?: MissedReason
) {
  const d = date ?? todayDateString();
  const log = await getOrCreateLog(userId, d);

  const entry = log.prayers[prayer];
  const wasMissed = entry.status === 'missed';
  entry.status = status;
  entry.prayedAt = status !== 'pending' ? new Date() : undefined;

  // Jumu'ah — Friday's Dhuhr is only valid as a congregational mosque prayer,
  // so "Done" always means "at the mosque". If it's missed on time, it can
  // only be made up as an ordinary (alone) Dhuhr — Jumu'ah itself has no kaza.
  const isFridayDhuhr = prayer === 'dhuhr' && new Date(d + 'T12:00:00').getDay() === 5;

  if (status === 'completed' || status === 'kaza') {
    entry.location = isFridayDhuhr
      ? status === 'completed'
        ? 'mosque'
        : 'home'
      : (location ?? 'home');
    entry.tasbeeh = tasbeeh ?? false;
    entry.ayatulKursi = ayatulKursi ?? false;
    // Window bounds come from the client's own adhan-library computation
    // (only meaningful for the day being marked) — store them only when both
    // are given, and only in this branch, so an older client that never
    // sends them just leaves the field unset rather than storing a partial pair.
    entry.windowStart = windowStart ? new Date(windowStart) : undefined;
    entry.windowEnd = windowEnd ? new Date(windowEnd) : undefined;
    entry.missedReason = undefined;
  } else if (status === 'missed') {
    entry.location = undefined;
    entry.tasbeeh = false;
    entry.ayatulKursi = false;
    entry.windowStart = undefined;
    entry.windowEnd = undefined;
    entry.missedReason = missedReason;
  } else {
    entry.location = undefined;
    entry.tasbeeh = false;
    entry.ayatulKursi = false;
    entry.windowStart = undefined;
    entry.windowEnd = undefined;
    entry.missedReason = undefined;
  }

  await log.save();

  // Keep the kaza-debt counter in sync with explicit 'missed' taps only —
  // a past day that was simply never logged does not silently add debt,
  // matching how missedCount in analytics already works.
  const isMissed = status === 'missed';
  if (wasMissed && !isMissed) await salatDebtService.adjustDebt(userId, prayer, -1, d);
  else if (!wasMissed && isMissed) await salatDebtService.adjustDebt(userId, prayer, 1, d);

  return log;
}

export async function updateNafl(
  userId: string,
  completed: boolean,
  types: NaflType[],
  rakat: number,
  date?: string
) {
  const d = date ?? todayDateString();
  const log = await getOrCreateLog(userId, d);

  log.nafl = {
    completed,
    types,
    rakat: Math.max(2, rakat),
    completedAt: completed ? new Date() : undefined,
  };

  await log.save();
  return log;
}

/** Shift a YYYY-MM-DD date string by `delta` days (pure string math, no TZ). */
function shiftDateStr(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().substring(0, 10);
}

export async function getSalatHistory(userId: string, days: number, today?: string) {
  const end = today ?? todayDateString();
  const sinceStr = shiftDateStr(end, -(days - 1));
  return SalatLog.find({ userId, date: { $gte: sinceStr, $lte: end } }).sort({ date: 1 });
}

export interface SalatAnalyticsResult {
  periodDays: number;
  totalDays: number;
  totalPossiblePrayers: number;
  completedCount: number;
  kazaCount: number;
  missedCount: number;
  prayedTotal: number;
  mosqueCount: number;
  jamaatCount: number;
  homeCount: number;
  tasbeehCount: number;
  naflDays: number;
  fridayCount: number;
  jumuahAttendedCount: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  perPrayer: Record<
    string,
    {
      completed: number;
      kaza: number;
      missed: number;
      pending: number;
      mosque: number;
      jamat: number;
      tasbeeh: number;
      currentStreak: number;
      bestStreak: number;
    }
  >;
  last7Days: Array<{ date: string; completed: number; total: number }>;
  /** `logged` is false when no SalatLog row exists for that date at all —
   * distinct from a row that exists with 0 prayers completed. The frontend
   * calendar heatmap uses this to render "no data" days differently from
   * "logged, nothing done" days (previously indistinguishable — both showed
   * the same 0-completed red cell). */
  calendarData: Array<{ date: string; completed: number; total: number; logged: boolean }>;
  weeklyMosqueTrend: Array<{
    weekStart: string;
    weekEnd: string;
    mosqueCount: number;
    prayedCount: number;
    rate: number;
  }>;
  /** Completion by day of week (JS getDay(): 0=Sun … 6=Sat), across the
   * whole window — e.g. "you miss Fajr on weekends more than weekdays". */
  byWeekday: Record<number, { completed: number; kaza: number; missed: number; total: number }>;
  /** How far into a prayer's window it was marked done, for prayers where
   * both the window bounds and the mark timestamp are known (older logs,
   * or ones marked without a saved location, are simply not counted here —
   * see IPrayerEntry.windowStart/windowEnd). */
  timeOfWindow: { early: number; mid: number; late: number; unknown: number };
  /** Counts of the optional reason tag on prayers explicitly marked missed.
   * Prayers swept into 'missed' by the day-rollover, or marked missed
   * without picking a reason, are not counted here. */
  missedReasons: Record<string, number>;
}

export async function getSalatAnalytics(
  userId: string,
  days: number,
  clientToday?: string,
  resetDate?: string,
  trackingStart?: string
): Promise<SalatAnalyticsResult> {
  const today = clientToday ?? todayDateString();
  // The heatmap is a fixed at-most-a-year view even when the stats window is
  // "all time" (thousands of days), so its cells and log fetch stay bounded.
  const calendarDays = Math.min(365, Math.max(days, 90));
  const logs = await getSalatHistory(userId, Math.max(calendarDays, days), today);

  const rawCutoff = shiftDateStr(today, -(days - 1));
  // Never count days before the user started tracking (account creation or
  // their first log, whichever is earlier) or before a reset: a day nobody
  // could have logged isn't a "missed" day, and a new user picking "this
  // month" or "1y" would otherwise be graded on a past they never had here.
  let statsCutoff = rawCutoff;
  if (resetDate && resetDate > statsCutoff) statsCutoff = resetDate;
  if (trackingStart && trackingStart > statsCutoff) statsCutoff = trackingStart;
  // A window that lies wholly before tracking began (e.g. a past month picked
  // before signup) collapses to the single day `today` rather than going
  // negative; the frontend shows "no data" for it via totalDays/logged flags.
  if (statsCutoff > today) statsCutoff = today;

  // Full window: all dates from statsCutoff to today (inclusive), whether or
  // not the user created a log row for them. A day with no row = 5 pending
  // prayers; on past days those count as missed. This gives an honest picture
  // of prayers skipped, not just prayers explicitly marked.
  const effectiveDays = Math.max(
    1,
    Math.round(
      (new Date(today + 'T12:00:00').getTime() - new Date(statsCutoff + 'T12:00:00').getTime()) /
        86_400_000
    ) + 1
  );

  const logMap = new Map(logs.map((l) => [l.date, l]));
  // Rest days (Rayhanah): salat is excused, so these days are neither missed nor
  // pending, do not count towards totals, and neither break nor extend a streak.
  const excused = await getExcusedDaySet(userId, statsCutoff, today);

  let completedCount = 0;
  let kazaCount = 0;
  let missedCount = 0;
  let mosqueCount = 0;
  let jamaatCount = 0;
  let homeCount = 0;
  let tasbeehCount = 0;
  let naflDays = 0;
  let fridayCount = 0;
  let jumuahAttendedCount = 0;

  const perPrayer: SalatAnalyticsResult['perPrayer'] = {};
  for (const pid of PRAYER_IDS) {
    perPrayer[pid] = {
      completed: 0,
      kaza: 0,
      missed: 0,
      pending: 0,
      mosque: 0,
      jamat: 0,
      tasbeeh: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
  }

  const byWeekday: SalatAnalyticsResult['byWeekday'] = {};
  for (let w = 0; w < 7; w++) byWeekday[w] = { completed: 0, kaza: 0, missed: 0, total: 0 };
  const timeOfWindow: SalatAnalyticsResult['timeOfWindow'] = {
    early: 0,
    mid: 0,
    late: 0,
    unknown: 0,
  };
  const missedReasons: Record<string, number> = {};
  for (const r of MISSED_REASONS) missedReasons[r] = 0;

  // Iterate every date in the analytics window. Unlogged past days count as 5
  // missed prayers. Pending prayers on past logged days also count as missed.
  for (let i = 0; i < effectiveDays; i++) {
    const dateStr = shiftDateStr(statsCutoff, i);
    if (excused.has(dateStr)) continue;
    const isPast = dateStr < today;
    const log = logMap.get(dateStr);

    const weekday = new Date(dateStr + 'T12:00:00').getDay();

    if (!log) {
      // No log row for this date. Past days = fully missed; today = all pending.
      if (isPast) {
        missedCount += 5;
        for (const pid of PRAYER_IDS) perPrayer[pid].missed++;
        byWeekday[weekday]!.missed += 5;
        byWeekday[weekday]!.total += 5;
      }
      // (today with no log: 5 pending — don't count against completion)
      continue;
    }

    for (const pid of PRAYER_IDS) {
      const entry = log.prayers[pid];
      const s = entry?.status ?? 'pending';
      const loc = entry?.location;
      // On past days, an unresolved pending prayer counts as missed.
      const effective = s === 'pending' && isPast ? 'missed' : s;

      if (effective === 'completed') {
        completedCount++;
        perPrayer[pid].completed++;
        byWeekday[weekday]!.completed++;
        byWeekday[weekday]!.total++;
      } else if (effective === 'kaza') {
        kazaCount++;
        perPrayer[pid].kaza++;
        byWeekday[weekday]!.kaza++;
        byWeekday[weekday]!.total++;
      } else if (effective === 'missed') {
        missedCount++;
        perPrayer[pid].missed++;
        byWeekday[weekday]!.missed++;
        byWeekday[weekday]!.total++;
        const reason = entry?.missedReason;
        if (reason && Object.hasOwn(missedReasons, reason)) missedReasons[reason]!++;
      } else {
        perPrayer[pid].pending++;
      }

      if (effective === 'completed' || effective === 'kaza') {
        if (loc === 'mosque') {
          mosqueCount++;
          jamaatCount++;
          perPrayer[pid].mosque++;
        } else if (loc === 'jamat') {
          jamaatCount++;
          perPrayer[pid].jamat++;
        } else {
          homeCount++;
        }
        if (entry?.tasbeeh) {
          tasbeehCount++;
          perPrayer[pid].tasbeeh++;
        }

        // Punctuality within the prayer's window — only computable when the
        // client sent both bounds at mark time AND we have the mark timestamp.
        if (entry?.windowStart && entry.windowEnd && entry.prayedAt) {
          const winStart = entry.windowStart.getTime();
          const winEnd = entry.windowEnd.getTime();
          const span = winEnd - winStart;
          if (span > 0) {
            const frac = Math.min(1, Math.max(0, (entry.prayedAt.getTime() - winStart) / span));
            if (frac <= 1 / 3) timeOfWindow.early++;
            else if (frac <= 2 / 3) timeOfWindow.mid++;
            else timeOfWindow.late++;
          } else {
            timeOfWindow.unknown++;
          }
        } else {
          timeOfWindow.unknown++;
        }
      }
    }
    if (log.nafl?.completed) naflDays++;

    // Jumu'ah — Friday's Dhuhr, prayed specifically at the mosque.
    if (new Date(dateStr + 'T12:00:00').getDay() === 5) {
      fridayCount++;
      const dhuhr = log.prayers.dhuhr;
      if (
        (dhuhr?.status === 'completed' || dhuhr?.status === 'kaza') &&
        dhuhr.location === 'mosque'
      ) {
        jumuahAttendedCount++;
      }
    }
  }

  const totalDays = Math.max(0, effectiveDays - excused.size);
  const totalPossiblePrayers = totalDays * 5;
  const prayedTotal = completedCount + kazaCount;

  const isAllDone = (date: string): boolean => {
    const log = logMap.get(date);
    if (!log) return false; // a day with no log breaks the streak
    return PRAYER_IDS.every((pid) => {
      const s = log.prayers[pid]?.status;
      return s === 'completed' || s === 'kaza';
    });
  };

  let bestStreak = 0;
  let runStreak = 0;
  for (let i = 0; i < effectiveDays; i++) {
    const date = shiftDateStr(statsCutoff, i);
    if (excused.has(date)) continue; // a rest day neither breaks nor extends a streak
    runStreak = isAllDone(date) ? runStreak + 1 : 0;
    if (runStreak > bestStreak) bestStreak = runStreak;
  }

  let currentStreak = 0;
  let cursor = excused.has(today) || isAllDone(today) ? today : shiftDateStr(today, -1);
  while (cursor >= statsCutoff) {
    if (excused.has(cursor)) {
      cursor = shiftDateStr(cursor, -1);
      continue;
    }
    if (!isAllDone(cursor)) break;
    currentStreak++;
    cursor = shiftDateStr(cursor, -1);
  }

  // Per-prayer streaks — same best/current-run logic as the all-5 streak
  // above, but for one prayer at a time (e.g. "42-day Fajr streak").
  const isPrayerDone = (pid: PrayerId, date: string): boolean => {
    const log = logMap.get(date);
    if (!log) return false;
    const s = log.prayers[pid]?.status;
    return s === 'completed' || s === 'kaza';
  };
  for (const pid of PRAYER_IDS) {
    let pBest = 0;
    let pRun = 0;
    for (let i = 0; i < effectiveDays; i++) {
      const date = shiftDateStr(statsCutoff, i);
      if (excused.has(date)) continue;
      pRun = isPrayerDone(pid, date) ? pRun + 1 : 0;
      if (pRun > pBest) pBest = pRun;
    }
    let pCurrent = 0;
    let pCursor = excused.has(today) || isPrayerDone(pid, today) ? today : shiftDateStr(today, -1);
    while (pCursor >= statsCutoff) {
      if (excused.has(pCursor)) {
        pCursor = shiftDateStr(pCursor, -1);
        continue;
      }
      if (!isPrayerDone(pid, pCursor)) break;
      pCurrent++;
      pCursor = shiftDateStr(pCursor, -1);
    }
    perPrayer[pid].currentStreak = pCurrent;
    perPrayer[pid].bestStreak = pBest;
  }

  // Weekly mosque attendance trend — 7-day buckets ending "today", oldest
  // first, capped at the last 12 weeks so a 1-year view doesn't render 52 bars.
  // Below 14 days, bucket by DAY instead — weekly buckets on a short window
  // (e.g. "current month so far" on the 8th) produce one real 7-day week
  // plus a lopsided 1-day leftover, with x-axis labels a day apart that read
  // as a bug (reported directly by a user looking at exactly this case; see
  // the identical fix in salatDebt.service.ts's getDebtHistory).
  const weeklyMosqueTrend: SalatAnalyticsResult['weeklyMosqueTrend'] = [];
  const mosqueBucketIsDaily = effectiveDays < 14;
  // Up to 12 buckets that together cover the WHOLE window: 7-day weeks for
  // windows up to 12 weeks, wider buckets beyond that (e.g. ~31 days for a
  // year) so a 90d/1y/all-time view isn't silently just its last 12 weeks.
  const bucketDays = mosqueBucketIsDaily ? 1 : Math.max(7, Math.ceil(effectiveDays / 12));
  const totalWeeks = mosqueBucketIsDaily ? effectiveDays : Math.ceil(effectiveDays / bucketDays);
  for (let w = totalWeeks - 1; w >= 0; w--) {
    const weekEnd = shiftDateStr(today, -(w * bucketDays));
    const weekStart = mosqueBucketIsDaily ? weekEnd : shiftDateStr(weekEnd, -(bucketDays - 1));
    const clampedStart = weekStart < statsCutoff ? statsCutoff : weekStart;
    let weekMosque = 0;
    let weekPrayed = 0;
    for (let d = clampedStart; d <= weekEnd; d = shiftDateStr(d, 1)) {
      const log = logMap.get(d);
      if (!log) continue;
      for (const pid of PRAYER_IDS) {
        const entry = log.prayers[pid];
        if (entry?.status === 'completed' || entry?.status === 'kaza') {
          weekPrayed++;
          if (entry.location === 'mosque') weekMosque++;
        }
      }
    }
    weeklyMosqueTrend.push({
      weekStart: clampedStart,
      weekEnd,
      mosqueCount: weekMosque,
      prayedCount: weekPrayed,
      rate: weekPrayed > 0 ? Math.round((weekMosque / weekPrayed) * 100) : 0,
    });
  }

  const countDone = (dateStr: string): number => {
    const log = logMap.get(dateStr);
    if (!log) return 0;
    let done = 0;
    for (const pid of PRAYER_IDS) {
      const s = log.prayers[pid]?.status;
      if (s === 'completed' || s === 'kaza') done++;
    }
    return done;
  };

  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const dateStr = shiftDateStr(today, -i);
    last7Days.push({ date: dateStr, completed: countDone(dateStr), total: 5 });
  }

  const calendarData = [];
  for (let i = calendarDays - 1; i >= 0; i--) {
    const dateStr = shiftDateStr(today, -i);
    calendarData.push({
      date: dateStr,
      completed: countDone(dateStr),
      total: 5,
      logged: logMap.has(dateStr),
    });
  }

  const completionRate =
    totalPossiblePrayers > 0 ? Math.round((prayedTotal / totalPossiblePrayers) * 100) : 0;

  return {
    periodDays: days, // the originally-requested window (before reset clamp)
    totalDays, // actual days counted = effectiveDays (after reset clamp)
    totalPossiblePrayers,
    completedCount,
    kazaCount,
    missedCount,
    prayedTotal,
    mosqueCount,
    jamaatCount,
    homeCount,
    tasbeehCount,
    naflDays,
    fridayCount,
    jumuahAttendedCount,
    completionRate,
    currentStreak,
    bestStreak,
    perPrayer,
    last7Days,
    calendarData,
    weeklyMosqueTrend,
    byWeekday,
    timeOfWindow,
    missedReasons,
  };
}

export interface JourneyPhase {
  index: number;
  from: string; // inclusive start date (YYYY-MM-DD)
  to: string | null; // inclusive end date, null = ongoing
  days: number;
  done: number; // completed + kaza
  missed: number;
  kaza: number;
  completionRate: number;
  resetNote: string | null;
}

export async function getSalatJourney(
  userId: string,
  userCreatedAt: Date,
  resetHistory: Array<{ date: string; note: string }>,
  today: string
): Promise<JourneyPhase[]> {
  const accountStart = userCreatedAt.toISOString().substring(0, 10);

  // Build phase windows: [accountStart, r0), [r0, r1), …, [rN, today]
  const resets = [...resetHistory].sort((a, b) => a.date.localeCompare(b.date));
  const boundaries: string[] = [accountStart, ...resets.map((r) => r.date)];

  const phases: JourneyPhase[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const from = boundaries.at(i);
    if (!from) continue;
    const to = i < boundaries.length - 1 ? shiftDateStr(boundaries.at(i + 1) ?? from, -1) : null;
    const phaseEnd = to ?? today;
    if (from > today) continue; // skip future phases

    const dayCount = Math.max(
      0,
      Math.round(
        (new Date(phaseEnd + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime()) /
          86_400_000
      ) + 1
    );

    // Reuse existing analytics — pass `from` as the resetDate so it acts as cutoff
    const stats = await getSalatAnalytics(userId, Math.max(1, dayCount), phaseEnd, from);
    const resetNote = i < resets.length ? resets.at(i)?.note || null : null;

    phases.push({
      index: i,
      from,
      to,
      days: stats.totalDays,
      done: stats.prayedTotal,
      missed: stats.missedCount,
      kaza: stats.kazaCount,
      completionRate: stats.completionRate,
      resetNote,
    });
  }

  return phases.reverse(); // newest first
}

export interface IshaFajrCorrelation {
  /** False when there isn't enough data yet to say anything meaningful —
   * render nothing rather than a shaky/misleading percentage. */
  available: boolean;
  /** % of days Fajr was prayed on time (not kaza/missed) the morning after
   * an Isha logged before local 11pm. */
  earlyIshaFajrRate: number | null;
  /** Same, for mornings after an Isha logged at/after local 11pm. */
  lateIshaFajrRate: number | null;
  earlySampleSize: number;
  lateSampleSize: number;
}

const CORRELATION_MIN_SAMPLE = 5;
const ISHA_CUTOFF_HOUR = 23; // 11pm local

/**
 * The one correlation insight actually shippable from data already
 * collected (no new "log your bedtime" feature needed): does praying Isha
 * before local 11pm correlate with an on-time Fajr the next morning?
 * Reads `prayedAt` (UTC) off both entries and converts to the user's local
 * hour via the same `timezoneOffset` param every other analytics endpoint
 * already takes. Looks back up to 90 days; needs at least
 * `CORRELATION_MIN_SAMPLE` days in EACH bucket before showing anything —
 * a 2-data-point "71%" would be noise dressed up as insight.
 */
export async function getIshaFajrCorrelation(
  userId: string,
  timezoneOffset: number,
  today?: string
): Promise<IshaFajrCorrelation> {
  const end = today ?? todayDateString();
  const since = shiftDateStr(end, -90);
  const logs = await SalatLog.find({ userId, date: { $gte: since, $lte: end } })
    .select('date prayers.isha.prayedAt prayers.fajr.status')
    .sort({ date: 1 });

  const byDate = new Map(logs.map((l) => [l.date, l]));

  let earlyOnTime = 0,
    earlyTotal = 0,
    lateOnTime = 0,
    lateTotal = 0;

  for (const log of logs) {
    const ishaAt = log.prayers.isha?.prayedAt;
    if (!ishaAt) continue;
    const nextDate = shiftDateStr(log.date, 1);
    const nextLog = byDate.get(nextDate);
    const fajrStatus = nextLog?.prayers.fajr?.status;
    if (!fajrStatus || fajrStatus === 'pending') continue; // next day not resolved yet

    const localHour = new Date(ishaAt.getTime() + timezoneOffset * 60_000).getUTCHours();
    const onTime = fajrStatus === 'completed';
    if (localHour < ISHA_CUTOFF_HOUR) {
      earlyTotal++;
      if (onTime) earlyOnTime++;
    } else {
      lateTotal++;
      if (onTime) lateOnTime++;
    }
  }

  return {
    available: earlyTotal >= CORRELATION_MIN_SAMPLE && lateTotal >= CORRELATION_MIN_SAMPLE,
    earlyIshaFajrRate: earlyTotal ? Math.round((earlyOnTime / earlyTotal) * 100) : null,
    lateIshaFajrRate: lateTotal ? Math.round((lateOnTime / lateTotal) * 100) : null,
    earlySampleSize: earlyTotal,
    lateSampleSize: lateTotal,
  };
}

export async function deleteAllUserSalatLogs(userId: string): Promise<{ deletedCount: number }> {
  const result = await SalatLog.deleteMany({ userId });
  await salatDebtService.deleteDebt(userId);
  return { deletedCount: result.deletedCount ?? 0 };
}
