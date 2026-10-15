import { describe, expect, it } from 'vitest';
import { calendarDays, monthDays, type HijriInputs } from './calendarMonth.js';
import { dayEvents, type EventFilters } from './calendarEvents.js';
import {
  DEFAULT_PRINT,
  boxEvents,
  monthListEvents,
  pageRule,
  printMonths,
  sheetSize,
  yearStart,
  type PrintOptions,
} from './calendarPrint.js';

const BD: HijriInputs = {
  manual: false,
  userOffset: 0,
  country: 'BD',
  records: [
    {
      id: 'bd-1448-5',
      country: 'BD',
      hijriYear: 1448,
      hijriMonth: 5,
      startDate: '2026-10-13',
      effectiveFrom: '2026-10-12',
      offset: -1,
      note: 'fixture',
    },
  ],
};
const day = calendarDays(BD);
const ALL: EventFilters = { country: 'BD', islamic: true, holidays: true, national: true };
const opts = (p: Partial<PrintOptions>): PrintOptions => ({
  ...DEFAULT_PRINT,
  order: ['greg', 'hijri', 'bn'],
  ...p,
});

describe('which months a download prints', () => {
  it('this month, in the first calendar', () => {
    expect(printMonths('2026-10-15', opts({}), day)).toEqual(['2026-10-01']);
    expect(printMonths('2026-10-15', opts({ order: ['hijri', 'greg'] }), day)).toEqual([
      '2026-10-13',
    ]);
    expect(printMonths('2026-10-15', opts({ order: ['bn'] }), day)).toEqual(['2026-09-16']);
  });

  it('a full English year is January to December', () => {
    const m = printMonths('2026-10-15', opts({ range: { kind: 'year', layout: 'pages' } }), day);
    expect(m).toHaveLength(12);
    expect(m[0]).toBe('2026-01-01');
    expect(m[11]).toBe('2026-12-01');
  });

  it('a full Hijri year starts with Muharram, a Bengali year with Boishakh', () => {
    const hijri = printMonths(
      '2026-10-15',
      opts({ order: ['hijri'], range: { kind: 'year', layout: 'pages' } }),
      day
    );
    expect(hijri).toHaveLength(12);
    expect(day(hijri[0]!).hijri).toMatchObject({ year: 1448, month: 1, day: 1 });
    expect(day(hijri[11]!).hijri).toMatchObject({ year: 1448, month: 12, day: 1 });
    expect(yearStart('2026-10-15', 'bn', day)).toBe('2026-04-14');
  });

  it('a range, in order, whichever way round', () => {
    const r = (from: string, to: string) =>
      printMonths('2026-10-15', opts({ range: { kind: 'range', from, to } }), day);
    expect(r('2026-10-01', '2026-12-01')).toEqual(['2026-10-01', '2026-11-01', '2026-12-01']);
    expect(r('2026-12-20', '2026-10-05')).toEqual(['2026-10-01', '2026-11-01', '2026-12-01']);
    expect(r('2026-10-01', '2030-10-01')).toHaveLength(24);
  });
});

describe('what a day box and the side column show', () => {
  it('two events, then "+N more"', () => {
    const e = dayEvents(day('2026-12-25'), ALL);
    expect(boxEvents(e)).toEqual({ shown: e, more: 0 });
    const three = [...e, ...e];
    expect(boxEvents(three).shown).toHaveLength(2);
    expect(boxEvents(three).more).toBe(2);
  });

  it('White Days are one line in the month list', () => {
    const oct = monthDays('2026-10-15', 'greg', day);
    const list = monthListEvents(oct, (d) => dayEvents(d, ALL));
    const white = list.filter((x) => x.event.type === 'islamic' && x.event.id === 'ayyam_al_bid');
    expect(white).toHaveLength(1);
    expect(white[0]!.day.ymd).toBe('2026-10-25');
    expect(white[0]!.span).toEqual([13, 15]);
    expect(list.filter((x) => x.event.type === 'holiday').map((x) => x.day.ymd)).toEqual([
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ]);
  });

  it('a month that opens inside the White Days still lists them', () => {
    // Hijri grid: Jumada al-Akhirah 1448 in BD begins 12 Nov; its White Days are 24-26 Nov.
    const m = monthDays('2026-11-25', 'greg', day).filter((d) => d.ymd >= '2026-11-25');
    const list = monthListEvents(m, (d) => dayEvents(d, ALL));
    expect(list.some((x) => x.event.type === 'islamic' && x.event.id === 'ayyam_al_bid')).toBe(
      true
    );
  });
});

describe('paper', () => {
  it('sheet sizes at 96 dpi and the @page rule', () => {
    expect(sheetSize('A4', 'landscape')).toEqual({ width: 1123, height: 794 });
    expect(sheetSize('A4', 'portrait')).toEqual({ width: 794, height: 1123 });
    expect(sheetSize('Letter', 'landscape')).toEqual({ width: 1056, height: 816 });
    expect(pageRule({ paper: 'A4', orient: 'landscape' })).toBe(
      '@page { size: A4 landscape; margin: 0; }'
    );
  });
});

describe('downloads stay within last year, this year and next year', () => {
  const bounds = { from: '2025-01-01', to: '2027-12-31' };
  it('a range past the end stops at December 2027', () => {
    const m = printMonths(
      '2027-10-15',
      opts({ range: { kind: 'range', from: '2027-10-01', to: '2028-03-01' } }),
      day,
      bounds
    );
    expect(m).toEqual(['2027-10-01', '2027-11-01', '2027-12-01']);
  });
  it('a full year inside the window is untouched', () => {
    const m = printMonths(
      '2026-10-15',
      opts({ range: { kind: 'year', layout: 'pages' } }),
      day,
      bounds
    );
    expect(m).toHaveLength(12);
  });
});
