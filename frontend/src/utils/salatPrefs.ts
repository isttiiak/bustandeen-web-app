// Salat preferences — mirrors utils/quranPrefs.ts. Plain localStorage (read
// synchronously; no zustand rehydrate race) so the salat tracker and the
// prayer-time maths can both read them on first paint.
//
// Every reference below was verified on sunnah.com.

import { TAHLIL_NAME } from './zikrLibrary.js';
import {
  FALLBACK_PRAYER_DEFAULTS,
  deviceCountry,
  prayerDefaultsForCountry,
  type CalcMethodId,
  type PrayerDefaults,
} from './countryDefaults.js';

// ─── after-ṣalāh tasbīḥ ─────────────────────────────────────────────────────

/**
 * The two authentic ways to reach a hundred after every fard prayer.
 * Both are ṣaḥīḥ; the worshipper follows whichever they habitually pray, so
 * the app must not assume one. This setting tells the tracker how many counts
 * to credit when the "tasbīḥ" tag is tapped.
 */
export type TasbihMode = 'tahlil' | 'takbir34';

export interface TasbihStep {
  /** Counter key in the zikr list — must match a CORE_ZIKR name exactly. */
  zikr: string;
  count: number;
}

export interface TasbihModeMeta {
  id: TasbihMode;
  label: string;
  summary: string;
  steps: TasbihStep[];
  source: string;
  sourceUrl: string;
  grade: string;
  virtue?: string;
}

export const TASBIH_MODES: TasbihModeMeta[] = [
  {
    id: 'tahlil',
    label: '33 · 33 · 33 + tahlīl',
    summary: 'Ninety-nine, then one tahlīl completes the hundred.',
    steps: [
      { zikr: 'SubhanAllah', count: 33 },
      { zikr: 'Alhamdulillah', count: 33 },
      { zikr: 'Allahu Akbar', count: 33 },
      { zikr: TAHLIL_NAME, count: 1 },
    ],
    source: 'Ṣaḥīḥ Muslim 597a',
    sourceUrl: 'https://sunnah.com/muslim:597',
    grade: 'Ṣaḥīḥ',
    virtue: '"His sins are forgiven even if they are like the foam of the sea."',
  },
  {
    id: 'takbir34',
    label: '33 · 33 · 34',
    summary: 'Thirty-four takbīrs complete the hundred.',
    steps: [
      { zikr: 'SubhanAllah', count: 33 },
      { zikr: 'Alhamdulillah', count: 33 },
      { zikr: 'Allahu Akbar', count: 34 },
    ],
    source: 'Ṣaḥīḥ Muslim 596a',
    sourceUrl: 'https://sunnah.com/muslim:596',
    grade: 'Ṣaḥīḥ',
    virtue: '"The repeaters of these after every prescribed prayer will never be disappointed."',
  },
];

// NOT 'bustandeen_tasbih_mode' — that key belongs to useUiStore's unrelated
// Zikr-counter countdown toggle (also called "tasbih mode"). The two used
// to collide on the same key: setting one silently corrupted the other's
// stored value (a boolean '1'/'0' doesn't match 'tahlil'/'takbir34', so
// getTasbihMode() below would silently fall back to the default the moment
// someone toggled the Zikr counter's tasbih mode on).
const TASBIH_KEY = 'bustandeen_tasbih_breakdown';
export const DEFAULT_TASBIH_MODE: TasbihMode = 'takbir34';

export function getTasbihMode(): TasbihMode {
  try {
    const v = localStorage.getItem(TASBIH_KEY);
    return v === 'takbir34' || v === 'tahlil' ? v : DEFAULT_TASBIH_MODE;
  } catch {
    return DEFAULT_TASBIH_MODE;
  }
}

export function setTasbihMode(mode: TasbihMode): void {
  try {
    localStorage.setItem(TASBIH_KEY, mode);
  } catch {
    /* private mode */
  }
}

export function tasbihModeMeta(mode: TasbihMode): TasbihModeMeta {
  return TASBIH_MODES.find((m) => m.id === mode) ?? TASBIH_MODES[0];
}

/** The dhikr deltas one tasbīḥ tag is worth, as a {name: amount} map ready for
 * useZikrStore.addCounts(). Pass sign -1 to reverse an un-tapped tag. */
export function tasbihDeltas(mode: TasbihMode, sign: 1 | -1 = 1): Record<string, number> {
  const out: Record<string, number> = {};
  for (const step of tasbihModeMeta(mode).steps) {
    out[step.zikr] = (out[step.zikr] ?? 0) + step.count * sign;
  }
  return out;
}

