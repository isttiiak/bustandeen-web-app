import FastingLog from '../models/FastingLog.js';
import SalatLog from '../models/SalatLog.js';
import { PRAYER_IDS } from '../models/SalatLog.js';
import QuranLog from '../models/QuranLog.js';
import ZikrDaily from '../models/ZikrDaily.js';
import { unitsOf } from './quran.service.js';
import { dayRange, DEFAULT_TIMEZONE_OFFSET, getTodayString } from '../utils/timezone-flexible.js';

/** Shift a YYYY-MM-DD date string by `delta` days (pure string math, no TZ). */
function shiftDateStr(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().substring(0, 10);
}

export interface WorshipGroup {
  /** Number of days in this group within the window. */
  days: number;
  /** Mean salat completion rate (0-100) across the group's days — a day
   * with no log counts as 0 (matches getSalatAnalytics' own convention). */
  avgSalatCompletionPct: number | null;
  /** Mean total zikr count per day across the group. */
  avgZikrCount: number | null;
  /** Mean Quran units (ayat-equivalents; unitsOf()) read per day. */
  avgQuranUnits: number | null;
}

export interface WorshipCorrelationResult {
  windowDays: number;
  fastingDays: WorshipGroup;
  nonFastingDays: WorshipGroup;
  /** True when either group has too few days for the comparison to mean
   * anything — the UI should hide itself rather than show noisy averages. */
  insufficientData: boolean;
}

const MIN_SAMPLE_DAYS = 3;

/**
 * Compares worship consistency on days the user actually completed a fast
 * against days they didn't, over the same window — "does fasting come with
 * more/less zikr, salat, and Quran, for you specifically." A self-relative
 * A/B comparison, not a claim of causation.
 */
export async function getWorshipCorrelation(
  userId: string,
  days: number,
  today?: string,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET
): Promise<WorshipCorrelationResult> {
  // Callers send the tracking day; without one, the user's civil day (was UTC)
  const end = today ?? getTodayString(timezoneOffset);
  const start = shiftDateStr(end, -(days - 1));

  const [fastingLogs, salatLogs, quranLogs, zikrRecords] = await Promise.all([
    FastingLog.find({ userId, date: { $gte: start, $lte: end }, status: 'completed' }),
    SalatLog.find({ userId, date: { $gte: start, $lte: end } }),
    QuranLog.find({ userId, date: { $gte: start, $lte: end } }),
    // By date: every bucket of these days, whatever offset it was saved under
    ZikrDaily.find({ userId, date: dayRange(start, end) }),
  ]);

  const fastingSet = new Set(fastingLogs.map((f) => f.date));
  const salatByDate = new Map(salatLogs.map((l) => [l.date, l]));
  const quranByDate = new Map(quranLogs.map((l) => [l.date, l]));
  const zikrByDate = new Map<string, number>();
  for (const r of zikrRecords) {
    const key = r.date.toISOString().split('T')[0]!;
    zikrByDate.set(key, (zikrByDate.get(key) ?? 0) + r.count);
  }

  const fasting = { salat: [] as number[], zikr: [] as number[], quran: [] as number[] };
  const nonFasting = { salat: [] as number[], zikr: [] as number[], quran: [] as number[] };

  for (let d = start; d <= end; d = shiftDateStr(d, 1)) {
    const bucket = fastingSet.has(d) ? fasting : nonFasting;

    // Salat completion for the day — a past day with no log is 0 (fully
    // missed), matching getSalatAnalytics; today with no log is skipped
    // entirely since it isn't resolved yet and would bias today's partial day.
    const log = salatByDate.get(d);
    if (log) {
      let done = 0;
      for (const pid of PRAYER_IDS) {
        const s = log.prayers[pid]?.status;
        if (s === 'completed' || s === 'kaza') done++;
      }
      bucket.salat.push((done / PRAYER_IDS.length) * 100);
    } else if (d < end) {
      bucket.salat.push(0);
    }

    bucket.zikr.push(zikrByDate.get(d) ?? 0);
    bucket.quran.push(unitsOf(quranByDate.get(d)));
  }

  const avg = (arr: number[]): number | null =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  const totalDays =
    Math.round(
      (new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) / 86_400_000
    ) + 1;
  const fastingDayCount = fastingSet.size;
  const nonFastingDayCount = totalDays - fastingDayCount;

  return {
    windowDays: days,
    fastingDays: {
      days: fastingDayCount,
      avgSalatCompletionPct: avg(fasting.salat),
      avgZikrCount: avg(fasting.zikr),
      avgQuranUnits: avg(fasting.quran),
    },
    nonFastingDays: {
      days: nonFastingDayCount,
      avgSalatCompletionPct: avg(nonFasting.salat),
      avgZikrCount: avg(nonFasting.zikr),
      avgQuranUnits: avg(nonFasting.quran),
    },
    insufficientData: fastingDayCount < MIN_SAMPLE_DAYS || nonFastingDayCount < MIN_SAMPLE_DAYS,
  };
}
