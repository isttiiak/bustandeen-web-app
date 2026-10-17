import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as adhan from 'adhan';
import {
  COUNTRY_PRAYER_DEFAULTS,
  COUNTRY_TIME_ADJUSTMENTS,
  countryTimeAdjustments,
  type CalcMethodId,
} from './countryDefaults.js';
import { calcPrayerTimesForDay } from './prayerTimes.js';
import { loadZoneLookup, resetZoneLookupForTests } from './placeClock.js';
import { computePrayerTimes } from '../seo/utils/calc.js';
import { cityBySlug } from '../seo/data/cities.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit R0a (v5.179.0): Bangladesh's default times are calibrated to Islamic
// Foundation Bangladesh, in the app and on the static pages alike, always to
// the safe side. Every other country keeps its method's own numbers.

/** Islamic Foundation Bangladesh, Dhaka, Ramadan 1447 (2026): sehri ends /
 * iftar, Bangladesh time. Via https://dbcnews.tv/ramadan-2026 ("source:
 * Islamic Foundation Bangladesh"), read 2026-10-17. */
const IF_DHAKA_RAMADAN_2026: [day: string, sehri: string, iftar: string][] = [
  ['2026-02-19', '05:12', '17:58'],
  ['2026-02-20', '05:11', '17:58'],
  ['2026-02-21', '05:11', '17:59'],
  ['2026-02-22', '05:10', '17:59'],
  ['2026-02-23', '05:09', '18:00'],
  ['2026-02-24', '05:08', '18:00'],
  ['2026-02-25', '05:08', '18:01'],
  ['2026-02-26', '05:07', '18:01'],
  ['2026-02-27', '05:06', '18:02'],
  ['2026-02-28', '05:05', '18:02'],
  ['2026-03-01', '05:05', '18:03'],
  ['2026-03-02', '05:04', '18:03'],
  ['2026-03-03', '05:03', '18:04'],
  ['2026-03-04', '05:02', '18:04'],
  ['2026-03-05', '05:01', '18:05'],
  ['2026-03-06', '05:00', '18:05'],
  ['2026-03-07', '04:59', '18:06'],
  ['2026-03-08', '04:58', '18:06'],
  ['2026-03-09', '04:57', '18:07'],
  ['2026-03-10', '04:57', '18:07'],
  ['2026-03-11', '04:56', '18:07'],
  ['2026-03-12', '04:55', '18:08'],
  ['2026-03-13', '04:54', '18:08'],
  ['2026-03-14', '04:53', '18:09'],
  ['2026-03-15', '04:52', '18:09'],
  ['2026-03-16', '04:51', '18:10'],
  ['2026-03-17', '04:50', '18:10'],
  ['2026-03-18', '04:49', '18:10'],
  ['2026-03-19', '04:48', '18:11'],
  ['2026-03-20', '04:47', '18:11'],
];

const DHAKA = cityBySlug('dhaka-bangladesh')!;

/** Minutes after midnight on the Dhaka clock. */
function dhakaMinutes(d: Date): number {
  const [h, m] = d
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })
    .split(':')
    .map(Number);
  return h * 60 + m;
}
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** adhan with the method's own numbers only, no calibration. */
function raw(lat: number, lng: number, day: string, method: CalcMethodId) {
  const [y, m, d] = day.split('-').map(Number);
  return new adhan.PrayerTimes(
    new adhan.Coordinates(lat, lng),
    new Date(y, m - 1, d, 12),
    adhan.CalculationMethod[method]()
  );
}

