import SalatDebt, { ISalatDebt } from '../models/SalatDebt.js';
import SalatDebtEvent from '../models/SalatDebtEvent.js';
import SalatLog from '../models/SalatLog.js';
import { PRAYER_IDS, PrayerId } from '../models/SalatLog.js';
import KazaUnit from '../models/KazaUnit.js';
import { getExcusedDaySet, getExcusedIntervals, isDayExcused } from './cycle.service.js';

export interface SalatDebtSummary {
  owed: Record<PrayerId, number>;
  totalOwed: number;
  /** Civil date the current counting period started (see ISalatDebt.since). */
  since: string | null;
}

function todayDateString(): string {
  return new Date().toISOString().substring(0, 10);
}

const EMPTY_OWED = (): Record<PrayerId, number> =>
  Object.fromEntries(PRAYER_IDS.map((id) => [id, 0])) as Record<PrayerId, number>;

/**
 * Reads each field explicitly rather than spreading `doc.owed` — it is a
 * Mongoose subdocument, and its schema-defined fields live on prototype
 * getters, not as own enumerable properties. A spread instead copies the
 * subdocument's own internal bookkeeping props ($__, _doc, $isNew, ...).
 */
function toSummary(doc: ISalatDebt | null): SalatDebtSummary {
  const owed = EMPTY_OWED();
  if (doc?.owed) {
    for (const id of PRAYER_IDS) {
      const v = doc.owed[id];
      if (typeof v === 'number') owed[id] = v;
    }
  }
  const totalOwed = PRAYER_IDS.reduce((sum, id) => sum + owed[id], 0);
  return { owed, totalOwed, since: doc?.since ?? null };
}

/** Read-only fetch — never creates a row for a user who has no debt yet. */
export async function getDebtReadOnly(userId: string): Promise<SalatDebtSummary> {
  const doc = await SalatDebt.findOne({ userId });
  return toSummary(doc);
}

async function logEvent(
  userId: string,
  prayer: PrayerId,
  delta: number,
  date?: string
): Promise<void> {
  if (delta === 0) return;
  await SalatDebtEvent.create({ userId, prayer, delta, date: date ?? todayDateString() });
}

/**
 * Atomically add `delta` to one prayer's owed count, clamped at 0. A
 * read-then-$set here lost increments when calls overlapped (e.g. several
 * concurrent restoreUncoveredDays runs each counting a different day), so
 * increases are a plain $inc, and decreases are an $inc guarded by "enough is
 * owed", falling back to a compare-and-set to 0 when less is owed.
 */
async function applyOwedDelta(
  userId: string,
  prayer: PrayerId,
  delta: number
): Promise<{ doc: ISalatDebt | null; actualDelta: number }> {
  const path = `owed.${prayer}`;
  if (delta > 0) {
    const doc = await SalatDebt.findOneAndUpdate(
      { userId },
      { $inc: { [path]: delta } },
      { upsert: true, new: true }
    );
    return { doc, actualDelta: delta };
  }
  const need = -delta;
  for (let attempt = 0; attempt < 5; attempt++) {
    const full = await SalatDebt.findOneAndUpdate(
      { userId, [path]: { $gte: need } },
      { $inc: { [path]: delta } },
      { new: true }
    );
    if (full) return { doc: full, actualDelta: delta };
    const current = await SalatDebt.findOne({ userId });
    const currentVal = current?.owed?.[prayer] ?? 0;
    if (currentVal <= 0) return { doc: current, actualDelta: 0 };
    const partial = await SalatDebt.findOneAndUpdate(
      { userId, [path]: currentVal },
      { $set: { [path]: 0 } },
      { new: true }
    );
    if (partial) return { doc: partial, actualDelta: -currentVal };
    // The value moved under us; try again with the fresh count.
  }
  return { doc: await SalatDebt.findOne({ userId }), actualDelta: 0 };
}

/**
 * Add `delta` to one prayer's owed count, clamped at 0 so payback taps can
 * never go negative. Used both for the manual "+/-" controls and for the
 * automatic missed <-> non-missed transition hook in salat.service.ts.
 * `date` is the civil date the change belongs to (the prayer's own date for
 * the automatic hook, "today" for a manual tap) — recorded on the event log
 * so the debt history chart buckets it correctly, not by server clock.
 */
