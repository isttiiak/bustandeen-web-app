// Self-contained calculation helpers for the SSG page tree. Deliberately
// NOT importing utils/prayerTimes.ts or utils/islamicCalendar.ts directly:
// both transitively touch `localStorage` for user-settings overrides
// (calc method, Asr madhab, Hijri day-adjustment) — safe in the browser,
// but during `react-dom/server` rendering in Node there is no
// `localStorage`, so those calls would silently fall back to defaults (or,
// for getHijriDate's un-guarded `localStorage.getItem` in
// getHijriAdjustment, always throw and return null). Re-implementing the
// same math here with fixed, explicit defaults keeps SSG output
// deterministic and avoids depending on that fallback behavior.
//
// utils/qibla.ts has no such dependency and is reused as-is.
import * as adhan from 'adhan';
import {
  prayerDefaultsForCountry,
  type AsrSchool,
  type CalcMethodId,
} from '../../utils/countryDefaults.js';
import { dateFormat } from './intl.js';

export interface PrayerTimesResult {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  /** ʿAṣr in the school most mosques in this country follow (`asrSchool`). */
  asr: Date;
  /** Both schools, so a page can show the two ʿAṣr times side by side. */
  asrStandard: Date;
  asrHanafi: Date;
  maghrib: Date;
  isha: Date;
  /** The method and ʿAṣr school used: the country's usual convention
   * (utils/countryDefaults.ts), the same default a new app user there gets. */
  method: CalcMethodId;
  asrSchool: AsrSchool;
}

export function computePrayerTimes(
  lat: number,
  lng: number,
  date: Date = new Date(),
  countryCode?: string
): PrayerTimesResult {
  const { method, asr: asrSchool } = prayerDefaultsForCountry(countryCode);
  const coords = new adhan.Coordinates(lat, lng);
  const standardParams = adhan.CalculationMethod[method]();
  const hanafiParams = adhan.CalculationMethod[method]();
  hanafiParams.madhab = adhan.Madhab.Hanafi;
  const standard = new adhan.PrayerTimes(coords, date, standardParams);
  const hanafi = new adhan.PrayerTimes(coords, date, hanafiParams);
  return {
    fajr: standard.fajr,
    sunrise: standard.sunrise,
    dhuhr: standard.dhuhr,
    asr: asrSchool === 'hanafi' ? hanafi.asr : standard.asr,
    asrStandard: standard.asr,
    asrHanafi: hanafi.asr,
    maghrib: standard.maghrib,
    isha: standard.isha,
    method,
    asrSchool,
  };
}

export function formatTimeInZone(date: Date, timezone: string, locale: string): string {
  return dateFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(date);
}

export function formatDateInZone(date: Date, timezone: string, locale: string): string {
  return dateFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  }).format(date);
}

export interface HijriDate {
  day: number;
  month: number; // 1-12
  year: number;
}

export function toHijri(date: Date): HijriDate {
  const fmt = dateFormat('en-US-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const parts = fmt.formatToParts(date);
  return {
    day: parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10),
    month: parseInt(parts.find((p) => p.type === 'month')?.value ?? '1', 10),
    year: parseInt(parts.find((p) => p.type === 'year')?.value ?? '1', 10),
  };
}

export function currentHijriYear(): number {
  return toHijri(new Date()).year;
}

/**
 * Reverse of toHijri: finds the Gregorian date for a given Hijri
 * year/month/day. Same "no closed-form formula, scan outward from an
 * estimate" approach as ramadanRangeForHijriYear — the Umm al-Qura calendar's
 * month lengths (29 or 30 days, not a fixed pattern) rule out simple math.
 */
