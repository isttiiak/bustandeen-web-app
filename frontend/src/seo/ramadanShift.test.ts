import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  formatFast,
  parseShift,
  rowState,
  shiftStorageKey,
  type RamadanShift,
} from './ramadanShift.js';
import { ramadanPlan } from './utils/ramadanBd.js';
import { ramadanRows, ramadanShape } from './components/RamadanShift.js';
import { cityBySlug } from './data/cities.js';
import { BD_DISTRICTS } from './data/bdDistricts.js';
import BdRamadanPage from './templates/BdRamadanPage.js';
import RamadanCalendarPage from './templates/RamadanCalendarPage.js';
import type { MoonSightingRecord } from '../utils/hijriOffset.js';

/** The page without its print sheets (R2-R4 draw three more tables). */
const screenPart = (html: string) => html.split('<div data-ramadan-sheets')[0];

const dhaka = cityBySlug('dhaka-bangladesh')!;
const london = cityBySlug('london-united-kingdom')!;
const district = BD_DISTRICTS.find((d) => d.citySlug === 'dhaka-bangladesh')!;
// Umm al-Qura: 1 Ramadan 1448 = 8 Feb 2027, 29 Ramadan = 8 Mar 2027.
const HY = 1448;
const rec = (hijriMonth: number, startDate: string): MoonSightingRecord => ({
  id: `BD-${hijriMonth}`,
  country: 'BD',
  hijriYear: HY,
  hijriMonth,
  startDate,
  effectiveFrom: startDate,
  offset: 0,
  note: '',
});

/** The dates a shift makes fasts, with their numbers and possible flag. */
function shifted(plan: ReturnType<typeof ramadanPlan>, shift: RamadanShift) {
  const shape = ramadanShape(plan);
  return ramadanRows(plan)
    .map(({ day }) => ({ date: day.date, ...rowState(day.fast, shift, shape) }))
    .filter((r) => r.visible);
}

describe('rowState', () => {
  const open = { maxFast: 30, possible30: true };
  it('as shown: rows 1..30 are the fasts, the 30th only possible', () => {
    expect(rowState(0, 0, open).visible).toBe(false);
    expect(rowState(1, 0, open)).toEqual({ fast: 1, visible: true, possible: false });
    expect(rowState(30, 0, open)).toEqual({ fast: 30, visible: true, possible: true });
    expect(rowState(31, 0, open).visible).toBe(false);
  });

  it('one day earlier: the day before becomes fast 1, every number moves up', () => {
    expect(rowState(0, -1, open)).toEqual({ fast: 1, visible: true, possible: false });
    expect(rowState(29, -1, open)).toEqual({ fast: 30, visible: true, possible: true });
    expect(rowState(30, -1, open).visible).toBe(false);
  });

  it('one day later: the built fast 1 is no fast, the day after the month is the 30th', () => {
    expect(rowState(1, 1, open).visible).toBe(false);
    expect(rowState(2, 1, open)).toEqual({ fast: 1, visible: true, possible: false });
    expect(rowState(31, 1, open)).toEqual({ fast: 30, visible: true, possible: true });
  });

  it('a settled month keeps its length and has no possible row', () => {
    const settled29 = { maxFast: 29, possible30: false };
    expect(rowState(29, 0, settled29)).toEqual({ fast: 29, visible: true, possible: false });
    expect(rowState(30, 1, settled29)).toEqual({ fast: 29, visible: true, possible: false });
    expect(rowState(29, -1, settled29).visible).toBe(false);
  });
});

