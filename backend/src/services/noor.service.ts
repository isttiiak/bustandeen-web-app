import SalatLog, { PRAYER_IDS } from '../models/SalatLog.js';
import FastingLog from '../models/FastingLog.js';
import QuranLog from '../models/QuranLog.js';
import QuranProfile from '../models/QuranProfile.js';
import ZikrGoal from '../models/ZikrGoal.js';
import ZikrDaily from '../models/ZikrDaily.js';
import HifzLog from '../models/HifzLog.js';
import { getExcusedIntervals } from './cycle.service.js';

/**
 * Noor v2: the daily score behind the leaderboard and the navbar capsules.
 * One formula for a day, used for today, past days, the weekly average and the
 * all-time total, so the numbers can never disagree with each other.
 *
 * A day starts at 0 and can only go UP as the day goes on (nothing is
 * pro-rated by the clock, so a score never falls while you do nothing wrong).
 *
 *   Ordinary day (max 100)
 *     50  fard prayers, 10 each (kaza of the day's prayer counts)
 *     15  zikr today vs your own daily goal
 *     15  Quran today (reading or listening) vs your own daily goal
 *     10  steadiness: 1 per day of your run of active days, up to 10, and only
 *         once you have done something TODAY (no head start for a long streak)
 *     10  extras, 5 each, best two of: fasting (completed), nafl prayer,
 *         hifz review, salawat/istighfar
 *
 *   Excused day (Rayhanah, max 100) - prayer and fasting are paused, so:
 *     40  zikr vs goal   40  Quran (listening counts) vs goal
 *     10  steadiness     10  extras: salawat/istighfar 5, hifz review 5
 *
 * An "active day" (for steadiness) is any day with a non-zero base score.
 */
export const NOOR_WEIGHTS = {
  salatEach: 10,
  zikr: 15,
  quran: 15,
  steadyMax: 10,
  extraEach: 5,
  excused: { zikr: 40, quran: 40, extraEach: 5 },
} as const;

export interface DayInputs {
  salatDone: number;
  zikr: number;
  zikrGoal: number;
  quran: number;
  quranGoal: number;
  fasted: boolean;
  nafl: boolean;
  hifz: boolean;
  salawat: boolean;
  excused: boolean;
}

export interface DayNoor {
  score: number;
  /** Number of distinct good acts done that day. A tie-break, not a score. */
  acts: number;
  /** Score before the steadiness bonus; > 0 means an active day. */
  base: number;
}

const ratio = (n: number, goal: number): number => Math.min(1, goal > 0 ? n / goal : n > 0 ? 1 : 0);

/** Score for one day, given the length of the active-day run that ends on it. */
export function computeDayNoor(i: DayInputs, activeRun: number): DayNoor {
  let base: number;
  let extrasCount: number;
  if (i.excused) {
    extrasCount = (i.salawat ? 1 : 0) + (i.hifz ? 1 : 0);
    base =
      Math.round(ratio(i.zikr, i.zikrGoal) * NOOR_WEIGHTS.excused.zikr) +
      Math.round(ratio(i.quran, i.quranGoal) * NOOR_WEIGHTS.excused.quran) +
      extrasCount * NOOR_WEIGHTS.excused.extraEach;
  } else {
    const candidates =
      (i.fasted ? 1 : 0) + (i.nafl ? 1 : 0) + (i.hifz ? 1 : 0) + (i.salawat ? 1 : 0);
    extrasCount = Math.min(2, candidates);
    base =
      Math.min(5, i.salatDone) * NOOR_WEIGHTS.salatEach +
      Math.round(ratio(i.zikr, i.zikrGoal) * NOOR_WEIGHTS.zikr) +
      Math.round(ratio(i.quran, i.quranGoal) * NOOR_WEIGHTS.quran) +
      extrasCount * NOOR_WEIGHTS.extraEach;
  }
  const steady = base > 0 ? Math.min(NOOR_WEIGHTS.steadyMax, Math.max(1, activeRun)) : 0;
  const acts =
    (i.excused ? 0 : Math.min(5, i.salatDone)) +
    (i.zikr > 0 ? 1 : 0) +
    (i.quran > 0 ? 1 : 0) +
    extrasCount;
  return { score: base + steady, acts, base };
}

function shift(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().substring(0, 10);
}

const SALAWAT_DB_REGEX = 'salawat|ṣalawāt|durud|darood|salat.?.?ala|istighfar|astaghfir';

/**
 * Daily Noor for every day in `from`..`to` (inclusive), keyed by YYYY-MM-DD.
 * Loads a few extra days before `from` so the steadiness run is right on the
 * first day requested. Days with no activity are present with score 0.
 */