describe('the calibration table', () => {
  it('Bangladesh: Fajr -1, Maghrib +2, only with its default method (Karachi)', () => {
    expect(COUNTRY_TIME_ADJUSTMENTS).toEqual({ BD: { fajr: -1, maghrib: 2 } });
    expect(countryTimeAdjustments('BD', 'Karachi')).toEqual({ fajr: -1, maghrib: 2 });
    expect(countryTimeAdjustments('bd', 'Karachi')).toEqual({ fajr: -1, maghrib: 2 });
    expect(countryTimeAdjustments('BD', 'MuslimWorldLeague')).toBeNull();
    expect(countryTimeAdjustments(null, 'Karachi')).toBeNull();
  });

  it('no other country is calibrated, Pakistan on Karachi included', () => {
    for (const [cc, { method }] of Object.entries(COUNTRY_PRAYER_DEFAULTS)) {
      if (cc !== 'BD') expect(countryTimeAdjustments(cc, method), cc).toBeNull();
    }
    expect(countryTimeAdjustments('PK', 'Karachi')).toBeNull();
    expect(countryTimeAdjustments('ZZ', 'MoonsightingCommittee')).toBeNull();
  });
});

describe('Dhaka against Islamic Foundation, Ramadan 2026 (static pages)', () => {
  it.each(IF_DHAKA_RAMADAN_2026)(
    '%s: sehri never later, iftar never earlier, within 2 min',
    (day, sehri, iftar) => {
      const t = computePrayerTimes(DHAKA.lat, DHAKA.lng, day, DHAKA.timezone, 'BD');
      const fajrGap = dhakaMinutes(t.fajr) - toMinutes(sehri);
      const iftarGap = dhakaMinutes(t.maghrib) - toMinutes(iftar);
      expect(fajrGap).toBeLessThanOrEqual(0);
      expect(fajrGap).toBeGreaterThanOrEqual(-2);
      expect(iftarGap).toBeGreaterThanOrEqual(0);
      expect(iftarGap).toBeLessThanOrEqual(2);
    }
  );

  it('plain Karachi was on the unsafe side (why the calibration exists)', () => {
    const later = IF_DHAKA_RAMADAN_2026.filter(
      ([day, sehri]) =>
        dhakaMinutes(raw(DHAKA.lat, DHAKA.lng, day, 'Karachi').fajr) > toMinutes(sehri)
    );
    const earlier = IF_DHAKA_RAMADAN_2026.filter(
      ([day, , iftar]) =>
        dhakaMinutes(raw(DHAKA.lat, DHAKA.lng, day, 'Karachi').maghrib) < toMinutes(iftar)
    );
    expect(later.length).toBe(28);
    expect(earlier.length).toBe(30);
  });

  it('sunset itself is not moved, only Maghrib', () => {
    const t = computePrayerTimes(DHAKA.lat, DHAKA.lng, '2026-02-19', DHAKA.timezone, 'BD');
    const r = raw(DHAKA.lat, DHAKA.lng, '2026-02-19', 'Karachi');
    expect(t.maghrib.getTime() - r.sunset.getTime()).toBe(2 * 60_000);
    expect(r.fajr.getTime() - t.fajr.getTime()).toBe(60_000);
    // The rest of the day is the method's own.
    expect(t.sunrise.getTime()).toBe(r.sunrise.getTime());
    expect(t.dhuhr.getTime()).toBe(r.dhuhr.getTime());
    expect(t.isha.getTime()).toBe(r.isha.getTime());
  });
});

