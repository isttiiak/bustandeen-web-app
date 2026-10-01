import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DISLIKED_INFO,
  FASTING_SUNNAH,
  OBLIGATORY_META,
  PROHIBITED_INFO,
  VOLUNTARY_BY_ID,
  VOLUNTARY_META,
  getDayRuling,
  type FastingRef,
} from './fastingRules.js';
import type { HijriDate } from './islamicCalendar.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit T2.1. The rules getDayRuling encodes (sources are in fastingRules.ts):
// - Ramaḍān is logged only by the Ramadan tracker.
// - Fasting is ḥarām on 1 Shawwāl, 10 Dhul Ḥijjah and the days of Tashrīq
//   (11-13 Dhul Ḥijjah), so logging is blocked.
// - Recommended: ʿArafah (9 Dhul Ḥijjah), Tāsūʿāʾ/ʿĀshūrāʾ (9/10 Muḥarram),
//   al-Ayyām al-Bīḍ (13-15), the first 8 of Dhul Ḥijjah, six of Shawwāl (from
//   2 Shawwāl), the rest of Muḥarram, Shaʿbān up to the 15th, Mondays and
//   Thursdays.
// - Cautions: 30 Shaʿbān (day of doubt), Friday or Saturday singled out.

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// Weekdays of a neutral week (no Hijri effect, since the Hijri date is overridden).
const MON = new Date('2026-03-16T12:00:00');
const TUE = new Date('2026-03-17T12:00:00');
const WED = new Date('2026-03-18T12:00:00');
const THU = new Date('2026-03-19T12:00:00');
const FRI = new Date('2026-03-20T12:00:00');
const SAT = new Date('2026-03-21T12:00:00');
const SUN = new Date('2026-03-22T12:00:00');

const hijri = (day: number, month: number, year = 1447): HijriDate => ({
  day,
  month,
  year,
  monthName: '',
  weekday: 2,
});

const rec = (date: Date, h: HijriDate | null) => getDayRuling(date, h).recommended.map((m) => m.id);
const cautions = (date: Date, h: HijriDate | null) =>
  getDayRuling(date, h).cautions.map((c) => c.id);

describe('getDayRuling: ḥarām days block logging', () => {
  it.each<[string, HijriDate, string]>([
    ['Eid al-Fiṭr', hijri(1, 10), 'eid_fitr'],
    ['Eid al-Aḍḥā', hijri(10, 12), 'eid_adha'],
    ['11 Dhul Ḥijjah', hijri(11, 12), 'tashriq'],
    ['12 Dhul Ḥijjah', hijri(12, 12), 'tashriq'],
    ['13 Dhul Ḥijjah', hijri(13, 12), 'tashriq'],
  ])('%s', (_label, h, id) => {
    const r = getDayRuling(MON, h);
    expect(r.level).toBe('haram');
    expect(r.haram?.id).toBe(id);
    expect(r.haram?.title).toBeTruthy();
    expect(r.haram?.refs.length).toBeGreaterThan(0);
    // Nothing is recommended on a forbidden day, not even Monday or Ayyām al-Bīḍ.
    expect(r.recommended).toEqual([]);
    expect(r.cautions).toEqual([]);
  });

  it('the Tashrīq title names the day', () => {
    expect(getDayRuling(TUE, hijri(12, 12)).haram?.title).toContain('12');
  });

  it('14 Dhul Ḥijjah is no longer Tashrīq (and is Ayyām al-Bīḍ)', () => {
    const r = getDayRuling(TUE, hijri(14, 12));
    expect(r.level).toBe('normal');
    expect(r.recommended.map((m) => m.id)).toEqual(['ayyam_bid']);
  });
});

describe('getDayRuling: Ramaḍān defers to the Ramadan tracker', () => {
  it.each([1, 15, 27, 30])('%i Ramaḍān', (day) => {
    const r = getDayRuling(MON, hijri(day, 9));
    expect(r.level).toBe('ramadan');
    expect(r.recommended).toEqual([]);
    expect(r.cautions).toEqual([]);
  });
});

describe('getDayRuling: recommended days', () => {
  it.each<[string, HijriDate, string[]]>([
    ['9 Dhul Ḥijjah (ʿArafah)', hijri(9, 12), ['arafah']],
    ['1 Dhul Ḥijjah', hijri(1, 12), ['dhul_hijjah']],
    ['8 Dhul Ḥijjah', hijri(8, 12), ['dhul_hijjah']],
    ['9 Muḥarram (Tāsūʿāʾ)', hijri(9, 1), ['ashura']],
    ['10 Muḥarram (ʿĀshūrāʾ)', hijri(10, 1), ['ashura']],
    ['1 Muḥarram', hijri(1, 1), ['muharram']],
    ['11 Muḥarram', hijri(11, 1), ['muharram']],
    ['13 Muḥarram', hijri(13, 1), ['ayyam_bid', 'muharram']],
    ['13 Rajab', hijri(13, 7), ['ayyam_bid']],
    ['15 Ṣafar', hijri(15, 2), ['ayyam_bid']],
    ['16 Ṣafar', hijri(16, 2), []],
    ['12 Rajab', hijri(12, 7), []],
    ['2 Shawwāl', hijri(2, 10), ['shawwal_six']],
    ['30 Shawwāl', hijri(30, 10), ['shawwal_six']],
    ['14 Shawwāl', hijri(14, 10), ['ayyam_bid', 'shawwal_six']],
    ['1 Shaʿbān', hijri(1, 8), ['shaban']],
    ['15 Shaʿbān', hijri(15, 8), ['ayyam_bid', 'shaban']],
    ['16 Shaʿbān', hijri(16, 8), []],
    ['5 Rabīʿ al-Awwal', hijri(5, 3), []],
  ])('%s on a Tuesday → %j', (_label, h, expected) => {
    expect(rec(TUE, h)).toEqual(expected);
  });

  it('Monday and Thursday add mon_thu after the Hijri-specific fasts', () => {
    expect(rec(MON, hijri(5, 3))).toEqual(['mon_thu']);
    expect(rec(THU, hijri(5, 3))).toEqual(['mon_thu']);
    expect(rec(MON, hijri(9, 12))).toEqual(['arafah', 'mon_thu']);
    expect(rec(THU, hijri(10, 1))).toEqual(['ashura', 'mon_thu']);
  });

  it.each([TUE, WED, SUN])('no mon_thu on %s', (d) => {
    expect(rec(d, hijri(5, 3))).toEqual([]);
  });
});

