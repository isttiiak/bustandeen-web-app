import { afterEach, describe, expect, it, vi } from 'vitest';
import { nightFastDate, ramadanStartBasis } from './ramadan.js';
import { calcPrayerTimesForDay } from './prayerTimes.js';
import { getTrackingDay, setDayStartModeLocal, type DayStartMode } from './trackingDay.js';
import { MemoryStorage } from '../test/memoryStorage.js';
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

// R10: the night comes before its day. The 21st night begins at Maghrib on
// the evening of the 20th fast, so tarawih and the odd-night marks belong to
// the fast that FOLLOWS the night, whatever the tracking-day mode.
describe('nightFastDate (whose night it is)', () => {
  const DHAKA = { latitude: 23.81, longitude: 90.41, name: 'Dhaka' };
  // A day of the BD forecast's last ten: 28 Feb 2027 (fast 20 if Ramadan
  // begins 9 Feb). Times on the Dhaka clock (vitest TZ = Asia/Dhaka).
  const day = '2027-02-28';
  const maghrib = () => calcPrayerTimesForDay(DHAKA.latitude, DHAKA.longitude, day).maghrib;
  const at = (hhmm: string) => new Date(`${day}T${hhmm}:00+06:00`);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("before Maghrib: today's fast (its night was last night)", () => {
    expect(nightFastDate(at('01:00'), day, maghrib())).toBe(day);
    expect(nightFastDate(at('12:00'), day, maghrib())).toBe(day);
    expect(nightFastDate(new Date(maghrib().getTime() - 60_000), day, maghrib())).toBe(day);
  });

  it("from Maghrib: tomorrow's fast (the 21st night begins at iftar of the 20th fast)", () => {
    expect(nightFastDate(maghrib(), day, maghrib())).toBe('2027-03-01');
    expect(nightFastDate(at('23:30'), day, maghrib())).toBe('2027-03-01');
  });

  it('across a month end', () => {
    const m = new Date('2027-03-31T18:20:00+06:00');
    expect(nightFastDate(new Date('2027-03-31T20:00:00+06:00'), '2027-03-31', m)).toBe(
      '2027-04-01'
    );
  });

  it('no Maghrib (polar day): the date itself', () => {
    expect(nightFastDate(at('23:00'), day, new Date(NaN))).toBe(day);
  });

  it.each<DayStartMode>(['fajr', 'midnight', 'maghrib'])(
    'the same night in %s mode, though the tracking day differs',
    (mode) => {
      const store = new MemoryStorage();
      vi.stubGlobal('localStorage', store);
      store.setItem('bustandeen_location', JSON.stringify(DHAKA));
      setDayStartModeLocal(mode);
      // Evening of fast 20: every mode still calls it fast 20's day, but the
      // night is the 21st.
      const evening = new Date(maghrib().getTime() + 90 * 60_000);
      expect(getTrackingDay(evening)).toBe(day);
      expect(nightFastDate(evening, day, maghrib())).toBe('2027-03-01');
      // 1 am, still the 21st night: the modes disagree on the day, the night
      // does not.
      const next = '2027-03-01';
      const oneAm = new Date(`${next}T01:00:00+06:00`);
      const nextMaghrib = calcPrayerTimesForDay(DHAKA.latitude, DHAKA.longitude, next).maghrib;
      expect(getTrackingDay(oneAm)).toBe(mode === 'midnight' ? next : day);
      expect(nightFastDate(oneAm, next, nextMaghrib)).toBe(next);
    }
  );
});
