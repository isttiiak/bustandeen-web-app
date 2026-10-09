import { describe, expect, it } from 'vitest';
import {
  addMonths,
  daysInMonth,
  expiredMonths,
  monthRows,
  monthWindow,
  ymInZone,
} from './monthTable.js';
import { cityBySlug } from '../data/cities.js';
import { MONTHLY, formatClock, formatMonth, formatNumber } from '../locales/monthly.js';

describe('month window', () => {
  it('counts months in Bangladesh time', () => {
    // 31 Oct 19:00 UTC is already 1 Nov in Dhaka (UTC+6).
    expect(ymInZone(new Date('2026-10-31T19:00:00Z'))).toBe('2026-11');
    expect(ymInZone(new Date('2026-10-31T17:00:00Z'))).toBe('2026-10');
  });

  it('adds months across a year end', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
  });

  it('is this month and the next two', () => {
    expect(monthWindow(new Date('2026-10-10T06:00:00Z'))).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
    ]);
    expect(monthWindow(new Date('2026-12-20T06:00:00Z'))).toEqual([
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
  });

  it('redirects only months that had pages', () => {
    expect(expiredMonths(new Date('2026-10-10T06:00:00Z'))).toEqual([]);
    expect(expiredMonths(new Date('2027-01-05T06:00:00Z'))).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
    ]);
  });

  it('knows month lengths, leap years included', () => {
    expect(daysInMonth('2026-10')).toBe(31);
    expect(daysInMonth('2027-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
  });
});

describe('monthRows', () => {
  const dhaka = cityBySlug('dhaka-bangladesh')!;
  const rows = monthRows(dhaka, '2026-10');

  it('has one row per day, in order', () => {
    expect(rows).toHaveLength(31);
    expect(rows[0].date).toBe('2026-10-01');
    expect(rows[30].date).toBe('2026-10-31');
  });

  it('matches the approved prototype for Dhaka, 1 October 2026', () => {
    const t = rows[0].times;
    expect(t.method).toBe('Karachi');
    expect(t.asrSchool).toBe('hanafi');
    expect(
      [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map((d) => formatClock(d, 'en'))
    ).toEqual(['4:35', '5:50', '11:49', '4:06', '5:46', '7:01']);
  });

  it('keeps every day in prayer order', () => {
    for (const { times: t } of rows) {
      const seq = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map((d) => d.getTime());
      expect([...seq].sort((a, b) => a - b)).toEqual(seq);
    }
  });

  it('dates each row in the Umm al-Qura calendar', () => {
    // 1 October 2026 = 20 Rabi' al-Akhir 1448 (Umm al-Qura; aladhan.com October
    // 2026 calendar, and Rabi II 1448 = 12 Sep - 11 Oct 2026 on Wikipedia).
    expect(rows[0].hijri).toEqual({ day: 20, month: 4, year: 1448 });
  });
});

describe('monthly strings', () => {
  it('writes Bangla numbers and months in Bangla', () => {
    const dhaka = cityBySlug('dhaka-bangladesh')!;
    const fajr = monthRows(dhaka, '2026-10')[0].times.fajr;
    expect(formatClock(fajr, 'bn')).toBe('৪:৩৫');
    expect(formatMonth('2026-10', 'bn')).toBe('অক্টোবর ২০২৬');
    expect(formatNumber(1448, 'bn')).toBe('১৪৪৮');
  });

  it("uses the app's spelling for the prayer names", () => {
    expect(MONTHLY.bn.columns.dhuhr).toBe('যুহর');
    expect(MONTHLY.bn.columns.isha).toBe('ইশা');
  });

  it('adds no em dash to the new copy', () => {
    expect(JSON.stringify(MONTHLY)).not.toContain('—');
  });
});