export function hijriToGregorian(hijriYear: number, hijriMonth: number, hijriDay: number): Date {
  const approxGregorianYear = hijriYear + 579;
  const dayOfHijriYear = (hijriMonth - 1) * 29.53 + hijriDay;
  const guess = new Date(Date.UTC(approxGregorianYear, 0, 1) + dayOfHijriYear * 86_400_000);
  for (let i = -400; i <= 400; i++) {
    const d = new Date(guess.getTime() + i * 86_400_000);
    const h = toHijri(d);
    if (h.year === hijriYear && h.month === hijriMonth && h.day === hijriDay) return d;
  }
  return guess; // shouldn't happen for any real Hijri date — avoid throwing
}

/** The Hijri year whose Ramadan (month 9) starts within the given
 * Gregorian calendar year — the reverse of ramadanRangeForHijriYear's
 * `.start.getUTCFullYear()`, used to resolve the `:year` route param
 * (a Gregorian year, for searchability) back to a Hijri year to compute. */
export function hijriYearForRamadanGregorianYear(gregorianYear: number): number {
  const guess = gregorianYear - 579;
  for (const hy of [guess, guess + 1, guess - 1, guess + 2, guess - 2]) {
    if (ramadanRangeForHijriYear(hy).start.getUTCFullYear() === gregorianYear) return hy;
  }
  return guess;
}

const EARTH_RADIUS_KM = 6371;
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

/** Great-circle distance (km) from `lat,lng` to the Kaaba. */
export function distanceToKaabaKm(lat: number, lng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(KAABA_LAT - lat);
  const dLng = toRad(KAABA_LNG - lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(KAABA_LAT)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c);
}

/**
 * Finds the Gregorian date range [start, end] (inclusive) of Ramadan
 * (Hijri month 9) for the given Hijri year, by scanning day-by-day from a
 * rough estimate. The Hijri calendar has no fixed Gregorian offset, so a
 * direct formula isn't possible — this is the standard approach for
 * converting a specific Hijri month back to Gregorian dates via `Intl`.
 */
const ramadanRanges = new Map<number, { start: Date; end: Date }>();

export function ramadanRangeForHijriYear(hijriYear: number): { start: Date; end: Date } {
  // Every Ramadan page asks for the same year: scan once, hand out copies.
  let range = ramadanRanges.get(hijriYear);
  if (!range) {
    range = scanRamadanRange(hijriYear);
    ramadanRanges.set(hijriYear, range);
  }
  return { start: new Date(range.start), end: new Date(range.end) };
}

function scanRamadanRange(hijriYear: number): { start: Date; end: Date } {
  // A Hijri year is ~354.37 Gregorian days; Ramadan is the 9th month, so it
  // starts roughly 8 * 29.53 ≈ 236 days into the Hijri year. Seed a guess,
  // then walk to the exact boundary.
  const approxGregorianYear = hijriYear + 579; // islamic-umalqura epoch offset, approximate
  let cursor = new Date(Date.UTC(approxGregorianYear, 0, 1));

  // Walk forward/backward until we land inside the target Hijri year+month.
  const matches = (d: Date) => {
    const h = toHijri(d);
    return h.year === hijriYear && h.month === 9;
  };
  // Coarse search: step by 10 days across ~2 Gregorian years around the guess.
  let found: Date | null = null;
  const searchStart = new Date(Date.UTC(approxGregorianYear - 1, 0, 1));
  for (let i = 0; i < 146; i++) {
    // ~4 years of 10-day steps
    const d = new Date(searchStart.getTime() + i * 10 * 86_400_000);
    if (matches(d)) {
      found = d;
      break;
    }
  }
  if (!found) {
    // Fallback: shouldn't happen, but avoid throwing during a build.
    found = cursor;
  }
  cursor = found;

  // Walk backward to the first day of the month.
  let start = cursor;
  while (matches(new Date(start.getTime() - 86_400_000))) {
    start = new Date(start.getTime() - 86_400_000);
  }
  // Walk forward to the last day of the month.
  let end = cursor;
  while (matches(new Date(end.getTime() + 86_400_000))) {
    end = new Date(end.getTime() + 86_400_000);
  }
  return { start, end };
}
