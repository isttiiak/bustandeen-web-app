import User from '../models/User.js';
import ZikrDaily from '../models/ZikrDaily.js';
import ZikrEvent from '../models/ZikrEvent.js';
import { resetAreas, resetDateFor } from './statsReset.service.js';
import {
  truncateToTimezone,
  bucketDateForDayString,
  DEFAULT_TIMEZONE_OFFSET,
} from '../utils/timezone-flexible.js';
import { ZikrIncrementItem } from '../types/api.types.js';

export interface IncrementResult {
  totalCount: number;
  zikrTotals: Record<string, number>;
}

// Fields needed by increment/summary paths. Excludes photoUrl (can be a large
// base64 data URL) so hot paths never drag it out of the database.
const ZIKR_PROJECTION = 'uid totalCount zikrTotals zikrTypes';

/**
 * Applies increments atomically with $inc so concurrent flushes from two
 * tabs/devices can't overwrite each other (the previous read-modify-write
 * via user.save() lost counts under concurrency).
 */
async function applyIncrements(
  userId: string,
  increments: ZikrIncrementItem[],
  timezoneOffset: number
): Promise<IncrementResult> {
  const userInc: Record<string, number> = {};
  const newTypeNames = new Set<string>();
  const events: {
    userId: string;
    zikrType: string;
    amount: number;
    ts: Date;
    startTs?: Date;
    manual?: boolean;
  }[] = [];
  let totalAdded = 0;

  for (const item of increments) {
    const { zikrType, amount = 1, ts, realTs, startTs, untimedAmount = 0, manual } = item;
    if (!zikrType || !Number.isFinite(amount) || amount === 0) continue;

    const date = truncateToTimezone(ts ?? Date.now(), timezoneOffset);
    // The delta actually applied to the day bucket — for decrements this can
    // be smaller in magnitude than `amount` (buckets clamp at 0), and the
    // lifetime totals must move by exactly the same applied delta.
    let applied = amount;
    try {
      if (amount > 0) {
        await ZikrDaily.updateOne(
          { userId, date, zikrType },
          { $inc: { count: amount } },
          { upsert: true }
        );
      } else {
        // Atomic clamp-at-zero via pipeline update. Mongoose v9 requires
        // updatePipeline:true when the update is an array, and returnDocument
        // instead of the deprecated `new` option.
        const before = await ZikrDaily.findOneAndUpdate(
          { userId, date, zikrType },
          [{ $set: { count: { $max: [0, { $add: [{ $ifNull: ['$count', 0] }, amount] }] } } }],
          { returnDocument: 'before', updatePipeline: true }
        );
        const prev = before?.count ?? 0;
        applied = Math.max(0, prev + amount) - prev; // ≤ 0, never past the bucket
      }
    } catch {
      // Ignore duplicate key race conditions
    }

    if (applied !== 0) {
      userInc[`zikrTotals.${zikrType}`] = (userInc[`zikrTotals.${zikrType}`] ?? 0) + applied;
      totalAdded += applied;
    }
    if (amount > 0) {
      newTypeNames.add(zikrType);
      // Log the real tap moment for time-of-day/session analytics — `ts`
      // above is anchored to the tracking day's midday and can't tell us when
      // during the day this actually happened.
      if (manual) {
        // Typed in afterwards: keep it (so the day's history is complete) but
        // with no clock time — `ts` is just the day anchor.
        events.push({ userId, zikrType, amount, ts: new Date(ts ?? Date.now()), manual: true });
      } else {
        // Only the tapped part is a real-time event; the untimed part (salat
        // tracker tasbīḥ etc.) counts toward totals but is not a session.
        const tapped = amount - untimedAmount;
        if (tapped > 0) {
          const end = new Date(realTs ?? ts ?? Date.now());
          const start = startTs && startTs < end.getTime() ? new Date(startTs) : undefined;
          events.push({
            userId,
            zikrType,
            amount: tapped,
            ts: end,
            ...(start ? { startTs: start } : {}),
          });
        }
      }
    }
  }

  if (totalAdded !== 0 || Object.keys(userInc).length) {
    await User.updateOne(
      { uid: userId },
      { $inc: { ...userInc, totalCount: totalAdded }, $set: { lastActiveAt: new Date() } }
    );
  }
  if (events.length) {
    // Best-effort — never let analytics logging fail the actual increment.
    await ZikrEvent.insertMany(events).catch(() => {});
  }

  const user = await User.findOne({ uid: userId }).select(ZIKR_PROJECTION);
  if (!user) throw new Error('User not found');

  // Register any brand-new type names (case-insensitive, deduped by pre-save hook)
  let typesChanged = false;
  for (const name of newTypeNames) {
    if (!user.zikrTypes.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      user.zikrTypes.push({ name } as never);
      typesChanged = true;
    }
  }
  if (typesChanged) await user.save();

  return {
    totalCount: user.totalCount,
    zikrTotals: Object.fromEntries(user.zikrTotals ?? []),
  };
}

