import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ramadanPlan } from './ramadanBd.js';
import { cityBySlug } from '../data/cities.js';
import { BD_DISTRICTS } from '../data/bdDistricts.js';
import BdRamadanPage from '../templates/BdRamadanPage.js';
import RamadanCalendarPage from '../templates/RamadanCalendarPage.js';
import type { CityEntry } from '../data/cities.js';
import type { MoonSightingRecord } from '../../utils/hijriOffset.js';

const dhaka = cityBySlug('dhaka-bangladesh')!;
const district = BD_DISTRICTS.find((d) => d.citySlug === 'dhaka-bangladesh')!;
// Umm al-Qura: 1 Ramadan 1448 = 8 Feb 2027, 29 Ramadan = 8 Mar 2027.
const HY = 1448;

const rec = (hijriMonth: number, startDate: string, country = 'BD'): MoonSightingRecord => ({
  id: `${country}-${hijriMonth}`,
  country,
  hijriYear: HY,
  hijriMonth,
  startDate,
  effectiveFrom: startDate,
  offset: 0,
  note: '',
});

describe('ramadanPlan', () => {
  it('without a record follows Umm al-Qura and offers a possible 30th fast', () => {
    const plan = ramadanPlan(dhaka, HY, []);
    expect(plan.days).toHaveLength(29);
    expect(plan.days[0].date).toBe('2027-02-08');
    expect(plan.days[28].date).toBe('2027-03-08');
    expect(plan.days.map((d) => d.fast)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
    expect(plan.startRecord).toBeUndefined();
    expect(plan.endSettled).toBe(false);
    expect(plan.possible30?.date).toBe('2027-03-09');
    expect(plan.possible30?.fast).toBe(30);
  });

  it('sehri ends at Fajr and iftar is at Maghrib of that date', () => {
    const { days } = ramadanPlan(dhaka, HY, []);
    for (const d of days) {
      expect(d.times.fajr.getTime()).toBeLessThan(d.times.maghrib.getTime());
      // Both fall on the civil date in Dhaka (UTC+6).
      const dhakaDay = (t: Date) =>
        new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(t);
      expect(dhakaDay(d.times.fajr)).toBe(d.date);
      expect(dhakaDay(d.times.maghrib)).toBe(d.date);
    }
  });

  it("follows the committee's announced start (a day after Umm al-Qura)", () => {
    const plan = ramadanPlan(dhaka, HY, [rec(9, '2027-02-09')]);
    expect(plan.days[0].date).toBe('2027-02-09');
    expect(plan.days).toHaveLength(29);
    expect(plan.startRecord?.startDate).toBe('2027-02-09');
    expect(plan.endSettled).toBe(false);
    expect(plan.possible30?.date).toBe('2027-03-10');
  });

  it("an older month's record moves the dates but is not this Ramadan's announcement", () => {
    const plan = ramadanPlan(dhaka, HY, [rec(8, '2027-01-10')]);
    // Sha'ban began 10 Jan: day 30 = 8 Feb, Ramadan from 9 Feb (forecast)
    expect(plan.days[0].date).toBe('2027-02-09');
    expect(plan.startRecord).toBeUndefined();
  });

  it('a 29-day Shawwal record settles the length (no possible 30th fast)', () => {
    const plan = ramadanPlan(dhaka, HY, [rec(9, '2027-02-09'), rec(10, '2027-03-10')]);
    expect(plan.days[0].date).toBe('2027-02-09');
    expect(plan.days[plan.days.length - 1].date).toBe('2027-03-09');
    expect(plan.days).toHaveLength(29);
    expect(plan.endSettled).toBe(true);
    expect(plan.possible30).toBeUndefined();
  });

  it('a 30-day Ramadan after a 29-day Umm al-Qura one: 30 fasts, 9 Feb to 10 Mar', () => {
    const plan = ramadanPlan(dhaka, HY, [rec(9, '2027-02-09'), rec(10, '2027-03-11')]);
    expect(plan.days).toHaveLength(30);
    expect(plan.days[0].date).toBe('2027-02-09');
    expect(plan.days[29]).toMatchObject({ date: '2027-03-10', fast: 30 });
    expect(plan.endSettled).toBe(true);
    expect(plan.possible30).toBeUndefined();
  });

  it("ignores other countries' records", () => {
    const plan = ramadanPlan(dhaka, HY, [rec(9, '2027-02-07', 'PK')]);
    expect(plan.days[0].date).toBe('2027-02-08');
    expect(plan.startRecord).toBeUndefined();
  });
});

describe('BdRamadanPage', () => {
  const render = (records: MoonSightingRecord[]) =>
    renderToStaticMarkup(
      createElement(BdRamadanPage, {
        lang: 'bn',
        district,
        city: dhaka,
        plan: ramadanPlan(dhaka, HY, records),
        ym: '2026-10',
      })
    );

  it('says the date is subject to the committee until it announces', () => {
    const html = render([]);
    expect(html).toContain('ঢাকা জেলার সেহরি ও ইফতারের সময়সূচি');
    expect(html).toContain('data-ramadan-basis="ummAlQura"');
    expect(html).toContain('উম্মুল কুরা ক্যালেন্ডার অনুযায়ী');
    expect(html).toContain('জাতীয় চাঁদ দেখা কমিটির ঘোষণা অনুযায়ী, তাই তারিখে এক দিনের পার্থক্য');
    expect(html).toContain('রমজান ৩০ দিনের হলে');
    // 29 fasts + the possible 30th
    expect(html.match(/data-date="/g)).toHaveLength(30);
    expect(html).toContain('/bn/prayer-times/dhaka-bangladesh/2026-10');
    expect(html).not.toContain('—');
  });

  it('names the announced start once a record exists', () => {
    const html = render([{ ...rec(9, '2027-02-09'), sourceUrl: 'https://example.org/a' }]);
    expect(html).toContain('জাতীয় চাঁদ দেখা কমিটির ঘোষণা অনুযায়ী বাংলাদেশে প্রথম রোজা');
    expect(html).toContain('https://example.org/a');
    expect(html).toContain('data-ramadan-basis="announced"');
    expect(html).not.toContain('উম্মুল কুরা');
    expect(html).not.toContain('সর্বশেষ চাঁদ দেখা');
  });

  it("names Bangladesh's latest moon sighting when it moved the dates (2026-10-17 bug)", () => {
    // The real record: Jumada al-Ula 1448 began 13 Oct 2026, a day after Umm al-Qura.
    const html = render([{ ...rec(5, '2026-10-13') }]);
    expect(html).toContain('data-ramadan-basis="forecast"');
    expect(html).toContain('বাংলাদেশের সর্বশেষ চাঁদ দেখা অনুযায়ী (জুমাদাল উলা মাস শুরু হয়েছে');
    expect(html).not.toContain('উম্মুল কুরা');
    expect(html).toContain('জাতীয় চাঁদ দেখা কমিটির ঘোষণা অনুযায়ী');
    expect(html).toContain('data-date="2027-02-09"');
  });

  it('English: the three states name their basis', () => {
    const en = (records: MoonSightingRecord[]) =>
      renderToStaticMarkup(
        createElement(BdRamadanPage, {
          lang: 'en',
          district,
          city: dhaka,
          plan: ramadanPlan(dhaka, HY, records),
          ym: '2026-10',
        })
      ).replace(/&#x27;/g, "'");
    expect(en([])).toContain(
      'Expected first fast: Monday, February 8, 2027, by the Umm al-Qura calendar.'
    );
    const forecast = en([rec(5, '2026-10-13')]);
    expect(forecast).toContain(
      "Expected first fast: Tuesday, February 9, 2027, based on Bangladesh's latest moon sighting (Jumādā al-Ūlā began on October 13, 2026)."
    );
    expect(forecast).not.toContain('Umm al-Qura');
    expect(forecast).toContain('Once the committee announces, this calendar will follow its date.');
    const announced = en([rec(5, '2026-10-13'), rec(9, '2027-02-09')]);
    expect(announced).toContain(
      'First fast in Bangladesh: Tuesday, February 9, 2027, as announced by the National Moon Sighting Committee.'
    );
  });
});

describe('ramadanPlan basis', () => {
  it('ummAlQura without a record, forecast from an earlier month, announced with a Ramadan record', () => {
    expect(ramadanPlan(dhaka, HY, []).basis).toBe('ummAlQura');
    const f = ramadanPlan(dhaka, HY, [rec(5, '2026-10-13')]);
    expect(f.basis).toBe('forecast');
    expect(f.forecastRecord?.hijriMonth).toBe(5);
    expect(f.days[0].date).toBe('2027-02-09');
    const a = ramadanPlan(dhaka, HY, [rec(5, '2026-10-13'), rec(9, '2027-02-09')]);
    expect(a.basis).toBe('announced');
    expect(a.forecastRecord).toBeUndefined();
  });
});

describe('worldwide Ramadan calendars (RamadanCalendarPage)', () => {
  const london = cityBySlug('london-united-kingdom')!;
  const tongi = cityBySlug('tungi-bangladesh')!;
  const page = (city: CityEntry, records: MoonSightingRecord[], lang: 'en' | 'bn' = 'en') =>
    renderToStaticMarkup(
      createElement(RamadanCalendarPage, {
        lang,
        city,
        plan: ramadanPlan(city, HY, records),
        gregorianYear: 2027,
      })
    );

  it("a 29-day Umm al-Qura month shows the 30th as possible (Umm al-Qura's Shawwal 1)", () => {
    const plan = ramadanPlan(london, HY, [rec(5, '2026-10-13')]);
    // Bangladesh's record does not move London's dates.
    expect(plan.basis).toBe('ummAlQura');
    expect(plan.days).toHaveLength(29);
    expect(plan.days[0].date).toBe('2027-02-08');
    expect(plan.possible30).toMatchObject({ date: '2027-03-09', fast: 30 });
    const html = page(london, []);
    expect(html.match(/data-date="/g)).toHaveLength(30);
    expect(html).toContain('If Ramadan has 30 days');
    expect(html).toContain('data-date="2027-03-09"');
  });

  it('notes the method, the minutes it adds, and the local masjid; no em dash', () => {
    const html = page(london, []);
    expect(html).toContain('Moonsighting Committee method, Fajr at 18°');
    // The committee's 3 minutes + 1 matched to East London Mosque (R0c).
    expect(html).toContain('4 minutes after sunset');
    expect(html).toContain('the convention most masjids in United Kingdom follow');
    expect(html).toContain('follow your local masjid');
    expect(html).toContain('by the Umm al-Qura calendar');
    expect(html).not.toContain('—');
    const istanbul = page(cityBySlug('istanbul-turkey')!, []);
    // Diyanet's 7 minutes + 1 (R0c).
    expect(istanbul).toContain('8 minutes after sunset');
    const karachi = page(cityBySlug('karachi-pakistan')!, []);
    expect(karachi).toContain('Iftar is at Maghrib (sunset).');
    expect(karachi).toContain('Fajr at 18°');
  });

  it('Bangladesh towns follow the committee like the district sheets (2026-10-17 bug)', () => {
    const plan = ramadanPlan(tongi, HY, [rec(5, '2026-10-13')]);
    expect(plan.days[0].date).toBe('2027-02-09');
    expect(plan.basis).toBe('forecast');
    const bn = page(tongi, [rec(5, '2026-10-13')], 'bn');
    expect(bn).toContain('বাংলাদেশের সর্বশেষ চাঁদ দেখা অনুযায়ী');
    expect(bn).toContain('রমজান ৩০ দিনের হলে');
    expect(bn).toContain('করাচি পদ্ধতি');
  });

  it('a Shawwal record settles the month: no possible row', () => {
    const plan = ramadanPlan(tongi, HY, [rec(9, '2027-02-09'), rec(10, '2027-03-10')]);
    expect(plan.possible30).toBeUndefined();
    const html = page(tongi, [rec(9, '2027-02-09'), rec(10, '2027-03-10')]);
    expect(html.match(/data-date="/g)).toHaveLength(29);
    expect(html).not.toContain('If Ramadan has 30 days');
    expect(html).not.toContain('Shawwal moon');
  });
});