export async function loadNoorSeries(
  userId: string,
  from: string,
  to: string
): Promise<Map<string, DayNoor>> {
  const loadFrom = shift(from, -NOOR_WEIGHTS.steadyMax);
  const [salatLogs, zikrRows, quranLogs, fastLogs, hifzLogs, zikrGoalDoc, quranProfile, intervals] =
    await Promise.all([
      SalatLog.find({ userId, date: { $gte: loadFrom, $lte: to } }).select('date prayers nafl'),
      ZikrDaily.aggregate([
        {
          $match: {
            userId,
            date: {
              $gte: new Date(loadFrom + 'T00:00:00.000Z'),
              $lt: new Date(shift(to, 1) + 'T00:00:00.000Z'),
            },
          },
        },
        {
          $group: {
            _id: '$date',
            total: { $sum: '$count' },
            salawat: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: { input: '$zikrType', regex: SALAWAT_DB_REGEX, options: 'i' },
                  },
                  '$count',
                  0,
                ],
              },
            },
          },
        },
      ]) as Promise<Array<{ _id: Date; total: number; salawat: number }>>,
      QuranLog.find({ userId, date: { $gte: loadFrom, $lte: to } }).select('date pages ayat'),
      FastingLog.find({ userId, status: 'completed', date: { $gte: loadFrom, $lte: to } }).select(
        'date'
      ),
      HifzLog.find({ userId, date: { $gte: loadFrom, $lte: to } }).select('date revisionCount'),
      ZikrGoal.findOne({ userId }),
      QuranProfile.findOne({ userId }).select('dailyGoalAyat'),
      getExcusedIntervals(userId),
    ]);

  const zikrGoal = zikrGoalDoc?.dailyTarget ?? 100;
  const quranGoal = quranProfile?.dailyGoalAyat ?? 20;

  const salatByDay = new Map<string, number>();
  const naflDays = new Set<string>();
  for (const log of salatLogs) {
    let done = 0;
    for (const pid of PRAYER_IDS) {
      const st = log.prayers[pid]?.status;
      if (st === 'completed' || st === 'kaza') done++;
    }
    salatByDay.set(log.date, done);
    if (log.nafl?.completed) naflDays.add(log.date);
  }
  const zikrByDay = new Map<string, number>();
  const salawatDays = new Set<string>();
  for (const r of zikrRows) {
    // Bucket convention: the UTC date part equals the user's local date
    const k = new Date(r._id).toISOString().split('T')[0] ?? '';
    zikrByDay.set(k, (zikrByDay.get(k) ?? 0) + r.total);
    if ((r.salawat ?? 0) > 0) salawatDays.add(k);
  }
  const quranByDay = new Map(
    quranLogs.map((l) => [l.date, Math.round((l.ayat ?? 0) + (l.pages ?? 0) * 10)])
  );
  const fastDays = new Set(fastLogs.map((l) => l.date));
  const hifzDays = new Set(hifzLogs.filter((h) => (h.revisionCount ?? 0) > 0).map((h) => h.date));

  const isExcused = (day: string): boolean =>
    intervals.some((iv) => iv.start <= day && (iv.end === null ? day <= to : day <= iv.end));

  const out = new Map<string, DayNoor>();
  let run = 0;
  for (let day = loadFrom; day <= to; day = shift(day, 1)) {
    const inputs: DayInputs = {
      salatDone: salatByDay.get(day) ?? 0,
      zikr: zikrByDay.get(day) ?? 0,
      zikrGoal,
      quran: quranByDay.get(day) ?? 0,
      quranGoal,
      fasted: fastDays.has(day),
      nafl: naflDays.has(day),
      hifz: hifzDays.has(day),
      salawat: salawatDays.has(day),
      excused: isExcused(day),
    };
    // First learn whether the day is active (extends or resets the run), then
    // score it with the run length that ends on it.
    const probe = computeDayNoor(inputs, 1);
    run = probe.base > 0 ? run + 1 : 0;
    const result = computeDayNoor(inputs, run);
    if (day >= from) out.set(day, result);
  }
  return out;
}

/** The Friday on or before `day` (the app's week runs Friday to Thursday). */
export function weekStartFriday(day: string): string {
  const dow = new Date(day + 'T12:00:00Z').getUTCDay(); // 0 Sun .. 5 Fri .. 6 Sat
  return shift(day, -((dow + 2) % 7));
}

export interface NoorSummary {
  today: DayNoor;
  /** Average daily Noor this Fri-Thu week so far (days with nothing count 0). */
  week: number;
  /** Average of the user's active days in the previous 14, or null with fewer than 3. */
  usual: number | null;
}

export async function getNoorSummary(userId: string, today: string): Promise<NoorSummary> {
  const weekStart = weekStartFriday(today);
  const from = shift(today, -14);
  const series = await loadNoorSeries(userId, from, today);
  const todayNoor = series.get(today) ?? { score: 0, acts: 0, base: 0 };

  let weekSum = 0;
  let weekDays = 0;
  for (let d = weekStart; d <= today; d = shift(d, 1)) {
    weekSum += series.get(d)?.score ?? 0;
    weekDays++;
  }

  const past: number[] = [];
  for (let d = from; d < today; d = shift(d, 1)) {
    const s = series.get(d)?.score ?? 0;
    if (s > 0) past.push(s);
  }
  const usual = past.length >= 3 ? Math.round(past.reduce((a, b) => a + b, 0) / past.length) : null;

  return { today: todayNoor, week: weekDays ? Math.round(weekSum / weekDays) : 0, usual };
}

/** Sum of daily Noor over the last 365 days (only ever grows). */
export async function getAllTimeNoor(userId: string, end: string): Promise<number> {
  const series = await loadNoorSeries(userId, shift(end, -364), end);
  let total = 0;
  for (const v of series.values()) total += v.score;
  return total;
}
