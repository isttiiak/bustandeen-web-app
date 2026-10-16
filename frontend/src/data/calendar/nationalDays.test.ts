import { describe, expect, it } from 'vitest';
import { NATIONAL_DAYS } from './nationalDays.js';

const validMonthDay = (md: string) => {
  // A leap year, so 29 Feb would pass; none is listed.
  const d = new Date(`2028-${md}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(5, 10) === md;
};
const texts = (o: object) => Object.values(o).filter((v): v is string => typeof v === 'string');

describe('national days outside Bangladesh', () => {
  it('the countries, each with a source; Bangladesh stays in bd.ts', () => {
    expect(Object.keys(NATIONAL_DAYS).sort()).toEqual(
      [
        ...['AE', 'EG', 'GB', 'ID', 'IN', 'MY', 'PK', 'SA', 'TR', 'US'],
        ...['AU', 'BE', 'CA', 'DE', 'FR', 'IT', 'NL', 'SE'],
        ...['AT', 'CH', 'DK', 'ES', 'NO'],
      ].sort()
    );
    for (const [code, c] of Object.entries(NATIONAL_DAYS)) {
      expect(c.sources.length, code).toBeGreaterThan(0);
      for (const s of c.sources) expect(s.url).toMatch(/^https:\/\//);
      expect(c.days.length, code).toBeGreaterThan(0);
    }
  });

  it('real month-days, in order, one per date', () => {
    for (const [code, c] of Object.entries(NATIONAL_DAYS)) {
      let prev = '';
      for (const d of c.days) {
        expect(d.monthDay).toMatch(/^\d{2}-\d{2}$/);
        expect(validMonthDay(d.monthDay), `${code} ${d.monthDay}`).toBe(true);
        expect(d.monthDay > prev, `${code} ${d.monthDay}`).toBe(true);
        prev = d.monthDay;
      }
    }
  });

  it('names in English and in Bangla script, no em dash', () => {
    for (const c of Object.values(NATIONAL_DAYS)) {
      for (const d of c.days) {
        expect(d.en.length).toBeGreaterThan(2);
        expect(d.bn).toMatch(/[ঀ-৿]/);
        expect(d.bn).not.toMatch(/[A-Za-z]/);
        if (d.shortBn) expect(d.shortBn).toMatch(/[ঀ-৿]/);
        for (const t of texts(d)) expect(t).not.toContain('—');
      }
    }
  });

  it('checked dates (government sources, 2026-10-16)', () => {
    const md = (code: string) => NATIONAL_DAYS[code]!.days.map((d) => d.monthDay);
    expect(md('PK')).toEqual(['02-05', '03-23', '05-28', '08-14', '11-09', '12-25']);
    expect(md('IN')).toEqual(['01-26', '08-15', '10-02']);
    expect(md('SA')).toEqual(['02-22', '09-23']);
    expect(md('AE')).toEqual(['11-30', '12-02']);
    expect(md('MY')).toEqual(['08-31', '09-16']);
    expect(md('ID')).toEqual(['06-01', '08-17']);
    expect(md('GB')).toEqual(['11-11']);
    expect(md('US')).toEqual(['06-19', '07-04', '11-11']);
    expect(md('EG')).toEqual(['01-25', '04-25', '06-30', '07-23', '10-06']);
    expect(md('TR')).toEqual(['04-23', '05-19', '07-15', '08-30', '10-29']);
    expect(md('DE')).toEqual(['10-03']);
    expect(md('FR')).toEqual(['05-08', '07-14', '11-11']);
    expect(md('IT')).toEqual(['04-25', '06-02']);
    expect(md('NL')).toEqual(['05-04', '05-05']);
    expect(md('BE')).toEqual(['07-21', '11-11']);
    expect(md('SE')).toEqual(['06-06']);
    expect(md('CA')).toEqual(['07-01', '09-30', '11-11']);
    expect(md('AU')).toEqual(['01-26', '04-25']);
    expect(md('ES')).toEqual(['10-12', '12-06']);
    expect(md('AT')).toEqual(['10-26']);
    expect(md('CH')).toEqual(['08-01']);
    expect(md('NO')).toEqual(['05-17']);
    expect(md('DK')).toEqual(['06-05']);
  });
});
