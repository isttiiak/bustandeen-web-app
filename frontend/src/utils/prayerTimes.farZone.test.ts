import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as adhan from 'adhan';
import {
  calcPrayerTimes,
  calcPrayerTimesForDay,
  getCurrentAndNextPrayer,
  getMandatoryWidget,
  type PrayerKey,
} from './prayerTimes.js';
import { loadZoneLookup, placeToday, resetZoneLookupForTests } from './placeClock.js';
import { getAsrMadhab, getCalcMethod } from './salatPrefs.js';
import {
  applyTimeAdjustments,
  countryFromTimeZone,
  countryTimeAdjustments,
} from './countryDefaults.js';
import { getTrackingDay } from './trackingDay.js';
import { getHijriDate, getHijriToday, isFriday } from './islamicCalendar.js';
import { suggestStartAfter } from './musafir.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Far-zone report, 2026-10-12: a phone on UK time with Dhaka as the saved
// location showed "Isha, ends in 4h 16m" after Fajr had begun in Dhaka.
// Every answer the app gives about "now" (current prayer, its end, the next
// prayer, the tracking day, the Islamic day, Friday) must hold wherever the
// phone's clock is set, for any saved place on Earth. This suite checks the
// app against a ground truth built from each place's real IANA zone, for a
// grid of phone zones x places, every 30 minutes over two days in three
// seasons. The ground truth only uses adhan for exact calendar days of the
// place and orders the resulting instants, so it cannot share the app's bugs.

interface Place {
  name: string;
  lat: number;
  lng: number;
  tz: string;
}

const PLACES: Place[] = [
  { name: 'Dhaka', lat: 23.81, lng: 90.41, tz: 'Asia/Dhaka' },
  { name: 'Los Angeles', lat: 34.05, lng: -118.24, tz: 'America/Los_Angeles' },
  { name: 'London', lat: 51.51, lng: -0.13, tz: 'Europe/London' },
  { name: 'Auckland', lat: -36.85, lng: 174.76, tz: 'Pacific/Auckland' },
  { name: 'Makkah', lat: 21.42, lng: 39.83, tz: 'Asia/Riyadh' },
  // Tibet runs on Beijing time: Lhasa's clock is ~2 h ahead of the sun.
  { name: 'Lhasa', lat: 29.65, lng: 91.1, tz: 'Asia/Shanghai' },
  { name: 'Madrid', lat: 40.42, lng: -3.7, tz: 'Europe/Madrid' },
  { name: 'Toronto', lat: 43.65, lng: -79.38, tz: 'America/Toronto' },
  { name: 'Jakarta', lat: -6.21, lng: 106.85, tz: 'Asia/Jakarta' },
  { name: 'Honolulu', lat: 21.31, lng: -157.86, tz: 'Pacific/Honolulu' },
  // West of the date line by longitude, east of it by clock (UTC+13).
  { name: 'Apia', lat: -13.83, lng: -171.76, tz: 'Pacific/Apia' },
];

const PHONE_ZONES = [
  'Asia/Dhaka',
  'Europe/London',
  'America/Los_Angeles',
  'Pacific/Auckland',
  'Asia/Kolkata',
  'America/New_York',
  'Asia/Tokyo',
  'Pacific/Tongatapu',
];

// Two days from each start, every 30 minutes (UTC instants).
const WINDOWS = ['2026-10-11T00:00:00Z', '2026-06-20T00:00:00Z', '2026-03-28T00:00:00Z'];
const STEP_MIN = 50;
const MIN = 60_000;
const DAY = 86_400_000;
// Each case runs ~150 instants x several adhan days; under a full parallel run
// the date-line ones pass 5 s (vitest's default).
const CASE_TIMEOUT = 30_000;

type YMD = string;

const partsFmt = new Map<string, Intl.DateTimeFormat>();
function placeYmd(instant: Date, tz: string): YMD {
  let f = partsFmt.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    partsFmt.set(tz, f);
  }
  return f.format(instant);
}