describe('other countries keep their method numbers (static pages)', () => {
  const PLACES = [
    { cc: 'PK', lat: 24.8607, lng: 67.0011, tz: 'Asia/Karachi' },
    { cc: 'IN', lat: 22.5726, lng: 88.3639, tz: 'Asia/Kolkata' },
    { cc: 'GB', lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
    { cc: 'AE', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai' },
    { cc: 'TR', lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul' },
    { cc: 'SA', lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh' },
    { cc: 'US', lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
    { cc: 'MY', lat: 3.139, lng: 101.6869, tz: 'Asia/Kuala_Lumpur' },
  ];
  it.each(PLACES)('$cc', ({ cc, lat, lng, tz }) => {
    for (const day of ['2026-03-01', '2026-06-21', '2026-12-21']) {
      const t = computePrayerTimes(lat, lng, day, tz, cc);
      const r = raw(lat, lng, day, t.method);
      expect([t.fajr, t.maghrib].map((d) => d.getTime())).toEqual(
        [r.fajr, r.maghrib].map((d) => d.getTime())
      );
    }
  });
});

describe('the app shows the same minute as the pages', () => {
  let store: MemoryStorage;
  const place = (lat: number, lng: number) =>
    store.setItem('bustandeen_location', JSON.stringify({ latitude: lat, longitude: lng }));

  beforeAll(async () => {
    await loadZoneLookup();
  });
  afterAll(() => {
    resetZoneLookupForTests();
  });
  beforeEach(() => {
    store = new MemoryStorage();
    vi.stubGlobal('localStorage', store);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Bangladesh, country default: every IF day matches the static page', () => {
    place(DHAKA.lat, DHAKA.lng);
    for (const [day] of IF_DHAKA_RAMADAN_2026) {
      const app = calcPrayerTimesForDay(DHAKA.lat, DHAKA.lng, day);
      const page = computePrayerTimes(DHAKA.lat, DHAKA.lng, day, DHAKA.timezone, 'BD');
      expect(
        [app.fajr, app.maghrib, app.asr].map((d) => d.getTime()),
        day
      ).toEqual([page.fajr, page.maghrib, page.asr].map((d) => d.getTime()));
    }
  });

  it('Bangladesh, Karachi saved (onboarding saves the preselected default): calibrated', () => {
    place(DHAKA.lat, DHAKA.lng);
    store.setItem('bustandeen_calc_method', 'Karachi');
    const app = calcPrayerTimesForDay(DHAKA.lat, DHAKA.lng, '2026-02-19');
    const page = computePrayerTimes(DHAKA.lat, DHAKA.lng, '2026-02-19', DHAKA.timezone, 'BD');
    expect(app.fajr.getTime()).toBe(page.fajr.getTime());
    expect(app.maghrib.getTime()).toBe(page.maghrib.getTime());
  });

  it('Bangladesh, another method picked: that method’s own numbers', () => {
    place(DHAKA.lat, DHAKA.lng);
    store.setItem('bustandeen_calc_method', 'MuslimWorldLeague');
    const app = calcPrayerTimesForDay(DHAKA.lat, DHAKA.lng, '2026-02-19');
    const r = raw(DHAKA.lat, DHAKA.lng, '2026-02-19', 'MuslimWorldLeague');
    expect(app.fajr.getTime()).toBe(r.fajr.getTime());
    expect(app.maghrib.getTime()).toBe(r.maghrib.getTime());
  });

  it('a place outside Bangladesh on Karachi is not calibrated, even on a Dhaka phone', () => {
    // The test runs on Asia/Dhaka (vitest.config.ts): the device says BD,
    // the place's own zone says PK.
    const karachi = { lat: 24.8607, lng: 67.0011 };
    place(karachi.lat, karachi.lng);
    store.setItem('bustandeen_calc_method', 'Karachi');
    const app = calcPrayerTimesForDay(karachi.lat, karachi.lng, '2026-02-19');
    const r = raw(karachi.lat, karachi.lng, '2026-02-19', 'Karachi');
    expect(app.fajr.getTime()).toBe(r.fajr.getTime());
    expect(app.maghrib.getTime()).toBe(r.maghrib.getTime());
  });

  it('London keeps the Moonsighting Committee numbers', () => {
    place(51.5074, -0.1278);
    const app = calcPrayerTimesForDay(51.5074, -0.1278, '2026-06-21');
    const r = raw(51.5074, -0.1278, '2026-06-21', 'MoonsightingCommittee');
    expect(app.fajr.getTime()).toBe(r.fajr.getTime());
    expect(app.maghrib.getTime()).toBe(r.maghrib.getTime());
  });
});
