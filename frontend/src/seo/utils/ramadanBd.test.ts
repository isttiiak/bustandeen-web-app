import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ramadanPlan } from './ramadanBd.js';
import { cityBySlug } from '../data/cities.js';
import { BD_DISTRICTS } from '../data/bdDistricts.js';
import BdRamadanPage from '../templates/BdRamadanPage.js';
import type { MoonSightingRecord } from '../../utils/hijriOffset.js';

const dhaka = cityBySlug('dhaka-bangladesh')!;
const district = BD_DISTRICTS.find((d) => d.citySlug === 'dhaka-bangladesh')!;
// Umm al-Qura: 1 Ramadan 1448 = 8 Feb 2027, 29 Ramadan = 8 Mar 2027.
const HY = 1448;

const rec = (effectiveFrom: string, offset: number, country = 'BD'): MoonSightingRecord => ({
  id: effectiveFrom,
  country,
  effectiveFrom,
  offset,
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
    const plan = ramadanPlan(dhaka, HY, [rec('2027-02-08', -1)]);
    expect(plan.days[0].date).toBe('2027-02-09');
    expect(plan.days).toHaveLength(29);
    expect(plan.startRecord?.effectiveFrom).toBe('2027-02-08');
    expect(plan.possible30?.date).toBe('2027-03-10');
  });

  it('also when the record starts on the announced day itself', () => {
    const plan = ramadanPlan(dhaka, HY, [rec('2027-02-09', -1)]);
    expect(plan.days[0].date).toBe('2027-02-09');
    expect(plan.days).toHaveLength(29);
    expect(plan.startRecord?.effectiveFrom).toBe('2027-02-09');
    expect(plan.possible30?.date).toBe('2027-03-10');
  });

  it('applies an older record but does not call it an announcement', () => {
    const plan = ramadanPlan(dhaka, HY, [rec('2027-01-09', -1)]);
    expect(plan.days[0].date).toBe('2027-02-09');
    expect(plan.startRecord).toBeUndefined();
  });

  it('a Shawwal record settles the length (no possible 30th fast)', () => {
    const plan = ramadanPlan(dhaka, HY, [rec('2027-02-08', -1), rec('2027-03-10', 0)]);
    // Eid on 10 Mar: 29 fasts, 9 Feb to 9 Mar.
    expect(plan.days[0].date).toBe('2027-02-09');
    expect(plan.days[plan.days.length - 1].date).toBe('2027-03-09');
    expect(plan.endSettled).toBe(true);
    expect(plan.possible30).toBeUndefined();
  });

  it("ignores other countries' records", () => {
    const plan = ramadanPlan(dhaka, HY, [rec('2027-02-07', 1, 'PK')]);
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
    expect(html).toContain('জাতীয় চাঁদ দেখা কমিটির ঘোষণা অনুযায়ী, তাই এক দিন পরেও');
    expect(html).toContain('রমজান ৩০ দিনের হলে');
    // 29 fasts + the possible 30th
    expect(html.match(/data-date="/g)).toHaveLength(30);
    expect(html).toContain('/bn/prayer-times/dhaka-bangladesh/2026-10');
    expect(html).not.toContain('—');
  });

  it('names the announced start once a record exists', () => {
    const html = render([{ ...rec('2027-02-09', -1), sourceUrl: 'https://example.org/a' }]);
    expect(html).toContain('জাতীয় চাঁদ দেখা কমিটির ঘোষণা অনুযায়ী বাংলাদেশে প্রথম রোজা');
    expect(html).toContain('https://example.org/a');
    expect(html).not.toContain('এক দিন পরেও');
  });
});