export async function adjustDebt(
  userId: string,
  prayer: PrayerId,
  delta: number,
  date?: string
): Promise<SalatDebtSummary> {
  if (delta === 0) return getDebtReadOnly(userId);
  const { doc, actualDelta } = await applyOwedDelta(userId, prayer, delta);
  await logEvent(userId, prayer, actualDelta, date);

  // Itemize only the single-unit, date-specific case (a specific day's log
  // moving into/out of 'missed' — see updatePrayerStatus in salat.service.ts,
  // the only caller that passes both). A bulk/multi-unit adjustment here has
  // no single real date to attach, so it's left out of the itemized ledger
  // entirely rather than guessing — see KazaUnit's own doc comment.
  if (date) {
    if (actualDelta === 1) {
      await KazaUnit.updateOne(
        { userId, prayer, missedDate: date },
        { $setOnInsert: { status: 'owed' } },
        { upsert: true }
      );
    } else if (actualDelta === -1) {
      await resolveKazaUnit(userId, prayer, date);
    }
  }

  return toSummary(doc);
}

/**
 * Marks one owed KazaUnit paid. Prefers the exact (prayer, date) match —
 * correct when the caller is undoing that SPECIFIC day's missed mark —
 * falling back to the oldest owed unit for this prayer (FIFO) for the
 * generic "pay back one" tap, which has no specific date to target.
 */
async function resolveKazaUnit(userId: string, prayer: PrayerId, date: string): Promise<void> {
  const exact = await KazaUnit.findOneAndUpdate(
    { userId, prayer, missedDate: date, status: 'owed' },
    { $set: { status: 'paid', paidAt: new Date() } }
  );
  if (exact) return;
  await KazaUnit.findOneAndUpdate(
    { userId, prayer, status: 'owed' },
    { $set: { status: 'paid', paidAt: new Date() } },
    { sort: { missedDate: 1 } }
  );
}

/** Absolute set — used for the one-time "how many do you estimate you owe" setup. */
export async function setDebt(
  userId: string,
  prayer: PrayerId,
  count: number,
  date?: string
): Promise<SalatDebtSummary> {
  const before = await getDebtReadOnly(userId);
  const actualDelta = count - before.owed[prayer];
  const doc = await SalatDebt.findOneAndUpdate(
    { userId },
    { $set: { [`owed.${prayer}`]: count } },
    { upsert: true, new: true }
  );
  await logEvent(userId, prayer, actualDelta, date);
  return toSummary(doc);
}

export async function deleteDebt(userId: string): Promise<void> {
  await SalatDebt.deleteOne({ userId });
  await SalatDebtEvent.deleteMany({ userId });
  await KazaUnit.deleteMany({ userId });
}

/**
 * Reset the running kaza debt to zero and start a fresh counting period from
 * `date` (default today). For a user who fell behind for a long stretch, a
 * bare "142 prayers owed" is demotivating and rarely actionable — this gives
 * them a clean slate. It is not a data loss: the underlying SalatLog rows
 * (and the debt event history) are untouched, so anyone who wants the old
 * number back can re-add it with the same +/- / set-count controls used for
 * "debt from before I started tracking".
 */
