// The Ramadan calendar of a city (audit T4.4; every country since v5.178.0).
// Dates follow the app's own rule (T4.1, hijriOffset.ts resolveHijriDay): the
// country's month-start records (prerender.mjs fetches the public records at
// build time; only Bangladesh has any). Without a record the dates are
// Umm al-Qura's, and the page says they are subject to the moon sighting.
import type { CityEntry } from '../data/cities.js';
import { resolveHijriDay, type MoonSightingRecord } from '../../utils/hijriOffset.js';
import { computePrayerTimes, ramadanRangeForHijriYear } from './calc.js';
import type { PrayerTimesResult } from './calc.js';

const DAY = 86_400_000;

export interface RamadanDay {
  /** 1-based number of the fast. */
  fast: number;
  /** `YYYY-MM-DD`, the civil date in the city. */
  date: string;
  /** Noon UTC of the date: format it with `timeZone: 'UTC'`. */
  noon: Date;
  times: PrayerTimesResult;
}

/** What the first fast's date rests on:
 *  - `announced`: a record of this Ramadan's start;
 *  - `forecast`: the country's latest record (an earlier month) carried forward;
 *  - `ummAlQura`: no record for the country. */
export type RamadanBasis = 'announced' | 'forecast' | 'ummAlQura';

export interface RamadanPlan {
  hijriYear: number;
  days: RamadanDay[];
  basis: RamadanBasis;
  /** The record that announced this Ramadan's start, if one exists. */
  startRecord?: MoonSightingRecord;
  /** For a `forecast`: the latest record before Ramadan, which moved the dates. */
  forecastRecord?: MoonSightingRecord;
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
  const date = ymd(noon);
  return {
    fast,
    date,
    noon,
    times: computePrayerTimes(city.lat, city.lng, date, city.timezone, city.countryCode),
  };
}

export function ramadanPlan(
  city: CityEntry,
  hijriYear: number,
  records: readonly MoonSightingRecord[],
  country = city.countryCode
): RamadanPlan {
  const uq = ramadanRangeForHijriYear(hijriYear);
  const uqStart = Date.UTC(
    uq.start.getUTCFullYear(),
    uq.start.getUTCMonth(),
    uq.start.getUTCDate(),
    12
  );

  // A record's start is at most two days from Umm al-Qura's and the month
  // may run to 30 days, so this window always holds the month as Bangladesh
  // counts it.
  const noons: Date[] = [];
  let firstRecord: MoonSightingRecord | undefined;
  for (let i = -3; i <= 33; i++) {
    const noon = new Date(uqStart + i * DAY);
    const { hijri, record } = resolveHijriDay({
      manual: false,
      userOffset: 0,
      country,
      records,
      day: ymd(noon),
    });
    if (hijri.year === hijriYear && hijri.month === 9) {
      if (noons.length === 0) firstRecord = record;
      noons.push(noon);
    }
  }
  const days = noons.map((noon, i) => dayRow(city, noon, i + 1));
  const mine = records.filter((r) => r.country === country && r.hijriYear === hijriYear);

  // The announcement of this Ramadan's start, and of Shawwal's (which fixes
  // the month's length).
  const startRecord = mine.find((r) => r.hijriMonth === 9);
  const endSettled = mine.some((r) => r.hijriMonth === 10);

  const possible30 =
    days.length === 29 && !endSettled
      ? dayRow(city, new Date(noons[28].getTime() + DAY), 30)
      : undefined;

  const basis: RamadanBasis = startRecord ? 'announced' : firstRecord ? 'forecast' : 'ummAlQura';
  const forecastRecord = basis === 'forecast' ? firstRecord : undefined;

  return { hijriYear, days, basis, startRecord, forecastRecord, endSettled, possible30 };
}
