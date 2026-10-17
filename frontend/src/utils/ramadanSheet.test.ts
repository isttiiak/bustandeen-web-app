import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRamadanSheet, formatCoordinates } from './ramadanSheet.js';
import { getRamadanWindow } from './ramadan.js';
import { calcPrayerTimesForDay, formatTime } from './prayerTimes.js';
import { loadZoneLookup, resetZoneLookupForTests, type SavedPlace } from './placeClock.js';
import { HIJRI_COUNTRY_KEY, MOON_SIGHTING_KEY } from './islamicCalendar.js';
import type { MoonSightingRecord } from './hijriOffset.js';
import { computePrayerTimes } from '../seo/utils/calc.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit R12: the app's Ramadan sheet for a place without a prerendered page.
// The phone's clock is Asia/Dhaka (vitest pins TZ). Ramadan 1448 by Umm
// al-Qura: 8 Feb - 8 Mar 2027 (29 days), so the 30th is "possible".

const at = (place: SavedPlace) => {
  localStorage.setItem('bustandeen_location', JSON.stringify(place));
  return buildRamadanSheet(getRamadanWindow(), place)!;
};

/** "4:58 AM" on a zone's clock, for comparing minutes. */
const clock = (d: Date, timeZone: string) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone });

const rec = (hijriMonth: number, startDate: string): MoonSightingRecord => ({
  id: `BD-${hijriMonth}`,
  country: 'BD',
  hijriYear: 1448,
  hijriMonth,
  startDate,
  effectiveFrom: startDate,
  offset: 0,
  note: '',
});

