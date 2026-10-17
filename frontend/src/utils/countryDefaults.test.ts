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
  it('Bangladesh: sehri 3 min before Fajr, Maghrib +3, all year, only with its default method (Karachi)', () => {
    expect(COUNTRY_TIME_ADJUSTMENTS).toEqual({ BD: { sehri: -3, maghrib: 3 } });
    expect(countryTimeAdjustments('BD', 'Karachi')).toEqual({ sehri: -3, maghrib: 3 });
    expect(countryTimeAdjustments('bd', 'Karachi')).toEqual({ sehri: -3, maghrib: 3 });
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
    '%s: sehri never later, iftar never earlier, within 3 min',
    (day, sehri, iftar) => {
      const t = computePrayerTimes(DHAKA.lat, DHAKA.lng, day, DHAKA.timezone, 'BD');
      const sehriGap = dhakaMinutes(t.sehri) - toMinutes(sehri);
      const iftarGap = dhakaMinutes(t.maghrib) - toMinutes(iftar);
      expect(sehriGap).toBeLessThanOrEqual(0);
      expect(sehriGap).toBeGreaterThanOrEqual(-3);
      expect(iftarGap).toBeGreaterThanOrEqual(0);
      expect(iftarGap).toBeLessThanOrEqual(3);
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

  it('sehri ends 3 min before Fajr, iftar 3 min after sunset; Fajr itself never moves', () => {
    const t = computePrayerTimes(DHAKA.lat, DHAKA.lng, '2026-02-19', DHAKA.timezone, 'BD');
    const r = raw(DHAKA.lat, DHAKA.lng, '2026-02-19', 'Karachi');
    expect(t.maghrib.getTime() - r.sunset.getTime()).toBe(3 * 60_000);
    expect(r.fajr.getTime() - t.sehri.getTime()).toBe(3 * 60_000);
    // An earlier Fajr would be the unsafe side for the prayer: unchanged.
    expect(t.fajr.getTime()).toBe(r.fajr.getTime());
    // The rest of the day is the method's own.
    expect(t.sunrise.getTime()).toBe(r.sunrise.getTime());
    expect(t.dhuhr.getTime()).toBe(r.dhuhr.getTime());
    expect(t.isha.getTime()).toBe(r.isha.getTime());
  });
});

/** IF's permanent Dhaka timetable ("সাহরী ও ইফতারসহ (ঢাকা) নামাজের স্থায়ী
 * সময়সূচী", 2015 edition, mirrored at kivabe.com/namaz/islamicfoundation.php):
 * sehri / "Maghrib and iftar", read 2026-10-17. It is stricter than IF's own
 * 2026 Ramadan table, so it is only used for the SEASON: the rows both tables
 * share give the offset between them, and the summer rows moved by that
 * offset estimate IF's summer times. */
const IF_PERMANENT_OVERLAP: [day: string, sehri: string, iftar: string][] = [
  ['2026-02-24', '05:05', '18:02'],
  ['2026-03-01', '05:01', '18:05'],
  ['2026-03-06', '04:57', '18:07'],
  ['2026-03-12', '04:51', '18:10'],
  ['2026-03-18', '04:45', '18:12'],
];
const IF_PERMANENT_SUMMER: [day: string, sehri: string, iftar: string][] = [
  ['2026-04-01', '04:29', '18:18'],
  ['2026-04-06', '04:24', '18:20'],
  ['2026-04-12', '04:18', '18:23'],
  ['2026-04-18', '04:11', '18:25'],
  ['2026-04-24', '04:05', '18:28'],
  ['2026-04-30', '04:00', '18:30'],
  ['2026-05-01', '03:59', '18:31'],
  ['2026-05-06', '03:53', '18:33'],
  ['2026-05-12', '03:49', '18:36'],
  ['2026-05-18', '03:46', '18:39'],
  ['2026-05-24', '03:42', '18:42'],
  ['2026-05-30', '03:40', '18:45'],
  ['2026-06-01', '03:39', '18:46'],
  ['2026-06-06', '03:38', '18:47'],
  ['2026-06-12', '03:38', '18:50'],
  ['2026-06-18', '03:38', '18:51'],
  // The scan prints 5-53 here: 6:53, between 6:51 and 6:53 around it.
  ['2026-06-24', '03:39', '18:53'],
  ['2026-06-30', '03:43', '18:53'],
  ['2026-07-12', '03:48', '18:53'],
  ['2026-07-18', '03:51', '18:52'],
  ['2026-07-24', '03:55', '18:49'],
  ['2026-07-30', '03:59', '18:46'],
  ['2026-08-01', '04:00', '18:45'],
  ['2026-08-06', '04:04', '18:42'],
  ['2026-08-12', '04:07', '18:38'],
  ['2026-08-18', '04:11', '18:33'],
  ['2026-08-24', '04:14', '18:28'],
  ['2026-08-30', '04:17', '18:22'],
];

describe("Dhaka in summer, against IF's permanent timetable", () => {
  const ramadan2026 = new Map(IF_DHAKA_RAMADAN_2026.map(([day, s, i]) => [day, { s, i }]));
  // IF 2026 minus the permanent table on the shared days, the most cautious
  // one for each: sehri the smallest (estimate never too late), iftar the
  // largest (estimate never too early).
  const sehriOffset = Math.min(
    ...IF_PERMANENT_OVERLAP.map(
      ([day, sehri]) => toMinutes(ramadan2026.get(day)!.s) - toMinutes(sehri)
    )
  );
  const iftarOffset = Math.max(
    ...IF_PERMANENT_OVERLAP.map(
      ([day, , iftar]) => toMinutes(ramadan2026.get(day)!.i) - toMinutes(iftar)
    )
  );

  it('the two IF tables differ by a steady offset on the shared days', () => {
    expect(sehriOffset).toBe(3);
    for (const [day, sehri] of IF_PERMANENT_OVERLAP) {
      const offset = toMinutes(ramadan2026.get(day)!.s) - toMinutes(sehri);
      expect([3, 4], day).toContain(offset);
    }
    expect(iftarOffset).toBe(-2);
    for (const [day, , iftar] of IF_PERMANENT_OVERLAP) {
      expect(toMinutes(ramadan2026.get(day)!.i) - toMinutes(iftar), day).toBe(-2);
    }
  });

  it.each(IF_PERMANENT_SUMMER)(
    '%s: iftar never earlier than the estimate',
    (day, _sehri, iftar) => {
      const t = computePrayerTimes(DHAKA.lat, DHAKA.lng, day, DHAKA.timezone, 'BD');
      expect(dhakaMinutes(t.maghrib) - (toMinutes(iftar) + iftarOffset)).toBeGreaterThanOrEqual(0);
    }
  );

  // 6 May reads 3:53, but the table's own neighbours (3:59 on 1 May, 3:49 on
  // 12 May) put it at 3:54-3:55, and its gap to Karachi's Fajr is 7 min where
  // every other summer row is 4-6 (the Fajr column, sehri + 6, repeats the
  // slip). Treated as a one-minute slip in the table: kept out of the strict
  // check, and held within 1 min below so it cannot drift further unseen.
  const SCAN_SLIP = '2026-05-06';
  it.each(IF_PERMANENT_SUMMER.filter(([day]) => day !== SCAN_SLIP))(
    '%s: sehri never later than the estimate',
    (day, sehri) => {
      const t = computePrayerTimes(DHAKA.lat, DHAKA.lng, day, DHAKA.timezone, 'BD');
      expect(dhakaMinutes(t.sehri) - (toMinutes(sehri) + sehriOffset)).toBeLessThanOrEqual(0);
    }
  );

  it(`${SCAN_SLIP} (a slip in the table): within 1 min of the estimate`, () => {
    const [day, sehri] = IF_PERMANENT_SUMMER.find(([d]) => d === SCAN_SLIP)!;
    const t = computePrayerTimes(DHAKA.lat, DHAKA.lng, day, DHAKA.timezone, 'BD');
    expect(dhakaMinutes(t.sehri) - (toMinutes(sehri) + sehriOffset)).toBeLessThanOrEqual(1);
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
      // Sehri ends at Fajr itself.
      expect([t.fajr, t.sehri, t.maghrib].map((d) => d.getTime())).toEqual(
        [r.fajr, r.fajr, r.maghrib].map((d) => d.getTime())
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
        [app.fajr, app.sehri, app.maghrib, app.asr].map((d) => d.getTime()),
        day
      ).toEqual([page.fajr, page.sehri, page.maghrib, page.asr].map((d) => d.getTime()));
    }
  });

  it('Bangladesh, Karachi saved (onboarding saves the preselected default): calibrated', () => {
    place(DHAKA.lat, DHAKA.lng);
    store.setItem('bustandeen_calc_method', 'Karachi');
    const app = calcPrayerTimesForDay(DHAKA.lat, DHAKA.lng, '2026-02-19');
    const page = computePrayerTimes(DHAKA.lat, DHAKA.lng, '2026-02-19', DHAKA.timezone, 'BD');
    expect(app.sehri.getTime()).toBe(page.sehri.getTime());
    expect(app.maghrib.getTime()).toBe(page.maghrib.getTime());
  });

  it('Bangladesh, another method picked: that method’s own numbers', () => {
    place(DHAKA.lat, DHAKA.lng);
    store.setItem('bustandeen_calc_method', 'MuslimWorldLeague');
    const app = calcPrayerTimesForDay(DHAKA.lat, DHAKA.lng, '2026-02-19');
    const r = raw(DHAKA.lat, DHAKA.lng, '2026-02-19', 'MuslimWorldLeague');
    expect(app.fajr.getTime()).toBe(r.fajr.getTime());
    expect(app.sehri.getTime()).toBe(r.fajr.getTime());
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
    expect(app.sehri.getTime()).toBe(r.fajr.getTime());
    expect(app.maghrib.getTime()).toBe(r.maghrib.getTime());
  });

  it('London keeps the Moonsighting Committee numbers', () => {
    place(51.5074, -0.1278);
    const app = calcPrayerTimesForDay(51.5074, -0.1278, '2026-06-21');
    const r = raw(51.5074, -0.1278, '2026-06-21', 'MoonsightingCommittee');
    expect(app.fajr.getTime()).toBe(r.fajr.getTime());
    expect(app.sehri.getTime()).toBe(r.fajr.getTime());
    expect(app.maghrib.getTime()).toBe(r.maghrib.getTime());
  });
});
