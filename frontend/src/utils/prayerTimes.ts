import * as adhan from 'adhan';
import { getAsrMadhab, getCalcMethod, type CalculationMethodId } from './salatPrefs.js';
import i18n from '../i18n.js';
import { addDaysYmd, foreignPlaceZone, placeYmd } from './placeClock.js';

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerTimesResult {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  sunset: Date;
}

export interface ForbiddenWindow {
  label: string;
  note: string;
  start: Date;
  end: Date;
}

export interface PrayerInfo {
  id: PrayerKey;
  name: string;
  icon: string;
  isTrackable: boolean; // sunrise is not a salat
}

export const PRAYER_META: PrayerInfo[] = [
  { id: 'fajr', name: 'Fajr', icon: '🌅', isTrackable: true },
  { id: 'sunrise', name: 'Sunrise', icon: '🌄', isTrackable: false },
  { id: 'dhuhr', name: 'Dhuhr', icon: '☀️', isTrackable: true },
  { id: 'asr', name: 'Asr', icon: '🌤️', isTrackable: true },
  { id: 'maghrib', name: 'Maghrib', icon: '🌆', isTrackable: true },
  { id: 'isha', name: 'Isha', icon: '🌙', isTrackable: true },
];

/**
 * adhan's date is the UTC day of solar noon, read off the Date with LOCAL
 * getters (getFullYear/getMonth/getDate). Two things follow:
 * - the day must come from the saved place's clock, not the phone's: a phone
 *   on London time with Dhaka saved would otherwise compute the wrong day's
 *   times for hours every night (far-zone report, 2026-10-12);
 * - where the clock runs far from the sun (Samoa: UTC+13 at longitude -172)
 *   adhan's day N holds the prayers of the civil day N+1.
 * So a civil day of the place is the adhan day whose Dhuhr falls on it there.
 */
function placeDay(
  lat: number,
  lng: number,
  ymd: string,
  compute: (day: Date) => adhan.PrayerTimes
): adhan.PrayerTimes {
  let first: adhan.PrayerTimes | null = null;
  for (const n of [0, -1, 1]) {
    const day = addDaysYmd(ymd, n);
    const [y, m, d] = day.split('-').map(Number);
    const times = compute(new Date(y, m - 1, d));
    first ??= times;
    if (placeYmd(lat, lng, times.dhuhr) === ymd) return times;
  }
  return first!;
}

function methodParams(method: CalculationMethodId = getCalcMethod()) {
  // Read per call (not cached) so a settings change takes effect on the next
  // minute tick without a reload.
  return adhan.CalculationMethod[method]();
}

function toResult(times: adhan.PrayerTimes): PrayerTimesResult {
  // sunset: adhan exposes it; fall back to maghrib if missing
  const sunset: Date = (times as unknown as { sunset?: Date }).sunset ?? times.maghrib;
  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
    sunset,
  };
}

/** Prayer times of one calendar day (YYYY-MM-DD) AT THE PLACE. */
export function calcPrayerTimesForDay(lat: number, lng: number, ymd: string): PrayerTimesResult {
  const coords = new adhan.Coordinates(lat, lng);
  return toResult(
    placeDay(lat, lng, ymd, (day) => {
      const params = methodParams();
      // ʿAṣr (and therefore the end of Ẓuhr) differs by school — see
      // utils/salatPrefs.ts. Read per call for the same reason as the method.
      if (getAsrMadhab() === 'hanafi') params.madhab = adhan.Madhab.Hanafi;
      return new adhan.PrayerTimes(coords, day, params);
    })
  );
}

/** Prayer times of the place's calendar day that contains the instant `date`. */
export function calcPrayerTimes(
  lat: number,
  lng: number,
  date: Date = new Date()
): PrayerTimesResult {
  return calcPrayerTimesForDay(lat, lng, placeYmd(lat, lng, date));
}

