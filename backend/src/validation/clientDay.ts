import { z } from 'zod';

/**
 * The "today" a client claims (audit 2026-11-16 P0-3 / P0-4).
 *
 * The client owns the day decision (Fajr / Maghrib / midnight tracking day,
 * its own timezone), so the server cannot recompute it. It can still refuse a
 * day that is impossible for any place on earth right now:
 *
 * - civil dates run from UTC-12 to UTC+14, so a real local date is the server's
 *   UTC date, one day before it, or one day after it;
 * - the tracking day can lag the civil date by one more day (before Fajr, or
 *   before sunset in Maghrib mode, "today" is still yesterday).
 *
 * So a believable "today" is within 2 days back and 1 day ahead of the UTC
 * date. Without this bound a wrong phone clock (or a forged request) pushed the
 * missed-prayer cursor years ahead and opened any past day for "correct a day".
 */
export const CLIENT_DAY_MAX_BACK = 2;
export const CLIENT_DAY_MAX_AHEAD = 1;

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const utcDayStr = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** The latest day any client can truthfully call "today" right now. */
export function latestPossibleToday(now: number = Date.now()): string {
  return utcDayStr(now + CLIENT_DAY_MAX_AHEAD * DAY_MS);
}

let enforceBound = true;

/**
 * Test suites that replay fixed calendar dates (a Ramadan in June, a streak in
 * October) switch the bound off for their file. Refuses to run anywhere else.
 */
export function setClientDayBoundForTests(on: boolean): void {
  if (process.env.NODE_ENV !== 'test') throw new Error('test-only switch');
  enforceBound = on;
}

export function isPlausibleClientToday(day: string, now: number = Date.now()): boolean {
  if (!DAY_RE.test(day)) return false;
  if (!enforceBound) return true;
  // Plain string comparison is correct for zero-padded YYYY-MM-DD.
  return day >= utcDayStr(now - CLIENT_DAY_MAX_BACK * DAY_MS) && day <= latestPossibleToday(now);
}

export const CLIENT_DAY_MESSAGE =
  "This date does not match today's date. Please check the date and time on your device.";

/** Required client "today" (YYYY-MM-DD), bounded to the server clock. */
export const clientToday = z
  .string()
  .regex(DAY_RE)
  .refine((d) => isPlausibleClientToday(d), { message: CLIENT_DAY_MESSAGE });

/**
 * For writes the app may queue offline and replay days later (zikr batches,
 * the Rayhanah outbox): the "today" in the body was true when the write was
 * made, so an old one is expected. Only a day that has not happened yet
 * anywhere is refused.
 */
export const replayedClientToday = z
  .string()
  .regex(DAY_RE)
  .refine((d) => !enforceBound || d <= latestPossibleToday(), { message: CLIENT_DAY_MESSAGE });
