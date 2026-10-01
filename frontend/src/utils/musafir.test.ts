import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrayerId } from '../hooks/useSalatLog.js';
import {
  FARD_RAKAT,
  JAM_PAIRS,
  MUSAFIR_DUAS,
  MUSAFIR_HISTORY_KEY,
  MUSAFIR_KEY,
  MUSAFIR_RULINGS,
  PRAYER_ORDER,
  QASR_DISTANCE_KM,
  SCHOOLS,
  defaultSchool,
  deleteMusafirJourney,
  dismissTravelHint,
  distanceKm,
  endMusafir,
  getDuasSaid,
  getMusafir,
  getMusafirHistory,
  getTravelKazaRule,
  isQasrPrayer,
  jamAllowed,
  jamPartner,
  journeyDay,
  musafirAppliesOn,
  musafirAppliesTo,
  schoolMeta,
  setDuasSaid,
  setTravelKazaRule,
  startMusafir,
  staysAsResident,
  suggestStartAfter,
  travelKazaRakat,
  travelRakat,
  updateMusafir,
  wasTravelPrayer,
  type MusafirState,
  type PastJourney,
} from './musafir.js';
import { setAsrMadhab } from './salatPrefs.js';
import { calcPrayerTimes } from './prayerTimes.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit T2.1. The rules musafir.ts encodes (sources are in the file):
// - Qaṣr: Ẓuhr, ʿAṣr, ʿIshāʾ become 2 rakʿahs; Fajr (2) and Maghrib (3) never change.
// - Jamʿ pairs are Ẓuhr+ʿAṣr and Maghrib+ʿIshāʾ; the majority allow it, the
//   Ḥanafī school does not (outside Ḥajj).
// - Travel rulings apply from the prayer after the last one prayed at home,
//   through the last prayer prayed on the road on the day of return.
// - A missed travel prayer made up while still travelling: 2. Back home: 2
//   (Ḥanafī/Mālikī) or 4 (later Shāfiʿī/Ḥanbalī), the user's choice.
// - Residency: an intended stay of 4+ days (majority) or 15+ days (Ḥanafī).

const DHAKA = { latitude: 23.81, longitude: 90.41, name: 'Dhaka' };

