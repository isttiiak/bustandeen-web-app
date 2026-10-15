import { describe, expect, it } from 'vitest';
import { BD_HOLIDAY_YEARS, BD_NATIONAL_DAYS } from './bd.js';

const validDate = (ymd: string) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === ymd;
};
const texts = (o: object) => Object.values(o).filter((v): v is string => typeof v === 'string');

describe('Bangladesh calendar data', () => {
  it('every holiday year has sources and real dates in that year, in order', () => {
    for (const y of BD_HOLIDAY_YEARS) {
      expect(y.sources.length).toBeGreaterThan(0);
      for (const s of y.sources) expect(s.url).toMatch(/^https:\/\//);
      let prev = '';
      for (const h of y.holidays) {
        expect(validDate(h.date), h.date).toBe(true);
        expect(h.date.startsWith(`${y.year}-`)).toBe(true);
        expect(h.date >= prev, h.date).toBe(true);
        expect(['general', 'executive']).toContain(h.kind);
        prev = h.date;
      }
    }
  });

  it('names in English and in Bangla script, no em dash', () => {
    const all = [...BD_HOLIDAY_YEARS.flatMap((y) => y.holidays), ...BD_NATIONAL_DAYS];
    for (const item of all) {
      expect(item.en.length).toBeGreaterThan(2);
      expect(item.bn).toMatch(/[ঀ-৿]/);
      if (item.shortBn) expect(item.shortBn).toMatch(/[ঀ-৿]/);
      for (const t of texts(item)) expect(t).not.toContain('—');
    }
  });

  it('national days are valid month-days and not also holidays', () => {
    for (const nd of BD_NATIONAL_DAYS) {
      expect(nd.monthDay).toMatch(/^\d{2}-\d{2}$/);
      expect(validDate(`2028-${nd.monthDay}`)).toBe(true);
      for (const y of BD_HOLIDAY_YEARS) {
        expect(y.holidays.some((h) => h.date.endsWith(nd.monthDay))).toBe(false);
      }
    }
  });
});