describe('getDayRuling: cautions', () => {
  it('30 Shaʿbān is the day of doubt', () => {
    expect(cautions(TUE, hijri(30, 8))).toEqual(['day_of_doubt']);
    expect(cautions(TUE, hijri(29, 8))).toEqual([]);
  });

  it('Friday and Saturday alone get a caution; other days do not', () => {
    expect(cautions(FRI, hijri(5, 3))).toEqual(['friday_alone']);
    expect(cautions(SAT, hijri(5, 3))).toEqual(['saturday_alone']);
    for (const d of [SUN, MON, TUE, WED, THU]) expect(cautions(d, hijri(5, 3))).toEqual([]);
  });

  it('ʿArafah on a Friday is still recommended, with the Friday caution alongside', () => {
    const r = getDayRuling(FRI, hijri(9, 12));
    expect(r.level).toBe('normal');
    expect(r.recommended.map((m) => m.id)).toEqual(['arafah']);
    expect(r.cautions.map((c) => c.id)).toEqual(['friday_alone']);
  });

  it('day of doubt on a Saturday carries both cautions', () => {
    expect(cautions(SAT, hijri(30, 8))).toEqual(['day_of_doubt', 'saturday_alone']);
  });

  it('every caution carries its info card', () => {
    const r = getDayRuling(FRI, hijri(30, 8));
    for (const c of r.cautions) expect(c.info.id).toBe(c.id);
  });
});

describe('getDayRuling: without a Hijri date', () => {
  it('still applies the weekday rules', () => {
    const r = getDayRuling(MON, null);
    expect(r.level).toBe('normal');
    expect(r.hijriLabel).toBeNull();
    expect(r.recommended.map((m) => m.id)).toEqual(['mon_thu']);
    expect(getDayRuling(FRI, null).cautions.map((c) => c.id)).toEqual(['friday_alone']);
  });
});

describe('getDayRuling: real calendar dates (Umm al-Qura, no override)', () => {
  it.each<[string, string, string]>([
    ['2026-03-20', 'haram', 'Eid al-Fiṭr 1447'],
    ['2026-05-27', 'haram', 'Eid al-Aḍḥā 1447'],
    ['2026-05-28', 'haram', '11 Dhul Ḥijjah'],
    ['2026-05-30', 'haram', '13 Dhul Ḥijjah'],
    ['2026-03-01', 'ramadan', '12 Ramaḍān 1447'],
    ['2026-05-26', 'normal', 'ʿArafah 1447'],
  ])('%s is %s (%s)', (iso, level) => {
    const r = getDayRuling(new Date(`${iso}T12:00:00`));
    expect(r.level).toBe(level);
    expect(r.hijriLabel).toBeTruthy();
  });

  it('the moon-sighting offset moves the ruling: with -1, 20 Mar 2026 is 30 Ramaḍān', () => {
    localStorage.setItem('bustandeen_hijri_offset', '-1');
    expect(getDayRuling(new Date('2026-03-20T12:00:00')).level).toBe('ramadan');
    expect(getDayRuling(new Date('2026-03-21T12:00:00')).haram?.id).toBe('eid_fitr');
  });
});

describe('reference data', () => {
  const allRefs: [string, FastingRef][] = [
    ...OBLIGATORY_META.flatMap((m) => m.refs.map((r) => [m.id, r] as [string, FastingRef])),
    ...VOLUNTARY_META.map((m) => [m.id, m.ref] as [string, FastingRef]),
    ...PROHIBITED_INFO.flatMap((m) => m.refs.map((r) => [m.id, r] as [string, FastingRef])),
    ...DISLIKED_INFO.flatMap((m) => m.refs.map((r) => [m.id, r] as [string, FastingRef])),
    ...FASTING_SUNNAH.map((r) => ['sunnah', r] as [string, FastingRef]),
  ];

  it.each(allRefs)('%s: cites a source with a quran.com / sunnah.com link', (_id, ref) => {
    expect(ref.text).toBeTruthy();
    expect(ref.source).toBeTruthy();
    expect(ref.url).toMatch(/^https:\/\/(quran\.com|sunnah\.com)\//);
  });

  it('VOLUNTARY_BY_ID indexes every voluntary kind', () => {
    for (const m of VOLUNTARY_META) expect(VOLUNTARY_BY_ID[m.id]).toBe(m);
  });
});