/** Ayat al-Kursi after every fard prayer — one recitation per tag.
 * "Whoever recites Ayat al-Kursi after every prescribed prayer, nothing
 * prevents him from entering Paradise except death."
 * an-Nasāʾī, ʿAmal al-Yawm wa'l-Layla — ṣaḥīḥ per al-Albānī
 * (Silsilah aṣ-Ṣaḥīḥah 972). */
export const AYATUL_KURSI_ZIKR = 'Ayatul Kursi';
export const AYATUL_KURSI_REF = {
  source: "an-Nasāʾī, ʿAmal al-Yawm wa'l-Layla 100",
  grade: 'Ṣaḥīḥ (al-Albānī, Silsilah aṣ-Ṣaḥīḥah 972)',
  virtue: 'Nothing prevents him from entering Paradise except death.',
};

// ─── auto-count dhikr toggle ────────────────────────────────────────────────

const AUTO_COUNT_KEY = 'bustandeen_salat_auto_count';
/** Existing behaviour for everyone today — tapping a tag has always also
 * credited the zikr counter until this setting existed. */
export const DEFAULT_AUTO_COUNT_DHIKR = true;

export function getAutoCountDhikr(): boolean {
  try {
    const v = localStorage.getItem(AUTO_COUNT_KEY);
    return v === null ? DEFAULT_AUTO_COUNT_DHIKR : v === '1';
  } catch {
    return DEFAULT_AUTO_COUNT_DHIKR;
  }
}

export function setAutoCountDhikr(value: boolean): void {
  try {
    localStorage.setItem(AUTO_COUNT_KEY, value ? '1' : '0');
  } catch {
    /* private mode */
  }
}

/**
 * Tracks which of TODAY's tasbīḥ/Ayatul-Kursi tags actually credited the zikr
 * counter — needed because the auto-count setting above can be toggled
 * BETWEEN the moment a tag is marked and the moment it's un-marked, so
 * SalatLog's own `tasbeeh`/`ayatulKursi` booleans (meaning only "marked") can
 * no longer be trusted as a proxy for "a credit was given" when reversing one.
 *
 * Only ever meaningful for today — crediting itself never applies to a
 * back-dated entry (see SalatTracker.tsx's creditDhikr), so a day rollover
 * simply makes the previous day's record irrelevant; no explicit cleanup
 * needed, the single key is just overwritten with the new day's own record.
 */
const CREDITED_KEY = 'bustandeen_salat_dhikr_credited';
interface CreditedRecord {
  date: string;
  credited: Record<string, boolean>;
}

function readCreditedRecord(today: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CREDITED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CreditedRecord;
    return parsed.date === today ? parsed.credited : {};
  } catch {
    return {};
  }
}

function writeCreditedRecord(today: string, credited: Record<string, boolean>): void {
  try {
    localStorage.setItem(CREDITED_KEY, JSON.stringify({ date: today, credited }));
  } catch {
    /* private mode */
  }
}

export function wasDhikrCredited(
  today: string,
  prayer: string,
  type: 'tasbeeh' | 'ayatulKursi'
): boolean {
  return readCreditedRecord(today)[`${prayer}:${type}`] ?? false;
}

export function setDhikrCredited(
  today: string,
  prayer: string,
  type: 'tasbeeh' | 'ayatulKursi',
  value: boolean
): void {
  const record = readCreditedRecord(today);
  const key = `${prayer}:${type}`;
  if (value) record[key] = true;
  else delete record[key];
  writeCreditedRecord(today, record);
}

// ─── sunnah/nafl rak'ah guidance toggles ────────────────────────────────────

/** Sunnah Mu'akkadah (confirmed rawātib — Fajr/Dhuhr/Maghrib/Isha) guidance
 * shown once each prayer's time has started. On by default — same
 * always-visible precedent as the existing Witr reminder. */
const SHOW_SUNNAH_KEY = 'bustandeen_show_sunnah_guide';
export const DEFAULT_SHOW_SUNNAH_GUIDE = true;

export function getShowSunnahGuide(): boolean {
  try {
    const v = localStorage.getItem(SHOW_SUNNAH_KEY);
    return v === null ? DEFAULT_SHOW_SUNNAH_GUIDE : v === '1';
  } catch {
    return DEFAULT_SHOW_SUNNAH_GUIDE;
  }
}

export function setShowSunnahGuide(value: boolean): void {
  try {
    localStorage.setItem(SHOW_SUNNAH_KEY, value ? '1' : '0');
  } catch {
    /* private mode */
  }
}

