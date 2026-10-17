import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as adhan from 'adhan';
import type { CityEntry } from '../data/cities.js';
import {
  applyTimeAdjustments,
  countryTimeAdjustments,
  prayerDefaultsForCountry,
} from '../../utils/countryDefaults.js';
import PrayerTimesCityPage from '../templates/PrayerTimesCityPage.js';
import RamadanCalendarPage from '../templates/RamadanCalendarPage.js';
import { formatTimeInZone } from './calc.js';
import { ramadanPlan } from './ramadanBd.js';

/** The page without its print sheets (R2-R4 draw three more tables). */
const screenPart = (html: string) => html.split('<div data-ramadan-sheets')[0];

// The static pages are built on CI / Vercel, which run in UTC. A page must
// show its city's civil day, whatever the build machine's zone: west of UTC
// the city is still on "yesterday" for part of the UTC day, and on the
// date-line islands (clock UTC+13/+14 at longitudes west of 180°) adhan's
// day N holds the prayers of civil day N+1.

const LA: CityEntry = {
  slug: 'los-angeles-test',
  name: 'Los Angeles',
  country: 'United States',
  countryCode: 'US',
  lat: 34.0522,
  lng: -118.2437,
  timezone: 'America/Los_Angeles',
  population: 1,
};
const APIA: CityEntry = {
  slug: 'apia-test',
  name: 'Apia',
  country: 'Samoa',
  countryCode: 'WS',
  lat: -13.8333,
  lng: -171.7667,
  timezone: 'Pacific/Apia',
  population: 1,
};
const NEW_YORK: CityEntry = {
  ...LA,
  slug: 'ny-test',
  name: 'New York',
  lat: 40.7128,
  lng: -74.006,
  timezone: 'America/New_York',
};

const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

/** adhan's own day `y-m-d`, read the way adhan reads it (local getters). */
function adhanDay(city: CityEntry, y: number, m: number, d: number) {
  const { method } = prayerDefaultsForCountry(city.countryCode);
  // With the country's calibration to its official timetable (R0a).
  const params = applyTimeAdjustments(
    adhan.CalculationMethod[method](),
    countryTimeAdjustments(city.countryCode, method)
  );
  return new adhan.PrayerTimes(
    new adhan.Coordinates(city.lat, city.lng),
    new Date(y, m - 1, d, 12),
    params
  );
}

const ymdIn = (date: Date, tz: string) => date.toLocaleDateString('en-CA', { timeZone: tz });

/** The adhan day whose Dhuhr falls on civil `ymd` in the city's zone. */
function civilDay(city: CityEntry, ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  for (const off of [0, -1, 1]) {
    const t = adhanDay(city, y, m, d + off);
    if (ymdIn(t.dhuhr, city.timezone) === ymd) return t;
  }
  throw new Error(`no adhan day for ${ymd}`);
}

const fmt = (city: CityEntry, d: Date) => formatTimeInZone(d, city.timezone, 'en-US');