/**
 * Today's ʿAṣr under each school with the user's calculation method, so the
 * madhab choice (onboarding, FIQH-01) can show what it changes. `method`
 * lets a picker preview a method before it is saved. Only the
 * shadow factor differs: 1 (Shāfiʿī, Mālikī, Ḥanbalī) vs 2 (Ḥanafī).
 */
export function asrBySchool(
  lat: number,
  lng: number,
  date: Date = new Date(),
  method: CalculationMethodId = getCalcMethod()
): { standard: Date; hanafi: Date } {
  const coords = new adhan.Coordinates(lat, lng);
  const ymd = placeYmd(lat, lng, date);
  const at = (madhab: (typeof adhan.Madhab)[keyof typeof adhan.Madhab]) =>
    placeDay(lat, lng, ymd, (day) => {
      const params = methodParams(method);
      params.madhab = madhab;
      return new adhan.PrayerTimes(coords, day, params);
    }).asr;
  return { standard: at(adhan.Madhab.Shafi), hanafi: at(adhan.Madhab.Hanafi) };
}

/**
 * Start of the Istiwa' (solar zenith) forbidden window, 10 minutes before
 * Dhuhr. Duha runs until here on every screen (Home and Prayer Times), so the
 * two can never show different end times (v5.160.0).
 */
export function getIstiwaStart(times: PrayerTimesResult): Date {
  return new Date(times.dhuhr.getTime() - 10 * 60_000);
}

/**
 * Returns the three makrooh (forbidden) prayer windows for the day.
 * 1. Around sunrise: from sunrise until 20 minutes after
 * 2. Solar zenith (istiwa): from 10 minutes before Dhuhr until Dhuhr begins
 * 3. After Asr: from Asr until Maghrib
 */
export function getForbiddenWindows(times: PrayerTimesResult): ForbiddenWindow[] {
  const MIN = 60_000;
  return [
    {
      label: 'Around Sunrise',
      note: 'Do not pray at sunrise itself',
      start: times.sunrise,
      end: new Date(times.sunrise.getTime() + 20 * MIN),
    },
    {
      label: 'Solar Zenith (Istiwa)',
      note: 'Sun directly overhead — just before Dhuhr',
      start: getIstiwaStart(times),
      end: times.dhuhr,
    },
    {
      // The forbidden window is the ~17 minutes when the sun visibly descends and turns yellow.
      // This is the "time of sunset" described in the hadith — not the full period from Asr.
      // Reference: "At three times … when it is about to set." — Ṣaḥīḥ Muslim 831
      label: 'Forbidden — At Sunset',
      note: 'Prayer is forbidden during the ~17 minutes the sun is visibly setting (turning yellow and descending). This is the actual "time of sunset" mentioned in the hadith. You may perform nafl between Asr and this window. Maghrib begins shortly after sunset.',
      start: new Date(times.sunset.getTime() - 17 * MIN),
      end: times.sunset,
    },
  ];
}

/**
 * A prayer time as people at the saved place read it: on the place's own
 * clock when the phone is set to another zone (see `foreignPlaceZone`; the
 * screens label it "Dhaka time"), else on the phone's clock.
 */
export function formatTime(date: Date): string {
  const lang = (i18n.language || 'en').split('-')[0]!;
  const zone = foreignPlaceZone(date);
  return date.toLocaleTimeString(lang === 'bn' ? 'bn' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...(zone ? { timeZone: zone } : {}),
  });
}

/** English display name → `salatNames.*` locale key, for names that don't
 * carry their own `id` field (NaflWindow below). */
const SALAT_NAME_TO_KEY: Record<string, string> = {
  Fajr: 'fajr',
  Sunrise: 'sunrise',
  Dhuhr: 'dhuhr',
  Asr: 'asr',
  Maghrib: 'maghrib',
  Isha: 'isha',
  Tahajjud: 'tahajjud',
  Ishraq: 'ishraq',
  Dhuha: 'duha',
  Awabeen: 'awwabin',
};

