import { describe, expect, it } from 'vitest';
import { calendarDays, monthDays, type HijriInputs } from './calendarMonth.js';
import { dayEvents, type EventFilters } from './calendarEvents.js';
import { addDays } from './hijriOffset.js';
import {
  DEFAULT_PRINT,
  DOWNLOADS_PER_HOUR,
  boxEvents,
  dayMarks,
  isRecurring,
  monthRecurring,
  defaultInclude,
  downloadWaitMinutes,
  downloadWindow,
  includeFilters,
  recentDownloads,
  monthListEvents,
  pageRule,
  printMonths,
  sheetSize,
  yearStart,
  type PrintOptions,
  type RecurringLine,
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
  at: '2026-10-15',
  include: defaultInclude('BD'),
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
    // At most a year in one download.
    expect(r('2026-10-01', '2030-10-01')).toHaveLength(12);
  });
});

describe('what a day box and the side column show', () => {
  const FASTS: EventFilters = { ...ALL, monThu: true, fridays: true };

  it('two named events, then "+N more"; recurring days are marks, not names', () => {
    const e = dayEvents(day('2026-12-25'), ALL).filter((x) => !isRecurring(x));
    expect(boxEvents(e)).toEqual({ shown: e, more: 0 });
    const three = [...e, ...e, ...e];
    expect(boxEvents(three).shown).toHaveLength(2);
    expect(boxEvents(three).more).toBe(three.length - 2);
    // 26 Oct 2026: a Monday in the White Days, nothing else.
    const mon = dayEvents(day('2026-10-26'), FASTS);
    expect(boxEvents(mon)).toEqual({ shown: [], more: 0 });
    expect(dayMarks(mon)).toEqual(['fast', 'white']);
    // 23 Oct: Friday is in the column header, so no mark.
    expect(dayMarks(dayEvents(day('2026-10-23'), FASTS))).toEqual([]);
  });

  it('the dated list leaves out recurring days; holidays stay', () => {
    const oct = monthDays('2026-10-15', 'greg', day);
    const list = monthListEvents(oct, (d) => dayEvents(d, FASTS));
    expect(list.some((x) => isRecurring(x.event))).toBe(false);
    expect(list.filter((x) => x.event.type === 'holiday').map((x) => x.day.ymd)).toEqual([
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ]);
  });

  it('recurring days are one line each: weekdays, and the White Days with their dates', () => {
    const oct = monthDays('2026-10-15', 'greg', day);
    const lines = monthRecurring(oct, (d) => dayEvents(d, FASTS));
    expect(lines.map((l) => l.id)).toEqual(['fast_mon_thu', 'friday', 'ayyam_al_bid']);
    expect(lines[0]).toMatchObject({ weekdays: [1, 4] });
    expect(lines[1]).toMatchObject({ weekdays: [5] });
    const white = lines[2] as Extract<RecurringLine, { id: 'ayyam_al_bid' }>;
    expect([white.from.ymd, white.to.ymd]).toEqual(['2026-10-25', '2026-10-27']);
    expect([white.from.hijri.day, white.to.hijri.day]).toEqual([13, 15]);
    // Only the switches that are on.
    expect(monthRecurring(oct, (d) => dayEvents(d, ALL)).map((l) => l.id)).toEqual([
      'ayyam_al_bid',
    ]);
  });

  it('a month that opens inside the White Days lists the part it has', () => {
    // Hijri grid: Jumada al-Akhirah 1448 in BD begins 12 Nov; its White Days are 24-26 Nov.
    const m = monthDays('2026-11-25', 'greg', day).filter((d) => d.ymd >= '2026-11-25');
    const lines = monthRecurring(m, (d) => dayEvents(d, ALL));
    expect(lines).toHaveLength(1);
    const white = lines[0] as Extract<RecurringLine, { id: 'ayyam_al_bid' }>;
    expect([white.from.ymd, white.to.ymd]).toEqual(['2026-11-25', '2026-11-26']);
  });

  it('no Sunnah fast mark on Eid or the days of Tashriq', () => {
    // Find the next Eid al-Adha and the three days after it.
    const eid = Array.from({ length: 400 }, (_, i) => day(addDays('2026-10-16', i))).find(
      (d) => d.hijri.month === 12 && d.hijri.day === 10
    )!;
    for (let i = 0; i < 4; i++) {
      const d = day(addDays(eid.ymd, i));
      expect(dayMarks(dayEvents(d, FASTS))).toEqual([]);
    }
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

describe('what a download includes (2026-10-16)', () => {
  it('Islamic days and, where curated, national days; never government holidays by default', () => {
    expect(defaultInclude('BD')).toEqual({
      islamic: true,
      sunnahFasts: false,
      fridays: false,
      holidays: false,
      national: true,
    });
    // National days but no holiday list: national days on, holidays still off.
    expect(defaultInclude('PK')).toMatchObject({ islamic: true, holidays: false, national: true });
    expect(defaultInclude('JP')).toMatchObject({ islamic: true, holidays: false, national: false });
    expect(defaultInclude(null)).toMatchObject({ islamic: true, national: false });
  });

  it('holidays and national days only where there is a list', () => {
    const on = {
      islamic: true,
      sunnahFasts: false,
      fridays: false,
      holidays: true,
      national: true,
    };
    expect(includeFilters('BD', on)).toMatchObject({ holidays: true, national: true });
    expect(includeFilters('PK', on)).toMatchObject({ holidays: false, national: true });
    expect(includeFilters('JP', on)).toMatchObject({ holidays: false, national: false });
  });

  it('Sunnah fasts and Fridays are their own switches', () => {
    const base = {
      islamic: true,
      sunnahFasts: false,
      fridays: false,
      holidays: false,
      national: false,
    };
    // 2026-10-23 is a Friday; 2026-10-26 (14 Jumada al-Ula with the BD record) a Monday in the White Days.
    const ids = (ymd: string, inc: typeof base) =>
      dayEvents(day(ymd), includeFilters('BD', inc)).map((e) =>
        e.type === 'islamic' ? e.id : e.type
      );
    expect(ids('2026-10-23', base)).toEqual([]);
    expect(ids('2026-10-23', { ...base, fridays: true })).toEqual(['friday']);
    expect(ids('2026-10-26', base)).toEqual([]);
    expect(ids('2026-10-26', { ...base, sunnahFasts: true })).toEqual([
      'ayyam_al_bid',
      'fast_mon_thu',
    ]);
  });

  it('yearly Islamic days come before the monthly and weekly ones', () => {
    // 15 Sha'ban 1448 (Laylat al-Bara'ah's day) is also a White Day.
    const sha15 = Array.from({ length: 400 }, (_, i) => day(addDays('2026-10-16', i))).find(
      (d) => d.hijri.month === 8 && d.hijri.day === 15
    )!;
    const ev = dayEvents(sha15, { ...ALL, monThu: true, fridays: true });
    expect(ev[0]).toMatchObject({ type: 'islamic', id: 'shab_e_barat' });
  });

  it('the screen still shows the White Days and leaves out Mondays, Thursdays and Fridays', () => {
    const ids = dayEvents(day('2026-10-26'), ALL).map((e) =>
      e.type === 'islamic' ? e.id : e.type
    );
    expect(ids).toContain('ayyam_al_bid');
    expect(ids).not.toContain('fast_mon_thu');
  });
});

describe('how far a download reaches', () => {
  it('with government holidays: last year to next year', () => {
    expect(downloadWindow('2026-10-16', true)).toEqual({ from: '2025-01-01', to: '2027-12-31' });
  });
  it('without them: 25 years either side', () => {
    expect(downloadWindow('2026-10-16', false)).toEqual({ from: '2001-01-01', to: '2051-12-31' });
    const m = printMonths(
      '2040-03-01',
      opts({ at: '2040-03-01', range: { kind: 'year', layout: 'pages' } }),
      day,
      downloadWindow('2026-10-16', false)
    );
    expect(m).toHaveLength(12);
    expect(m[0]).toBe('2040-01-01');
  });
});

describe('downloads per hour on one device', () => {
  const now = Date.parse('2026-10-16T12:00:00Z');
  it('counts only the last hour and survives bad data', () => {
    expect(recentDownloads(null, now)).toEqual([]);
    expect(recentDownloads('not json', now)).toEqual([]);
    expect(recentDownloads('{"a":1}', now)).toEqual([]);
    expect(recentDownloads(JSON.stringify([now - 3_700_000, now - 60_000, 'x']), now)).toEqual([
      now - 60_000,
    ]);
  });
  it('waits until the oldest of the last hour is an hour old', () => {
    const nine = Array.from({ length: DOWNLOADS_PER_HOUR - 1 }, (_, i) => now - i * 60_000);
    expect(downloadWaitMinutes(nine, now)).toBe(0);
    const full = [...nine, now - 50 * 60_000];
    expect(downloadWaitMinutes(full, now)).toBe(10);
  });
});
