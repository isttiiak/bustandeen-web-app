// Monthly prayer timetables for the Bangladesh district pages (audit T4.4).
// Pure date logic, shared by the build (entry-server / prerender.mjs) and
// the tests. All "months" are calendar months in Bangladesh time.
import type { CityEntry } from '../data/cities.js';
import { computePrayerTimes, toHijri, type HijriDate, type PrayerTimesResult } from './calc.js';

export const BD_TZ = 'Asia/Dhaka';

/** `YYYY-MM`. */
export type YearMonth = string;

/** The first month that had monthly pages: older months never existed, so
 * they need no redirect. */
export const MONTHLY_SINCE: YearMonth = '2026-10';

/** How many months are live at once: this month and the next two. */
export const MONTH_WINDOW = 3;

const YM = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isYearMonth(s: string): boolean {
  return YM.test(s);
}

/** The calendar month `date` falls in, in `timeZone`. */
export function ymInZone(date: Date, timeZone: string = BD_TZ): YearMonth {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone,
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return `${year}-${month}`;
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** The live months at `buildDate`: this month and the next ones. */
export function monthWindow(buildDate: Date): YearMonth[] {
  const first = ymInZone(buildDate);
  return Array.from({ length: MONTH_WINDOW }, (_, i) => addMonths(first, i));
}

/** Months that had pages but fell out of the window: they redirect to the
 * current month. */
export function expiredMonths(buildDate: Date): YearMonth[] {
  const current = ymInZone(buildDate);
  const out: YearMonth[] = [];
  for (let ym = MONTHLY_SINCE; ym < current; ym = addMonths(ym, 1)) out.push(ym);
  return out;
}

export interface MonthRow {
  /** `YYYY-MM-DD`, the civil date in Bangladesh. */
  date: string;
  day: number;
  /** Noon UTC of the date: for formatting the weekday and the Hijri date. */
  noon: Date;
  times: PrayerTimesResult;
  /** Umm al-Qura date of the daytime of this date. */
  hijri: HijriDate;
}

export function daysInMonth(ym: YearMonth): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** One row per day of the month, with the city's usual method and school
 * (Karachi + Hanafi ʿAṣr for Bangladesh). */
export function monthRows(city: CityEntry, ym: YearMonth): MonthRow[] {
  const [y, m] = ym.split('-').map(Number);
  return Array.from({ length: daysInMonth(ym) }, (_, i) => {
    const day = i + 1;
    // Noon UTC is the same calendar day in Bangladesh (UTC+6) and on the
    // build machine, the same choice the Ramadan calendar makes.
    const noon = new Date(Date.UTC(y, m - 1, day, 12));
    return {
      date: `${ym}-${String(day).padStart(2, '0')}`,
      day,
      noon,
      times: computePrayerTimes(city.lat, city.lng, noon, city.countryCode),
      hijri: toHijri(noon),
    };
  });
}
