import { describe, expect, it } from 'vitest';
import { COUNTRY_TIME_ADJUSTMENTS } from './countryDefaults.js';
import { computePrayerTimes } from '../seo/utils/calc.js';
import { cityBySlug } from '../seo/data/cities.js';

// Audits R0d (v5.180.0) and R0c (v5.181.0): every calibrated country against its official
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
  {
    cc: 'TR',
    slug: 'istanbul-turkey',
    source: 'Diyanet, namazvakitleri.diyanet.gov.tr/tr-TR/9541 (İmsak, Akşam)',
    sehri: true,
    rows: [
      ['2026-10-17', '05:46', '18:29'],
      ['2026-10-18', '05:47', '18:27'],
      ['2026-10-19', '05:48', '18:26'],
      ['2026-10-26', '05:55', '18:16'],
      ['2026-10-27', '05:56', '18:14'],
      ['2026-10-28', '05:57', '18:13'],
      ['2026-11-01', '06:02', '18:08'],
      ['2027-01-01', '06:50', '17:53'],
      ['2027-02-01', '06:41', '18:27'],
      ['2027-02-10', '06:33', '18:38'],
      ['2027-02-25', '06:14', '18:56'],
      ['2027-03-01', '06:08', '19:01'],
      ['2027-03-08', '05:57', '19:09'],
      ['2027-04-01', '05:14', '19:35'],
      ['2027-05-01', '04:17', '20:07'],
      ['2027-06-01', '03:32', '20:36'],
      ['2027-06-21', '03:24', '20:47'],
      ['2027-07-01', '03:29', '20:47'],
      ['2027-08-01', '04:08', '20:29'],
      ['2027-10-01', '05:29', '18:55'],
      ['2027-11-01', '06:01', '18:08'],
      ['2027-12-01', '06:31', '17:44'],
    ],
  },
  {
    cc: 'SG',
    slug: 'singapore-singapore',
    source: 'MUIS 2026 timetable, data.gov.sg dataset d_d441e7242e78efc566024dd5b0d9829c',
    sehri: true,
    rows: [
      ['2026-01-01', '05:44', '19:11'],
      ['2026-01-03', '05:45', '19:12'],
      ['2026-01-04', '05:46', '19:12'],
      ['2026-02-01', '05:57', '19:21'],
      ['2026-03-01', '05:57', '19:21'],
      ['2026-03-06', '05:56', '19:20'],
      ['2026-03-10', '05:55', '19:19'],
      ['2026-03-14', '05:54', '19:18'],
      ['2026-04-01', '05:48', '19:13'],
      ['2026-05-01', '05:38', '19:07'],
      ['2026-06-01', '05:34', '19:09'],
      ['2026-07-01', '05:40', '19:15'],
      ['2026-08-01', '05:46', '19:17'],
      ['2026-09-01', '05:43', '19:09'],
      ['2026-10-01', '05:35', '18:58'],
      ['2026-11-01', '05:27', '18:51'],
      ['2026-12-01', '05:30', '18:56'],
    ],
  },
  {
    cc: 'ID',
    slug: 'jakarta-indonesia',
    source: 'Kemenag Bimas Islam, DKI Jakarta, Ramadan 1447 (as printed by sonora.id)',
    sehri: true,
    rows: [
      ['2026-02-19', '04:40', '18:17'],
      ['2026-02-20', '04:41', '18:16'],
      ['2026-02-23', '04:41', '18:16'],
      ['2026-03-01', '04:42', '18:14'],
      ['2026-03-10', '04:42', '18:10'],
      ['2026-03-19', '04:41', '18:06'],
    ],
  },
  {
    cc: 'SA',
    slug: 'mecca-saudi-arabia',
    source: 'Umm al-Qura (KACST), umqserv.kacst.gov.sa GetPrayerHijriYear 1448, Makkah',
    sehri: true,
    rows: [
      ['2026-06-16', '04:11', '19:05'],
      ['2026-06-20', '04:12', '19:06'],
      ['2026-07-01', '04:15', '19:08'],
      ['2026-08-01', '04:32', '19:00'],
      ['2026-09-01', '04:47', '18:38'],
      ['2026-10-01', '04:57', '18:09'],
      ['2026-10-15', '05:01', '17:58'],
      ['2026-11-01', '05:07', '17:45'],
      ['2026-12-01', '05:22', '17:38'],
      ['2027-01-01', '05:38', '17:50'],
      ['2027-02-01', '05:40', '18:11'],
      ['2027-03-01', '05:25', '18:25'],
      ['2027-04-01', '04:57', '18:36'],
      ['2027-04-16', '04:42', '18:41'],
      ['2027-04-17', '04:41', '18:41'],
      ['2027-05-01', '04:29', '18:46'],
      ['2027-06-01', '04:12', '19:00'],
    ],
  },
  {
    cc: 'SA',
    slug: 'riyadh-saudi-arabia',
    source: 'Umm al-Qura (KACST), umqserv.kacst.gov.sa GetPrayerHijriYear 1448, Riyadh',
    sehri: true,
    rows: [
      ['2026-06-16', '03:33', '18:44'],
      ['2026-06-17', '03:33', '18:45'],
      ['2026-07-01', '03:37', '18:47'],
      ['2026-08-01', '03:56', '18:38'],
      ['2026-09-01', '04:15', '18:12'],
      ['2026-09-15', '04:21', '17:59'],
      ['2026-09-16', '04:22', '17:58'],
      ['2026-10-01', '04:28', '17:41'],
      ['2026-11-01', '04:41', '17:14'],
      ['2026-12-01', '04:58', '17:04'],
      ['2027-01-01', '05:14', '17:16'],
      ['2027-02-01', '05:15', '17:39'],
      ['2027-03-01', '04:58', '17:56'],
      ['2027-03-05', '04:54', '17:58'],
      ['2027-03-19', '04:40', '18:04'],
      ['2027-03-20', '04:39', '18:05'],
      ['2027-04-01', '04:26', '18:10'],
      ['2027-05-01', '03:54', '18:23'],
      ['2027-06-01', '03:34', '18:38'],
    ],
  },
  {
    cc: 'QA',
    slug: 'doha-qatar',
    source: 'Qatar Ministry of Awqaf, islam.gov.qa (PrayerTimes service), 2026',
    sehri: true,
    rows: [
      ['2026-01-01', '04:57', '16:57'],
      ['2026-02-03', '04:57', '17:22'],
      ['2026-02-18', '04:49', '17:32'],
      ['2026-02-21', '04:47', '17:34'],
      ['2026-02-24', '04:44', '17:36'],
      ['2026-03-02', '04:39', '17:39'],
      ['2026-04-01', '04:08', '17:52'],
      ['2026-05-01', '03:35', '18:06'],
      ['2026-06-03', '03:14', '18:23'],
      ['2026-06-21', '03:13', '18:29'],
      ['2026-07-03', '03:18', '18:30'],
      ['2026-08-02', '03:36', '18:21'],
      ['2026-09-01', '03:55', '17:55'],
      ['2026-09-04', '03:56', '17:52'],
      ['2026-09-10', '03:59', '17:46'],
      ['2026-10-28', '04:21', '16:58'],
      ['2026-11-03', '04:24', '16:54'],
      ['2026-12-03', '04:42', '16:45'],
    ],
  },
  {
    cc: 'AE',
    slug: 'dubai-united-arab-emirates',
    source:
      'IACAD Dubai, iacad.gov.ae/en/prayer-times (17 Oct 2026); Awqaf UAE Ramadan 2026 (as printed by gulfnews.com)',
    sehri: true,
    rows: [
      ['2026-02-18', '05:34', '18:18'],
      ['2026-02-27', '05:27', '18:23'],
      ['2026-03-09', '05:18', '18:28'],
      ['2026-03-18', '05:09', '18:32'],
      ['2026-10-17', '05:01', '17:54'],
    ],
  },
  {
    cc: 'EG',
    slug: 'cairo-egypt',
    source: 'Cairo times as printed by al-ain.com and akhbarelyom.com (no ministry page reachable)',
    sehri: true,
    rows: [
      ['2026-02-19', '05:04', '17:47'],
      ['2026-02-21', '05:02', '17:48'],
      ['2026-06-22', '04:08', '20:00'],
    ],
  },
  {
    cc: 'GB',
    slug: 'london-united-kingdom',
    source:
      'East London Mosque 2026 timetable, eastlondonmosque.org.uk/prayer-times (Maghrib begins)',
    // No national body: suhoor stays at the Moonsighting Committee's Fajr.
    sehri: false,
    rows: [
      ['2026-01-01', '06:26', '16:05'],
      ['2026-01-10', '06:23', '16:17'],
      ['2026-02-01', '05:59', '16:53'],
      ['2026-03-01', '05:06', '17:44'],
      ['2026-04-01', '05:01', '19:37'],
      ['2026-05-01', '03:52', '20:27'],
      ['2026-06-01', '02:52', '21:11'],
      ['2026-07-01', '02:49', '21:24'],
      ['2026-08-01', '03:39', '20:52'],
      ['2026-09-01', '04:38', '19:50'],
      ['2026-10-01', '05:30', '18:42'],
      ['2026-11-01', '05:14', '16:37'],
      ['2026-12-01', '05:59', '15:58'],
    ],
  },
  {
    cc: 'MA',
    slug: 'rabat-morocco',
    source:
      'Ministry of Habous, habous.gov.ma/prieres, Rabat: Joumada I 1448 (live) and archived daily pages, Jan 2025 - Sep 2026 (web.archive.org)',
    sehri: true,
    fajrPrayer: true,
    rows: [
      ['2025-01-16', '06:59', '18:46'],
      ['2025-01-24', '06:57', '18:54'],
      ['2025-02-11', '06:46', '19:12'],
      ['2025-03-24', '04:56', '18:46'],
      ['2025-03-26', '04:53', '18:48'],
      ['2025-04-28', '05:04', '20:13'],
      ['2025-04-29', '05:02', '20:14'],
      ['2025-05-12', '04:46', '20:24'],
      ['2025-05-16', '04:41', '20:27'],
      ['2025-06-15', '04:24', '20:44'],
      ['2025-07-11', '04:36', '20:45'],
      ['2025-08-29', '05:26', '20:01'],
      ['2026-02-14', '06:44', '19:14'],
      ['2026-02-17', '05:41', '18:17'],
      ['2026-03-10', '05:16', '18:35'],
      ['2026-03-12', '05:14', '18:37'],
      ['2026-03-19', '05:04', '18:42'],
      ['2026-03-24', '05:57', '19:46'],
      ['2026-05-15', '04:42', '20:26'],
      ['2026-05-28', '04:31', '20:35'],
      ['2026-05-29', '04:30', '20:36'],
      ['2026-06-16', '04:24', '20:45'],
      ['2026-06-26', '04:26', '20:47'],
      ['2026-06-30', '04:28', '20:47'],
      ['2026-09-07', '05:34', '19:49'],
      ['2026-09-25', '04:49', '18:24'],
      ['2026-10-13', '05:02', '18:00'],
      ['2026-10-14', '05:03', '17:59'],
      ['2026-10-15', '05:04', '17:57'],
      ['2026-10-16', '05:05', '17:56'],
      ['2026-10-17', '05:05', '17:55'],
      ['2026-10-18', '05:06', '17:54'],
      ['2026-10-19', '05:07', '17:52'],
      ['2026-10-20', '05:08', '17:51'],
      ['2026-10-21', '05:08', '17:50'],
      ['2026-10-22', '05:09', '17:49'],
      ['2026-10-23', '05:10', '17:48'],
      ['2026-10-24', '05:11', '17:47'],
      ['2026-10-25', '05:11', '17:46'],
      ['2026-10-26', '05:12', '17:45'],
      ['2026-10-27', '05:13', '17:44'],
      ['2026-10-28', '05:14', '17:43'],
      ['2026-10-29', '05:15', '17:42'],
      ['2026-10-30', '05:15', '17:41'],
      ['2026-10-31', '05:16', '17:40'],
      ['2026-11-01', '05:17', '17:39'],
      ['2026-11-02', '05:18', '17:38'],
      ['2026-11-03', '05:18', '17:37'],
      ['2026-11-04', '05:19', '17:36'],
      ['2026-11-05', '05:20', '17:35'],
      ['2026-11-06', '05:21', '17:34'],
      ['2026-11-07', '05:22', '17:33'],
      ['2026-11-08', '05:22', '17:33'],
      ['2026-11-09', '05:23', '17:32'],
      ['2026-11-10', '05:24', '17:31'],
      ['2026-11-11', '05:25', '17:30'],
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

// Malaysia, the other prayers (v5.186.0): JAKIM adds a ~2 min caution to
// every prayer and takes it off syuruk. Every prayer start must be at or after
// JAKIM's, sunrise (the end of Fajr) at or before JAKIM's syuruk. Rows: JAKIM
// e-Solat zone WLY01, 2026 (syuruk, Zohor, Asar, Isyak), read 2026-10-17: the
// first day of every month, the worst days of each prayer before the fix
// (Asar 3 min early 15 Sep - 5 Oct, Isyak 3 min early mid-May to July), and
// days where Zohor or syuruk already sits on JAKIM's minute.
const JAKIM_WLY01_OTHER: [day: string, syuruk: string, dhuhr: string, asr: string, isha: string][] =
  [
    ['2026-01-01', '07:18', '13:19', '16:42', '20:31'],
    ['2026-01-05', '07:19', '13:21', '16:44', '20:33'],
    ['2026-01-06', '07:20', '13:22', '16:44', '20:33'],
    ['2026-01-24', '07:25', '13:28', '16:50', '20:39'],
    ['2026-02-01', '07:26', '13:30', '16:51', '20:40'],
    ['2026-02-12', '07:26', '13:30', '16:50', '20:40'],
    ['2026-02-19', '07:25', '13:30', '16:48', '20:39'],
    ['2026-02-20', '07:25', '13:30', '16:47', '20:39'],
    ['2026-03-01', '07:23', '13:28', '16:43', '20:38'],
    ['2026-03-13', '07:19', '13:26', '16:35', '20:36'],
    ['2026-03-31', '07:12', '13:20', '16:22', '20:33'],
    ['2026-04-01', '07:12', '13:20', '16:22', '20:33'],
    ['2026-04-20', '07:05', '13:15', '16:28', '20:31'],
    ['2026-04-28', '07:03', '13:14', '16:30', '20:31'],
    ['2026-05-01', '07:03', '13:13', '16:31', '20:31'],
    ['2026-05-17', '07:01', '13:12', '16:35', '20:34'],
    ['2026-05-22', '07:01', '13:13', '16:36', '20:35'],
    ['2026-05-29', '07:01', '13:13', '16:38', '20:37'],
    ['2026-06-01', '07:02', '13:14', '16:39', '20:37'],
    ['2026-06-09', '07:03', '13:15', '16:41', '20:40'],
    ['2026-06-21', '07:05', '13:18', '16:44', '20:43'],
    ['2026-06-26', '07:06', '13:19', '16:45', '20:44'],
    ['2026-07-01', '07:07', '13:20', '16:45', '20:44'],
    ['2026-07-04', '07:08', '13:20', '16:46', '20:45'],
    ['2026-07-20', '07:10', '13:22', '16:46', '20:45'],
    ['2026-07-27', '07:11', '13:23', '16:45', '20:44'],
    ['2026-08-01', '07:11', '13:22', '16:43', '20:42'],
    ['2026-09-01', '07:07', '13:16', '16:24', '20:30'],
    ['2026-09-15', '07:04', '13:11', '16:12', '20:23'],
    ['2026-09-17', '07:03', '13:11', '16:13', '20:22'],
    ['2026-09-18', '07:03', '13:10', '16:13', '20:22'],
    ['2026-09-20', '07:02', '13:10', '16:14', '20:21'],
    ['2026-09-21', '07:02', '13:09', '16:14', '20:20'],
    ['2026-09-24', '07:01', '13:08', '16:15', '20:19'],
    ['2026-09-25', '07:01', '13:08', '16:15', '20:19'],
    ['2026-09-29', '07:00', '13:06', '16:16', '20:17'],
    ['2026-09-30', '07:00', '13:06', '16:16', '20:17'],
    ['2026-10-01', '07:00', '13:06', '16:16', '20:16'],
    ['2026-10-05', '06:59', '13:05', '16:17', '20:15'],
    ['2026-10-17', '06:57', '13:01', '16:18', '20:11'],
    ['2026-11-01', '06:56', '13:00', '16:20', '20:09'],
    ['2026-12-01', '07:03', '13:05', '16:27', '20:16'],
  ];

describe('MY (kuala-lumpur-malaysia) against JAKIM e-Solat WLY01: sunrise, Dhuhr, Asr, Isha', () => {
  const city = cityBySlug('kuala-lumpur-malaysia')!;
  it.each(JAKIM_WLY01_OTHER)(
    '%s: no prayer before JAKIM, sunrise never after syuruk',
    (day, syuruk, dhuhr, asr, isha) => {
      const t = computePrayerTimes(city.lat, city.lng, day, city.timezone, 'MY');
      const sunriseGap = minutesIn(t.sunrise, city.timezone) - toMinutes(syuruk);
      expect(sunriseGap, 'sunrise minus JAKIM syuruk').toBeLessThanOrEqual(0);
      expect(sunriseGap).toBeGreaterThanOrEqual(-3);
      for (const [name, ours, official] of [
        ['Dhuhr', t.dhuhr, dhuhr],
        ['Asr', t.asr, asr],
        ['Isha', t.isha, isha],
      ] as const) {
        const gap = minutesIn(ours, city.timezone) - toMinutes(official);
        expect(gap, `${name} minus JAKIM`).toBeGreaterThanOrEqual(0);
        expect(gap, name).toBeLessThanOrEqual(3);
      }
    }
  );
});
