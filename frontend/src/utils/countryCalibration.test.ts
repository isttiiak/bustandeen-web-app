import { describe, expect, it } from 'vitest';
import { COUNTRY_TIME_ADJUSTMENTS } from './countryDefaults.js';
import { computePrayerTimes } from '../seo/utils/calc.js';
import { cityBySlug } from '../seo/data/cities.js';

// Audits R0c/R0d (v5.180.0): every calibrated country against its official
// timetable, always to the safe side: sehri never ends later than the
// official Fajr, iftar never comes earlier than the official Maghrib, and
// where the Fajr prayer is calibrated it never begins before the official
// Fajr. Rows are official days (Fajr, Maghrib, local clock), all read
// 2026-10-17: the worst days of each table plus the first day of every month
// it covers. Bangladesh has its own, fuller tests in countryDefaults.test.ts.

interface OfficialTable {
  cc: string;
  slug: string;
  source: string;
  rows: [day: string, fajr: string, maghrib: string][];
  /** Suhoor is checked unless the country has no national timetable. */
  sehri: boolean;
  /** Most minutes our sehri may end before the official Fajr. */
  sehriSpread?: number;
  /** The Fajr prayer is calibrated: never before the official Fajr. */
  fajrPrayer?: boolean;
}

const TABLES: OfficialTable[] = [
  {
    cc: 'MY',
    slug: 'kuala-lumpur-malaysia',
    source: 'JAKIM e-Solat, zone WLY01, e-solat.gov.my takwimsolat 2026 (Subuh, Maghrib)',
    sehri: true,
    fajrPrayer: true,
    rows: [
      ['2026-01-01', '06:06', '19:17'],
      ['2026-01-08', '06:10', '19:20'],
      ['2026-01-10', '06:11', '19:21'],
      ['2026-01-12', '06:12', '19:22'],
      ['2026-02-01', '06:18', '19:28'],
      ['2026-02-17', '06:18', '19:29'],
      ['2026-03-01', '06:17', '19:29'],
      ['2026-03-15', '06:12', '19:27'],
      ['2026-03-27', '06:07', '19:24'],
      ['2026-04-01', '06:05', '19:23'],
      ['2026-04-03', '06:04', '19:23'],
      ['2026-05-01', '05:53', '19:20'],
      ['2026-05-27', '05:49', '19:22'],
      ['2026-06-01', '05:49', '19:22'],
      ['2026-06-11', '05:50', '19:25'],
      ['2026-06-15', '05:51', '19:26'],
      ['2026-07-01', '05:54', '19:29'],
      ['2026-08-01', '06:01', '19:30'],
      ['2026-09-01', '06:00', '19:21'],
      ['2026-10-01', '05:53', '19:07'],
      ['2026-10-17', '05:50', '19:01'],
      ['2026-11-01', '05:48', '18:58'],
      ['2026-12-01', '05:52', '19:02'],
    ],
  },
];

function minutesIn(d: Date, timeZone: string): number {
  const [h, m] = d
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone })
    .split(':')
    .map(Number);
  return h * 60 + m;
}
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

describe('every calibrated country has an official table here', () => {
  it('and every table belongs to a calibrated country', () => {
    const tested = new Set(TABLES.map((t) => t.cc));
    expect([...tested].sort()).toEqual(
      Object.keys(COUNTRY_TIME_ADJUSTMENTS)
        .filter((cc) => cc !== 'BD')
        .sort()
    );
  });
});

describe.each(TABLES)(
  '$cc ($slug) against $source',
  ({ cc, slug, rows, sehri, sehriSpread, fajrPrayer }) => {
    const city = cityBySlug(slug)!;
    it.each(rows)('%s: sehri never later, iftar never earlier', (day, fajr, maghrib) => {
      expect(city, slug).toBeDefined();
      const t = computePrayerTimes(city.lat, city.lng, day, city.timezone, cc);
      const iftarGap = minutesIn(t.maghrib, city.timezone) - toMinutes(maghrib);
      expect(iftarGap, 'iftar minus official Maghrib').toBeGreaterThanOrEqual(0);
      expect(iftarGap).toBeLessThanOrEqual(3);
      if (sehri) {
        const sehriGap = minutesIn(t.sehri, city.timezone) - toMinutes(fajr);
        expect(sehriGap, 'sehri end minus official Fajr').toBeLessThanOrEqual(0);
        expect(sehriGap).toBeGreaterThanOrEqual(-(sehriSpread ?? 3));
      }
      if (fajrPrayer) {
        const fajrGap = minutesIn(t.fajr, city.timezone) - toMinutes(fajr);
        expect(fajrGap, 'Fajr prayer minus official Fajr').toBeGreaterThanOrEqual(0);
        expect(fajrGap).toBeLessThanOrEqual(3);
      }
    });
  }
);
