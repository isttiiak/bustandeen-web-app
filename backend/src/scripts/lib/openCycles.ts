import CycleLog from '../../models/CycleLog.js';

/**
 * READ-ONLY count of people with more than one OPEN cycle (endDate null), the
 * state audit 2026-11-16 P1-8 closes with a partial unique index. The index
 * cannot be built while any such account exists, so count first.
 *
 * Reads only: one aggregate, no updates and no index changes. Privacy: it
 * reports counts and, with `withUids`, opaque uids; never dates or notes.
 */
export interface OpenCyclesReport {
  accountsWithOpenCycle: number;
  /** Accounts with 2 or more open cycles: these block the unique index. */
  accountsWithSeveralOpen: number;
  /** The largest number of open cycles one account has. */
  maxOpenForOneAccount: number;
  /** Only filled when `withUids` is set. */
  uids?: string[];
}

export async function reportOpenCycles(
  opts: { withUids?: boolean } = {}
): Promise<OpenCyclesReport> {
  const rows = await CycleLog.aggregate<{ _id: string; open: number }>([
    { $match: { endDate: null } },
    { $group: { _id: '$userId', open: { $sum: 1 } } },
  ]);
  const several = rows.filter((r) => r.open > 1);
  return {
    accountsWithOpenCycle: rows.length,
    accountsWithSeveralOpen: several.length,
    maxOpenForOneAccount: rows.reduce((m, r) => Math.max(m, r.open), 0),
    ...(opts.withUids ? { uids: several.map((r) => r._id).sort() } : {}),
  };
}
