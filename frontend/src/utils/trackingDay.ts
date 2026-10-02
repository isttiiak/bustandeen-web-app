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
import { calcPrayerTimes } from './prayerTimes.js';

export type DayStartMode = 'fajr' | 'midnight' | 'maghrib';

const DAY_START_MODE_KEY = 'bustandeen_day_start_mode';

interface StoredLocation {
  latitude: number;
  longitude: number;
  name?: string;
}

function readLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem('bustandeen_location');
    if (!raw) return null;
    const loc = JSON.parse(raw) as StoredLocation;
    if (typeof loc?.latitude !== 'number' || typeof loc?.longitude !== 'number') return null;
    return loc;
  } catch {
    return null;
  }
}

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
 * - 'midnight' → always the plain civil date.
 * - 'fajr'     → before today's Fajr is still yesterday's tracking day.
 * - 'maghrib'  → before today's Maghrib is still yesterday's tracking day
 *                (the Hijri day starts at sunset).
 * Both 'fajr' and 'maghrib' fall back to the civil date without a saved
 * location — there's no prayer-time math to anchor the boundary to.
 */
export function getTrackingDay(now: Date = new Date()): string {
  const mode = getDayStartMode();
  if (mode === 'midnight') return toYMD(now);

  const boundary = mode === 'maghrib' ? getMaghribTime(now) : getFajrTime(now);
  if (boundary && now < boundary) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return toYMD(yesterday);
  }
  return toYMD(now);
}

/**
 * A timestamp safely INSIDE the current tracking day for server-side day
 * bucketing (12:00 local of the tracking day's civil date). Zikr flushes
 * anchor increments with this so a 1 AM tap lands in the closing day's
 * bucket, not the next civil day's.
 */
export function getTrackingDayMiddayTs(now: Date = new Date()): number {
  const [y, m, d] = getTrackingDay(now).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

/**
 * Midday of the tracking day `daysBack` days before the current one (0 =
 * today). "Log missed counts" anchors backfills here AND labels them from it:
 * deriving the label from the civil date showed the wrong day whenever the
 * tracking day lags the calendar (before Fajr, or before Maghrib in 'maghrib'
 * mode).
 */
export function getTrackingDayMiddayTsDaysBack(daysBack: number, now: Date = new Date()): number {
  const d = new Date(getTrackingDayMiddayTs(now));
  d.setDate(d.getDate() - daysBack);
  return d.getTime();
}

export function isNewTrackingDay(lastDateString: string | null): boolean {
  return getTrackingDay() !== lastDateString;
}
