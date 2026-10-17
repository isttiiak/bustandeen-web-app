import { describe, expect, it } from 'vitest';
import { ramadanStartBasis } from './ramadan.js';
import { resolveHijriDay, type MoonSightingRecord } from './hijriOffset.js';

const rec = (hijriMonth: number, startDate: string): MoonSightingRecord => ({
  id: `BD-${hijriMonth}`,
  country: 'BD',
  hijriYear: 1448,
  hijriMonth,
  startDate,
  effectiveFrom: startDate,
  offset: 0,
  note: '',
});

// The source of Ramadan's first day as the app resolves it.
const basis = (records: MoonSightingRecord[], day: string, manual = false, country = 'BD') =>
  ramadanStartBasis(resolveHijriDay({ manual, userOffset: 1, country, records, day }), 1448);

describe('ramadanStartBasis ("Expected around" names what the date rests on)', () => {
  it('Umm al-Qura when the country has no record', () => {
    expect(basis([], '2027-02-08')).toEqual({ kind: 'ummAlQura' });
    expect(basis([rec(5, '2026-10-13')], '2027-02-08', false, 'GB')).toEqual({
      kind: 'ummAlQura',
    });
  });

  it("a forecast from the country's latest record (Jumada al-Ula 1448, 13 Oct 2026)", () => {
    expect(basis([rec(5, '2026-10-13')], '2027-02-09')).toEqual({
      kind: 'forecast',
      country: 'BD',
    });
  });

  it("announced once this Ramadan's record exists", () => {
    expect(basis([rec(5, '2026-10-13'), rec(9, '2027-02-09')], '2027-02-09')).toEqual({
      kind: 'announced',
      country: 'BD',
    });
  });

  it("the user's own adjustment wins", () => {
    expect(basis([rec(9, '2027-02-09')], '2027-02-07', true)).toEqual({ kind: 'manual' });
  });
});