export async function resetDebt(userId: string, date?: string): Promise<SalatDebtSummary> {
  const d = date ?? todayDateString();
  const before = await getDebtReadOnly(userId);
  const events = PRAYER_IDS.filter((id) => before.owed[id] !== 0).map((id) => ({
    userId,
    prayer: id,
    delta: -before.owed[id],
    date: d,
  }));
  if (events.length) await SalatDebtEvent.insertMany(events);
  await SalatDebt.findOneAndUpdate(
    { userId },
    { $set: { owed: EMPTY_OWED(), since: d, lastAccrualDate: shiftDateStr(d, -1) } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  return getDebtReadOnly(userId);
}

/**
 * Automatic day-rollover sweep: any fard prayer still 'pending' once its
 * civil day is fully in the past is a missed prayer, whether or not the user
 * ever taps ❌ Miss — so this folds every such day, from the last processed
 * date up to (not including) today, straight into the debt counters. Safe to
 * call on every read of salat data; it's a no-op once caught up.
 *
 * A user's very first debt doc (or one predating this field) adopts "today"
 * as `since`/`lastAccrualDate` instead of scanning backwards — the feature
 * must never surprise an existing user with years of back-dated debt the
 * first time it ships.
 *
 * CONCURRENCY: this is called on every GET of salat data (log/history/
 * analytics/debt), and the frontend fires several of those in parallel on a
 * single page load. Without the atomic claim below, every one of those
 * parallel calls would read the SAME `lastAccrualDate`, independently
 * compute the SAME "days to sweep," and each apply its OWN $inc — silently
 * multiplying the debt by however many requests happened to race together
 * (reported directly: 2 real missed Maghrib showing as 4, 1 missed Isha
 * showing as 3). The findOneAndUpdate below is a compare-and-swap: it only
 * matches (and advances `lastAccrualDate`) for the FIRST caller to reach it;
 * every other concurrent caller's condition then fails to match, it gets
 * `null` back, and returns having touched nothing. Exactly one caller ever
 * proceeds to actually sweep a given window, no matter how many raced for it.
 */
/**
 * Rest days (Rayhanah) never create kaza: salat is excused and not made up.
 * Debt that an earlier version already added for such a day is released here,
 * and this also self-heals when a past cycle is added later.
 *
 * Idempotent and race-safe: each unit is claimed by deleting it first, and only
 * the caller that deleted it lowers the counter, so concurrent calls cannot
 * double-release. Only itemized, still-owed units on excused days are touched;
 * paid units and anonymous +/- adjustments are left exactly as they were.
 */
export async function releaseExcusedDebt(userId: string, today: string): Promise<number> {
  const intervals = await getExcusedIntervals(userId);
  if (intervals.length === 0) return 0;

  const owedUnits = await KazaUnit.find({ userId, status: 'owed' }).select('prayer missedDate');
  // A manual reset zeroes the counter but leaves older ledger entries behind, so a
  // unit dated before `since` is not in the counter any more: remove the unit,
  // but do not lower a counter that never contained it.
  const since = (await SalatDebt.findOne({ userId }).select('since'))?.since ?? '';
  let released = 0;
  for (const u of owedUnits) {
    if (!isDayExcused(intervals, u.missedDate, today)) continue;
    const claimed = await KazaUnit.findOneAndDelete({ _id: u._id, status: 'owed' });
    if (!claimed) continue; // another call released it first
    released++;
    if (u.missedDate >= since) {
      await SalatDebt.updateOne(
        { userId, [`owed.${u.prayer}`]: { $gt: 0 } },
        { $inc: { [`owed.${u.prayer}`]: -1 } }
      );
      // Remember the day so it can be counted again if the cycle is removed later.
      await SalatDebt.updateOne({ userId }, { $addToSet: { skippedRestDays: u.missedDate } });
    }
    // Drop the matching +1 history entry so the debt chart stays truthful.
    await SalatDebtEvent.deleteOne({ userId, prayer: u.prayer, date: u.missedDate, delta: 1 });
    // The day's own log should not read "missed" either.
    await SalatLog.updateOne(
      { userId, date: u.missedDate, [`prayers.${u.prayer}.status`]: 'missed' },
      { $set: { [`prayers.${u.prayer}.status`]: 'pending' } }
    );
  }
  return released;
}

/**
 * The other direction of releaseExcusedDebt: a cycle that is deleted or made
 * shorter turns some remembered rest days back into ordinary days. Those days
 * were never counted, so count them now, exactly once.
 *
 * - One-time catch-up: for debt documents that pre-date `skippedRestDays`, fill
 *   it from the days that are rest days right now (they were skipped or released).
 * - Each day is claimed with an atomic $pull, so concurrent calls cannot count
 *   it twice; only the winner counts it.
 * - Only prayers still 'pending' are counted; anything the user logged is kept.
 * - Only the already-swept region (<= lastAccrualDate) is touched; the normal
 *   sweep handles later days itself.
 */
export async function restoreUncoveredDays(userId: string, today: string): Promise<number> {
  const doc = await SalatDebt.findOne({ userId }).select(
    'since lastAccrualDate skippedRestDays restDaysSeeded'
  );
  if (!doc || !doc.lastAccrualDate) return 0;
  if (doc.restDaysSeeded && doc.skippedRestDays.length === 0) return 0;

  const since = doc.since ?? '';
  const sweptThrough = doc.lastAccrualDate;

  if (!doc.restDaysSeeded) {
    const excusedNow = await getExcusedDaySet(userId, since || sweptThrough, sweptThrough);
    await SalatDebt.updateOne(
      { userId, restDaysSeeded: { $ne: true } },
      { $set: { restDaysSeeded: true }, $addToSet: { skippedRestDays: { $each: [...excusedNow] } } }
    );
  }

  const fresh = await SalatDebt.findOne({ userId }).select('skippedRestDays');
  const remembered = (fresh?.skippedRestDays ?? []).filter((d) => d <= sweptThrough && d < today);
  if (remembered.length === 0) return 0;

  const sorted = [...remembered].sort();
  const stillExcused = await getExcusedDaySet(userId, sorted[0]!, sorted[sorted.length - 1]!);
  let restored = 0;
  for (const day of sorted) {
    if (stillExcused.has(day)) continue;
    const claimed = await SalatDebt.updateOne(
      { userId, skippedRestDays: day },
      { $pull: { skippedRestDays: day } }
    );
    if (claimed.modifiedCount !== 1) continue; // another call already restored it
    if (day < since) continue; // before a reset: not part of the counter
    await countMissedDay(userId, day);
    restored++;
  }
  // Days before a reset can never matter again.
  if (since) {
    await SalatDebt.updateOne({ userId }, { $pull: { skippedRestDays: { $lt: since } } });
  }
  return restored;
}

/** Count one ordinary past day: every prayer still 'pending' becomes owed. */
async function countMissedDay(userId: string, day: string): Promise<void> {
  let log = await SalatLog.findOne({ userId, date: day });
  const pending = PRAYER_IDS.filter(
    (pid) => (log?.prayers[pid]?.status ?? 'pending') === 'pending'
  );
  if (pending.length === 0) return;
  if (!log) log = new SalatLog({ userId, date: day });
  for (const pid of pending) log.prayers[pid].status = 'missed';
  await log.save();
  for (const pid of pending) await adjustDebt(userId, pid, 1, day);
}

export async function ensureCaughtUp(userId: string, today?: string): Promise<void> {
  const t = today ?? todayDateString();
  await releaseExcusedDebt(userId, t);
  await restoreUncoveredDays(userId, t);
  const doc = await SalatDebt.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (!doc.lastAccrualDate) {
    // Same compare-and-swap idea for the one-time "adopt today" legacy path —
    // only the winner sets it; a racing loser's condition just won't match.
    await SalatDebt.updateOne(
      { userId, lastAccrualDate: { $exists: false } },
      { $set: { since: doc.since ?? t, lastAccrualDate: shiftDateStr(t, -1) } }
    );
    return;
  }

  const staleCursor = doc.lastAccrualDate;
  if (shiftDateStr(staleCursor, 1) >= t) return;

  // Atomic claim — see CONCURRENCY note above. Must happen BEFORE any of the
  // work below, not after, or concurrent callers would all still do (and
  // double-count) the work before any of them got around to writing back.
  const claimed = await SalatDebt.findOneAndUpdate(
    { userId, lastAccrualDate: staleCursor },
    { $set: { lastAccrualDate: shiftDateStr(t, -1) } }
  );
  if (!claimed) return; // lost the race — another call already claimed this window

  const cursor = shiftDateStr(staleCursor, 1);

  const logs = await SalatLog.find({ userId, date: { $gte: cursor, $lt: t } });
  const logMap = new Map(logs.map((l) => [l.date, l]));
  const excusedDays = await getExcusedDaySet(userId, cursor, shiftDateStr(t, -1));
  const totals = EMPTY_OWED();
  const events: Array<{ userId: string; prayer: PrayerId; delta: number; date: string }> = [];
  const dirtyLogs: typeof logs = [];

  for (let day = cursor; day < t; day = shiftDateStr(day, 1)) {
    if (excusedDays.has(day)) continue; // rest day: nothing is owed, nothing is "missed"
    let log = logMap.get(day);
    let logChanged = false;
    for (const pid of PRAYER_IDS) {
      const status = log?.prayers[pid]?.status ?? 'pending';
      if (status === 'pending') {
        totals[pid]++;
        events.push({ userId, prayer: pid, delta: 1, date: day });
        // A day the user never opened has no SalatLog row at all — the debt
        // counter still needs incrementing, but without persisting 'missed'
        // here, later marking that day's prayer "done" starts from a fresh
        // 'pending' row (wasMissed=false), so updatePrayerStatus's
        // missed<->non-missed transition never fires and the debt never
        // decrements. Create the row now so that later edit sees 'missed'.
        if (!log) {
          log = new SalatLog({ userId, date: day });
          logMap.set(day, log);
        }
        log.prayers[pid].status = 'missed';
        logChanged = true;
      }
    }
    if (log && logChanged) dirtyLogs.push(log);
  }

  const skippedNow = [...excusedDays].filter((d) => d >= (doc.since ?? ''));
  if (skippedNow.length) {
    await SalatDebt.updateOne(
      { userId },
      { $addToSet: { skippedRestDays: { $each: skippedNow } } }
    );
  }

  for (const log of dirtyLogs) await log.save();
  if (events.length) await SalatDebtEvent.insertMany(events);
  if (events.length) {
    // Every event here has a genuine specific date (the day it swept into
    // 'missed') — the one caller where bulk itemization is exactly right.
    // ordered:false so a duplicate (re-running the sweep over an already
    // -processed day, which shouldn't happen given the cursor above, but
    // this is cheap insurance) skips just that row instead of aborting the
    // whole batch.
    await KazaUnit.insertMany(
      events.map((e) => ({
        userId: e.userId,
        prayer: e.prayer,
        missedDate: e.date,
        status: 'owed',
      })),
      { ordered: false }
    ).catch(() => {
      /* duplicate-key on an already-itemized day — safe to ignore */
    });
  }

  // lastAccrualDate was already advanced atomically by the claim above — this
  // is now just the totals. No other caller can reach this line for the same
  // window (they'd have lost the claim and returned already), so a plain
  // $inc here is race-free.
  const inc = Object.fromEntries(
    PRAYER_IDS.filter((id) => totals[id] > 0).map((id) => [`owed.${id}`, totals[id]])
  );
  if (Object.keys(inc).length) {
    await SalatDebt.updateOne({ userId }, { $inc: inc });
  }
}

/** Shift a YYYY-MM-DD date string by `delta` days (pure string math, no TZ). */
function shiftDateStr(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().substring(0, 10);
}

export interface SalatDebtHistoryWeek {
  weekStart: string;
  weekEnd: string;
  accumulated: number;
  paidBack: number;
}

/**
 * Weekly accumulation-vs-payback buckets for the debt chart — same 7-day,
 * last-12-weeks windowing as the mosque frequency trend, for visual
 * consistency between the two analytics charts.
 *
 * Below 14 days this switches to one bucket PER DAY instead: weekly buckets
 * on a short window produce a lopsided, confusing chart — e.g. an 8-day
 * window (the "current month so far" default for a new tracker, or just
 * early September) used to render as one real 7-day week plus one leftover
 * 1-day "week", with x-axis labels one day apart that read as a bug
 * (reported directly by a user looking at exactly this case).
 */
export async function getDebtHistory(
  userId: string,
  days: number,
  today?: string
): Promise<SalatDebtHistoryWeek[]> {
  const end = today ?? todayDateString();
  const start = shiftDateStr(end, -(days - 1));
  const events = await SalatDebtEvent.find({ userId, date: { $gte: start, $lte: end } });

  if (days < 14) {
    const buckets: SalatDebtHistoryWeek[] = [];
    for (let day = start; day <= end; day = shiftDateStr(day, 1)) {
      let accumulated = 0;
      let paidBack = 0;
      for (const ev of events) {
        if (ev.date !== day) continue;
        if (ev.delta > 0) accumulated += ev.delta;
        else paidBack += -ev.delta;
      }
      buckets.push({ weekStart: day, weekEnd: day, accumulated, paidBack });
    }
    return buckets;
  }

  // Up to 12 buckets covering the whole window (7-day weeks up to 12 weeks,
  // wider buckets beyond that) — see the same logic in getSalatAnalytics.
  const bucketDays = Math.max(7, Math.ceil(days / 12));
  const totalWeeks = Math.ceil(days / bucketDays);
  const weeks: SalatDebtHistoryWeek[] = [];
  for (let w = totalWeeks - 1; w >= 0; w--) {
    const weekEnd = shiftDateStr(end, -(w * bucketDays));
    const weekStartRaw = shiftDateStr(weekEnd, -(bucketDays - 1));
    const weekStart = weekStartRaw < start ? start : weekStartRaw;
    let accumulated = 0;
    let paidBack = 0;
    for (const ev of events) {
      if (ev.date < weekStart || ev.date > weekEnd) continue;
      if (ev.delta > 0) accumulated += ev.delta;
      else paidBack += -ev.delta;
    }
    weeks.push({ weekStart, weekEnd, accumulated, paidBack });
  }
  return weeks;
}

export interface KazaInsights {
  /** Longest-unpaid missed prayer still owed, or null if none are itemized. */
  oldestOwed: { prayer: PrayerId; missedDate: string } | null;
  /** Mean days between a prayer being missed and being marked paid back —
   * null when nothing itemized has been paid back yet to average. */
  avgPayoffDays: number | null;
  /** How many of the current total owed are itemized (have a real date) —
   * always <= SalatDebtSummary.totalOwed; the gap is debt added via the
   * anonymous +/- adjuster or the one-time estimate, which was never given
   * a specific date (see KazaUnit's doc comment for why). */
  itemizedOwedCount: number;
  itemizedPaidCount: number;
  /** Same two numbers, broken out per prayer — "which prayer's kaza lingers
   * longest" is a different, more actionable question than the overall
   * average. A prayer with no itemized data at all is omitted. */
  perPrayer: Partial<
    Record<
      PrayerId,
      {
        owedCount: number;
        oldestOwedDate: string | null;
        avgPayoffDays: number | null;
        paidCount: number;
      }
    >
  >;
}

/**
 * Derived from the itemized KazaUnit ledger — genuinely new analysis that
 * an anonymous running counter can't answer, e.g. "what's the oldest thing
 * you still owe" and "how long does it usually take you to catch up."
 */
export async function getKazaInsights(userId: string): Promise<KazaInsights> {
  const [oldestOwed, paidUnits, owedUnits] = await Promise.all([
    KazaUnit.findOne({ userId, status: 'owed' }).sort({ missedDate: 1 }),
    KazaUnit.find({ userId, status: 'paid', paidAt: { $exists: true } }),
    KazaUnit.find({ userId, status: 'owed' }).sort({ missedDate: 1 }),
  ]);

  const avgOf = (units: typeof paidUnits): number | null => {
    if (units.length === 0) return null;
    const totalDays = units.reduce((sum, u) => {
      const missed = Date.parse(`${u.missedDate}T00:00:00Z`);
      const paid = (u.paidAt as Date).getTime();
      return sum + Math.max(0, (paid - missed) / 86_400_000);
    }, 0);
    return Math.round((totalDays / units.length) * 10) / 10;
  };

  const perPrayer: KazaInsights['perPrayer'] = {};
  for (const pid of PRAYER_IDS) {
    const owed = owedUnits.filter((u) => u.prayer === pid);
    const paid = paidUnits.filter((u) => u.prayer === pid);
    if (owed.length === 0 && paid.length === 0) continue;
    perPrayer[pid] = {
      owedCount: owed.length,
      oldestOwedDate: owed[0]?.missedDate ?? null,
      avgPayoffDays: avgOf(paid),
      paidCount: paid.length,
    };
  }

  return {
    oldestOwed: oldestOwed
      ? { prayer: oldestOwed.prayer, missedDate: oldestOwed.missedDate }
      : null,
    avgPayoffDays: avgOf(paidUnits),
    itemizedOwedCount: owedUnits.length,
    itemizedPaidCount: paidUnits.length,
    perPrayer,
  };
}
