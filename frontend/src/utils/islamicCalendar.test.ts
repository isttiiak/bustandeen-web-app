import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n.js';
import {
  SPECIAL_DAYS,
  formatHijriDate,
  getHijriAdjustment,
  getHijriDate,
  getHijriToday,
  getTodaySpecialDays,
  isFriday,
  isPostMaghrib,
  setHijriAdjustment,
  setHijriAutomatic,
  getHijriOffsetSource,
  resolveHijriOffset,
  syncHijriFromServer,
  HIJRI_COUNTRY_KEY,
  MOON_SIGHTING_KEY,
  type MoonSightingRecord,
} from './islamicCalendar.js';
import { getMaghribTime } from './trackingDay.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit T2.1. The rules: Hijri dates follow Umm al-Qura plus the user's ±1 day
// moon-sighting offset; the Islamic day (and so "today's" Hijri date, special
// days and Jumuʿah) advances at Maghrib, not midnight.
//
// Reference dates are the published Umm al-Qura calendar for 1447-1448 AH
// (Ramadan 1447 began Wed 18 Feb 2026, Eid al-Fiṭr Fri 20 Mar 2026, ʿArafah
// Tue 26 May 2026, 1 Muḥarram 1448 Tue 16 Jun 2026). TZ is Asia/Dhaka.

const DHAKA = JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' });

let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
});
afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await i18n.changeLanguage('en');
});

/** Local noon, far from any day boundary. */
const noon = (iso: string) => new Date(`${iso}T12:00:00`);
const ids = (date?: Date) => getTodaySpecialDays(date).map((d) => d.id);