let store: MemoryStorage;
let events: string[];
beforeEach(() => {
  store = new MemoryStorage();
  events = [];
  vi.stubGlobal('localStorage', store);
  const target = new EventTarget();
  target.addEventListener('bustandeen-musafir-change', (e) => events.push(e.type));
  vi.stubGlobal('window', target);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const journey = (over: Partial<MusafirState> = {}): MusafirState => ({
  active: true,
  startedAt: '2026-03-10',
  school: 'majority',
  ...over,
});

describe('journey state', () => {
  it('is null when nothing is stored', () => {
    expect(getMusafir()).toBeNull();
  });

  it.each([
    ['not JSON', '{nope'],
    ['inactive', JSON.stringify({ active: false, startedAt: '2026-03-10' })],
    ['bad date', JSON.stringify({ active: true, startedAt: '10/03/2026' })],
    ['null', 'null'],
  ])('is null when the record is %s', (_l, raw) => {
    store.setItem(MUSAFIR_KEY, raw);
    expect(getMusafir()).toBeNull();
  });

  it('sanitises a hand-edited record', () => {
    store.setItem(
      MUSAFIR_KEY,
      JSON.stringify({
        active: true,
        startedAt: '2026-03-10',
        startAfter: 'tahajjud',
        destination: 'x'.repeat(100),
        plannedStay: 999.6,
        school: 'zahiri',
      })
    );
    expect(getMusafir()).toEqual({
      active: true,
      startedAt: '2026-03-10',
      startAfter: undefined,
      destination: 'x'.repeat(60),
      plannedStay: 365,
      school: 'majority',
    });
  });

  it('drops a negative stay and an empty destination', () => {
    store.setItem(
      MUSAFIR_KEY,
      JSON.stringify({ active: true, startedAt: '2026-03-10', plannedStay: -2, destination: '' })
    );
    expect(getMusafir()).toMatchObject({ plannedStay: undefined, destination: undefined });
  });

  it('startMusafir writes the journey and notifies listeners', () => {
    startMusafir({
      today: '2026-03-12',
      startAfter: 'dhuhr',
      destination: '  Chattogram  ',
      plannedStay: 3,
      school: 'hanafi',
    });
    expect(getMusafir()).toEqual({
      active: true,
      startedAt: '2026-03-12',
      startAfter: 'dhuhr',
      destination: 'Chattogram',
      plannedStay: 3,
      school: 'hanafi',
    });
    expect(events).toEqual(['bustandeen-musafir-change']);
  });

  it('startMusafir accepts an earlier start (logged after the fact) but never a future one', () => {
    startMusafir({ today: '2026-03-12', startedAt: '2026-03-09', school: 'majority' });
    expect(getMusafir()!.startedAt).toBe('2026-03-09');
    startMusafir({ today: '2026-03-12', startedAt: '2026-03-20', school: 'majority' });
    expect(getMusafir()!.startedAt).toBe('2026-03-12');
  });

  it('updateMusafir patches an active journey and ignores no journey', () => {
    updateMusafir({ destination: 'Sylhet' });
    expect(getMusafir()).toBeNull();
    startMusafir({ today: '2026-03-12', school: 'majority' });
    updateMusafir({ destination: 'Sylhet', plannedStay: 5 });
    expect(getMusafir()).toMatchObject({ destination: 'Sylhet', plannedStay: 5 });
  });

  it('endMusafir files the journey, keeps an inactive record for sync, and returns the trip', () => {
    expect(endMusafir('2026-03-15')).toBeNull();
    startMusafir({
      today: '2026-03-12',
      startAfter: 'fajr',
      destination: 'Sylhet',
      school: 'majority',
    });
    const trip = endMusafir('2026-03-15');
    expect(trip).toEqual({
      from: '2026-03-12',
      to: '2026-03-15',
      destination: 'Sylhet',
      days: 4,
      startAfter: 'fajr',
      endAfter: undefined, // no saved location: the whole return day counts
    });
    expect(getMusafir()).toBeNull();
    expect(JSON.parse(store.getItem(MUSAFIR_KEY)!)).toEqual({ active: false });
    expect(getMusafirHistory()).toEqual([trip]);
  });

  it('keeps at most 12 past journeys, newest first', () => {
    for (let i = 1; i <= 14; i++) {
      const d = `2026-01-${String(i).padStart(2, '0')}`;
      startMusafir({ today: d, school: 'majority' });
      endMusafir(d);
    }
    const history = getMusafirHistory();
    expect(history).toHaveLength(12);
    expect(history[0]!.from).toBe('2026-01-14');
    expect(history[11]!.from).toBe('2026-01-03');
  });

  it('deleteMusafirJourney removes one entry and ignores bad indexes', () => {
    const h: PastJourney[] = [
      { from: '2026-02-01', to: '2026-02-03', days: 3 },
      { from: '2026-01-01', to: '2026-01-02', days: 2 },
    ];
    store.setItem(MUSAFIR_HISTORY_KEY, JSON.stringify(h));
    deleteMusafirJourney(5);
    deleteMusafirJourney(-1);
    expect(getMusafirHistory()).toHaveLength(2);
    deleteMusafirJourney(0);
    expect(getMusafirHistory().map((j) => j.from)).toEqual(['2026-01-01']);
    expect(events).toEqual(['bustandeen-musafir-change']);
  });

  it('getMusafirHistory drops malformed entries and unknown prayer ids', () => {
    store.setItem(
      MUSAFIR_HISTORY_KEY,
      JSON.stringify([
        { from: '2026-02-01', to: '2026-02-03', days: 3, startAfter: 'witr', endAfter: 'asr' },
        { from: 'yesterday', to: '2026-02-03', days: 1 },
        null,
      ])
    );
    expect(getMusafirHistory()).toEqual([
      { from: '2026-02-01', to: '2026-02-03', days: 3, startAfter: undefined, endAfter: 'asr' },
    ]);
  });

  it.each([
    ['not an array', JSON.stringify({ from: '2026-02-01' })],
    ['not JSON', '[oops'],
  ])('getMusafirHistory is empty when storage holds %s', (_l, raw) => {
    store.setItem(MUSAFIR_HISTORY_KEY, raw);
    expect(getMusafirHistory()).toEqual([]);
  });

  it('survives blocked storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(getMusafir()).toBeNull();
    expect(() => startMusafir({ today: '2026-03-12', school: 'majority' })).not.toThrow();
    expect(getTravelKazaRule()).toBe('short');
    expect(() => setTravelKazaRule('full')).not.toThrow();
    expect(() => dismissTravelHint('2026-03-12')).not.toThrow();
    expect(() => setDuasSaid('2026-03-12', ['riding'])).not.toThrow();
    expect(getDuasSaid('2026-03-12')).toEqual([]);
  });
});

describe('journeyDay', () => {
  it.each([
    ['2026-03-10', 1],
    ['2026-03-11', 2],
    ['2026-03-31', 22],
    ['2026-04-01', 23],
    ['2026-03-09', 1], // clock skew: never below Day 1
  ])('on %s is Day %i', (today, day) => {
    expect(journeyDay(journey(), today)).toBe(day);
  });

  it('counts across a leap day', () => {
    expect(journeyDay(journey({ startedAt: '2028-02-28' }), '2028-03-01')).toBe(3);
  });
});

describe('which prayers are travel prayers', () => {
  const s = journey({ startedAt: '2026-03-10', startAfter: 'dhuhr' });

  it.each<[string, PrayerId, boolean]>([
    ['2026-03-09', 'isha', false], // before the journey
    ['2026-03-10', 'fajr', false], // prayed at home before leaving
    ['2026-03-10', 'dhuhr', false], // the last one at home
    ['2026-03-10', 'asr', true],
    ['2026-03-10', 'maghrib', true],
    ['2026-03-10', 'isha', true],
    ['2026-03-11', 'fajr', true], // every prayer after the start day
    ['2026-03-20', 'dhuhr', true],
  ])('%s %s → %s', (date, prayer, expected) => {
    expect(musafirAppliesTo(s, date, prayer)).toBe(expected);
  });

  it('without startAfter the whole start day is travel', () => {
    for (const p of PRAYER_ORDER) expect(musafirAppliesTo(journey(), '2026-03-10', p)).toBe(true);
  });

  it('no journey, no travel prayers', () => {
    expect(musafirAppliesTo(null, '2026-03-10', 'dhuhr')).toBe(false);
    expect(musafirAppliesTo({ ...s, active: false }, '2026-03-11', 'dhuhr')).toBe(false);
  });

  it('musafirAppliesOn: any travel prayer that day', () => {
    expect(musafirAppliesOn(s, '2026-03-09')).toBe(false);
    expect(musafirAppliesOn(s, '2026-03-10')).toBe(true);
    expect(musafirAppliesOn(journey({ startAfter: 'isha' }), '2026-03-10')).toBe(false);
    expect(musafirAppliesOn(null, '2026-03-10')).toBe(false);
  });
});

describe('wasTravelPrayer (recognising a travel kaza)', () => {
  const past: PastJourney[] = [
    { from: '2026-02-01', to: '2026-02-04', days: 4, startAfter: 'asr', endAfter: 'dhuhr' },
    { from: '2026-01-10', to: '2026-01-11', days: 2 }, // older record, no prayer bounds
  ];

  it.each<[string, PrayerId, boolean]>([
    ['2026-01-31', 'isha', false],
    ['2026-02-01', 'asr', false], // last prayer at home
    ['2026-02-01', 'maghrib', true],
    ['2026-02-02', 'fajr', true],
    ['2026-02-04', 'dhuhr', true], // last prayer on the road
    ['2026-02-04', 'asr', false], // home again
    ['2026-02-05', 'fajr', false],
    ['2026-01-10', 'fajr', true], // whole day counts without bounds
    ['2026-01-11', 'isha', true],
  ])('%s %s → %s', (date, prayer, expected) => {
    expect(wasTravelPrayer(null, past, date, prayer)).toBe(expected);
  });

  it('also counts the current journey', () => {
    expect(wasTravelPrayer(journey(), [], '2026-03-11', 'asr')).toBe(true);
    expect(wasTravelPrayer(journey(), [], '2026-03-09', 'asr')).toBe(false);
  });
});

describe("rak'ahs", () => {
  it.each<[PrayerId, number, number]>([
    ['fajr', 2, 2],
    ['dhuhr', 4, 2],
    ['asr', 4, 2],
    ['maghrib', 3, 3],
    ['isha', 4, 2],
  ])('%s: %i at home, %i on a journey', (p, home, travel) => {
    expect(FARD_RAKAT[p]).toBe(home);
    expect(travelRakat(p)).toBe(travel);
    expect(isQasrPrayer(p)).toBe(home === 4);
  });

  it.each<[PrayerId, boolean, 'short' | 'full', number]>([
    ['dhuhr', true, 'short', 2],
    ['dhuhr', true, 'full', 2], // still travelling: everyone agrees on 2
    ['dhuhr', false, 'short', 2], // Ḥanafī / Mālikī
    ['dhuhr', false, 'full', 4], // later Shāfiʿī / Ḥanbalī
    ['isha', false, 'full', 4],
    ['fajr', false, 'full', 2], // never shortened, so never changes
    ['maghrib', true, 'short', 3],
  ])('travel kaza of %s (travelling=%s, rule=%s) → %i', (p, travelling, rule, n) => {
    expect(travelKazaRakat(p, travelling, rule)).toBe(n);
  });

  it('the kaza rule defaults to short and round-trips', () => {
    expect(getTravelKazaRule()).toBe('short');
    setTravelKazaRule('full');
    expect(getTravelKazaRule()).toBe('full');
    expect(events).toContain('bustandeen-musafir-change');
    setTravelKazaRule('short');
    expect(getTravelKazaRule()).toBe('short');
  });
});

describe('jamʿ (joining)', () => {
  it('pairs Ẓuhr+ʿAṣr and Maghrib+ʿIshāʾ; Fajr is never joined', () => {
    expect(JAM_PAIRS).toEqual([
      { first: 'dhuhr', second: 'asr' },
      { first: 'maghrib', second: 'isha' },
    ]);
    expect(jamPartner('dhuhr')).toBe('asr');
    expect(jamPartner('asr')).toBe('dhuhr');
    expect(jamPartner('maghrib')).toBe('isha');
    expect(jamPartner('isha')).toBe('maghrib');
    expect(jamPartner('fajr')).toBeNull();
  });

  it('is allowed for the majority, not the Ḥanafī school', () => {
    expect(jamAllowed('majority')).toBe(true);
    expect(jamAllowed('hanafi')).toBe(false);
  });
});

describe('madhab thresholds', () => {
  it.each<['majority' | 'hanafi', number, number]>([
    ['majority', 4, 80],
    ['hanafi', 15, 77],
  ])('%s: resident after %i days, qaṣr from %i km', (school, days, km) => {
    expect(schoolMeta(school).residentAfterDays).toBe(days);
    expect(QASR_DISTANCE_KM[school]).toBe(km);
  });

  it.each<['majority' | 'hanafi', number | undefined, boolean]>([
    ['majority', undefined, false],
    ['majority', 3, false],
    ['majority', 4, true],
    ['hanafi', 14, false],
    ['hanafi', 15, true],
  ])('%s with a %s-day stay: resident=%s', (school, stay, resident) => {
    expect(staysAsResident(journey({ school, plannedStay: stay }))).toBe(resident);
  });

  it('schoolMeta falls back to the majority entry', () => {
    expect(schoolMeta('zahiri' as 'majority').id).toBe('majority');
    expect(SCHOOLS.map((s) => s.id)).toEqual(['majority', 'hanafi']);
  });

  it('defaultSchool follows the ʿAṣr madhab chosen in Salat settings', () => {
    setAsrMadhab('hanafi');
    expect(defaultSchool()).toBe('hanafi');
    setAsrMadhab('standard');
    expect(defaultSchool()).toBe('majority');
  });
});

describe('distanceKm', () => {
  it.each([
    ['the same point', DHAKA, DHAKA, 0, 0.001],
    ['Dhaka → Chattogram', DHAKA, { latitude: 22.3569, longitude: 91.7832 }, 214, 5],
    [
      'Makkah → Madinah',
      { latitude: 21.4225, longitude: 39.8262 },
      { latitude: 24.4672, longitude: 39.6111 },
      339,
      5,
    ],
  ])('%s ≈ %i km', (_l, a, b, km, tol) => {
    expect(Math.abs(distanceKm(a, b) - km)).toBeLessThanOrEqual(tol);
  });

  it('is symmetric', () => {
    const b = { latitude: 22.3569, longitude: 91.7832 };
    expect(distanceKm(DHAKA, b)).toBeCloseTo(distanceKm(b, DHAKA), 9);
  });
});

describe('suggestStartAfter', () => {
  it('is undefined without a location or with a corrupt one', () => {
    expect(suggestStartAfter('2026-03-12')).toBeUndefined();
    store.setItem('bustandeen_location', '{bad');
    expect(suggestStartAfter('2026-03-12')).toBeUndefined();
  });

  it('treats the running prayer as a travel prayer: the journey starts after the one before it', () => {
    store.setItem('bustandeen_location', JSON.stringify(DHAKA));
    const t = calcPrayerTimes(DHAKA.latitude, DHAKA.longitude, new Date('2026-03-12T12:00:00'));
    const after = (d: Date) => new Date(d.getTime() + 60_000);
    // Only Fajr has begun: the whole day is still ahead, no suggestion.
    expect(suggestStartAfter('2026-03-12', after(t.fajr))).toBeUndefined();
    // ʿAṣr is running (not prayed yet), so Ẓuhr was the last prayer at home.
    expect(suggestStartAfter('2026-03-12', after(t.asr))).toBe('dhuhr');
    expect(suggestStartAfter('2026-03-12', after(t.dhuhr))).toBe('fajr');
    expect(suggestStartAfter('2026-03-12', after(t.isha))).toBe('maghrib');
  });

  it('endMusafir records the last travel prayer when a location is saved', () => {
    store.setItem('bustandeen_location', JSON.stringify(DHAKA));
    startMusafir({ today: '2026-03-12', school: 'majority' });
    const t = calcPrayerTimes(DHAKA.latitude, DHAKA.longitude, new Date('2026-03-15T12:00:00'));
    vi.useFakeTimers();
    vi.setSystemTime(new Date(t.maghrib.getTime() + 60_000));
    // Home during Maghrib: ʿAṣr was the last prayer on the road.
    expect(endMusafir('2026-03-15')?.endAfter).toBe('asr');
    vi.useRealTimers();
  });
});

describe("du'a checklist", () => {
  it('remembers the ids for today only', () => {
    setDuasSaid('2026-03-12', ['riding', 'stopping']);
    expect(getDuasSaid('2026-03-12')).toEqual(['riding', 'stopping']);
    expect(getDuasSaid('2026-03-13')).toEqual([]);
  });

  it('ignores corrupt or non-string entries', () => {
    store.setItem(
      'bustandeen_musafir_duas_said',
      JSON.stringify({ date: '2026-03-12', ids: [1, 'riding'] })
    );
    expect(getDuasSaid('2026-03-12')).toEqual(['riding']);
    store.setItem('bustandeen_musafir_duas_said', '{bad');
    expect(getDuasSaid('2026-03-12')).toEqual([]);
  });

  it('dismissing the travel hint stores the day', () => {
    dismissTravelHint('2026-03-12');
    expect(store.getItem('bustandeen_musafir_hint_dismissed')).toBe('2026-03-12');
  });
});

describe('content integrity', () => {
  const evidence = /^https:\/\/(quran\.com|sunnah\.com)\//;

  it("every du'a has Arabic, a Bangla meaning and a quran.com / sunnah.com source", () => {
    const ids = new Set<string>();
    for (const d of MUSAFIR_DUAS) {
      expect(ids.has(d.id), d.id).toBe(false);
      ids.add(d.id);
      expect(d.arabic, d.id).toMatch(/[؀-ۿ]/);
      expect(d.meaningBn, d.id).toMatch(/[ঀ-৿]/);
      expect(d.url, d.id).toMatch(evidence);
      expect(d.grade, d.id).toBeTruthy();
    }
  });

  it('every ruling has Bangla text and graded evidence', () => {
    for (const r of MUSAFIR_RULINGS) {
      expect(r.titleBn, r.id).toMatch(/[ঀ-৿]/);
      expect(r.points.length, r.id).toBeGreaterThan(0);
      for (const p of r.points) expect(p.bn, r.id).toMatch(/[ঀ-৿]/);
      for (const ref of r.refs) {
        expect(ref.url, r.id).toMatch(evidence);
        expect(ref.grade, r.id).toBeTruthy();
      }
    }
  });
});
