// "Log counts" (U4): counts typed in afterwards, for the current tracking day
// or up to two tracking days back (the streak grace window, matching the
// server's ts bound in backend/src/validation/zikr.schemas.ts).
//
// Everything here takes an explicit `now`: the modal pins the moment it was
// opened, so a form opened before Fajr and saved after it still lands on the
// day it showed ("Today" = the closing day), never silently on the next one.
import {
  getTrackingDay,
  getTrackingDayMiddayTs,
  getTrackingDayMiddayTsDaysBack,
} from './trackingDay.js';
import { getUserTimezoneOffset } from './timezone.js';

/** Same cap as the server's amountField: a larger number is refused there. */
export const MAX_LOG_AMOUNT = 10_000;

export type LogDaysBack = 0 | 1 | 2;

/** Demo mode has no server history, so only today can be logged there. */
export function logDayOptions(isDemo: boolean): LogDaysBack[] {
  return isDemo ? [0] : [0, 1, 2];
}

export type LogAmountError = 'notWhole' | 'tooLarge' | null;

/** The typed amount as a whole positive number (0 = nothing to save yet). */
export function parseLogAmount(raw: string): { amount: number; error: LogAmountError } {
  const s = raw.trim();
  if (!s) return { amount: 0, error: null };
  if (!/^\d+$/.test(s)) return { amount: 0, error: 'notWhole' };
  const n = Number(s);
  if (n > MAX_LOG_AMOUNT) return { amount: 0, error: 'tooLarge' };
  return { amount: n, error: null };
}

export interface ZikrLogBody {
  increments: { zikrType: string; amount: number; ts: number; manual: true }[];
  timezoneOffset: number;
  today: string;
}

/** The YYYY-MM-DD tracking day a log `daysBack` from `openedAt` lands in. */
export function logTargetDay(daysBack: LogDaysBack, openedAt: Date): string {
  const d = new Date(getTrackingDayMiddayTsDaysBack(daysBack, openedAt));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Request body for POST /api/zikr/increment/batch. `ts` is the midday of the
 * target tracking day, so the server buckets it on that day in any timezone;
 * `today` is the tracking day at SAVE time (the streak is evaluated against
 * the real current day, not the one being filled in).
 */
export function buildZikrLogBody(
  zikrType: string,
  amount: number,
  daysBack: LogDaysBack,
  openedAt: Date,
  savedAt: Date = new Date()
): ZikrLogBody {
  return {
    increments: [
      {
        zikrType,
        amount,
        ts: getTrackingDayMiddayTsDaysBack(daysBack, openedAt),
        manual: true,
      },
    ],
    timezoneOffset: getUserTimezoneOffset(),
    today: getTrackingDay(savedAt),
  };
}

/** Counts in a (possibly queued) log body that belong to the current
 * tracking day: the live "today" count shows them before they sync. */
export function todaysLoggedCounts(
  bodies: unknown[],
  now: Date = new Date()
): Record<string, number> {
  const anchor = getTrackingDayMiddayTs(now);
  const out: Record<string, number> = {};
  for (const b of bodies) {
    const incs = (b as Partial<ZikrLogBody> | undefined)?.increments;
    if (!Array.isArray(incs)) continue;
    for (const inc of incs) {
      if (inc?.ts !== anchor || typeof inc.amount !== 'number') continue;
      out[inc.zikrType] = (out[inc.zikrType] ?? 0) + inc.amount;
    }
  }
  return out;
}