export async function incrementZikr(
  userId: string,
  zikrType: string,
  amount: number,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET,
  ts?: number,
  realTs?: number
): Promise<IncrementResult> {
  return applyIncrements(userId, [{ zikrType, amount, ts, realTs }], timezoneOffset);
}

export async function batchIncrementZikr(
  userId: string,
  increments: ZikrIncrementItem[],
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET
): Promise<IncrementResult> {
  return applyIncrements(userId, increments, timezoneOffset);
}

/** One tracking day's counts per zikr. A bucket's UTC date part is the
 * user's local day (timezone-flexible.ts), so the day is a UTC-date range;
 * that also catches a bucket written under another timezone offset. */
export async function getDayCounts(userId: string, day: string): Promise<Record<string, number>> {
  const from = new Date(`${day}T00:00:00.000Z`);
  const to = new Date(from.getTime() + 86_400_000);
  const docs = await ZikrDaily.find({ userId, date: { $gte: from, $lt: to } }).select(
    'zikrType count'
  );
  const out = new Map<string, number>();
  for (const d of docs) out.set(d.zikrType, (out.get(d.zikrType) ?? 0) + d.count);
  return Object.fromEntries(out);
}

/**
 * "Correct a day" (U7, the U4 gap): set the exact count of each given zikr
 * on a PAST tracking day (yesterday back to 30 days). The day's buckets are
 * set, and the lifetime totals move by the difference (never below 0).
 * Streak, goal days and Noor are derived from the buckets, so they follow.
 * Counter sessions (ZikrEvent) are left as they were.
 */
export async function correctDay(
  userId: string,
  day: string,
  today: string,
  counts: Record<string, number>,
  maxDays: number
): Promise<Record<string, number>> {
  const DAY_MS = 86_400_000;
  const dayMs = Date.parse(`${day}T00:00:00.000Z`);
  const todayMs = Date.parse(`${today}T00:00:00.000Z`);
  if (!(dayMs < todayMs && dayMs >= todayMs - maxDays * DAY_MS)) {
    throw Object.assign(new Error(`Only the last ${maxDays} days can be corrected.`), {
      statusCode: 400,
    });
  }
  const from = new Date(dayMs);
  const to = new Date(dayMs + DAY_MS);

  const deltas = new Map<string, number>();
  for (const [zikrType, target] of Object.entries(counts)) {
    const docs = await ZikrDaily.find({ userId, zikrType, date: { $gte: from, $lt: to } }).sort({
      date: 1,
    });
    const current = docs.reduce((n, d) => n + d.count, 0);
    if (target === current) continue;
    const [first, ...rest] = docs;
    if (first) {
      first.count = target;
      await first.save();
      for (const d of rest) {
        d.count = 0;
        await d.save();
      }
    } else {
      // No bucket yet for that day: anchored like every other bucket
      // (the date's own midnight UTC keeps the UTC date = the local day).
      await ZikrDaily.create({ userId, date: from, zikrType, count: target });
    }
    deltas.set(zikrType, target - current);
  }

  if (deltas.size) {
    // One update moves every running total by its difference, clamped at 0.
    const clampAdd = (current: unknown, delta: number) => ({
      $max: [0, { $add: [{ $ifNull: [current, 0] }, delta] }],
    });
    let totals: unknown = { $ifNull: ['$zikrTotals', {}] };
    let sum = 0;
    for (const [zikrType, delta] of deltas) {
      sum += delta;
      totals = {
        $setField: {
          field: { $literal: zikrType },
          input: totals,
          value: clampAdd({ $getField: { field: { $literal: zikrType }, input: totals } }, delta),
        },
      };
    }
    await User.updateOne(
      { uid: userId },
      [{ $set: { totalCount: clampAdd('$totalCount', sum), zikrTotals: totals } }],
      { updatePipeline: true }
    );
  }
  return getDayCounts(userId, day);
}

