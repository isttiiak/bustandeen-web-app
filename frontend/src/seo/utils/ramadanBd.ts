// The Ramadan calendar of a Bangladesh district (audit T4.4). Dates follow
// the app's own rule (T4.1): Umm al-Qura, shifted by Bangladesh's
// moon-sighting record in force on each date (prerender.mjs fetches the
// public records at build time). Without a record the dates are Umm
// al-Qura's, and the page says they are subject to the national committee.
import type { CityEntry } from '../data/cities.js';
import { resolveHijriOffset, type MoonSightingRecord } from '../../utils/hijriOffset.js';
import { computePrayerTimes, ramadanRangeForHijriYear, toHijri } from './calc.js';
import type { PrayerTimesResult } from './calc.js';

const DAY = 86_400_000;

export interface RamadanDay {
  /** 1-based number of the fast. */
  fast: number;
  /** `YYYY-MM-DD`, the civil date in Bangladesh. */
  date: string;
  /** Noon UTC of the date: same calendar day in Bangladesh (UTC+6). */
  noon: Date;
  times: PrayerTimesResult;
}

export interface RamadanPlan {
  hijriYear: number;
  days: RamadanDay[];
  /** The record that announced this Ramadan's start, if one exists. */
  startRecord?: MoonSightingRecord;
  /** A record after the month (Shawwal) has fixed its length. */
  endSettled: boolean;
  /** The day after a 29-day month, shown as "if Ramadan has 30 days" until
   * the Shawwal moon is announced. */
  possible30?: RamadanDay;
}

export function ramadanPagePath(citySlug: string, gregorianYear: number): string {
  return `/ramadan-calendar/${citySlug}/${gregorianYear}`;
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayRow(city: CityEntry, noon: Date, fast: number): RamadanDay {
  return {
    fast,
    date: ymd(noon),
    noon,
    times: computePrayerTimes(city.lat, city.lng, noon, city.countryCode),
  };
}

export function ramadanPlan(
  city: CityEntry,
  hijriYear: number,
  records: readonly MoonSightingRecord[],
  country = 'BD'
): RamadanPlan {
  const uq = ramadanRangeForHijriYear(hijriYear);
  const uqStart = Date.UTC(
    uq.start.getUTCFullYear(),
    uq.start.getUTCMonth(),
    uq.start.getUTCDate(),
    12
  );

  // A record shifts dates by at most one day, so a few days either side of
  // Umm al-Qura's month is enough to find the month as Bangladesh counts it.
  let noons: Date[] = [];
  const hijriDays: number[] = [];
  for (let i = -3; i <= 33; i++) {
    const noon = new Date(uqStart + i * DAY);
    const { offset } = resolveHijriOffset({
      manual: false,
      userOffset: 0,
      country,
      records,
      day: ymd(noon),
    });
    const h = toHijri(new Date(noon.getTime() + offset * DAY));
    if (h.year === hijriYear && h.month === 9) {
      noons.push(noon);
      hijriDays.push(h.day);
    }
  }
  // A record entered from the announced first day (not the day before) leaves
  // Umm al-Qura's 1 Ramadan in front of it: the announced day 1 wins.
  const announcedFirst = hijriDays.lastIndexOf(1);
  if (announcedFirst > 0) noons = noons.slice(announcedFirst);
  // Numbered in order (not by the shifted Hijri day): a record that starts
  // mid-month must not repeat or skip a fast number.
  const days = noons.map((noon, i) => dayRow(city, noon, i + 1));
  const first = days[0].date;
  const mine = records.filter((r) => r.country === country);

  // The record in force on the first fast, if it was made for this month's
  // start (an older record merely carried over says nothing about it).
  const inForce = resolveHijriOffset({
    manual: false,
    userOffset: 0,
    country,
    records: mine,
    day: first,
  }).record;
  const startRecord =
    inForce && inForce.effectiveFrom >= ymd(new Date(uqStart - 2 * DAY)) ? inForce : undefined;

  const afterMonth = ymd(new Date(noons[noons.length - 1].getTime() + 2 * DAY));
  const late = ymd(new Date(noons[0].getTime() + 20 * DAY));
  const endSettled = mine.some((r) => r.effectiveFrom > late && r.effectiveFrom <= afterMonth);

  const possible30 =
    days.length === 29 && !endSettled
      ? dayRow(city, new Date(noons[28].getTime() + DAY), 30)
      : undefined;

  return { hijriYear, days, startRecord, endSettled, possible30 };
}