describe('getHijriDate (Umm al-Qura)', () => {
  it.each([
    ['2026-02-17', 29, 8, 1447],
    ['2026-02-18', 1, 9, 1447],
    ['2026-03-19', 30, 9, 1447],
    ['2026-03-20', 1, 10, 1447],
    ['2026-05-26', 9, 12, 1447],
    ['2026-05-27', 10, 12, 1447],
    ['2026-06-16', 1, 1, 1448],
    ['2026-06-25', 10, 1, 1448],
    ['2027-02-07', 30, 8, 1448],
  ])('%s is %i/%i/%i', (iso, day, month, year) => {
    const h = getHijriDate(noon(iso))!;
    expect({ day: h.day, month: h.month, year: h.year }).toEqual({ day, month, year });
  });

  it('names the month and keeps the Gregorian weekday', () => {
    const h = getHijriDate(noon('2026-03-20'))!;
    expect(h.monthName).toBe('Shawwāl');
    expect(h.weekday).toBe(5); // Friday
  });

  it('applies the moon-sighting offset (South Asia is often a day behind)', () => {
    setHijriAdjustment(-1);
    expect(getHijriDate(noon('2026-02-18'))).toMatchObject({ day: 29, month: 8 });
    setHijriAdjustment(1);
    expect(getHijriDate(noon('2026-02-17'))).toMatchObject({ day: 1, month: 9 });
  });

  it('keeps the Gregorian weekday even when the offset moves the Hijri date', () => {
    setHijriAdjustment(1);
    expect(getHijriDate(noon('2026-03-19'))!.weekday).toBe(4); // Thursday
  });

  it('returns null if the platform cannot format the calendar', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new RangeError('no islamic-umalqura');
    });
    expect(getHijriDate(noon('2026-03-20'))).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('Hijri adjustment setting', () => {
  it('defaults to 0', () => {
    expect(getHijriAdjustment()).toBe(0);
  });

  it.each([
    [-1, -1],
    [0, 0],
    [1, 1],
    [2, 0],
    [-5, 0],
  ])('setHijriAdjustment(%i) stores %i', (input, stored) => {
    setHijriAdjustment(input);
    expect(getHijriAdjustment()).toBe(stored);
  });

  it('clamps a hand-edited out-of-range value to 0', () => {
    store.setItem('bustandeen_hijri_offset', '3');
    expect(getHijriAdjustment()).toBe(0);
    store.setItem('bustandeen_hijri_offset', 'abc');
    expect(getHijriAdjustment()).toBe(0);
  });
});

// T4.1: the user's own offset, else the country's moon-sighting record in
// force on that day, else 0. Records here are test fixtures, not real
// committee decisions.
describe('moon-sighting override (T4.1)', () => {
  const rec = (country: string, effectiveFrom: string, offset: number): MoonSightingRecord => ({
    id: `${country}-${effectiveFrom}`,
    country,
    effectiveFrom,
    offset,
    note: 'fixture',
  });
  const RECORDS = [
    rec('BD', '2027-02-08', -1),
    rec('BD', '2027-03-10', 0),
    rec('PK', '2027-02-08', 1),
  ];
  const base = { manual: false, userOffset: 0, country: 'BD', records: RECORDS };

  it('the record in force applies from its date until the next one', () => {
    expect(resolveHijriOffset({ ...base, day: '2027-02-07' })).toMatchObject({
      offset: 0,
      source: 'none',
    });
    expect(resolveHijriOffset({ ...base, day: '2027-02-08' })).toMatchObject({
      offset: -1,
      source: 'country',
    });
    expect(resolveHijriOffset({ ...base, day: '2027-03-09' }).offset).toBe(-1);
    expect(resolveHijriOffset({ ...base, day: '2027-03-10' })).toMatchObject({
      offset: 0,
      source: 'country',
    });
  });

  it('only the device country counts; no country means no override', () => {
    expect(resolveHijriOffset({ ...base, country: 'PK', day: '2027-02-20' }).offset).toBe(1);
    expect(resolveHijriOffset({ ...base, country: 'IN', day: '2027-02-20' })).toMatchObject({
      offset: 0,
      source: 'none',
    });
    expect(resolveHijriOffset({ ...base, country: null, day: '2027-02-20' }).source).toBe('none');
  });

  it("the user's own choice wins, even 0", () => {
    expect(
      resolveHijriOffset({ ...base, manual: true, userOffset: 0, day: '2027-02-20' })
    ).toMatchObject({ offset: 0, source: 'manual' });
    expect(
      resolveHijriOffset({ ...base, manual: true, userOffset: 1, day: '2027-02-20' }).offset
    ).toBe(1);
  });

  it('a record out of range is clamped, never applied as is', () => {
    expect(
      resolveHijriOffset({ ...base, records: [rec('BD', '2027-01-01', 3)], day: '2027-02-01' })
        .offset
    ).toBe(0);
  });

  it('devices from before T4.1: a non-zero offset counts as chosen, 0 follows the country', () => {
    store.setItem(MOON_SIGHTING_KEY, JSON.stringify(RECORDS));
    store.setItem(HIJRI_COUNTRY_KEY, 'BD');
    const day = noon('2027-02-20');
    store.setItem('bustandeen_hijri_offset', '1');
    expect(getHijriOffsetSource(day)).toMatchObject({ offset: 1, source: 'manual' });
    store.setItem('bustandeen_hijri_offset', '0');
    expect(getHijriOffsetSource(day)).toMatchObject({ offset: -1, source: 'country' });
  });

  it('Settings: picking an offset is manual, Automatic follows the record', () => {
    store.setItem(MOON_SIGHTING_KEY, JSON.stringify(RECORDS));
    store.setItem(HIJRI_COUNTRY_KEY, 'BD');
    const day = noon('2027-02-20');
    setHijriAdjustment(0);
    expect(getHijriAdjustment(day)).toBe(0);
    setHijriAutomatic();
    expect(getHijriAdjustment(day)).toBe(-1);
    syncHijriFromServer(1, true);
    expect(getHijriAdjustment(day)).toBe(1);
    syncHijriFromServer(0, false);
    expect(getHijriAdjustment(day)).toBe(-1);
  });

  it('the Hijri date moves with the record: Ramadan 1448 starts a day later in BD', () => {
    store.setItem(MOON_SIGHTING_KEY, JSON.stringify(RECORDS));
    store.setItem(HIJRI_COUNTRY_KEY, 'BD');
    // Umm al-Qura: 1 Ramadan 1448 = Mon 8 Feb 2027 (Shaʿbān has 30 days); with BD's -1 it is still 30 Shaʿbān
    expect(getHijriDate(noon('2027-02-08'))).toMatchObject({ day: 30, month: 8, year: 1448 });
    expect(getHijriDate(noon('2027-02-09'))).toMatchObject({ day: 1, month: 9, year: 1448 });
    store.setItem(HIJRI_COUNTRY_KEY, 'SA');
    expect(getHijriDate(noon('2027-02-08'))).toMatchObject({ day: 1, month: 9, year: 1448 });
  });

  it('a broken cache never breaks the date', () => {
    store.setItem(MOON_SIGHTING_KEY, '{not json');
    store.setItem(HIJRI_COUNTRY_KEY, 'BD');
    expect(getHijriAdjustment(noon('2027-02-20'))).toBe(0);
  });
});

describe('formatHijriDate', () => {
  const h = { day: 1, month: 10, year: 1447, monthName: 'Shawwāl', weekday: 5 };

  it('English', async () => {
    await i18n.changeLanguage('en');
    expect(formatHijriDate(h)).toBe(
      `1 ${i18n.t('hijriMonths.9')} 1447 ${i18n.t('hijriMonths.ah')}`
    );
  });

  it('Bangla uses Bangla digits', async () => {
    await i18n.changeLanguage('bn');
    const out = formatHijriDate({ ...h, day: 14 });
    expect(out).toContain('১৪');
    expect(out).toContain('১৪৪৭');
    expect(out).not.toMatch(/[0-9]/);
  });
});

describe('Maghrib-aware "today"', () => {
  it('isPostMaghrib is false without a location', () => {
    expect(isPostMaghrib(noon('2026-03-19'))).toBe(false);
  });

  it('isPostMaghrib is false for a corrupt location', () => {
    store.setItem('bustandeen_location', '{bad');
    expect(isPostMaghrib(noon('2026-03-19'))).toBe(false);
  });

  it('isPostMaghrib flips exactly at Maghrib', () => {
    store.setItem('bustandeen_location', DHAKA);
    const maghrib = getMaghribTime(noon('2026-03-19'))!;
    expect(isPostMaghrib(new Date(maghrib.getTime() - 60_000))).toBe(false);
    expect(isPostMaghrib(maghrib)).toBe(true);
  });

  it('getHijriToday advances at Maghrib: the evening of 30 Ramaḍān is already Eid', () => {
    store.setItem('bustandeen_location', DHAKA);
    const maghrib = getMaghribTime(noon('2026-03-19'))!;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(maghrib.getTime() - 60_000));
    expect(getHijriToday()).toMatchObject({ day: 30, month: 9 });
    vi.setSystemTime(new Date(maghrib.getTime() + 60_000));
    expect(getHijriToday()).toMatchObject({ day: 1, month: 10 });
  });

  it('isFriday: Thursday after Maghrib is the night of Jumuʿah', () => {
    store.setItem('bustandeen_location', DHAKA);
    const maghrib = getMaghribTime(noon('2026-03-19'))!; // Thursday
    vi.useFakeTimers();
    vi.setSystemTime(noon('2026-03-19'));
    expect(isFriday()).toBe(false);
    vi.setSystemTime(new Date(maghrib.getTime() + 60_000));
    expect(isFriday()).toBe(true);
    vi.setSystemTime(noon('2026-03-20'));
    expect(isFriday()).toBe(true);
  });

  it('isFriday without a location is the civil weekday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T23:00:00'));
    expect(isFriday()).toBe(false);
  });
});