/** Zikr totals from a fresh-start day on (U7), from the daily buckets. A
 * bucket's UTC date part is the user's local day (timezone-flexible.ts), so
 * a plain midnight-UTC bound selects exactly the days >= `day`. */
export async function zikrTotalsSince(
  userId: string,
  day: string
): Promise<{ totalCount: number; perType: Array<{ zikrType: string; total: number }> }> {
  const rows = (await ZikrDaily.aggregate([
    { $match: { userId, date: { $gte: new Date(`${day}T00:00:00.000Z`) } } },
    { $group: { _id: '$zikrType', total: { $sum: '$count' } } },
  ])) as Array<{ _id: string; total: number }>;
  const perType = rows
    .filter((r) => r.total > 0)
    .map((r) => ({ zikrType: r._id, total: r.total }))
    .sort((a, b) => b.total - a.total);
  return { totalCount: perType.reduce((n, r) => n + r.total, 0), perType };
}

export async function getZikrSummary(
  userId: string,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET,
  todayStr?: string
): Promise<{
  totalCount: number;
  perType: Array<{ zikrType: string; total: number }>;
  types: unknown[];
  today: { total: number; perType: Record<string, number> };
  /** Fresh-start day the totals count from (U7), or null. */
  since: string | null;
  /** Every phase together (the stored running total). */
  lifetimeTotal: number;
}> {
  const user = await User.findOne({ uid: userId }).select(ZIKR_PROJECTION);
  if (!user) throw new Error('User not found');

  // Today's buckets — the DB is the source of truth for the day count so every
  // browser/device shows the same number (localStorage is only a tap buffer).
  const todayDate =
    (todayStr ? bucketDateForDayString(todayStr, timezoneOffset) : null) ??
    truncateToTimezone(Date.now(), timezoneOffset);
  const todayDocs = await ZikrDaily.find({ userId, date: todayDate }).select('zikrType count');
  const todayPerType: Record<string, number> = {};
  let todayTotal = 0;
  for (const d of todayDocs) {
    todayPerType[d.zikrType] = d.count;
    todayTotal += d.count;
  }

  let perType: Array<{ zikrType: string; total: number }> = [];
  if (user.zikrTotals instanceof Map) {
    perType = [...user.zikrTotals.entries()].map(([zikrType, total]) => ({ zikrType, total }));
  } else if (user.zikrTotals && typeof user.zikrTotals === 'object') {
    perType = Object.entries(user.zikrTotals as unknown as Record<string, number>).map(
      ([zikrType, total]) => ({ zikrType, total })
    );
  }

  const since = await resetDateFor(userId, 'zikr');
  const sinceTotals = since ? await zikrTotalsSince(userId, since) : null;

  return {
    totalCount: sinceTotals ? sinceTotals.totalCount : (user.totalCount ?? 0),
    perType: sinceTotals ? sinceTotals.perType : perType.sort((a, b) => b.total - a.total),
    types: user.zikrTypes,
    today: { total: todayTotal, perType: todayPerType },
    since,
    lifetimeTotal: user.totalCount ?? 0,
  };
}