/** Translate a salat/nafl id (or English display name, via lookup) through
 * the `salatNames.*` namespace, falling back to the given English text. */
export function translateSalatName(
  idOrName: string,
  fallback: string,
  t: (key: string, fallback: string) => string
): string {
  const key = SALAT_NAME_TO_KEY[idOrName] ?? idOrName;
  return t(`salatNames.${key}`, fallback);
}

export interface NaflWindow {
  id: string;
  name: string;
  icon: string;
  start: Date;
  end: Date;
}

/**
 * Returns the currently active nafl (voluntary) prayer window, if any.
 * Windows (non-overlapping, in daily order):
 *  1. Tahajjud — last third of night until Fajr
 *  2. Ishraq   — 20–45 min after sunrise
 *  3. Dhuha    — 45 min after sunrise until the Istiwa' window (10 min before Dhuhr)
 *  4. Awabeen  — after Maghrib until Isha
 */
export function getCurrentNaflWindow(
  times: PrayerTimesResult,
  now: Date = new Date()
): NaflWindow | null {
  const MIN = 60_000;
  const { fajr, sunrise, maghrib, isha } = times;

  // ── Tahajjud: last third of night → Fajr ───────────────────────────────────
  if (now < fajr) {
    // Early morning (after midnight, before Fajr): use last night's Tahajjud window.
    // Approximate yesterday's Isha as today's Isha −24 h (shifts <2 min/day — acceptable).
    const prevIsha = new Date(isha.getTime() - 86_400_000);
    const nightDuration = fajr.getTime() - prevIsha.getTime();
    const tahajjudStart = new Date(prevIsha.getTime() + (2 / 3) * nightDuration);
    if (now >= tahajjudStart) {
      return { id: 'tahajjud', name: 'Tahajjud', icon: '🌙', start: tahajjudStart, end: fajr };
    }
  } else {
    // After Fajr: check tonight's upcoming Tahajjud (starts after tonight's Isha)
    const nextDayFajr = new Date(fajr.getTime() + 86_400_000);
    const nightDuration = nextDayFajr.getTime() - isha.getTime();
    const tahajjudStart = new Date(isha.getTime() + (2 / 3) * nightDuration);
    if (now >= tahajjudStart) {
      return {
        id: 'tahajjud',
        name: 'Tahajjud',
        icon: '🌙',
        start: tahajjudStart,
        end: nextDayFajr,
      };
    }
  }

  // Ishraq: 20–45 min after sunrise
  const ishraakStart = new Date(sunrise.getTime() + 20 * MIN);
  const ishraakEnd = new Date(sunrise.getTime() + 45 * MIN);
  if (now >= ishraakStart && now < ishraakEnd) {
    return { id: 'ishraq', name: 'Ishraq', icon: '🌅', start: ishraakStart, end: ishraakEnd };
  }

  // Dhuha: 45 min after sunrise → start of the Istiwa' forbidden window
  const dhuhaStart = new Date(sunrise.getTime() + 45 * MIN);
  const dhuhaEnd = getIstiwaStart(times);
  if (now >= dhuhaStart && now < dhuhaEnd) {
    return { id: 'duha', name: 'Dhuha', icon: '☀️', start: dhuhaStart, end: dhuhaEnd };
  }

  // Awabeen: 5 min after Maghrib → Isha
  const awabeenStart = new Date(maghrib.getTime() + 5 * MIN);
  if (now >= awabeenStart && now < isha) {
    return { id: 'awwabin', name: 'Awabeen', icon: '🌆', start: awabeenStart, end: isha };
  }

  return null;
}

// ── Mandatory prayer widget helpers ─────────────────────────────────────────

