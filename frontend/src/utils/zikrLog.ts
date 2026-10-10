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

/** What a rejected queued log held, for the notice that asks to log it
 * again: the total count and the day (its midday anchor). Null for anything
 * that is not a manual log body. */
export function rejectedLogSummary(body: unknown): { count: number; ts: number } | null {
  const incs = (body as { increments?: unknown } | null | undefined)?.increments;
  if (!Array.isArray(incs)) return null;
  let count = 0;
  let ts: number | null = null;
  for (const inc of incs as { amount?: unknown; ts?: unknown; manual?: unknown }[]) {
    if (!inc?.manual || typeof inc.amount !== 'number' || typeof inc.ts !== 'number') continue;
    count += inc.amount;
    ts ??= inc.ts;
  }
  return ts === null || count <= 0 ? null : { count, ts };
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

// ── Correct a day (U7) ─────────────────────────────────────────────────────
// How far back a past day's counts can be set exactly. Istiak: 3 days by
// default (people rarely remember exact counts), up to 30 in Zikr settings
// for those who keep careful counts. The server allows 30 at most.
export const ZIKR_FIX_DAYS_KEY = 'bustandeen_zikr_fix_days';
export const FIX_DAY_CHOICES = [3, 7, 14, 30] as const;
export const DEFAULT_FIX_DAYS = 3;

export function getFixDays(): number {
  try {
    const n = Number(localStorage.getItem(ZIKR_FIX_DAYS_KEY));
    return (FIX_DAY_CHOICES as readonly number[]).includes(n) ? n : DEFAULT_FIX_DAYS;
  } catch {
    return DEFAULT_FIX_DAYS;
  }
}

export function setFixDays(n: number): void {
  try {
    localStorage.setItem(ZIKR_FIX_DAYS_KEY, String(n));
  } catch {
    // private mode: the default stays
  }
}

/** The past tracking days that can be corrected, newest first (yesterday
 * back to `fixDays`), from the moment the form opened. */
export function correctDayOptions(fixDays: number, openedAt: Date): string[] {
  return Array.from({ length: fixDays }, (_, i) => {
    const d = new Date(getTrackingDayMiddayTsDaysBack(i + 1, openedAt));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

/** The counts to send: only zikr whose number changed, as whole numbers
 * (an empty box means 0). Null when a box holds something that is not a
 * whole number from 0 to 1,000,000. */
export function correctionChanges(
  was: Record<string, number>,
  typed: Record<string, string>
): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const [type, raw] of Object.entries(typed)) {
    const s = raw.trim();
    if (s && !/^\d+$/.test(s)) return null;
    const n = s ? Number(s) : 0;
    if (n > 1_000_000) return null;
    if (n !== (was[type] ?? 0)) out[type] = n;
  }
  return out;
}