function offsetToUtcTzString(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

/** Total counts by local hour-of-day (0-23) over the last `days` — "when
 * during the day do I count most?". Only positive taps are logged as events. */
export async function getTimeOfDayDistribution(
  userId: string,
  days: number = 30,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET
): Promise<Array<{ hour: number; total: number }>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = (await ZikrEvent.aggregate([
    { $match: { userId, ts: { $gte: since }, manual: { $ne: true } } },
    {
      $group: {
        _id: { $hour: { date: '$ts', timezone: offsetToUtcTzString(timezoneOffset) } },
        total: { $sum: '$amount' },
      },
    },
  ])) as Array<{ _id: number; total: number }>;

  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0 }));
  for (const r of rows) {
    if (r._id >= 0 && r._id < 24) hours[r._id]!.total = r.total;
  }
  return hours;
}

const SESSION_GAP_MS = 20 * 60 * 1000; // a 20-min quiet gap starts a new session

export interface ZikrSession {
  start: Date;
  end: Date;
  total: number;
  perType: Record<string, number>;
  /** Counts typed in afterwards ("Log missed counts") — no real clock time. */
  manual?: boolean;
}

/** Groups the day's raw taps into sessions (a run of taps with no gap longer
 * than SESSION_GAP_MS) — "what did I count, and when, today?". `date` is the
 * LOCAL CIVIL day (midnight-to-midnight in `timezoneOffset`), not the
 * Fajr-anchored tracking day ZikrDaily uses — a calendar-date picker is the
 * expected UI for this, so civil days are the intuitive boundary here. */
export async function getSessionsForDay(
  userId: string,
  dateStr: string,
  timezoneOffset: number = DEFAULT_TIMEZONE_OFFSET
): Promise<ZikrSession[]> {
  // NOTE: bucketDateForDayString's anchor is a symbolic bucket KEY (chosen so
  // its ISO date part equals dateStr), not a real "local midnight" instant —
  // wrong tool for range-filtering raw timestamps. Compute the actual UTC
  // instant of local midnight directly instead.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return [];
  const [, y, mo, d] = m;
  const start = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)) - timezoneOffset * 60_000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const events = await ZikrEvent.find({ userId, ts: { $gte: start, $lt: end } })
    .sort({ ts: 1 })
    .select('zikrType amount ts startTs manual');

  const sessions: ZikrSession[] = [];
  let current: ZikrSession | null = null;
  let lastEnd = 0;
  const manualEntry: ZikrSession = {
    start: start,
    end: start,
    total: 0,
    perType: {},
    manual: true,
  };

  for (const e of events) {
    if (e.manual) {
      manualEntry.total += e.amount;
      manualEntry.perType[e.zikrType] = (manualEntry.perType[e.zikrType] ?? 0) + e.amount;
      continue;
    }
    const evStart = e.startTs && e.startTs < e.ts ? e.startTs : e.ts;
    if (!current || evStart.getTime() - lastEnd > SESSION_GAP_MS) {
      current = { start: evStart, end: e.ts, total: 0, perType: {} };
      sessions.push(current);
    }
    if (evStart < current.start) current.start = evStart;
    if (e.ts > current.end) current.end = e.ts;
    current.total += e.amount;
    current.perType[e.zikrType] = (current.perType[e.zikrType] ?? 0) + e.amount;
    lastEnd = Math.max(lastEnd, e.ts.getTime());
  }

  // Manually logged counts have no clock time, so they sit after the timed
  // sessions as a single "logged manually" row for the day.
  if (manualEntry.total > 0) sessions.push(manualEntry);

  return sessions;
}

export async function getZikrTypes(userId: string): Promise<unknown[]> {
  const user = await User.findOne({ uid: userId }).select('zikrTypes');
  return user?.zikrTypes ?? [];
}

export async function addZikrType(userId: string, name: string): Promise<unknown[]> {
  const user = await User.findOne({ uid: userId }).select(ZIKR_PROJECTION);
  if (!user) throw new Error('User not found');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose DocumentArray subdocument typing doesn't expose `.name` cleanly here
  if (!user.zikrTypes.some((t: any) => (t.name as string).toLowerCase() === name.toLowerCase())) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DocumentArray#push rejects a plain object under the subdocument's strict type
    (user.zikrTypes as any).push({ name });
    await user.save();
  }
  return user.zikrTypes;
}