function addDays(ymd: YMD, n: number): YMD {
  return new Date(Date.parse(`${ymd}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

/** adhan for one adhan day (adhan reads y/m/d off local getters). */
const adhanCache = new Map<string, adhan.PrayerTimes>();
function adhanDay(p: Place, ymd: YMD): adhan.PrayerTimes {
  const key = `${process.env.TZ}|${getCalcMethod()}|${getAsrMadhab()}|${p.name}|${ymd}`;
  let t = adhanCache.get(key);
  if (!t) {
    const [y, m, d] = ymd.split('-').map(Number);
    // The country's calibration to its official timetable (R0a/R0c), from
    // the place's real zone, as the app does.
    const params = applyTimeAdjustments(
      adhan.CalculationMethod[getCalcMethod()](),
      countryTimeAdjustments(countryFromTimeZone(p.tz), getCalcMethod())
    );
    if (getAsrMadhab() === 'hanafi') params.madhab = adhan.Madhab.Hanafi;
    t = new adhan.PrayerTimes(new adhan.Coordinates(p.lat, p.lng), new Date(y, m - 1, d), params);
    adhanCache.set(key, t);
  }
  return t;
}

/**
 * The place's prayer day for its civil date `ymd`: the adhan day whose Dhuhr
 * falls on that date at the place. adhan's own date is the UTC day of solar
 * noon, which is a different civil date where the clock runs far from the sun
 * (Apia is UTC+13 at longitude -172).
 */
function exact(p: Place, ymd: YMD): adhan.PrayerTimes {
  for (const n of [0, -1, 1]) {
    const t = adhanDay(p, addDays(ymd, n));
    if (placeYmd(t.dhuhr, p.tz) === ymd) return t;
  }
  throw new Error(`no prayer day for ${p.name} ${ymd}`);
}

interface Event {
  at: number;
  kind: PrayerKey | 'asrEnd';
  day: YMD;
}

function eventsAround(p: Place, now: Date): Event[] {
  const d = placeYmd(now, p.tz);
  const out: Event[] = [];
  for (const day of [addDays(d, -1), d, addDays(d, 1)]) {
    const t = exact(p, day);
    const sunset = (t as unknown as { sunset?: Date }).sunset ?? t.maghrib;
    out.push(
      { at: t.fajr.getTime(), kind: 'fajr', day },
      { at: t.sunrise.getTime(), kind: 'sunrise', day },
      { at: t.dhuhr.getTime(), kind: 'dhuhr', day },
      { at: t.asr.getTime(), kind: 'asr', day },
      { at: sunset.getTime() - 17 * MIN, kind: 'asrEnd', day },
      { at: t.maghrib.getTime(), kind: 'maghrib', day },
      { at: t.isha.getTime(), kind: 'isha', day }
    );
  }
  return out.sort((a, b) => a.at - b.at);
}

function truth(p: Place, now: Date) {
  const ev = eventsAround(p, now);
  const t = now.getTime();
  const last = [...ev].reverse().find((e) => e.at <= t)!;
  const isFard = (e: Event) => e.kind !== 'sunrise' && e.kind !== 'asrEnd';
  const nextFard = ev.find((e) => e.at > t && isFard(e))!;
  // Far north in summer the high-latitude rule can put two times on the same
  // instant (London, June: ʿIshāʾ = Fajr = the middle of the night); either
  // name is then right.
  const tied = (a: Event) => (e: Event) => Math.abs(e.at - a.at) < MIN;
  const nextKinds = ev.filter((e) => isFard(e) && tied(nextFard)(e)).map((e) => e.kind);
  const currentKinds = ev.filter(tied(last)).map((e) => (isFard(e) ? (e.kind as PrayerKey) : null));
  const lastFajr = [...ev].reverse().find((e) => e.kind === 'fajr' && e.at <= t)!;
  const lastMaghrib = [...ev].reverse().find((e) => e.kind === 'maghrib' && e.at <= t)!;
  // Answers right at a boundary may differ by the app's +-24 h approximations
  // of yesterday's / tomorrow's times; skip the few minutes around each event.
  const nearest = Math.min(...ev.map((e) => Math.abs(e.at - t)));
  // The Salat page's "current" (getCurrentAndNextPrayer): the last of the
  // six times that has begun; the sun-setting gap does not end ʿAṣr there.
  const lastOfSix = [...ev].reverse().find((e) => e.at <= t && e.kind !== 'asrEnd')!;
  const pageCurrent = ev
    .filter((e) => e.kind !== 'asrEnd' && tied(lastOfSix)(e))
    .map((e) => e.kind as PrayerKey);
  return {
    pageCurrent,
    current: currentKinds,
    next: nextFard,
    nextKinds,
    trackingDay: lastFajr.day,
    islamicDay: addDays(lastMaghrib.day, 1),
    nearBoundary: nearest < 5 * MIN,
  };
}

let prevTz: string | undefined;
beforeAll(() => {
  prevTz = process.env.TZ;
});
afterAll(() => {
  process.env.TZ = prevTz;
});
let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function hijriKey(h: { year: number; month: number; day: number } | null) {
  return h ? `${h.year}-${h.month}-${h.day}` : 'null';
}

/** Every answer about "now", checked against the truth; returns what is wrong. */
function check(zone: string, place: Place): string[] {
  process.env.TZ = zone;
  store.setItem(
    'bustandeen_location',
    JSON.stringify({ latitude: place.lat, longitude: place.lng, name: place.name })
  );
  const problems: string[] = [];
  for (const start of WINDOWS) {
    for (let m = 0; m < 2 * 24 * 60; m += STEP_MIN) {
      const now = new Date(Date.parse(start) + m * MIN);
      const want = truth(place, now);
      const at = `${now.toISOString()} (${placeYmd(now, place.tz)} at ${place.name})`;

      // Home arch widget and Prayer Times page: times of "now".
      if (!want.nearBoundary) {
        const w = getMandatoryWidget(calcPrayerTimes(place.lat, place.lng, now), now);
        if (!want.current.includes(w.currentMandatory))
          problems.push(`${at}: current ${w.currentMandatory}, want ${want.current.join('/')}`);
        if (
          !want.nextKinds.includes(w.nextMandatory) ||
          Math.abs(w.nextMandatoryTime.getTime() - want.next.at) > 10 * MIN
        )
          problems.push(
            `${at}: next ${w.nextMandatory} ${w.nextMandatoryTime.toISOString()}, want ${want.next.kind} ${new Date(want.next.at).toISOString()}`
          );
      }

      const day = getTrackingDay(now);
      if (day !== want.trackingDay)
        problems.push(`${at}: tracking day ${day}, want ${want.trackingDay}`);

      // Salat page: the tracking day's own times, then "now" inside them.
      const dayTimes = calcPrayerTimesForDay(place.lat, place.lng, want.trackingDay);
      if (dayTimes.dhuhr.getTime() !== exact(place, want.trackingDay).dhuhr.getTime())
        problems.push(`${at}: day times ${dayTimes.dhuhr.toISOString()} for ${want.trackingDay}`);
      else if (!want.nearBoundary) {
        const page = getCurrentAndNextPrayer(dayTimes, now).current;
        if (!want.pageCurrent.includes(page))
          problems.push(`${at}: current on Salat page ${page}, want ${want.pageCurrent.join('/')}`);
      }

      // A fast is a calendar date at the place.
      const today = placeToday(now);
      if (today !== placeYmd(now, place.tz))
        problems.push(`${at}: fasting today ${today}, want ${placeYmd(now, place.tz)}`);

      vi.useFakeTimers();
      vi.setSystemTime(now);
      const [y, mo, d] = want.islamicDay.split('-').map(Number);
      const wantHijri = hijriKey(getHijriDate(new Date(y, mo - 1, d, 12)));
      const gotHijri = hijriKey(getHijriToday());
      if (gotHijri !== wantHijri) problems.push(`${at}: Hijri ${gotHijri}, want ${wantHijri}`);
      const wantFriday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay() === 5;
      if (isFriday() !== wantFriday)
        problems.push(`${at}: isFriday ${!wantFriday}, want ${wantFriday}`);
      vi.useRealTimers();

      // Starting Musafir now: the prayer whose time has begun is the first
      // travel prayer (see suggestStartAfter), on the tracking day.
      const begun = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).filter(
        (k) => exact(place, want.trackingDay)[k].getTime() <= now.getTime()
      );
      const wantStart = begun.length < 2 ? undefined : begun[begun.length - 2];
      const gotStart = suggestStartAfter(want.trackingDay, now);
      if (gotStart !== wantStart)
        problems.push(`${at}: Musafir starts after ${gotStart}, want ${wantStart}`);
    }
  }
  if (problems.length)
    console.warn(
      `${zone} / ${place.name}: ${problems.length}\n  ${problems.slice(0, 8).join('\n  ')}`
    );
  return problems;
}

describe('with the on-device zone map', () => {
  beforeAll(async () => {
    await loadZoneLookup();
  });
  afterAll(() => {
    resetZoneLookupForTests();
  });

  describe.each(PHONE_ZONES)('phone clock on %s', (zone) => {
    it.each(PLACES.map((p) => [p.name, p] as const))(
      'saved place %s',
      (_name, place) => {
        const problems = check(zone, place);
        expect(problems.slice(0, 12), `${problems.length} wrong answers`).toEqual([]);
      },
      CASE_TIMEOUT
    );
  });
});

// Before the zone map has loaded (the first moments after an update, or a
// first launch offline) the day comes from an estimate. A phone in the saved
// place's own zone, by far the common case, must still be exact everywhere.
describe("before the zone map has loaded: phone in the place's own zone", () => {
  beforeAll(() => {
    resetZoneLookupForTests();
  });

  it.each(PLACES.map((p) => [p.name, p] as const))(
    'saved place %s',
    (_name, place) => {
      const problems = check(place.tz, place);
      expect(problems.slice(0, 12), `${problems.length} wrong answers`).toEqual([]);
    },
    CASE_TIMEOUT
  );
});

// Far north in summer an 18° method puts ʿIshāʾ after midnight (London,
// 21 June, Karachi method: ʿIshāʾ ~00:50, Fajr ~01:15 BST). From midnight
// until that ʿIshāʾ it is still Maghrib, not "last night's ʿIshāʾ".
describe('ʿIshāʾ after midnight far north (18° method chosen)', () => {
  const NORTH: Place[] = [
    { name: 'London', lat: 51.51, lng: -0.13, tz: 'Europe/London' },
    { name: 'Edinburgh', lat: 55.95, lng: -3.19, tz: 'Europe/London' },
    { name: 'Edmonton', lat: 53.55, lng: -113.49, tz: 'America/Edmonton' },
  ];
  beforeAll(async () => {
    await loadZoneLookup();
  });
  afterAll(() => {
    resetZoneLookupForTests();
  });

  it.each(NORTH.flatMap((p) => [p.tz, 'Asia/Dhaka'].map((zone) => [p.name, zone, p] as const)))(
    '%s, phone on %s',
    (_name, zone, place) => {
      store.setItem('bustandeen_calc_method', 'Karachi');
      const problems = check(zone, place);
      expect(problems.slice(0, 12), `${problems.length} wrong answers`).toEqual([]);
    },
    CASE_TIMEOUT
  );

  it('London 00:30 BST on 21 June 2026 is Maghrib, ʿIshāʾ next', () => {
    process.env.TZ = 'Europe/London';
    store.setItem('bustandeen_calc_method', 'Karachi');
    const now = new Date('2026-06-21T00:30:00+01:00');
    const t = calcPrayerTimes(51.51, -0.13, now);
    const w = getMandatoryWidget(t, now);
    expect(w.currentMandatory).toBe('maghrib');
    expect(w.nextMandatory).toBe('isha');
    expect(w.currentMandatoryEnd!.getTime()).toBe(w.nextMandatoryTime.getTime());
    expect(getCurrentAndNextPrayer(t, now)).toMatchObject({ current: 'maghrib', next: 'isha' });
  });
});
