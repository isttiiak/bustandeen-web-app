import { describe, expect, it } from 'vitest';
import {
  addDays,
  recordShift,
  resolveHijriDay,
  ummAlQura,
  type MoonSightingRecord,
} from './hijriOffset.js';

// T4.1 option B: month-start moon-sighting records. A month has 29 or 30
// days and begins on the announced sighting. Records here are fixtures, not
// real committee decisions. Umm al-Qura 1448 (checked with Intl): 1 Sha'ban
// = 9 Jan 2027, 30 Sha'ban = 7 Feb, 1 Ramadan = 8 Feb, 29 Ramadan = 8 Mar,
// 1 Shawwal = 9 Mar (Ramadan 29 days), 1 Dhul Qa'dah = 8 Apr, 1 Dhul Hijjah
// = 7 May, 1 Muharram 1449 = 6 Jun.

const rec = (
  hijriYear: number,
  hijriMonth: number,
  startDate: string,
  country = 'BD'
): MoonSightingRecord => ({
  id: `${country}-${hijriYear}-${hijriMonth}`,
  country,
  hijriYear,
  hijriMonth,
  startDate,
  effectiveFrom: startDate,
  offset: 0,
  note: 'fixture',
});

const SHABAN = rec(1448, 8, '2027-01-10');
const RAMADAN_LATE = rec(1448, 9, '2027-02-09');
const SHAWWAL_30 = rec(1448, 10, '2027-03-11');
const SHAWWAL_29 = rec(1448, 10, '2027-03-10');

const on = (records: MoonSightingRecord[], day: string, country: string | null = 'BD') =>
  resolveHijriDay({ manual: false, userOffset: 0, country, records, day });
const ymdOf = (records: MoonSightingRecord[], day: string) => {
  const { hijri } = on(records, day);
  return `${hijri.day}/${hijri.month}/${hijri.year}`;
};

describe('Umm al-Qura reference dates', () => {
  it.each([
    ['2027-02-07', '30/8/1448'],
    ['2027-02-08', '1/9/1448'],
    ['2027-03-08', '29/9/1448'],
    ['2027-03-09', '1/10/1448'],
  ])('%s is %s', (day, want) => {
    const h = ummAlQura(day);
    expect(`${h.day}/${h.month}/${h.year}`).toBe(want);
  });

  it("a record's shift: -1 when the country began a day after Umm al-Qura", () => {
    expect(recordShift(RAMADAN_LATE)).toBe(-1);
    expect(recordShift(SHAWWAL_30)).toBe(-2);
    expect(recordShift(rec(1448, 9, '2027-02-08'))).toBe(0);
    expect(recordShift(rec(1448, 9, '2027-02-07'))).toBe(1);
    expect(recordShift(rec(1448, 9, '2027-02-11'))).toBeNull();
  });
});

describe('T1: no records = Umm al-Qura', () => {
  it('every day from 1 Muharram 1447 to the end of 1449', () => {
    for (let day = '2025-06-26'; day <= '2028-05-24'; day = addDays(day, 1)) {
      expect(on([], day).hijri).toEqual(ummAlQura(day));
      expect(on([], day).source).toBe('none');
    }
  });

  it("another country's records change nothing", () => {
    const pk = [rec(1448, 9, '2027-02-09', 'PK')];
    expect(ymdOf(pk, '2027-02-08')).toBe('1/9/1448');
  });

  it('no country on the device: Umm al-Qura even with records', () => {
    expect(on([RAMADAN_LATE], '2027-02-08', null).hijri).toEqual(ummAlQura('2027-02-08'));
  });
});

describe('T2: late start from 8 Feb (Ramadan record only)', () => {
  const R = [RAMADAN_LATE];
  it.each([
    ['2027-02-06', '29/8/1448'],
    ['2027-02-07', '30/8/1448'],
    // Umm al-Qura's 1 Ramadan, but Bangladesh has not started: never a day early
    ['2027-02-08', '30/8/1448'],
    ['2027-02-09', '1/9/1448'],
    ['2027-03-09', '29/9/1448'],
  ])('%s is %s', (day, want) => expect(ymdOf(R, day)).toBe(want));

  it('names the record it follows', () => {
    expect(on(R, '2027-02-08')).toMatchObject({ source: 'country', offset: -1 });
    expect(on(R, '2027-02-08').record?.id).toBe(RAMADAN_LATE.id);
  });
});