/** Ghair Mu'akkadah / lighter nafl guidance (4 before ʿAṣr, 2 before
 * Maghrib) — a separate toggle since these carry a lighter emphasis than
 * the confirmed rawātib and some users may only want the confirmed set. */
const SHOW_NAFL_KEY = 'bustandeen_show_nafl_guide';
export const DEFAULT_SHOW_NAFL_GUIDE = false;

export function getShowNaflGuide(): boolean {
  try {
    const v = localStorage.getItem(SHOW_NAFL_KEY);
    return v === null ? DEFAULT_SHOW_NAFL_GUIDE : v === '1';
  } catch {
    return DEFAULT_SHOW_NAFL_GUIDE;
  }
}

export function setShowNaflGuide(value: boolean): void {
  try {
    localStorage.setItem(SHOW_NAFL_KEY, value ? '1' : '0');
  } catch {
    /* private mode */
  }
}

// ─── ʿAṣr calculation school ────────────────────────────────────────────────

/**
 * The one genuine fiqh difference in the daily timetable: ʿAṣr begins when an
 * object's shadow equals its own length plus the noon shadow (Shāfiʿī, Mālikī,
 * Ḥanbalī) or TWICE its length (Ḥanafī). Because Ẓuhr runs until ʿAṣr starts,
 * moving one moves the other — a single setting governs both.
 */
export type AsrMadhab = 'standard' | 'hanafi';

const ASR_KEY = 'bustandeen_asr_madhab';
/** The worldwide fallback (adhan's default). The actual default for someone
 * who has not chosen is their country's (see regionPrayerDefaults below). */
export const DEFAULT_ASR_MADHAB: AsrMadhab = FALLBACK_PRAYER_DEFAULTS.asr;

export const ASR_MADHABS: { id: AsrMadhab; label: string; detail: string }[] = [
  {
    id: 'standard',
    label: 'Standard',
    detail:
      "Shāfiʿī · Mālikī · Ḥanbalī: ʿAṣr when the shadow equals the object's length. Ẓuhr ends earlier.",
  },
  {
    id: 'hanafi',
    label: 'Ḥanafī',
    detail:
      "ʿAṣr when the shadow is twice the object's length. ʿAṣr starts later, so Ẓuhr runs longer.",
  },
];

export function getAsrMadhab(): AsrMadhab {
  try {
    const v = localStorage.getItem(ASR_KEY);
    return v === 'hanafi' || v === 'standard' ? v : regionPrayerDefaults().asr;
  } catch {
    return regionPrayerDefaults().asr;
  }
}

export function setAsrMadhab(m: AsrMadhab): void {
  try {
    localStorage.setItem(ASR_KEY, m);
  } catch {
    /* private mode */
  }
}

/**
 * Which astronomical convention sets the Fajr/Isha twilight angles — the
 * biggest source of disagreement between prayer-time apps/mosques. Names
 * match adhan.js's `CalculationMethod.*()` factories (utils/prayerTimes.ts
 * reads this and picks the matching one).
 */
export type CalculationMethodId = CalcMethodId;

const CALC_METHOD_KEY = 'bustandeen_calc_method';
/** The worldwide fallback; see regionPrayerDefaults for the real default. */
export const DEFAULT_CALC_METHOD: CalculationMethodId = FALLBACK_PRAYER_DEFAULTS.method;

export const CALC_METHODS: { id: CalculationMethodId; label: string; detail: string }[] = [
  {
    id: 'MoonsightingCommittee',
    label: 'Moonsighting Committee',
    detail: 'Worldwide fallback, used where no national convention is set. Common in the UK.',
  },
  {
    id: 'MuslimWorldLeague',
    label: 'Muslim World League',
    detail: 'Widely used across Europe, the Far East and parts of the US.',
  },
  {
    id: 'Egyptian',
    label: 'Egyptian General Authority',
    detail: 'Used in Egypt, parts of Africa, Syria, Iraq, Lebanon, Malaysia.',
  },
  {
    id: 'Karachi',
    label: 'University of Islamic Sciences, Karachi',
    detail: 'Used across Pakistan, Bangladesh, India, Afghanistan.',
  },
  {
    id: 'UmmAlQura',
    label: 'Umm al-Qura, Makkah',
    detail: 'Used in Saudi Arabia, with a fixed 90-minute Isha interval.',
  },
  { id: 'Dubai', label: 'Dubai', detail: 'Used in the UAE.' },
  {
    id: 'NorthAmerica',
    label: 'ISNA (North America)',
    detail: 'Islamic Society of North America.',
  },
  { id: 'Kuwait', label: 'Kuwait', detail: 'Used in Kuwait.' },
  { id: 'Qatar', label: 'Qatar', detail: 'Used in Qatar.' },
  { id: 'Singapore', label: 'Singapore', detail: 'Majlis Ugama Islam Singapura (MUIS).' },
  { id: 'Tehran', label: 'Tehran', detail: 'Institute of Geophysics, University of Tehran.' },
  { id: 'Turkey', label: 'Turkey (Diyanet)', detail: 'Presidency of Religious Affairs, Turkey.' },
];