describe('getTodaySpecialDays', () => {
  it.each<[string, string[]]>([
    ['2026-03-20', ['friday', 'eid_fitr']], // 1 Shawwāl, Friday
    ['2026-05-26', ['arafah']], // 9 Dhul Ḥijjah, Tuesday
    ['2026-05-27', ['eid_adha']], // 10 Dhul Ḥijjah, Wednesday
    ['2026-05-25', ['fast_mon_thu', 'dhul_hijjah_first10']], // 8 Dhul Ḥijjah, Monday
    ['2026-06-16', ['islamic_new_year']], // 1 Muḥarram, Tuesday
    ['2026-06-24', ['ashura']], // 9 Muḥarram, Wednesday
    ['2026-06-25', ['fast_mon_thu', 'ashura']], // 10 Muḥarram, Thursday
    ['2026-08-26', ['ayyam_al_bid']], // 13 Rabīʿ al-Awwal, Wednesday
  ])('%s → %j', (iso, expected) => {
    expect(ids(noon(iso))).toEqual(expected);
  });

  it('marks Laylat al-Qadr only on the odd nights of the last ten', () => {
    // 21 Ramaḍān 1447 = Tue 10 Mar 2026; 22 = Wed; 27 = Mon 16 Mar.
    expect(ids(noon('2026-03-10'))).toContain('laylat_qadr');
    expect(ids(noon('2026-03-11'))).not.toContain('laylat_qadr');
    expect(ids(noon('2026-03-16'))).toContain('laylat_qadr');
    // 19 Ramaḍān (odd, but before the last ten)
    expect(ids(noon('2026-03-08'))).not.toContain('laylat_qadr');
  });

  it("marks 14 and 15 Sha'bān (Laylat al-Barāʾah)", () => {
    // 14 Sha'bān 1448 = Fri 22 Jan 2027 (29 Sha'bān = 6 Feb 2027).
    const h = getHijriDate(noon('2027-01-22'))!;
    expect({ d: h.day, m: h.month }).toEqual({ d: 14, m: 8 });
    expect(ids(noon('2027-01-21'))).not.toContain('shab_e_barat');
    expect(ids(noon('2027-01-22'))).toContain('shab_e_barat');
    expect(ids(noon('2027-01-23'))).toContain('shab_e_barat');
    expect(ids(noon('2027-01-24'))).not.toContain('shab_e_barat');
  });

  it('has an info entry for every id it can return', () => {
    const known = new Set(SPECIAL_DAYS.map((d) => d.id));
    for (const id of [
      'friday',
      'fast_mon_thu',
      'ayyam_al_bid',
      'islamic_new_year',
      'ashura',
      'shab_e_barat',
      'laylat_qadr',
      'eid_fitr',
      'dhul_hijjah_first10',
      'arafah',
      'eid_adha',
    ]) {
      expect(known.has(id), id).toBe(true);
    }
  });

  it('without a date, uses the Maghrib-shifted Islamic day', () => {
    store.setItem('bustandeen_location', DHAKA);
    const maghrib = getMaghribTime(noon('2026-03-19'))!;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(maghrib.getTime() + 60_000)); // Thu evening, 30 Ramaḍān
    expect(ids()).toEqual(['friday', 'eid_fitr']);
  });

  it('still returns weekly days when the Hijri date is unavailable', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new RangeError('no islamic-umalqura');
    });
    expect(ids(noon('2026-03-20'))).toEqual(['friday']);
    vi.restoreAllMocks();
  });
});

describe('special-day references', () => {
  // Evidence (Quran / graded hadith) must link to quran.com or sunnah.com. A
  // scholarly discussion is allowed elsewhere only when labelled 'Reference'.
  it('every evidence reference links to quran.com or sunnah.com', () => {
    for (const day of SPECIAL_DAYS) {
      for (const ref of day.references) {
        expect(ref.text, day.id).toBeTruthy();
        expect(ref.url, day.id).toMatch(/^https:\/\//);
        if (ref.grade === 'Reference') continue;
        expect(ref.url, day.id).toMatch(/^https:\/\/(quran\.com|sunnah\.com)\//);
      }
    }
  });
});
