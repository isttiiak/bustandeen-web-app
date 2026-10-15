import { describe, expect, it } from 'vitest';
import { bengaliDate, bengaliMonthLength, bnDigits, formatBengaliDate } from './bengaliCalendar.js';

const at = (ymd: string) => {
  const b = bengaliDate(ymd);
  return `${b.day}/${b.month}/${b.year}`;
};

describe('Bangla Academy 2019 calendar', () => {
  it.each([
    // 1 Boishakh is always 14 April
    ['2026-04-14', '1/1/1433'],
    ['2027-04-14', '1/1/1434'],
    ['2026-04-13', '30/12/1432'],
    // Boishakh to Ashwin have 31 days
    ['2026-05-14', '31/1/1433'],
    ['2026-05-15', '1/2/1433'],
    ['2026-10-15', '30/6/1433'],
    ['2026-10-16', '31/6/1433'],
    ['2026-10-17', '1/7/1433'],
    // National days fixed by the 2019 revision
    ['2026-12-16', '1/9/1433'], // Victory Day = 1 Poush
    ['2027-02-14', '1/11/1433'], // Pohela Falgun
    ['2027-02-21', '8/11/1433'], // Shaheed Day = 8 Falgun
    ['2027-03-26', '12/12/1433'], // Independence Day = 12 Chaitra
  ])('%s is %s', (ymd, want) => expect(at(ymd)).toBe(want));

  it('Falgun has 30 days when February is a leap month', () => {
    expect(bengaliMonthLength(1434, 11)).toBe(30); // Feb-Mar 2028
    expect(bengaliMonthLength(1433, 11)).toBe(29); // Feb-Mar 2027
    expect(at('2028-03-14')).toBe('30/11/1434');
    expect(at('2027-03-15')).toBe('1/12/1433');
  });

  it('every year has 365 or 366 days and no day is skipped or repeated', () => {
    let prev = bengaliDate('2019-04-13');
    let t = Date.UTC(2019, 3, 14);
    for (; t < Date.UTC(2031, 0, 1); t += 86_400_000) {
      const b = bengaliDate(new Date(t).toISOString().slice(0, 10));
      if (b.day === 1) {
        expect(prev.day).toBe(bengaliMonthLength(prev.year, prev.month));
        expect(b.month).toBe((prev.month % 12) + 1);
        if (b.month === 1) expect(b.year).toBe(prev.year + 1);
      } else {
        expect(b).toEqual({ ...prev, day: prev.day + 1 });
      }
      prev = b;
    }
  });
});

describe('Bangla script', () => {
  it('digits and the full date', () => {
    expect(bnDigits(2026)).toBe('২০২৬');
    expect(bnDigits('17:32')).toBe('১৭:৩২');
    expect(formatBengaliDate(bengaliDate('2026-10-15'))).toBe('৩০ আশ্বিন ১৪৩৩ বঙ্গাব্দ');
  });
});