/** The six times the city page shows, in row order (standard ʿAṣr only). */
function cityPageTimes(city: CityEntry, buildDate: Date): string[] {
  const html = renderToStaticMarkup(
    createElement(PrayerTimesCityPage, { lang: 'en', city, buildDate })
  );
  const all = [...html.matchAll(/font-black tabular-nums">([^<]+)</g)].map((m) => m[1]);
  // Rows: fajr, sunrise, dhuhr, asrStandard, asrHanafi, maghrib, isha.
  return [all[0], all[1], all[2], all[3], all[5], all[6]];
}

const expectedTimes = (city: CityEntry, t: adhan.PrayerTimes) => KEYS.map((k) => fmt(city, t[k]));

let savedTz: string | undefined;
beforeAll(() => {
  savedTz = process.env.TZ;
  process.env.TZ = 'UTC';
});
afterAll(() => {
  process.env.TZ = savedTz;
});

describe('city page shows the city civil day (build in UTC)', () => {
  const buildDate = new Date('2026-10-12T03:00:00Z'); // LA: 11 Oct 20:00, Apia: 12 Oct 16:00

  it('runs in UTC', () => {
    expect(new Date('2026-10-12T03:00:00Z').getDate()).toBe(12);
  });

  it('Los Angeles: 11 October times under the 11 October date', () => {
    const want = expectedTimes(LA, adhanDay(LA, 2026, 10, 11));
    // The test only means something if the two days differ.
    expect(expectedTimes(LA, adhanDay(LA, 2026, 10, 12))).not.toEqual(want);
    expect(cityPageTimes(LA, buildDate)).toEqual(want);
    const html = renderToStaticMarkup(
      createElement(PrayerTimesCityPage, { lang: 'en', city: LA, buildDate })
    );
    expect(html).toContain('October 11, 2026');
  });

  it("Apia: the adhan day whose Dhuhr is on Apia's 12 October", () => {
    const t = civilDay(APIA, '2026-10-12');
    expect(ymdIn(t.dhuhr, 'Pacific/Apia')).toBe('2026-10-12');
    expect(cityPageTimes(APIA, buildDate)).toEqual(expectedTimes(APIA, t));
  });

  it('a city east of UTC is unchanged (Dhaka-like: same day)', () => {
    const dhaka: CityEntry = {
      ...LA,
      countryCode: 'BD',
      lat: 23.8103,
      lng: 90.4125,
      timezone: 'Asia/Dhaka',
    };
    const evening = new Date('2026-10-12T15:00:00Z'); // Dhaka 21:00, 12 Oct
    expect(cityPageTimes(dhaka, evening)).toEqual(
      expectedTimes(dhaka, adhanDay(dhaka, 2026, 10, 12))
    );
  });
});

describe('Ramadan calendar rows are civil days of the city', () => {
  // Umm al-Qura: 1 Ramadan 1448 = 8 Feb 2027.
  const rows = (city: CityEntry) => {
    const html = renderToStaticMarkup(
      createElement(RamadanCalendarPage, {
        lang: 'en',
        city,
        plan: ramadanPlan(city, 1448, []),
        gregorianYear: 2027,
      })
    );
    // The visible rows (only they carry data-fast), cells as plain text
    // without the screen-reader "if Ramadan has 30 days" note, the weekday
    // or the odd-night star.
    return [
      ...screenPart(html).matchAll(
        /<tr data-date="[^"]*" data-ramadan-row="\d+" data-fast="\d+"[^>]*>(.*?)<\/tr>/g
      ),
    ]
      .map((m) =>
        m[1]
          .replace(/<span data-possible-note[^>]*>.*?<\/span>/g, '')
          .replace(/ ?<small[^>]*>.*?<\/small>/g, '')
      )
      .map((row) =>
        [...row.matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/g)].map((c) =>
          c[1].replace(/<span data-odd-star[^>]*>.*?<\/span>/g, '').replace(/<[^>]+>/g, '')
        )
      );
  };

  // Every row against the adhan day whose Dhuhr is on that civil date (one
  // day's shift is often under a minute, so day 1 alone can hide it).
  const expectedRows = (city: CityEntry, count: number) =>
    Array.from({ length: count }, (_, i) => {
      const date = new Date(Date.UTC(2027, 1, 8 + i));
      const t = civilDay(city, date.toISOString().slice(0, 10));
      const label = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      return [String(i + 1), label, fmt(city, t.fajr), fmt(city, t.maghrib)];
    });

  it.each([
    ['Apia', APIA],
    ['New York', NEW_YORK],
  ])('%s: each row is that date, with its own Fajr and Maghrib', (_name, city) => {
    const got = rows(city);
    expect(got.length).toBeGreaterThanOrEqual(29);
    expect(got).toEqual(expectedRows(city, got.length));
  });
});