describe('T3: a 30-day month after a 29-day Umm al-Qura month', () => {
  const R = [RAMADAN_LATE, SHAWWAL_30];
  it.each([
    ['2027-03-09', '29/9/1448'],
    // No offset could show this day: Umm al-Qura's Ramadan has no 30th
    ['2027-03-10', '30/9/1448'],
    ['2027-03-11', '1/10/1448'],
    ['2027-03-12', '2/10/1448'],
  ])('%s is %s', (day, want) => expect(ymdOf(R, day)).toBe(want));

  it('after the month, Shawwal follows Umm al-Qura two days later', () => {
    // Shawwal 1448 began 11 Mar: day 29 = 8 Apr; day 30 forecast from UQ (7 Apr = 30 Shawwal)
    expect(ymdOf(R, '2027-04-08')).toBe('29/10/1448');
    expect(ymdOf(R, '2027-04-09')).toBe('30/10/1448');
  });
});

describe('T4: a 29-day month in Bangladesh', () => {
  const R = [RAMADAN_LATE, SHAWWAL_29];
  it.each([
    ['2027-03-09', '29/9/1448'],
    ['2027-03-10', '1/10/1448'],
  ])('%s is %s', (day, want) => expect(ymdOf(R, day)).toBe(want));
});

describe('T5: before the Shawwal announcement', () => {
  it('day 30 is a forecast from the shifted Umm al-Qura (Eid), until the record', () => {
    expect(ymdOf([RAMADAN_LATE], '2027-03-10')).toBe('1/10/1448');
  });
});

describe('T6: record after record', () => {
  const R = [SHABAN, RAMADAN_LATE, SHAWWAL_30];
  it("Sha'ban of 30 days, then Ramadan of 30: no gap, no repeat", () => {
    expect(ymdOf(R, '2027-01-09')).toBe('30/7/1448');
    expect(ymdOf(R, '2027-01-10')).toBe('1/8/1448');
    expect(ymdOf(R, '2027-02-08')).toBe('30/8/1448');
    expect(ymdOf(R, '2027-02-09')).toBe('1/9/1448');
    let prev = on(R, '2027-01-10').hijri;
    for (let day = '2027-01-11'; day <= '2027-03-20'; day = addDays(day, 1)) {
      const h = on(R, day).hijri;
      if (h.day === 1) {
        expect([29, 30]).toContain(prev.day);
        expect(h.month).toBe((prev.month % 12) + 1);
      } else {
        expect(h).toEqual({ ...prev, day: prev.day + 1 });
      }
      prev = h;
    }
  });
});

describe('T7: early start (a day before Umm al-Qura)', () => {
  const R = [rec(1448, 9, '2027-02-07')];
  it.each([
    ['2027-02-06', '29/8/1448'],
    ['2027-02-07', '1/9/1448'],
    ['2027-02-08', '2/9/1448'],
  ])('%s is %s', (day, want) => expect(ymdOf(R, day)).toBe(want));
});

describe('T8: a record the same as Umm al-Qura', () => {
  it('matches no record for that month', () => {
    const R = [rec(1448, 9, '2027-02-08')];
    for (let day = '2027-02-01'; day <= '2027-03-08'; day = addDays(day, 1)) {
      expect(on(R, day).hijri).toEqual(ummAlQura(day));
    }
  });
});

describe('T9 + T10: long after the last record, and the year boundary', () => {
  it('Dhul Hijjah 1448 follows Umm al-Qura shifted by the last record', () => {
    // UQ 10 Dhul Hijjah = 16 May; with Shawwal's -2 it is 18 May
    expect(ymdOf([RAMADAN_LATE, SHAWWAL_30], '2027-05-18')).toBe('10/12/1448');
  });

  it('Dhul Hijjah of 30 days, then Muharram 1449', () => {
    const R = [rec(1448, 12, '2027-05-08'), rec(1449, 1, '2027-06-07')];
    expect(ymdOf(R, '2027-06-06')).toBe('30/12/1448');
    expect(ymdOf(R, '2027-06-07')).toBe('1/1/1449');
  });
});

describe("T11: the user's own offset wins", () => {
  it('Umm al-Qura shifted by it, records ignored', () => {
    const r = resolveHijriDay({
      manual: true,
      userOffset: 1,
      country: 'BD',
      records: [RAMADAN_LATE],
      day: '2027-02-07',
    });
    expect(r).toMatchObject({ source: 'manual', offset: 1 });
    expect(r.hijri).toEqual(ummAlQura('2027-02-08'));
  });

  it('a record too far from Umm al-Qura is ignored', () => {
    expect(on([rec(1448, 9, '2027-02-12')], '2027-02-08').source).toBe('none');
  });
});