/** End time of each mandatory prayer period */
export function getPrayerEndTime(prayer: PrayerKey, times: PrayerTimesResult): Date {
  const MIN = 60_000;
  switch (prayer) {
    case 'fajr':
      return times.sunrise;
    case 'dhuhr':
      return times.asr;
    case 'asr':
      return new Date(times.sunset.getTime() - 17 * MIN);
    case 'maghrib':
      return times.isha;
    case 'isha': {
      const nextFajr = new Date(times.fajr.getTime() + 86_400_000);
      // Best to complete before midnight (midpoint between Isha & next Fajr)
      return new Date((times.isha.getTime() + nextFajr.getTime()) / 2);
    }
    default:
      return times.fajr;
  }
}

export interface IshaPhase {
  /** True before Islamic midnight: the preferred (ikhtiyārī) time. */
  best: boolean;
  /** Islamic midnight while `best`, else the Fajr that closes ʿIshāʾ. */
  end: Date;
}

/**
 * Where we are inside ʿIshāʾ. Its preferred time runs to the middle of the
 * night (Sahih Muslim 612a/612d, ʿAbdullāh ibn ʿAmr: "the time of ʿIshāʾ is
 * up to the middle of the night"), the midpoint between ʿIshāʾ and the next
 * Fajr, as `getPrayerEndTime('isha')` computes it; after that it is still
 * ʿIshāʾ until Fajr. Works on both sides of civil midnight: before today's
 * Fajr the night began with yesterday's ʿIshāʾ.
 */
export function getIshaPhase(times: PrayerTimesResult, now: Date): IshaPhase {
  const DAY = 86_400_000;
  const [start, fajr] =
    now < times.fajr
      ? [times.isha.getTime() - DAY, times.fajr.getTime()]
      : [times.isha.getTime(), times.fajr.getTime() + DAY];
  const midnight = (start + fajr) / 2;
  return now.getTime() < midnight
    ? { best: true, end: new Date(midnight) }
    : { best: false, end: new Date(fajr) };
}

/**
 * Before today's Fajr but also before last night's ʿIshāʾ began: still
 * Maghrib. Far north in summer ʿIshāʾ can begin after midnight (London, June,
 * with an 18° method: ʿIshāʾ 00:50, Fajr 01:15). Yesterday's ʿIshāʾ is taken
 * as today's −24 h, as elsewhere in this file (it moves ~1 min a day).
 */
function beforeLastNightsIsha(times: PrayerTimesResult, now: Date): boolean {
  return now < times.fajr && now.getTime() < times.isha.getTime() - 86_400_000;
}

/** Current mandatory prayer period (null if between periods or in a forbidden window) */
function getCurrentMandatoryPeriod(times: PrayerTimesResult, now: Date): PrayerKey | null {
  if (beforeLastNightsIsha(times, now)) return 'maghrib';
  // Before today's Fajr → we are in last night's Isha period (valid until Fajr)
  if (now < times.fajr) return 'isha';
  const asrEnd = getPrayerEndTime('asr', times);
  if (now >= times.fajr && now < times.sunrise) return 'fajr';
  if (now >= times.dhuhr && now < times.asr) return 'dhuhr';
  if (now >= times.asr && now < asrEnd) return 'asr';
  if (now >= times.maghrib && now < times.isha) return 'maghrib';
  if (now >= times.isha) return 'isha';
  return null;
}

/** Next mandatory prayer (fajr/dhuhr/asr/maghrib/isha), wraps to tomorrow's fajr */
function getNextMandatoryPrayer(
  times: PrayerTimesResult,
  now: Date
): { id: PrayerKey; time: Date } {
  if (beforeLastNightsIsha(times, now)) {
    return { id: 'isha', time: new Date(times.isha.getTime() - 86_400_000) };
  }
  const ordered: { id: PrayerKey; time: Date }[] = [
    { id: 'fajr', time: times.fajr },
    { id: 'dhuhr', time: times.dhuhr },
    { id: 'asr', time: times.asr },
    { id: 'maghrib', time: times.maghrib },
    { id: 'isha', time: times.isha },
  ];
  for (const p of ordered) {
    if (now < p.time) return p;
  }
  return { id: 'fajr', time: new Date(times.fajr.getTime() + 86_400_000) };
}

