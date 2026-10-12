// The Bustandeen TRACKING DAY — the app's day boundary, by default, is FAJR, not
// midnight (Istiak's spec, 2026-07-18). A new worship day begins at the local
// Fajr time: Isha prayed at 1 AM and tahajjud/suhoor before dawn belong to the
// CLOSING day, matching the rhythm of ibadah.
//
// As of the P7 international-readiness pass (2026-09-10), this boundary is a
// user preference (`dayStartMode`, synced server-side on User like
// hijriOffset — see Settings.tsx) with three options:
//   - 'fajr'     (default) — day starts at local Fajr, as above.
//   - 'midnight' — plain civil-midnight boundary.
//   - 'maghrib'  — the Hijri/Islamic calendar day, which starts at sunset,
//                  not midnight: before today's Maghrib is still "yesterday".
//
// Every "today" the app sends to the server (zikr buckets, salat/quran/
// social date strings) must come from getTrackingDay() — never from raw
// new Date() / getTodayLocal(). Fasting and the salat kaza-debt HISTORY view
// deliberately do NOT use this (see their own localTodayStr()) — a fast is
// dawn-to-sunset of a fixed calendar date regardless of this preference.
//
// Fallback: 'fajr'/'maghrib' need coordinates. Users who haven't set a
// location (localStorage `bustandeen_location`) keep the civil-midnight boundary
// until they do, same as always.
//
// The day is the saved PLACE's day (far-zone fix, 2026-10-12): with Dhaka saved
// and the phone on London time, the day still starts at Fajr in Dhaka and is
// named by Dhaka's calendar (see utils/placeClock.ts).
import { calcPrayerTimes, calcPrayerTimesForDay } from './prayerTimes.js';
import { addDaysYmd, placeNoonTs, placeYmd, readSavedPlace } from './placeClock.js';

export type DayStartMode = 'fajr' | 'midnight' | 'maghrib';

const DAY_START_MODE_KEY = 'bustandeen_day_start_mode';

const readLocation = readSavedPlace;

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDayStartMode(): DayStartMode {
  try {
    const v = localStorage.getItem(DAY_START_MODE_KEY);
    if (v === 'fajr' || v === 'midnight' || v === 'maghrib') return v;
  } catch {
    // ignore
  }
  return 'fajr';
}

/** Persists the mode locally (mirrors the server value — see App.tsx's sync
 * on sign-in and Settings.tsx's PATCH on change). */
export function setDayStartModeLocal(mode: DayStartMode): void {
  try {
    localStorage.setItem(DAY_START_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

/** Local Fajr time for the civil date of `date`, or null without a location. */
export function getFajrTime(date: Date = new Date()): Date | null {
  const loc = readLocation();
  if (!loc) return null;
  try {
    return calcPrayerTimes(loc.latitude, loc.longitude, date).fajr;
  } catch {
    return null;
  }
}

/** Local Maghrib time for the civil date of `date`, or null without a location. */
export function getMaghribTime(date: Date = new Date()): Date | null {
  const loc = readLocation();
  if (!loc) return null;
  try {
    return calcPrayerTimes(loc.latitude, loc.longitude, date).maghrib;
  } catch {
    return null;
  }
}

/**
 * The current tracking day as YYYY-MM-DD, per the user's dayStartMode:
 * - 'midnight' → the calendar date at the saved place.
 * - 'fajr'     → the place's day of the latest Fajr that has begun: before
 *                today's Fajr it is still yesterday's tracking day.
 * - 'maghrib'  → the place's day of the latest Maghrib that has begun (the
 *                Hijri day starts at sunset).
 * Without a saved location there is no place: the phone's civil date.
 */
export function getTrackingDay(now: Date = new Date()): string {
  const loc = readLocation();
  if (!loc) return toYMD(now);
  const mode = getDayStartMode();
  try {
    const today = placeYmd(loc.latitude, loc.longitude, now);
    if (mode === 'midnight') return today;
    const key = mode === 'maghrib' ? 'maghrib' : 'fajr';
    // Checked by instants, not by clock dates, so it holds wherever the
    // phone's clock is set. Tomorrow first: far north in summer the next
    // day's Fajr can come before midnight on the place's clock.
    for (const n of [1, 0]) {
      const day = addDaysYmd(today, n);
      const boundary = calcPrayerTimesForDay(loc.latitude, loc.longitude, day)[key];
      // No such time (polar day/night): keep the calendar date.
      if (Number.isNaN(boundary.getTime())) return today;
      if (boundary <= now) return day;
    }
    // Before today's boundary: still yesterday's tracking day.
    return addDaysYmd(today, -1);
  } catch {
    return toYMD(now);
  }
}

/**
 * A timestamp safely INSIDE the current tracking day for server-side day
 * bucketing (12:00 of the tracking day on the saved place's clock). Zikr
 * flushes anchor increments with this so a 1 AM tap lands in the closing
 * day's bucket, not the next civil day's.
 */
export function getTrackingDayMiddayTs(now: Date = new Date()): number {
  return placeNoonTs(getTrackingDay(now));
}

/** The tracking day `daysBack` days before the current one (0 = today). */
export function getTrackingDayDaysBack(daysBack: number, now: Date = new Date()): string {
  return addDaysYmd(getTrackingDay(now), -daysBack);
}

/**
 * Midday of the tracking day `daysBack` days before the current one (0 =
 * today). "Log missed counts" anchors backfills here AND labels them from it:
 * deriving the label from the civil date showed the wrong day whenever the
 * tracking day lags the calendar (before Fajr, or before Maghrib in 'maghrib'
 * mode).
 */
export function getTrackingDayMiddayTsDaysBack(daysBack: number, now: Date = new Date()): number {
  return placeNoonTs(getTrackingDayDaysBack(daysBack, now));
}

export function isNewTrackingDay(lastDateString: string | null): boolean {
  return getTrackingDay() !== lastDateString;
}
