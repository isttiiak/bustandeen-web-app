import { describe, expect, it } from 'vitest';
import type { MoonSightingRecord } from './hijriOffset.js';
import {
  calendarDays,
  leadingBlanks,
  monthDays,
  stepMonth,
  weekdayOrder,
  type HijriInputs,
} from './calendarMonth.js';

// The live Bangladesh record (fixture copy): Jumada al-Ula 1448 began 13 Oct 2026.
const BD_JUMADA: MoonSightingRecord = {
  id: 'bd-1448-5',
  country: 'BD',
  hijriYear: 1448,
  hijriMonth: 5,
  startDate: '2026-10-13',
  effectiveFrom: '2026-10-12',
  offset: -1,
  note: 'fixture',
};
const BD: HijriInputs = { manual: false, userOffset: 0, country: 'BD', records: [BD_JUMADA] };
const UQ: HijriInputs = { manual: false, userOffset: 0, country: null, records: [] };

const hijriOf = (inputs: HijriInputs, ymd: string) => {
  const h = calendarDays(inputs)(ymd).hijri;
  return `${h.day}/${h.month}/${h.year}`;
};

describe('a day carries all three dates', () => {
  it('15 Oct 2026 in Bangladesh', () => {
    const d = calendarDays(BD)('2026-10-15');
    expect(d.weekday).toBe(4); // Thursday
    expect(d.hijri).toEqual({ year: 1448, month: 5, day: 3 });
    expect(d.hijriSource).toBe('country');
    expect(d.record?.id).toBe('bd-1448-5');
    expect(d.bengali).toEqual({ year: 1433, month: 6, day: 30 });
  });

  it('without a record it is Umm al-Qura', () => {
    expect(hijriOf(UQ, '2026-10-12')).toBe('1/5/1448');
    expect(hijriOf(BD, '2026-10-12')).toBe('30/4/1448');
  });

  it("the user's own offset wins", () => {
    expect(hijriOf({ ...BD, manual: true, userOffset: 1 }, '2026-10-12')).toBe('2/5/1448');
  });
});

describe('monthDays', () => {
  const day = calendarDays(BD);

  it('a Gregorian month, from any day in it', () => {
    const oct = monthDays('2026-10-15', 'greg', day);
    expect(oct).toHaveLength(31);
    expect(oct[0].ymd).toBe('2026-10-01');
    expect(oct[30].ymd).toBe('2026-10-31');
    expect(monthDays('2026-02-10', 'greg', day)).toHaveLength(28);
  });

  it('a Hijri month follows the country: Jumada al-Ula 1448 is 13 Oct to 11 Nov', () => {
    const m = monthDays('2026-10-20', 'hijri', day);
    expect(m[0].ymd).toBe('2026-10-13');
    expect(m[0].hijri.day).toBe(1);
    expect(m[m.length - 1].ymd).toBe('2026-11-11');
    expect(m).toHaveLength(30);
    expect(m.map((d) => d.hijri.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('a Bengali month: Kartik 1433 is 17 Oct to 15 Nov', () => {
    const m = monthDays('2026-11-01', 'bn', day);
    expect(m[0].ymd).toBe('2026-10-17');
    expect(m[m.length - 1].ymd).toBe('2026-11-15');
    expect(m).toHaveLength(30);
  });

  it('every Hijri month over two years has 29 or 30 days, back to back', () => {
    let anchor = '2026-01-20';
    let prevLast = '';
    for (let i = 0; i < 24; i++) {
      const m = monthDays(anchor, 'hijri', day);
      expect([29, 30]).toContain(m.length);
      if (prevLast) expect(m[0].ymd > prevLast).toBe(true);
      prevLast = m[m.length - 1].ymd;
      anchor = stepMonth(anchor, 'hijri', 1, day);
    }
  });
});

describe('stepMonth', () => {
  const day = calendarDays(BD);
  it.each([
    ['greg', 1, '2026-11-01'],
    ['greg', -1, '2026-09-01'],
    ['hijri', 1, '2026-11-12'],
    ['hijri', -1, '2026-09-13'],
    ['bn', 1, '2026-10-17'],
    ['bn', -1, '2026-08-16'],
  ] as const)('%s %i from 15 Oct 2026 is %s', (kind, step, want) => {
    expect(stepMonth('2026-10-15', kind, step, day)).toBe(want);
  });

  it('a year back and forth lands on the same month', () => {
    let a = '2026-10-15';
    for (let i = 0; i < 12; i++) a = stepMonth(a, 'hijri', 1, day);
    for (let i = 0; i < 12; i++) a = stepMonth(a, 'hijri', -1, day);
    expect(a).toBe('2026-10-13');
  });
});

describe('grid helpers', () => {
  it('week order and leading blanks', () => {
    expect(weekdayOrder(6)).toEqual([6, 0, 1, 2, 3, 4, 5]);
    expect(weekdayOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    // 1 Oct 2026 is a Thursday
    expect(leadingBlanks(4, 6)).toBe(5);
    expect(leadingBlanks(4, 0)).toBe(4);
    expect(leadingBlanks(4, 1)).toBe(3);
    expect(leadingBlanks(6, 6)).toBe(0);
  });
});