export interface MandatoryWidgetData {
  forbiddenWindow: ForbiddenWindow | null;
  currentMandatory: PrayerKey | null;
  currentMandatoryEnd: Date | null;
  /** Set while the current prayer is ʿIshāʾ (see getIshaPhase). */
  ishaBest: boolean | null;
  naflWindow: NaflWindow | null;
  nextMandatory: PrayerKey;
  nextMandatoryTime: Date;
  nextHh: number;
  nextMm: number;
  nextSs: number;
}

/** All data needed by the compact prayer widget on the Home page */
export function getMandatoryWidget(
  times: PrayerTimesResult,
  now: Date = new Date()
): MandatoryWidgetData {
  const forbidden = getForbiddenWindows(times);
  const forbiddenWindow = forbidden.find((w) => now >= w.start && now < w.end) ?? null;

  const currentMandatory = getCurrentMandatoryPeriod(times, now);
  // ʿIshāʾ counts down to Islamic midnight (its preferred time), then to Fajr.
  const isha = currentMandatory === 'isha' ? getIshaPhase(times, now) : null;
  const currentMandatoryEnd = currentMandatory
    ? (isha?.end ??
      (beforeLastNightsIsha(times, now)
        ? new Date(times.isha.getTime() - 86_400_000)
        : getPrayerEndTime(currentMandatory, times)))
    : null;
  const naflWindow = getCurrentNaflWindow(times, now);

  const next = getNextMandatoryPrayer(times, now);
  const ms = Math.max(0, next.time.getTime() - now.getTime());
  const totalSec = Math.floor(ms / 1000);

  return {
    forbiddenWindow,
    currentMandatory,
    currentMandatoryEnd,
    ishaBest: isha ? isha.best : null,
    naflWindow,
    nextMandatory: next.id,
    nextMandatoryTime: next.time,
    nextHh: Math.floor(totalSec / 3600),
    nextMm: Math.floor((totalSec % 3600) / 60),
    nextSs: totalSec % 60,
  };
}

/** Returns the current prayer period and the next upcoming prayer */
export function getCurrentAndNextPrayer(times: PrayerTimesResult, now: Date = new Date()) {
  const ordered: { id: PrayerKey; time: Date }[] = [
    { id: 'fajr', time: times.fajr },
    { id: 'sunrise', time: times.sunrise },
    { id: 'dhuhr', time: times.dhuhr },
    { id: 'asr', time: times.asr },
    { id: 'maghrib', time: times.maghrib },
    { id: 'isha', time: times.isha },
  ];

  let current: PrayerKey = 'isha'; // default: after isha, still "isha time"
  let nextIdx = 0;

  for (let i = 0; i < ordered.length; i++) {
    if (now >= ordered[i].time) {
      current = ordered[i].id;
    } else {
      nextIdx = i;
      break;
    }
    if (i === ordered.length - 1) {
      // Past isha — next prayer is tomorrow's fajr
      nextIdx = -1;
    }
  }

  let next =
    nextIdx === -1
      ? { id: 'fajr' as PrayerKey, time: new Date(times.fajr.getTime() + 86400_000) }
      : ordered[nextIdx];
  if (beforeLastNightsIsha(times, now)) {
    current = 'maghrib';
    next = { id: 'isha', time: new Date(times.isha.getTime() - 86_400_000) };
  }

  // Asr's own prayer window ends ~17 min before sunset (the sun-setting
  // forbidden window) — after that point it's misleading to still call Asr
  // "current" even though Maghrib hasn't started yet.
  const inForbiddenGap = current === 'asr' && now >= getPrayerEndTime('asr', times);

  const msUntilNext = next.time.getTime() - now.getTime();
  const totalSec = Math.max(0, Math.floor(msUntilNext / 1000));
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;

  return { current, next: next.id, nextTime: next.time, hh, mm, ss, inForbiddenGap };
}
