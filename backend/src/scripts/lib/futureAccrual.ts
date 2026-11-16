import SalatDebt from '../../models/SalatDebt.js';
import SalatDebtEvent from '../../models/SalatDebtEvent.js';
import SalatLog from '../../models/SalatLog.js';
import KazaUnit from '../../models/KazaUnit.js';
import { latestPossibleToday } from '../../validation/clientDay.js';

/**
 * READ-ONLY count of what the unbounded client "today" left behind (audit
 * 2026-11-16 P0-3). Before v5.190.1 the server accepted any `today`, so a wrong
 * phone clock (or `?today=2099-01-01`) made the missed-prayer sweep walk to
 * that day and set `SalatDebt.lastAccrualDate` there. Real days are then never
 * swept, and the sweep wrote missed rows, debt events and kaza units for days
 * that had not happened.
 *
 * Thresholds (see validation/clientDay.ts): no client can truthfully call a day
 * later than `latestPossibleToday` "today", so the sweep never legitimately
 * reaches past the day before it, which is the server's UTC date. So:
 *   - a cursor, event or kaza unit dated AFTER the UTC date is impossible;
 *   - a SalatLog row dated AFTER `latestPossibleToday` is impossible (a row for
 *     exactly `latestPossibleToday` can be real, so it is not counted).
 *
 * Nothing here writes: only countDocuments, aggregate and find with a projection.
 */

export interface FutureAccrualReport {
  /** Server UTC date the thresholds were computed from. */
  utcDate: string;
  latestPossibleToday: string;
  /** Accounts whose cursor is after `utcDate`. */
  accountsWithFutureCursor: number;
  /** The furthest cursor, to see whether it is a clock slip or a forged year. */
  maxCursor: string | null;
  /** How far ahead the cursors are, in days past `utcDate`. */
  cursorsByDaysAhead: { '1': number; '2-7': number; '8-30': number; '31+': number };
  /** Impossible rows the sweep wrote for those days. */
  impossibleRows: {
    debtEvents: number;
    /** Sum of `delta` over those events: what a repair would take off `owed`. */
    debtEventDeltaSum: number;
    kazaUnits: number;
    salatLogs: number;
  };
  /** Accounts that have impossible rows but a cursor that is not in the future. */
  accountsWithRowsButNoFutureCursor: number;
  /** Only filled when `withUids` is set. */
  uids?: string[];
}

const DAY_MS = 86_400_000;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export async function reportFutureAccrual(
  now: number = Date.now(),
  opts: { withUids?: boolean } = {}
): Promise<FutureAccrualReport> {
  const utcDate = new Date(now).toISOString().slice(0, 10);
  const latest = latestPossibleToday(now);

  // `lastAccrualDate` is a YYYY-MM-DD string, so a string compare is a date compare.
  const future = await SalatDebt.find({ lastAccrualDate: { $gt: utcDate } })
    .select({ userId: 1, lastAccrualDate: 1, _id: 0 })
    .lean();

  const byDays = { '1': 0, '2-7': 0, '8-30': 0, '31+': 0 };
  let maxCursor: string | null = null;
  for (const d of future) {
    const cursor = d.lastAccrualDate as string;
    if (maxCursor === null || cursor > maxCursor) maxCursor = cursor;
    const ahead = daysBetween(utcDate, cursor);
    if (ahead <= 1) byDays['1']++;
    else if (ahead <= 7) byDays['2-7']++;
    else if (ahead <= 30) byDays['8-30']++;
    else byDays['31+']++;
  }

  const [events, eventSum, kaza, logs] = await Promise.all([
    SalatDebtEvent.countDocuments({ date: { $gt: utcDate } }),
    SalatDebtEvent.aggregate<{ _id: null; sum: number }>([
      { $match: { date: { $gt: utcDate } } },
      { $group: { _id: null, sum: { $sum: '$delta' } } },
    ]),
    KazaUnit.countDocuments({ missedDate: { $gt: utcDate } }),
    SalatLog.countDocuments({ date: { $gt: latest } }),
  ]);

  // Accounts with impossible rows whose cursor is NOT in the future: they would
  // be missed by a repair keyed on the cursor alone.
  const futureUids = new Set(future.map((d) => d.userId as string));
  const [eventUsers, kazaUsers, logUsers] = await Promise.all([
    SalatDebtEvent.distinct('userId', { date: { $gt: utcDate } }),
    KazaUnit.distinct('userId', { missedDate: { $gt: utcDate } }),
    SalatLog.distinct('userId', { date: { $gt: latest } }),
  ]);
  const rowUsers = new Set<string>([...eventUsers, ...kazaUsers, ...logUsers] as string[]);
  let rowsOnly = 0;
  for (const uid of rowUsers) if (!futureUids.has(uid)) rowsOnly++;

  const report: FutureAccrualReport = {
    utcDate,
    latestPossibleToday: latest,
    accountsWithFutureCursor: future.length,
    maxCursor,
    cursorsByDaysAhead: byDays,
    impossibleRows: {
      debtEvents: events,
      debtEventDeltaSum: eventSum[0]?.sum ?? 0,
      kazaUnits: kaza,
      salatLogs: logs,
    },
    accountsWithRowsButNoFutureCursor: rowsOnly,
  };
  if (opts.withUids) report.uids = [...new Set([...futureUids, ...rowUsers])].sort();
  return report;
}