describe('the shifted calendar', () => {
  it('moves fast 1 by a day either way and keeps the 30-day shape (Umm al-Qura)', () => {
    const plan = ramadanPlan(dhaka, HY, []);
    for (const shift of [-1, 0, 1] as const) {
      const rows = shifted(plan, shift);
      expect(rows.map((r) => r.fast)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
      expect(rows.filter((r) => r.possible).map((r) => r.fast)).toEqual([30]);
    }
    expect(shifted(plan, -1)[0].date).toBe('2027-02-07');
    expect(shifted(plan, 0)[0].date).toBe('2027-02-08');
    expect(shifted(plan, 1)[0].date).toBe('2027-02-09');
    expect(shifted(plan, 1).slice(-1)[0].date).toBe('2027-03-10');
  });

  it('a settled 29-day month stays 29 days under a shift', () => {
    const plan = ramadanPlan(dhaka, HY, [rec(9, '2027-02-09'), rec(10, '2027-03-10')]);
    expect(plan.possible30).toBeUndefined();
    for (const shift of [-1, 0, 1] as const) {
      expect(shifted(plan, shift)).toHaveLength(29);
    }
    expect(shifted(plan, 1).slice(-1)[0].date).toBe('2027-03-10');
  });

  it('times stay with their date: the extra rows carry their own day', () => {
    const plan = ramadanPlan(dhaka, HY, []);
    expect(plan.before).toMatchObject({ fast: 0, date: '2027-02-07' });
    expect(plan.after).toMatchObject({ fast: 31, date: '2027-03-10' });
    const dhakaDay = (t: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(t);
    for (const d of [plan.before, plan.after]) {
      expect(dhakaDay(d.times.sehri)).toBe(d.date);
      expect(dhakaDay(d.times.maghrib)).toBe(d.date);
    }
  });
});

describe('helpers', () => {
  it('parseShift accepts only -1, 0 and 1', () => {
    expect(parseShift('-1')).toBe(-1);
    expect(parseShift('1')).toBe(1);
    expect(parseShift('0')).toBe(0);
    expect(parseShift('2')).toBe(0);
    expect(parseShift(null)).toBe(0);
  });

  it('formatFast writes Bangla digits on Bangla pages', () => {
    expect(formatFast(27, 'bn')).toBe('২৭');
    expect(formatFast(27, 'latn')).toBe('27');
  });

  it('one key per city and year, shared by its languages', () => {
    expect(shiftStorageKey('/ramadan-calendar/dhaka-bangladesh/2027')).toBe(
      'bustandeen_ramadan_shift:/ramadan-calendar/dhaka-bangladesh/2027'
    );
  });
});

describe('prerendered markup (shift 0, before the script runs)', () => {
  const pages = {
    world: () =>
      renderToStaticMarkup(
        createElement(RamadanCalendarPage, {
          lang: 'en',
          city: london,
          plan: ramadanPlan(london, HY, []),
          gregorianYear: 2027,
        })
      ),
    bd: () =>
      renderToStaticMarkup(
        createElement(BdRamadanPage, {
          lang: 'bn',
          district,
          city: dhaka,
          plan: ramadanPlan(dhaka, HY, []),
          ym: '2027-02',
        })
      ),
  };

  for (const [name, render] of Object.entries(pages)) {
    it(`${name}: one hidden row either side, the control hidden until wired`, () => {
      const html = screenPart(render());
      const rows = [...html.matchAll(/<tr [^>]*data-ramadan-row="(\d+)"[^>]*>/g)];
      expect(rows.map((m) => Number(m[1]))).toEqual(Array.from({ length: 32 }, (_, i) => i));
      const hidden = rows.filter((m) => /\shidden=""/.test(m[0])).map((m) => Number(m[1]));
      expect(hidden).toEqual([0, 31]);
      // Three label rows (29, 30, 31), only the 30th's showing.
      const labels = [...html.matchAll(/<tr data-possible-label="(\d+)"( hidden="")?>/g)];
      expect(labels.map((m) => [m[1], !!m[2]])).toEqual([
        ['29', true],
        ['30', false],
        ['31', true],
      ]);
      expect(html).toMatch(/<div data-ramadan-shift="\/ramadan-calendar\/[a-z-]+\/2027" hidden=""/);
      expect(html.match(/data-shift-note="(-1|1)" hidden=""/g)).toHaveLength(2);
    });
  }
});