/**
 * Rename a zikr type, carrying its history along (Istiak's spec — full edit):
 * the dropdown entry, the lifetime total (zikrTotals Map key) and every
 * ZikrDaily bucket move to the new name. Rejects when the new name already
 * exists as a separate entry (merge-by-rename would be too easy to trigger by
 * accident). Historic buckets that somehow already use the new name are merged
 * additively so the unique index never throws.
 */
export async function renameZikrType(
  userId: string,
  oldName: string,
  newName: string
): Promise<unknown[]> {
  const user = await User.findOne({ uid: userId }).select(ZIKR_PROJECTION);
  if (!user) throw new Error('User not found');

  const oldLower = oldName.toLowerCase();
  const newLower = newName.toLowerCase();

  const entry = user.zikrTypes.find((t: { name: string }) => t.name.toLowerCase() === oldLower);
  if (!entry) {
    const err = new Error('Zikr not found in your list') as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  if (
    oldLower !== newLower &&
    user.zikrTypes.some((t: { name: string }) => t.name.toLowerCase() === newLower)
  ) {
    const err = new Error('A zikr with that name already exists') as Error & { status?: number };
    err.status = 409;
    throw err;
  }
  if (entry.name === newName) return user.zikrTypes; // nothing to do

  entry.name = newName;

  // Move the lifetime total to the new key (merge if a stale key exists)
  const totals = user.zikrTotals;
  const oldTotal = totals.get(oldName) ?? 0;
  if (oldTotal > 0 || totals.has(oldName)) {
    totals.set(newName, (totals.get(newName) ?? 0) + oldTotal);
    totals.delete(oldName);
    user.markModified('zikrTotals');
  }
  await user.save();

  // Move daily buckets. A plain updateMany would violate the unique
  // userId+date+zikrType index if a bucket already exists under the new name,
  // so merge additively per date instead.
  const oldDocs = await ZikrDaily.find({ userId, zikrType: oldName }).select('date count').lean();
  if (oldDocs.length > 0) {
    await ZikrDaily.bulkWrite(
      oldDocs.map((d) => ({
        updateOne: {
          filter: { userId, date: d.date, zikrType: newName },
          update: { $inc: { count: d.count } },
          upsert: true,
        },
      }))
    );
    await ZikrDaily.deleteMany({ userId, zikrType: oldName });
  }

  return user.zikrTypes;
}

/** Remove a custom zikr type from the user's list (case-insensitive). Lifetime
 * totals in the zikr Map are left untouched — only the dropdown entry is gone. */
export async function removeZikrType(userId: string, name: string): Promise<unknown[]> {
  const user = await User.findOne({ uid: userId }).select(ZIKR_PROJECTION);
  if (!user) throw new Error('User not found');

  const before = user.zikrTypes.length;
  user.zikrTypes = user.zikrTypes.filter(
    (t: { name: string }) => t.name.toLowerCase() !== name.toLowerCase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filter() returns a plain array, not the DocumentArray Mongoose expects back
  ) as any;
  if (user.zikrTypes.length !== before) await user.save();
  return user.zikrTypes;
}

export async function deleteAllUserZikrData(userId: string): Promise<void> {
  // Delete all daily records
  await ZikrDaily.deleteMany({ userId });
  // Reset lifetime totals on User document
  await User.updateOne({ uid: userId }, { $set: { totalCount: 0, zikrTotals: {} } });
  // Reset streak (keep the doc, just zero it out)
  const ZikrStreak = (await import('../models/ZikrStreak.js')).default;
  await ZikrStreak.updateOne(
    { userId },
    { $set: { currentStreak: 0, longestStreak: 0, lastCompletedDate: null, isPaused: false } }
  );
}

/** The old "Reset counters" route. It used to zero the lifetime totals and
 * delete the goal; since U7 it is a non-destructive fresh start from today. */
export async function resetZikrCounters(userId: string, today?: string): Promise<void> {
  const day = today && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : todayKeyUtc();
  await resetAreas(userId, ['zikr'], day);
}

function todayKeyUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