beforeAll(async () => {
  await loadZoneLookup();
});
afterAll(() => {
  resetZoneLookupForTests();
});
beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T10:00:00+06:00'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('buildRamadanSheet', () => {
  it("a calibrated country: a Bangladesh town without a page gets the static pages' minute", () => {
    // Bhairab, Kishoreganj: no district page of its own.
    const place = { latitude: 24.05, longitude: 90.98, name: 'Bhairab, Bangladesh' };
    const sheet = at(place);
    expect(sheet.hijriYear).toBe(1448);
    expect(sheet.country).toBe('BD');
    expect(sheet.method).toBe('Karachi');
    expect(sheet.calibration).toMatchObject({ sehri: -3, maghrib: 3 });
    expect(sheet.rows).toHaveLength(29);
    expect(sheet.rows[0]).toMatchObject({ fast: 1, date: '2027-02-08' });
    expect(sheet.possible30).toMatchObject({ fast: 30, date: '2027-03-09' });
    // Every row: the same minute as seo/utils/calc.ts (the prerendered pages).
    for (const r of [...sheet.rows, sheet.possible30!]) {
      const ref = computePrayerTimes(24.05, 90.98, r.date, 'Asia/Dhaka', 'BD');
      expect(r.sehri.getTime()).toBe(ref.sehri.getTime());
      expect(r.iftar.getTime()).toBe(ref.maghrib.getTime());
      // Sehri 3 minutes before Fajr.
      expect(ref.fajr.getTime() - r.sehri.getTime()).toBe(3 * 60_000);
    }
  });

  it("an uncalibrated country: the country's method alone, sehri at Fajr", () => {
    // Sukkur, Pakistan: no page; Karachi method, no official timetable matched.
    const place = { latitude: 27.7, longitude: 68.86, name: 'Sukkur, Pakistan' };
    const sheet = at(place);
    expect(sheet.country).toBe('PK');
    expect(sheet.method).toBe('Karachi');
    expect(sheet.calibration).toBeNull();
    for (const r of sheet.rows) {
      const ref = computePrayerTimes(27.7, 68.86, r.date, 'Asia/Karachi', 'PK');
      expect(r.sehri.getTime()).toBe(ref.fajr.getTime());
      expect(r.iftar.getTime()).toBe(ref.maghrib.getTime());
    }
  });

  it('a country with no known convention: no calibration, the same times as the page', () => {
    // Garissa, Kenya. Its zone names no country in countryDefaults, so the
    // method follows the phone's country (regionCountry); the sheet only has
    // to match what the app shows, and borrows no country's calibration.
    const place = { latitude: -0.45, longitude: 39.65, name: 'Garissa, Kenya' };
    const sheet = at(place);
    expect(sheet.zone).toBe('Africa/Nairobi');
    expect(sheet.country).toBeNull();
    expect(sheet.calibration).toBeNull();
    for (const r of sheet.rows) {
      const app = calcPrayerTimesForDay(-0.45, 39.65, r.date);
      expect(r.sehri.getTime()).toBe(app.fajr.getTime());
      expect(r.iftar.getTime()).toBe(app.maghrib.getTime());
    }
  });

  it("the user's own method wins and drops the calibration", () => {
    localStorage.setItem('bustandeen_calc_method', 'MuslimWorldLeague');
    const sheet = at({ latitude: 24.05, longitude: 90.98 });
    expect(sheet.method).toBe('MuslimWorldLeague');
    expect(sheet.calibration).toBeNull();
  });

  it("far-zone place clock: a phone on Dhaka time, a UK town's times on the UK clock", () => {
    // Keighley, West Yorkshire: no page of its own.
    const place = { latitude: 53.87, longitude: -1.91, name: 'Keighley, United Kingdom' };
    const sheet = at(place);
    expect(sheet.zone).toBe('Europe/London');
    expect(sheet.country).toBe('GB');
    expect(sheet.rows[0]!.date).toBe('2027-02-08');
    for (const r of sheet.rows) {
      const ref = computePrayerTimes(53.87, -1.91, r.date, 'Europe/London', 'GB');
      expect(r.sehri.getTime()).toBe(ref.sehri.getTime());
      expect(r.iftar.getTime()).toBe(ref.maghrib.getTime());
      // The sheet prints the place's clock, not the phone's (Dhaka is +6 h).
      expect(formatTime(r.iftar)).toBe(clock(r.iftar, 'Europe/London'));
      expect(formatTime(r.iftar)).not.toBe(clock(r.iftar, 'Asia/Dhaka'));
      // Each row's times fall on its own date at the place.
      expect(r.iftar.toLocaleDateString('en-CA', { timeZone: 'Europe/London' })).toBe(r.date);
    }
  });

  it("the user's own Hijri offset moves every date", () => {
    localStorage.setItem('bustandeen_hijri_offset', '1');
    localStorage.setItem('bustandeen_hijri_manual', '1');
    const sheet = at({ latitude: 24.05, longitude: 90.98 });
    // +1: the Hijri date is a day ahead, so Ramadan begins a day earlier.
    expect(sheet.rows[0]!.date).toBe('2027-02-07');
  });

  it("the country's records: an announced 30-day month has no possible 30th", () => {
    localStorage.setItem(HIJRI_COUNTRY_KEY, 'BD');
    localStorage.setItem(
      MOON_SIGHTING_KEY,
      JSON.stringify([rec(9, '2027-02-09'), rec(10, '2027-03-11')])
    );
    const sheet = at({ latitude: 24.05, longitude: 90.98 });
    expect(sheet.rows[0]!.date).toBe('2027-02-09');
    expect(sheet.rows).toHaveLength(30);
    expect(sheet.possible30).toBeNull();
  });

  it('a Shawwal record after 29 days settles the month: no possible 30th', () => {
    localStorage.setItem(HIJRI_COUNTRY_KEY, 'BD');
    localStorage.setItem(
      MOON_SIGHTING_KEY,
      JSON.stringify([rec(9, '2027-02-09'), rec(10, '2027-03-10')])
    );
    const sheet = at({ latitude: 24.05, longitude: 90.98 });
    expect(sheet.rows).toHaveLength(29);
    expect(sheet.possible30).toBeNull();
  });

  it('no Ramadan, no sheet', () => {
    expect(
      buildRamadanSheet(
        { active: false, todayNumber: null, days: [], daysUntil: 0, hijriYear: null },
        { latitude: 24.05, longitude: 90.98 }
      )
    ).toBeNull();
  });
});

describe('formatCoordinates', () => {
  it('two decimals with hemispheres', () => {
    expect(formatCoordinates(23.8103, 90.4125)).toBe('23.81° N, 90.41° E');
    expect(formatCoordinates(-0.45, -171.76)).toBe('0.45° S, 171.76° W');
  });
});