export function getCalcMethod(): CalculationMethodId {
  try {
    const v = localStorage.getItem(CALC_METHOD_KEY);
    return CALC_METHODS.some((m) => m.id === v)
      ? (v as CalculationMethodId)
      : regionPrayerDefaults().method;
  } catch {
    return regionPrayerDefaults().method;
  }
}

export function setCalcMethod(m: CalculationMethodId): void {
  try {
    localStorage.setItem(CALC_METHOD_KEY, m);
  } catch {
    /* private mode */
  }
}

// ─── Country-aware defaults (audit T1.9) ─────────────────────────────────────

/** The defaults for someone who has not chosen a method or ʿAṣr school: what
 * most mosques in their country use, judged from the device's time zone
 * (utils/countryDefaults.ts). A saved choice always wins over this. */
export function regionPrayerDefaults(): PrayerDefaults {
  return prayerDefaultsForCountry(deviceCountry());
}

const DEFAULTS_MIGRATED_KEY = 'bustandeen_prayer_defaults_v1';
const SUGGEST_KEY = 'bustandeen_prayer_defaults_suggest';

/**
 * Runs once per device, before the first render (main.tsx).
 *
 * Someone already using prayer times here (a saved location) but who never
 * picked a method or ʿAṣr school has been seeing the old worldwide default.
 * Switching them silently would move ʿAṣr by up to an hour overnight, so
 * their current settings are written down as an explicit choice instead,
 * and, if their country usually does it differently, a one-time card on the
 * Prayer Times page offers the local convention (they decide).
 * New users have no saved location yet, so they simply get the country
 * default from the start.
 */
export function migratePrayerDefaultsOnce(): void {
  try {
    if (localStorage.getItem(DEFAULTS_MIGRATED_KEY)) return;
    localStorage.setItem(DEFAULTS_MIGRATED_KEY, '1');
    if (!localStorage.getItem('bustandeen_location')) return;

    let pinned = false;
    if (!localStorage.getItem(CALC_METHOD_KEY)) {
      localStorage.setItem(CALC_METHOD_KEY, FALLBACK_PRAYER_DEFAULTS.method);
      pinned = true;
    }
    if (!localStorage.getItem(ASR_KEY)) {
      localStorage.setItem(ASR_KEY, FALLBACK_PRAYER_DEFAULTS.asr);
      pinned = true;
    }
    // Only someone who never chose gets the offer; a deliberate choice of
    // both settings is never second-guessed.
    const region = regionPrayerDefaults();
    if (pinned && (getCalcMethod() !== region.method || getAsrMadhab() !== region.asr)) {
      localStorage.setItem(SUGGEST_KEY, '1');
    }
  } catch {
    /* private mode: nothing to migrate */
  }
}

export interface PrayerDefaultsSuggestion {
  countryCode: string;
  suggested: PrayerDefaults;
  current: PrayerDefaults;
}

/** The one-time "your country usually uses…" offer, or null. */
export function getPrayerDefaultsSuggestion(): PrayerDefaultsSuggestion | null {
  try {
    if (localStorage.getItem(SUGGEST_KEY) !== '1') return null;
  } catch {
    return null;
  }
  const countryCode = deviceCountry();
  if (!countryCode) return null;
  const suggested = regionPrayerDefaults();
  const current: PrayerDefaults = { method: getCalcMethod(), asr: getAsrMadhab() };
  if (current.method === suggested.method && current.asr === suggested.asr) return null;
  return { countryCode, suggested, current };
}

export function acceptPrayerDefaultsSuggestion(): void {
  const { method, asr } = regionPrayerDefaults();
  setCalcMethod(method);
  setAsrMadhab(asr);
  dismissPrayerDefaultsSuggestion();
}

export function dismissPrayerDefaultsSuggestion(): void {
  try {
    localStorage.removeItem(SUGGEST_KEY);
  } catch {
    /* ignore */
  }
}
