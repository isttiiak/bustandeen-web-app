import DailyActivity, { IDailyActivity } from '../models/DailyActivity.js';
import User from '../models/User.js';
import SalatLog from '../models/SalatLog.js';
import ZikrDaily from '../models/ZikrDaily.js';
import QuranLog from '../models/QuranLog.js';
import FastingLog from '../models/FastingLog.js';
import { DEFAULT_TIMEZONE_OFFSET } from '../utils/timezone-flexible.js';

/**
 * Daily activity for the admin retention view (audit T4.6): counts only.
 * Days are Bangladesh days (UTC+6), where most users are; the feature counts
 * use each log's own tracking day.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" of `now` in Bangladesh time. */
export function activityDay(now: Date = new Date()): string {
  return new Date(now.getTime() + DEFAULT_TIMEZONE_OFFSET * 60_000).toISOString().slice(0, 10);
}

const shiftDay = (day: string, by: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + by * DAY_MS).toISOString().slice(0, 10);

/**
 * The first activity of a person on a new day adds one to that day's
 * `active`. One conditional write; a second open the same day changes
 * nothing. Best-effort: never fails the request it rides on.
 */
export async function markActive(uid: string, now: Date = new Date()): Promise<void> {
  const day = activityDay(now);
  try {
    const res = await User.updateOne(
      { uid, activeDay: { $ne: day } },
      { $set: { activeDay: day } }
    );
    if (res.modifiedCount === 1) {
      await DailyActivity.updateOne({ _id: day }, { $inc: { active: 1 } }, { upsert: true });
    }
  } catch (err) {
    console.error('Failed to count daily activity:', (err as Error).message);
  }
}

type FeatureCounts = Pick<IDailyActivity, 'salat' | 'zikr' | 'quran' | 'fasting'>;

/** Distinct people per day in `days` for one collection. */
async function distinctPerDay(
  model: typeof SalatLog | typeof QuranLog | typeof FastingLog,
  days: string[],
  extra: Record<string, unknown>
): Promise<Map<string, number>> {
  const rows = await (model as typeof QuranLog).aggregate<{ _id: string; n: number }>([
    { $match: { date: { $in: days }, ...extra } },
    { $group: { _id: { d: '$date', u: '$userId' } } },
    { $group: { _id: '$_id.d', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
}

/** Who logged salat, zikr, Quran and fasting on each day (from the logs). */
export async function computeFeatureCounts(days: string[]): Promise<Map<string, FeatureCounts>> {
  if (days.length === 0) return new Map();
  const sorted = [...days].sort();
  const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const [salat, quran, fasting, zikrRows] = await Promise.all([
    // Done or kaza (marked by the person); "missed" is filled in by the
    // missed-prayer sweep, so it does not count as use.
    distinctPerDay(SalatLog, days, {
      $or: [
        ...PRAYERS.map((p) => ({ [`prayers.${p}.status`]: { $in: ['completed', 'kaza'] } })),
        { 'nafl.completed': true },
      ],
    }),
    distinctPerDay(QuranLog, days, {
      $or: [{ pages: { $gt: 0 } }, { ayat: { $gt: 0 } }, { durationSec: { $gt: 0 } }],
    }),
    distinctPerDay(FastingLog, days, {}),
    // ZikrDaily.date is the bucket anchor of the person's tracking day: its
    // UTC date part IS that day for every offset (bucketDateForDayString).
    ZikrDaily.aggregate<{ _id: string; n: number }>([
      {
        $match: {
          count: { $gt: 0 },
          date: {
            $gte: new Date(`${sorted[0]}T00:00:00Z`),
            $lt: new Date(Date.parse(`${sorted[sorted.length - 1]}T00:00:00Z`) + DAY_MS),
          },
        },
      },
      {
        $project: {
          userId: 1,
          d: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' },
          },
        },
      },
      { $match: { d: { $in: days } } },
      { $group: { _id: { d: '$d', u: '$userId' } } },
      { $group: { _id: '$_id.d', n: { $sum: 1 } } },
    ]),
  ]);
  const zikr = new Map(zikrRows.map((r) => [r._id, r.n]));
  return new Map(
    days.map((d) => [
      d,
      {
        salat: salat.get(d) ?? 0,
        zikr: zikr.get(d) ?? 0,
        quran: quran.get(d) ?? 0,
        fasting: fasting.get(d) ?? 0,
      },
    ])
  );
}

export interface DailyActivityPoint {
  day: string;
  /** People who opened the app; null before counting started. */
  active: number | null;
  salat: number;
  zikr: number;
  quran: number;
  fasting: number;
}

export interface DailyActivitySeries {
  days: DailyActivityPoint[];
  /** First day with an opened-the-app count, or null if none yet. */
  activeSince: string | null;
}

/**
 * The last `count` days (today included). Finished days without stored
 * feature counts get them computed once and saved; today is computed live
 * and not saved (it is still changing).
 */
export async function getDailySeries(
  count = 90,
  now: Date = new Date()
): Promise<DailyActivitySeries> {
  const today = activityDay(now);
  const days = Array.from({ length: count }, (_, i) => shiftDay(today, i - count + 1));
  const docs = await DailyActivity.find({ _id: { $in: days } }).lean();
  const byDay = new Map(docs.map((d) => [d._id, d]));

  const missing = days.filter((d) => d !== today && !byDay.get(d)?.featuresAt);
  const toCompute = [...missing, today];
  const computed = await computeFeatureCounts(toCompute);
  if (missing.length) {
    const featuresAt = new Date();
    await DailyActivity.bulkWrite(
      missing.map((d) => ({
        updateOne: {
          filter: { _id: d },
          update: { $set: { ...computed.get(d), featuresAt } },
          upsert: true,
        },
      }))
    );
  }

  const first = await DailyActivity.findOne({ active: { $exists: true } })
    .sort({ _id: 1 })
    .select('_id')
    .lean();
  const activeSince = first?._id ?? null;

  return {
    activeSince,
    days: days.map((d) => {
      const doc = byDay.get(d);
      const f = computed.get(d) ?? doc ?? {};
      return {
        day: d,
        active: activeSince && d >= activeSince ? (doc?.active ?? 0) : null,
        salat: f.salat ?? 0,
        zikr: f.zikr ?? 0,
        quran: f.quran ?? 0,
        fasting: f.fasting ?? 0,
      };
    }),
  };
}
