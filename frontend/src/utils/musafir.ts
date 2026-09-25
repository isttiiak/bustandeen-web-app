// Musafir mode — the traveller's companion.
//
// A journey (safar) changes a Muslim's worship: the four-rak'ah prayers are
// shortened to two (qaṣr), prayers may be joined (jamʿ), fasting may be
// postponed, wiping over socks stretches to three days, and the traveller's
// du'a is answered. This module holds the journey state plus every ruling and
// du'a the /musafir page and the salat tracker show.
//
// AUTHENTICITY POLICY (same as sunnahGuide.ts / fastingRules.ts): Quran or
// ṣaḥīḥ/ḥasan hadith only, each with its exact number and a sunnah.com /
// quran.com link. Where the madhabs genuinely differ (distance, how long a
// stay keeps you a traveller, whether jamʿ is allowed) BOTH positions are
// shown and the user picks theirs; the app never pretends one is the only view.
// References cross-checked against sunnah.com listings on 2026-09-25.
//
// State lives in plain localStorage (read synchronously on render, like
// salatPrefs.ts) and is in prefsSync's SYNCED_KEYS, so starting a journey on
// the phone also shows it on the laptop.

import { useEffect, useState } from 'react';
import type { PrayerId } from '../hooks/useSalatLog.js';
import { getAsrMadhab } from './salatPrefs.js';
import { calcPrayerTimes } from './prayerTimes.js';

// ─── journey state ──────────────────────────────────────────────────────────

/** Which fiqh position the traveller follows on the points where schools differ. */
export type MusafirSchool = 'majority' | 'hanafi';

export interface MusafirState {
  active: boolean;
  /** Tracking day (YYYY-MM-DD) the journey began. */
  startedAt: string;
  /** The last prayer of `startedAt` that was prayed at home, before setting
   * out. Travel rulings apply from the prayer after it. Unset = the whole
   * start day is a travel day. (Set after the fact for a sudden trip.) */
  startAfter?: PrayerId;
  /** Optional free text — "Chattogram", "Umrah", "Grandma's village". */
  destination?: string;
  /** Days the traveller intends to stay at the destination (0 = unknown / keeps moving). */
  plannedStay?: number;
  school: MusafirSchool;
}

export interface PastJourney {
  from: string;
  to: string;
  destination?: string;
  days: number;
}

export const MUSAFIR_KEY = 'bustandeen_musafir';
export const MUSAFIR_HISTORY_KEY = 'bustandeen_musafir_history';
const DUAS_SAID_KEY = 'bustandeen_musafir_duas_said';
const CHANGE_EVENT = 'bustandeen-musafir-change';
const HISTORY_LIMIT = 12;

/** Ḥanafī users already chose ʿAṣr = Ḥanafī in Salat settings — start them there. */
export function defaultSchool(): MusafirSchool {
  return getAsrMadhab() === 'hanafi' ? 'hanafi' : 'majority';
}

function isDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function getMusafir(): MusafirState | null {
  try {
    const raw = localStorage.getItem(MUSAFIR_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<MusafirState>;
    if (!p || p.active !== true || !isDate(p.startedAt)) return null;
    return {
      active: true,
      startedAt: p.startedAt,
      startAfter:
        typeof p.startAfter === 'string' &&
        (PRAYER_ORDER as readonly string[]).includes(p.startAfter)
          ? p.startAfter
          : undefined,
      destination:
        typeof p.destination === 'string' ? p.destination.slice(0, 60) || undefined : undefined,
      plannedStay:
        typeof p.plannedStay === 'number' && p.plannedStay >= 0
          ? Math.min(365, Math.round(p.plannedStay))
          : undefined,
      school: p.school === 'hanafi' ? 'hanafi' : 'majority',
    };
  } catch {
    return null;
  }
}

function writeMusafir(state: MusafirState | null): void {
  try {
    // Written as an inactive record rather than removed, so prefsSync carries
    // "journey ended" to the other devices too (a removal is never pushed).
    localStorage.setItem(MUSAFIR_KEY, JSON.stringify(state ?? { active: false }));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function startMusafir(opts: {
  today: string;
  /** Defaults to `today`; may be earlier for a trip logged after the fact. */
  startedAt?: string;
  startAfter?: PrayerId;
  destination?: string;
  plannedStay?: number;
  school: MusafirSchool;
}): void {
  const startedAt = opts.startedAt && opts.startedAt <= opts.today ? opts.startedAt : opts.today;
  writeMusafir({
    active: true,
    startedAt,
    startAfter: opts.startAfter,
    destination: opts.destination?.trim().slice(0, 60) || undefined,
    plannedStay: opts.plannedStay,
    school: opts.school,
  });
}

export function updateMusafir(patch: Partial<Omit<MusafirState, 'active'>>): void {
  const cur = getMusafir();
  if (!cur) return;
  writeMusafir({ ...cur, ...patch });
}

/** Ends the journey, files it in the history and returns it. */
export function endMusafir(today: string): PastJourney | null {
  const cur = getMusafir();
  if (!cur) return null;
  const trip: PastJourney = {
    from: cur.startedAt,
    to: today,
    destination: cur.destination,
    days: journeyDay(cur, today),
  };
  try {
    const history = [trip, ...getMusafirHistory()].slice(0, HISTORY_LIMIT);
    localStorage.setItem(MUSAFIR_HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* private mode */
  }
  writeMusafir(null);
  return trip;
}

export function getMusafirHistory(): PastJourney[] {
  try {
    const raw = localStorage.getItem(MUSAFIR_HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? (parsed as PastJourney[]).filter((j) => isDate(j?.from) && isDate(j?.to))
      : [];
  } catch {
    return [];
  }
}

/** Live journey state — re-renders on start/update/end from any component. */
export function useMusafir(): MusafirState | null {
  const [state, setState] = useState<MusafirState | null>(() => getMusafir());
  useEffect(() => {
    const sync = () => setState(getMusafir());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);
  return state;
}

function dayDiff(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** 1-based day of the journey ("Day 1" is the day you set out). */
export function journeyDay(state: MusafirState, today: string): number {
  return Math.max(1, dayDiff(state.startedAt, today) + 1);
}

/** Fard prayers in the order they fall in a tracking day. */
export const PRAYER_ORDER: readonly PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Is this one prayer a travel prayer? Days after the start day: all of them.
 * The start day: only the prayers after `startAfter` (the last one prayed at
 * home). Days before the journey: none.
 */
export function musafirAppliesTo(
  state: MusafirState | null,
  date: string,
  prayer: PrayerId
): boolean {
  if (!state?.active || date < state.startedAt) return false;
  if (date > state.startedAt || !state.startAfter) return true;
  return PRAYER_ORDER.indexOf(prayer) > PRAYER_ORDER.indexOf(state.startAfter);
}

/** Does Musafir mode apply to any prayer of this tracking day? */
export function musafirAppliesOn(state: MusafirState | null, date: string): boolean {
  return PRAYER_ORDER.some((p) => musafirAppliesTo(state, date, p));
}

/**
 * Best guess for "after which prayer did I leave?" when starting right now:
 * the prayer whose time is running is treated as a travel prayer (not prayed
 * yet), so the journey starts after the one before it. Needs the saved
 * location for prayer times; without it the whole day counts. The user can
 * always correct it on /musafir.
 */
export function suggestStartAfter(date: string, now: Date = new Date()): PrayerId | undefined {
  try {
    const raw = localStorage.getItem('bustandeen_location');
    if (!raw) return undefined;
    const loc = JSON.parse(raw) as { latitude: number; longitude: number };
    const times = calcPrayerTimes(loc.latitude, loc.longitude, new Date(`${date}T12:00:00`));
    const begun = PRAYER_ORDER.filter((p) => times[p] <= now);
    if (begun.length < 2) return undefined;
    return begun[begun.length - 2];
  } catch {
    return undefined;
  }
}

// ─── "are you travelling?" hint (location, only if already permitted) ──────

const HINT_DISMISSED_KEY = 'bustandeen_musafir_hint_dismissed';

/** The qaṣr distance for a school, in km (the lower bound of each range above). */
export const QASR_DISTANCE_KM: Record<MusafirSchool, number> = { majority: 80, hanafi: 77 };

export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export interface TravelHint {
  km: number;
  from: string;
}

export function dismissTravelHint(today: string): void {
  try {
    localStorage.setItem(HINT_DISMISSED_KEY, today);
  } catch {
    /* private mode */
  }
}

/**
 * "You're 140 km from Dhaka — travelling?" Only when Musafir mode is off, the
 * browser ALREADY has location permission (we never trigger a permission
 * prompt for this), and the device is at least the qaṣr distance from the
 * saved prayer-times location. The position is used only for this distance on
 * the device and is never stored or sent anywhere.
 */
export function useTravelHint(today: string, active: boolean): TravelHint | null {
  const [hint, setHint] = useState<TravelHint | null>(null);
  useEffect(() => {
    if (active) {
      setHint(null);
      return;
    }
    let cancelled = false;
    try {
      if (localStorage.getItem(HINT_DISMISSED_KEY) === today) return;
      const raw = localStorage.getItem('bustandeen_location');
      if (!raw || !navigator.geolocation || !navigator.permissions?.query) return;
      const home = JSON.parse(raw) as { latitude: number; longitude: number; name?: string };
      if (typeof home.latitude !== 'number' || typeof home.longitude !== 'number') return;
      void navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (cancelled || status.state !== 'granted') return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancelled) return;
              const km = distanceKm(home, pos.coords);
              if (km >= QASR_DISTANCE_KM[defaultSchool()]) {
                setHint({ km: Math.round(km), from: home.name ?? '' });
              }
            },
            () => {
              /* unavailable: no hint */
            },
            { enableHighAccuracy: false, maximumAge: 30 * 60_000, timeout: 10_000 }
          );
        })
        .catch(() => {
          /* permissions API unsupported: no hint */
        });
    } catch {
      /* storage blocked: no hint */
    }
    return () => {
      cancelled = true;
    };
  }, [today, active]);
  return hint;
}

// ─── rak'ahs ────────────────────────────────────────────────────────────────

export const FARD_RAKAT: Record<PrayerId, number> = {
  fajr: 2,
  dhuhr: 4,
  asr: 4,
  maghrib: 3,
  isha: 4,
};

/** Only the four-rak'ah prayers are shortened; Fajr and Maghrib never change. */
export const QASR_PRAYERS: readonly PrayerId[] = ['dhuhr', 'asr', 'isha'];
export const isQasrPrayer = (p: PrayerId): boolean => QASR_PRAYERS.includes(p);

export function travelRakat(p: PrayerId): number {
  return isQasrPrayer(p) ? 2 : FARD_RAKAT[p];
}

/** The two pairs that may be joined. Fajr is never joined with anything. */
export const JAM_PAIRS: { first: PrayerId; second: PrayerId }[] = [
  { first: 'dhuhr', second: 'asr' },
  { first: 'maghrib', second: 'isha' },
];

export function jamPartner(p: PrayerId): PrayerId | null {
  for (const pair of JAM_PAIRS) {
    if (pair.first === p) return pair.second;
    if (pair.second === p) return pair.first;
  }
  return null;
}

/** Real (time-shifting) jamʿ is the majority view; the Ḥanafī school allows it
 * only at ʿArafah and Muzdalifah during Ḥajj. */
export const jamAllowed = (school: MusafirSchool): boolean => school === 'majority';

// ─── madhab thresholds ──────────────────────────────────────────────────────

export interface SchoolMeta {
  id: MusafirSchool;
  label: string;
  labelBn: string;
  who: string;
  whoBn: string;
  /** An intention to stay this many days or more makes you a resident. */
  residentAfterDays: number;
  distance: string;
  distanceBn: string;
  stay: string;
  stayBn: string;
  jam: string;
  jamBn: string;
}

export const SCHOOLS: SchoolMeta[] = [
  {
    id: 'majority',
    label: 'Shāfiʿī · Mālikī · Ḥanbalī',
    labelBn: 'শাফিঈ · মালিকী · হাম্বলী',
    who: 'The majority of scholars',
    whoBn: 'অধিকাংশ আলিম',
    residentAfterDays: 4,
    distance: 'About 80–89 km (4 burud, 48 Hāshimī miles)',
    distanceBn: 'প্রায় ৮০–৮৯ কিমি (৪ বারীদ, ৪৮ হাশিমী মাইল)',
    stay: 'Intend to stay 4 days or more (not counting the days of arriving and leaving) and you pray in full from arrival.',
    stayBn:
      'গন্তব্যে ৪ দিন বা বেশি থাকার নিয়ত করলে (আসা-যাওয়ার দিন বাদে) পৌঁছানো থেকেই পূর্ণ নামায।',
    jam: 'Allowed: Ẓuhr with ʿAṣr and Maghrib with ʿIshāʾ, in either prayer’s time.',
    jamBn: 'জায়েয: যোহর-আসর ও মাগরিব-ইশা, যেকোনো একটির ওয়াক্তে।',
  },
  {
    id: 'hanafi',
    label: 'Ḥanafī',
    labelBn: 'হানাফী',
    who: 'Common in South Asia, Turkey, Central Asia',
    whoBn: 'দক্ষিণ এশিয়া, তুরস্ক, মধ্য এশিয়ায় প্রচলিত',
    residentAfterDays: 15,
    distance: 'About 77–78 km (three days’ walk, 48 miles)',
    distanceBn: 'প্রায় ৭৭–৭৮ কিমি (তিন দিনের পথ, ৪৮ মাইল)',
    stay: 'Intend to stay 15 days or more at one place and you pray in full. Less than that, keep shortening.',
    stayBn: 'এক জায়গায় ১৫ দিন বা বেশি থাকার নিয়ত করলে পূর্ণ নামায। এর কম হলে কসর চলবে।',
    jam: 'Each prayer in its own time. Only a “formal” joining is allowed: Ẓuhr at the very end of its time, ʿAṣr at the very start of its own.',
    jamBn:
      'প্রত্যেক নামায নিজ ওয়াক্তে। শুধু “বাহ্যিক জমা”: যোহর তার শেষ ওয়াক্তে, আসর তার প্রথম ওয়াক্তে।',
  },
];

export const schoolMeta = (s: MusafirSchool): SchoolMeta =>
  SCHOOLS.find((m) => m.id === s) ?? SCHOOLS[0]!;

/** Planned stay long enough that the traveller becomes a resident on arrival. */
export function staysAsResident(state: MusafirState): boolean {
  return (state.plannedStay ?? 0) >= schoolMeta(state.school).residentAfterDays;
}

// ─── evidence ───────────────────────────────────────────────────────────────

export interface MusafirRef {
  text: string;
  textBn: string;
  source: string;
  url: string;
  grade: string;
}

export const REF_SADAQAH: MusafirRef = {
  text: 'It is a charity which Allah has given you, so accept His charity.',
  textBn: 'এটি আল্লাহর দেওয়া একটি সাদাকা, তোমরা তাঁর সাদাকা গ্রহণ করো।',
  source: 'Ṣaḥīḥ Muslim 686a',
  url: 'https://sunnah.com/muslim:686a',
  grade: 'Ṣaḥīḥ',
};

export const REF_REWARD_FLOWS: MusafirRef = {
  text: 'When a servant falls ill or travels, the like of what he used to do while resident and healthy is written for him.',
  textBn:
    'বান্দা যখন অসুস্থ হয় বা সফর করে, তখন সে সুস্থ ও মুকীম অবস্থায় যে আমল করত, তার সমপরিমাণ সওয়াব তার জন্য লেখা হয়।',
  source: 'Ṣaḥīḥ al-Bukhārī 2996',
  url: 'https://sunnah.com/bukhari:2996',
  grade: 'Ṣaḥīḥ',
};

export const REF_DUA_ANSWERED: MusafirRef = {
  text: 'Three supplications are answered, there is no doubt about them: the supplication of the oppressed, the supplication of the traveller, and the supplication of a father for his child.',
  textBn:
    'তিনটি দু‘আ নিঃসন্দেহে কবুল হয়: মাযলুমের দু‘আ, মুসাফিরের দু‘আ এবং সন্তানের জন্য পিতার দু‘আ।',
  source: 'Jāmiʿ al-Tirmidhī 1905',
  url: 'https://sunnah.com/tirmidhi:1905',
  grade: 'Ḥasan (al-Albānī)',
};

export const REF_HASTEN_HOME: MusafirRef = {
  text: 'Travel is a piece of torment: it keeps you from your food, drink and sleep. So when one of you has finished his business, let him hurry back to his family.',
  textBn:
    'সফর আযাবের একটি অংশ: তা তোমাদের খাবার, পানীয় ও ঘুম থেকে বিরত রাখে। তাই কাজ শেষ হলে দ্রুত পরিবারের কাছে ফিরে যাও।',
  source: 'Ṣaḥīḥ al-Bukhārī 1804',
  url: 'https://sunnah.com/bukhari:1804',
  grade: 'Ṣaḥīḥ',
};

export const REF_RETURN_MASJID: MusafirRef = {
  text: 'Whenever the Prophet ﷺ returned from a journey, he would first go to the mosque and pray two rak’ahs in it before sitting down.',
  textBn: 'নবী ﷺ সফর থেকে ফিরে প্রথমে মসজিদে যেতেন এবং বসার আগে দুই রাকআত নামায পড়তেন।',
  source: 'Ṣaḥīḥ al-Bukhārī 3088',
  url: 'https://sunnah.com/bukhari:3088',
  grade: 'Ṣaḥīḥ',
};

// ─── rukhṣah cards (the concessions of the journey) ────────────────────────

export interface MusafirRuling {
  id: string;
  emoji: string;
  title: string;
  titleBn: string;
  /** One line under the title. */
  summary: string;
  summaryBn: string;
  /** Plain-language detail shown when the card opens. */
  points: { en: string; bn: string }[];
  refs: MusafirRef[];
}

export const MUSAFIR_RULINGS: MusafirRuling[] = [
  {
    id: 'qasr',
    emoji: '✂️',
    title: 'Qaṣr: shorten the four-rak’ah prayers',
    titleBn: 'কসর: চার রাকআতের নামায দুই রাকআত',
    summary: 'Ẓuhr, ʿAṣr and ʿIshāʾ become 2 rak’ahs. Fajr stays 2, Maghrib stays 3.',
    summaryBn: 'যোহর, আসর ও ইশা দুই রাকআত। ফজর দুই আর মাগরিব তিন রাকআতই থাকে।',
    points: [
      {
        en: 'Allah Himself allowed it in the Quran, and the Prophet ﷺ, Abū Bakr, ʿUmar and ʿUthmān never prayed more than two on a journey.',
        bn: 'আল্লাহ কুরআনে এর অনুমতি দিয়েছেন, আর নবী ﷺ, আবু বকর, উমর ও উসমান (রা.) সফরে কখনো দুই রাকআতের বেশি পড়েননি।',
      },
      {
        en: 'The Ḥanafī school holds qaṣr is wājib (praying four knowingly is a fault); the other schools call it a strongly recommended sunnah. Either way: pray two.',
        bn: 'হানাফী মাযহাবে কসর ওয়াজিব (জেনেশুনে চার পড়া ত্রুটি); অন্য মাযহাবে তা সুন্নাতে মুআক্কাদা। যেভাবেই হোক: দুই রাকআত পড়ুন।',
      },
    ],
    refs: [
      {
        text: '“When you travel through the land, there is no blame on you for shortening the prayer…”',
        textBn: '“যখন তোমরা যমীনে সফর করো, তখন নামায সংক্ষিপ্ত করায় তোমাদের কোনো দোষ নেই…”',
        source: 'Quran 4:101',
        url: 'https://quran.com/4/101',
        grade: 'Quran',
      },
      {
        text: 'Prayer was first made two rak’ahs. The travel prayer was kept that way, and the prayer at home was increased.',
        textBn:
          'নামায প্রথমে দুই রাকআত করে ফরয হয়েছিল। সফরের নামায সেভাবেই রাখা হয়েছে, আর মুকীমের নামায বাড়ানো হয়েছে।',
        source: 'Ṣaḥīḥ al-Bukhārī 350',
        url: 'https://sunnah.com/bukhari:350',
        grade: 'Ṣaḥīḥ',
      },
      REF_SADAQAH,
      {
        text: 'Ibn ʿUmar: I accompanied the Messenger of Allah ﷺ on journeys and he did not add to two rak’ahs until Allah took him; then Abū Bakr, then ʿUmar, likewise.',
        textBn:
          'ইবনে উমর (রা.): আমি সফরে রাসূলুল্লাহ ﷺ-এর সাথে ছিলাম, তিনি ইন্তেকাল পর্যন্ত দুই রাকআতের বেশি পড়েননি; আবু বকর ও উমরও একই রকম।',
        source: 'Ṣaḥīḥ Muslim 689a',
        url: 'https://sunnah.com/muslim:689a',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'when',
    emoji: '🛣️',
    title: 'When does it start and end?',
    titleBn: 'কখন শুরু, কখন শেষ?',
    summary: 'Start once you leave your town’s built-up area; stop when you are back inside it.',
    summaryBn: 'নিজ শহর/এলাকার বসতি পার হলেই শুরু; ফিরে বসতির ভেতরে ঢুকলেই শেষ।',
    points: [
      {
        en: 'Not at home while packing: the Prophet ﷺ prayed Ẓuhr as four in Madinah and ʿAṣr as two at Dhul-Ḥulayfah, once he had left the city.',
        bn: 'ঘরে গোছগাছের সময় নয়: নবী ﷺ মদীনায় যোহর চার রাকআত আর শহর ছেড়ে যুল-হুলাইফায় আসর দুই রাকআত পড়েছেন।',
      },
      {
        en: 'The journey has to be long enough: roughly 77–89 km one way depending on the madhab (see the table below). A trip across town is not safar.',
        bn: 'সফর যথেষ্ট দীর্ঘ হতে হবে: মাযহাবভেদে একদিকে প্রায় ৭৭–৮৯ কিমি (নিচের টেবিল দেখুন)। শহরের ভেতরের যাতায়াত সফর নয়।',
      },
    ],
    refs: [
      {
        text: 'Anas: I prayed Ẓuhr with the Prophet ﷺ in Madinah as four, and ʿAṣr at Dhul-Ḥulayfah as two.',
        textBn:
          'আনাস (রা.): আমি মদীনায় নবী ﷺ-এর সাথে যোহর চার রাকআত এবং যুল-হুলাইফায় আসর দুই রাকআত পড়েছি।',
        source: 'Ṣaḥīḥ al-Bukhārī 1089',
        url: 'https://sunnah.com/bukhari:1089',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'stay',
    emoji: '🏨',
    title: 'Staying somewhere: how long are you still a musafir?',
    titleBn: 'কোথাও অবস্থান: কতদিন মুসাফির থাকবেন?',
    summary:
      'Depends on your intention to stay: 4+ days (majority) or 15+ days (Ḥanafī) makes you a resident.',
    summaryBn: 'অবস্থানের নিয়তের উপর নির্ভর করে: ৪+ দিন (অধিকাংশ) বা ১৫+ দিন (হানাফী) হলে মুকীম।',
    points: [
      {
        en: 'If you never fix a date (“I’ll leave as soon as the work is done”), you stay a traveller however long it takes: the Prophet ﷺ shortened for 19 days in Makkah and 20 days at Tabūk.',
        bn: 'যদি ফেরার দিন ঠিক না থাকে (“কাজ শেষ হলেই ফিরব”), যতদিনই লাগুক মুসাফির থাকবেন: নবী ﷺ মক্কায় ১৯ দিন ও তাবুকে ২০ দিন কসর করেছেন।',
      },
      {
        en: 'Set your planned stay on the journey card and Bustandeen will tell you, by your madhab, whether to pray in full once you arrive.',
        bn: 'সফর কার্ডে থাকার পরিকল্পনা দিলে বুস্তানদীন আপনার মাযহাব অনুযায়ী জানিয়ে দেবে পৌঁছানোর পর পূর্ণ নামায পড়বেন কিনা।',
      },
    ],
    refs: [
      {
        text: 'Ibn ʿAbbās: The Prophet ﷺ stayed nineteen days, shortening the prayer.',
        textBn: 'ইবনে আব্বাস (রা.): নবী ﷺ উনিশ দিন অবস্থান করেছেন এবং নামায কসর করেছেন।',
        source: 'Ṣaḥīḥ al-Bukhārī 1080',
        url: 'https://sunnah.com/bukhari:1080',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: 'Anas: We travelled with the Prophet ﷺ from Madinah to Makkah and prayed two rak’ahs until we returned. We stayed in Makkah ten days.',
        textBn:
          'আনাস (রা.): আমরা নবী ﷺ-এর সাথে মদীনা থেকে মক্কা গিয়েছি এবং ফেরা পর্যন্ত দুই রাকআত পড়েছি। মক্কায় দশ দিন ছিলাম।',
        source: 'Ṣaḥīḥ al-Bukhārī 1081',
        url: 'https://sunnah.com/bukhari:1081',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: 'Jābir: The Messenger of Allah ﷺ stayed at Tabūk for twenty days, shortening the prayer.',
        textBn: 'জাবির (রা.): রাসূলুল্লাহ ﷺ তাবুকে বিশ দিন অবস্থান করে নামায কসর করেছেন।',
        source: 'Sunan Abī Dāwūd 1235',
        url: 'https://sunnah.com/abudawud:1235',
        grade: 'Ṣaḥīḥ (al-Albānī)',
      },
    ],
  },
  {
    id: 'jam',
    emoji: '🔗',
    title: 'Jamʿ: joining two prayers',
    titleBn: 'জমা: দুই নামায একসাথে',
    summary:
      'Ẓuhr with ʿAṣr, Maghrib with ʿIshāʾ, in the earlier time (taqdīm) or the later (taʾkhīr).',
    summaryBn: 'যোহর-আসর, মাগরিব-ইশা; আগের ওয়াক্তে (তাকদীম) বা পরের ওয়াক্তে (তা’খীর)।',
    points: [
      {
        en: 'Majority: allowed for a traveller, especially while on the move. Pray the first, then the second straight after; Fajr is never joined.',
        bn: 'অধিকাংশ মত: মুসাফিরের জন্য জায়েয, বিশেষত চলন্ত অবস্থায়। প্রথমটি পড়ে সাথে সাথে দ্বিতীয়টি; ফজর কখনো জমা হয় না।',
      },
      {
        en: 'Ḥanafī: every prayer in its own time, except at ʿArafah and Muzdalifah; the “formal” joining (end of one time, start of the next) keeps the spirit of ease.',
        bn: 'হানাফী: আরাফা ও মুযদালিফা ছাড়া প্রত্যেক নামায নিজ ওয়াক্তে; “বাহ্যিক জমা” (এক ওয়াক্তের শেষে, পরেরটির শুরুতে) সহজতা রক্ষা করে।',
      },
      {
        en: 'In the salat tracker (Musafir mode, majority view): during Ẓuhr or Maghrib time a “Ẓuhr + ʿAṣr” / “Maghrib + ʿIshāʾ” button logs both together; during ʿAṣr or ʿIshāʾ time the same button appears if the earlier prayer is still unprayed.',
        bn: 'সালাত ট্র্যাকারে (মুসাফির মোড, অধিকাংশ মত): যোহর বা মাগরিবের ওয়াক্তে “যোহর + আসর” / “মাগরিব + ইশা” বাটনে দুটো একসাথে লেখা যায়; আসর বা ইশার ওয়াক্তে আগের নামায বাকি থাকলেও একই বাটন আসে।',
      },
    ],
    refs: [
      {
        text: 'Anas: When the Prophet ﷺ set out before the sun declined, he delayed Ẓuhr to the time of ʿAṣr, then stopped and joined them.',
        textBn:
          'আনাস (রা.): নবী ﷺ সূর্য ঢলার আগে রওনা হলে যোহরকে আসরের ওয়াক্ত পর্যন্ত বিলম্ব করতেন, তারপর নেমে দুটো একসাথে পড়তেন।',
        source: 'Ṣaḥīḥ al-Bukhārī 1111',
        url: 'https://sunnah.com/bukhari:1111',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: 'Muʿādh (Tabūk): If he set out after the sun had declined, he brought ʿAṣr forward to Ẓuhr and prayed Ẓuhr and ʿAṣr together, then travelled. If he set out after Maghrib, he brought ʿIshāʾ forward and prayed it with Maghrib.',
        textBn:
          'মুআয (রা., তাবুক): সূর্য ঢলার পরে রওনা হলে তিনি আসরকে যোহরের সময়ে এগিয়ে এনে যোহর ও আসর একসাথে পড়তেন, তারপর রওনা হতেন। মাগরিবের পরে রওনা হলে ইশাকে এগিয়ে এনে মাগরিবের সাথে পড়তেন।',
        source: 'Jāmiʿ al-Tirmidhī 553',
        url: 'https://sunnah.com/tirmidhi:553',
        grade: 'Ṣaḥīḥ (al-Albānī); at-Tirmidhī: ḥasan gharīb',
      },
      {
        text: 'Muʿādh: On the Tabūk expedition the Prophet ﷺ joined Ẓuhr with ʿAṣr and Maghrib with ʿIshāʾ; he wanted his Ummah not to be put in hardship.',
        textBn:
          'মুআয (রা.): তাবুক অভিযানে নবী ﷺ যোহর-আসর ও মাগরিব-ইশা একসাথে পড়েছেন; তিনি চেয়েছেন উম্মাহ যেন কষ্টে না পড়ে।',
        source: 'Ṣaḥīḥ Muslim 706a',
        url: 'https://sunnah.com/muslim:706a',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'sunnah',
    emoji: '🌙',
    title: 'Sunnah prayers: lighten, but keep two',
    titleBn: 'সুন্নাত নামায: হালকা করুন, তবে দুটি রাখুন',
    summary: 'The rawātib may be left on a journey. Keep Fajr’s two sunnah and Witr.',
    summaryBn: 'সফরে সুন্নাতে রাতিবা ছাড়া যায়। ফজরের দুই রাকআত সুন্নাত ও বিতর রাখুন।',
    points: [
      {
        en: 'Ibn ʿUmar did not pray the regular sunnah on journeys: “If I were to pray them, I would have completed the fard.”',
        bn: 'ইবনে উমর (রা.) সফরে নিয়মিত সুন্নাত পড়তেন না: “যদি পড়তামই, তবে ফরযই পূর্ণ করতাম।”',
      },
      {
        en: 'But the two before Fajr were never dropped, not even the morning the caravan overslept, and the Prophet ﷺ prayed Witr on his mount.',
        bn: 'কিন্তু ফজরের আগের দুই রাকআত কখনো ছাড়েননি, এমনকি কাফেলা ঘুমিয়ে পড়ার সকালেও নয়; আর নবী ﷺ বাহনের উপর বিতর পড়েছেন।',
      },
      {
        en: 'Voluntary prayer (Tahajjud, Ḍuḥā, any nafl) is still open, and can even be prayed seated on a bus, train or plane, facing the way you travel.',
        bn: 'নফল (তাহাজ্জুদ, দুহা ইত্যাদি) খোলা আছে, এমনকি বাস, ট্রেন বা বিমানে বসে যাত্রার দিকে মুখ করেও পড়া যায়।',
      },
    ],
    refs: [
      {
        text: 'Ibn ʿUmar saw people praying sunnah after the shortened Ẓuhr and said: “If I were to pray them, I would have completed my prayer.”',
        textBn:
          'ইবনে উমর (রা.) কসরের পর লোকদের সুন্নাত পড়তে দেখে বললেন: “যদি পড়তামই, তবে (ফরয) নামাযই পূর্ণ করতাম।”',
        source: 'Ṣaḥīḥ Muslim 689a',
        url: 'https://sunnah.com/muslim:689a',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: 'The caravan overslept on a journey; Bilāl called the adhān, the Prophet ﷺ prayed two rak’ahs, then prayed Fajr as on every day.',
        textBn:
          'সফরে কাফেলা ঘুমিয়ে পড়েছিল; বিলাল আযান দিলেন, নবী ﷺ দুই রাকআত পড়লেন, তারপর প্রতিদিনের মতো ফজর পড়লেন।',
        source: 'Ṣaḥīḥ Muslim 681',
        url: 'https://sunnah.com/muslim:681',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: 'The Prophet ﷺ prayed voluntary prayers on his mount facing wherever it went, by gestures, but not the obligatory prayers; and he prayed Witr on his mount.',
        textBn:
          'নবী ﷺ বাহনের উপর যেদিকে তা যেত সেদিকে মুখ করে ইশারায় নফল পড়তেন, ফরয নয়; আর বাহনের উপর বিতর পড়তেন।',
        source: 'Ṣaḥīḥ al-Bukhārī 1000',
        url: 'https://sunnah.com/bukhari:1000',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'fard_vehicle',
    emoji: '🚆',
    title: 'Fard prayer in a vehicle',
    titleBn: 'যানবাহনে ফরয নামায',
    summary:
      'Pray fard facing the qiblah, standing if you can. Plan stops, or join prayers to catch a window.',
    summaryBn:
      'ফরয কিবলামুখী হয়ে, সম্ভব হলে দাঁড়িয়ে। বিরতির পরিকল্পনা করুন, বা জমা করে ওয়াক্ত ধরুন।',
    points: [
      {
        en: 'The Prophet ﷺ dismounted and faced the qiblah for the obligatory prayers. On a train or plane where you can stand and turn to the qiblah, do so; if you truly cannot, pray as best you can rather than let the time pass.',
        bn: 'নবী ﷺ ফরয নামাযের জন্য নেমে কিবলামুখী হতেন। ট্রেন বা বিমানে দাঁড়িয়ে কিবলামুখী হওয়া গেলে তাই করুন; একান্ত সম্ভব না হলে ওয়াক্ত চলে যেতে না দিয়ে সাধ্যমতো পড়ুন।',
      },
    ],
    refs: [
      {
        text: 'The Prophet ﷺ prayed voluntary prayers on his mount facing east; when he wanted the obligatory prayer, he dismounted and faced the qiblah.',
        textBn: 'নবী ﷺ বাহনের উপর পূর্বমুখী হয়ে নফল পড়তেন; ফরয পড়তে চাইলে নেমে কিবলামুখী হতেন।',
        source: 'Ṣaḥīḥ al-Bukhārī 1099',
        url: 'https://sunnah.com/bukhari:1099',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: '“So fear Allah as much as you are able.”',
        textBn: '“অতএব তোমরা যথাসাধ্য আল্লাহকে ভয় করো।”',
        source: 'Quran 64:16',
        url: 'https://quran.com/64/16',
        grade: 'Quran',
      },
    ],
  },
  {
    id: 'imam',
    emoji: '🕌',
    title: 'Behind a local (resident) imam',
    titleBn: 'মুকীম ইমামের পেছনে',
    summary:
      'Follow the imam and pray all four. Shorten only when you pray alone or lead other travellers.',
    summaryBn: 'ইমামের অনুসরণে চার রাকআতই পড়ুন। একা পড়লে বা মুসাফিরদের ইমাম হলে কসর।',
    points: [
      {
        en: 'A traveller who leads residents prays two and the residents stand up to complete their own four.',
        bn: 'মুসাফির ইমাম হলে দুই রাকআত পড়বেন, আর মুকীম মুক্তাদিরা উঠে নিজেদের চার রাকআত পূর্ণ করবেন।',
      },
    ],
    refs: [
      {
        text: 'Mūsā ibn Salamah asked Ibn ʿAbbās how to pray in Makkah when not praying with the imam. He said: “Two rak’ahs, the Sunnah of Abul-Qāsim ﷺ.” (In Musnad Aḥmad he adds: praying four behind the imam and two alone is that same Sunnah.)',
        textBn:
          'মূসা ইবনে সালামাহ ইবনে আব্বাসকে জিজ্ঞেস করলেন, ইমামের সাথে না পড়লে মক্কায় কিভাবে পড়বেন। তিনি বললেন: “দুই রাকআত, আবুল কাসিম ﷺ-এর সুন্নাত।” (মুসনাদ আহমাদে: ইমামের পেছনে চার আর একা দুই, এটিই সেই সুন্নাত।)',
        source: 'Ṣaḥīḥ Muslim 688',
        url: 'https://sunnah.com/muslim:688',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'jumuah',
    emoji: '📿',
    title: 'Friday on the road',
    titleBn: 'সফরে জুমআর দিন',
    summary:
      'Jumuʿah is not obligatory on a traveller: pray Ẓuhr (2). If you can join a Jumuʿah, it counts.',
    summaryBn: 'মুসাফিরের উপর জুমআ ফরয নয়: যোহর (২) পড়ুন। জুমআয় শরীক হতে পারলে তা যথেষ্ট।',
    points: [
      {
        en: 'At ʿArafah, on a Friday, the Prophet ﷺ prayed Ẓuhr and then ʿAṣr, not a Jumuʿah. The tracker labels your Friday prayer “Ẓuhr” while Musafir mode is on, and you pick where you prayed it.',
        bn: 'আরাফায়, এক শুক্রবারে, নবী ﷺ জুমআ নয়, যোহর তারপর আসর পড়েছেন। মুসাফির মোডে ট্র্যাকার শুক্রবারের নামাযকে “যোহর” দেখায় এবং কোথায় পড়েছেন তা আপনি বেছে নেন।',
      },
    ],
    refs: [
      {
        text: 'Jābir (the Farewell Ḥajj, at ʿArafah): Bilāl called the adhān and iqāmah and he led Ẓuhr, then the iqāmah and he led ʿAṣr, praying nothing between them.',
        textBn:
          'জাবির (বিদায় হজ্জ, আরাফায়): বিলাল আযান ও ইকামত দিলেন, তিনি যোহর পড়ালেন, তারপর ইকামত দিয়ে আসর পড়ালেন, মাঝে কিছু পড়েননি।',
        source: 'Ṣaḥīḥ Muslim 1218a',
        url: 'https://sunnah.com/muslim:1218a',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'fasting',
    emoji: '🍽️',
    title: 'Fasting on a journey',
    titleBn: 'সফরে রোযা',
    summary:
      'You may fast or break it, and make up the missed days later. If it is hard, breaking it is better.',
    summaryBn: 'রোযা রাখতে বা ভাঙতে পারেন, পরে কাযা করবেন। কষ্ট হলে না রাখাই উত্তম।',
    points: [
      {
        en: 'Log a Ramadan day you did not fast on the Fasting page and add it to your qaḍāʾ counter, so nothing is forgotten after the trip.',
        bn: 'রমযানের যে দিন রোযা রাখেননি, রোযা পাতায় লিখে কাযা কাউন্টারে যোগ করুন, যেন সফরের পরে কিছু ভুলে না যান।',
      },
    ],
    refs: [
      {
        text: '“…and whoever is ill or on a journey, then an equal number of other days. Allah intends ease for you, not hardship.”',
        textBn:
          '“…আর যে অসুস্থ বা সফরে থাকে, সে অন্য দিনে সমান সংখ্যা পূরণ করবে। আল্লাহ তোমাদের জন্য সহজ চান, কঠিন চান না।”',
        source: 'Quran 2:185',
        url: 'https://quran.com/2/185',
        grade: 'Quran',
      },
      {
        text: 'Ḥamzah al-Aslamī asked about fasting while travelling. The Prophet ﷺ said: “Fast if you wish, and break your fast if you wish.”',
        textBn:
          'হামযা আল-আসলামী সফরে রোযা সম্পর্কে জিজ্ঞেস করলে নবী ﷺ বললেন: “চাইলে রোযা রাখো, চাইলে ভাঙো।”',
        source: 'Ṣaḥīḥ al-Bukhārī 1943',
        url: 'https://sunnah.com/bukhari:1943',
        grade: 'Ṣaḥīḥ',
      },
      {
        text: 'Seeing a man shaded from the heat because he was fasting, the Prophet ﷺ said: “It is not righteousness to fast on a journey.”',
        textBn: 'রোযার কারণে গরমে কাতর এক লোককে দেখে নবী ﷺ বললেন: “সফরে রোযা রাখা নেকির কাজ নয়।”',
        source: 'Ṣaḥīḥ al-Bukhārī 1946',
        url: 'https://sunnah.com/bukhari:1946',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'khuff',
    emoji: '🧦',
    title: 'Wiping over socks: 3 days',
    titleBn: 'মোজার উপর মাসেহ: ৩ দিন',
    summary:
      'Put them on with wuḍūʾ, then wipe over them for up to 3 days and nights (1 day at home).',
    summaryBn: 'উযু অবস্থায় পরুন, তারপর ৩ দিন ৩ রাত পর্যন্ত মাসেহ করুন (মুকীম হলে ১ দিন)।',
    points: [
      {
        en: 'The period starts from the first wiping after breaking the wuḍūʾ (most scholars). Ghusl still requires taking them off. Which socks qualify differs by madhab: leather khuffs by agreement; thick socks per many scholars.',
        bn: 'উযু ভাঙার পর প্রথম মাসেহ থেকে সময় গণনা (অধিকাংশের মতে)। গোসলের জন্য খুলতে হবে। কোন মোজায় মাসেহ চলে তা মাযহাবভেদে ভিন্ন: চামড়ার মোজায় সর্বসম্মত; মোটা মোজায় অনেক আলিমের মতে।',
      },
    ],
    refs: [
      {
        text: 'ʿAlī: The Messenger of Allah ﷺ set three days and nights for the traveller, and a day and a night for the resident.',
        textBn:
          'আলী (রা.): রাসূলুল্লাহ ﷺ মুসাফিরের জন্য তিন দিন তিন রাত এবং মুকীমের জন্য এক দিন এক রাত নির্ধারণ করেছেন।',
        source: 'Ṣaḥīḥ Muslim 276a',
        url: 'https://sunnah.com/muslim:276a',
        grade: 'Ṣaḥīḥ',
      },
    ],
  },
  {
    id: 'tayammum',
    emoji: '🏜️',
    title: 'No water? Tayammum',
    titleBn: 'পানি নেই? তায়াম্মুম',
    summary: 'If you cannot find or use water, strike clean earth and wipe your face and hands.',
    summaryBn: 'পানি না পেলে বা ব্যবহার করতে না পারলে পবিত্র মাটিতে হাত মেরে মুখ ও হাত মাসেহ করুন।',
    points: [
      {
        en: 'Do not skip the prayer because the washroom on the bus is unusable: tayammum is the Quran’s own answer for the traveller.',
        bn: 'বাসের ওয়াশরুম ব্যবহারযোগ্য নয় বলে নামায ছাড়বেন না: তায়াম্মুমই মুসাফিরের জন্য কুরআনের সমাধান।',
      },
    ],
    refs: [
      {
        text: '“…and if you are ill or on a journey… and find no water, then seek clean earth and wipe over your faces and hands with it.”',
        textBn:
          '“…আর যদি তোমরা অসুস্থ হও বা সফরে থাকো… এবং পানি না পাও, তবে পবিত্র মাটি দিয়ে তায়াম্মুম করো, তা দিয়ে মুখ ও হাত মাসেহ করো।”',
        source: 'Quran 5:6',
        url: 'https://quran.com/5/6',
        grade: 'Quran',
      },
    ],
  },
];

// ─── du'as of the journey ───────────────────────────────────────────────────

export interface MusafirDua {
  id: string;
  emoji: string;
  when: string;
  whenBn: string;
  arabic: string;
  translit: string;
  meaning: string;
  meaningBn: string;
  source: string;
  url: string;
  grade: string;
  /** Said on the way home rather than on the way out. */
  returning?: boolean;
}

export const MUSAFIR_DUAS: MusafirDua[] = [
  {
    id: 'leaving_home',
    emoji: '🚪',
    when: 'Stepping out of the house',
    whenBn: 'ঘর থেকে বের হওয়ার সময়',
    arabic: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    translit: 'Bismillāh, tawakkaltu ʿalallāh, lā ḥawla wa lā quwwata illā billāh',
    meaning:
      'In the name of Allah, I rely on Allah; there is no might and no power except by Allah. (It is said to him: you are guided, defended and protected.)',
    meaningBn:
      'আল্লাহর নামে, আল্লাহর উপর ভরসা করলাম; আল্লাহ ছাড়া কোনো শক্তি ও ক্ষমতা নেই। (তাকে বলা হয়: তুমি হিদায়াত পেলে, রক্ষা পেলে, নিরাপদ হলে।)',
    source: 'Sunan Abī Dāwūd 5095',
    url: 'https://sunnah.com/abudawud:5095',
    grade: 'Ṣaḥīḥ (al-Albānī)',
  },
  {
    id: 'farewell',
    emoji: '🤝',
    when: 'Bidding farewell to family and friends',
    whenBn: 'পরিবার ও বন্ধুদের বিদায় জানানোর সময়',
    arabic: 'أَسْتَوْدِعُ اللَّهَ دِينَكَ وَأَمَانَتَكَ وَخَوَاتِيمَ عَمَلِكَ',
    translit: 'Astawdiʿullāha dīnaka wa amānataka wa khawātīma ʿamalik',
    meaning: 'I entrust to Allah your religion, your trust, and the final outcome of your deeds.',
    meaningBn: 'তোমার দ্বীন, তোমার আমানত ও তোমার আমলের শেষ পরিণতি আল্লাহর কাছে সোপর্দ করলাম।',
    source: 'Sunan Abī Dāwūd 2600',
    url: 'https://sunnah.com/abudawud:2600',
    grade: 'Ṣaḥīḥ (al-Albānī)',
  },
  {
    id: 'riding',
    emoji: '🚌',
    when: 'Once seated in the car, bus, train or plane',
    whenBn: 'গাড়ি, বাস, ট্রেন বা বিমানে বসার পর',
    arabic:
      'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الْأَهْلِ',
    translit:
      'Allāhu akbar (×3). Subḥānalladhī sakhkhara lanā hādhā wa mā kunnā lahū muqrinīn, wa innā ilā rabbinā lamunqalibūn. Allāhumma innā nasʾaluka fī safarinā hādhal-birra wat-taqwā, wa minal-ʿamali mā tarḍā. Allāhumma hawwin ʿalaynā safaranā hādhā waṭwi ʿannā buʿdah. Allāhumma antaṣ-ṣāḥibu fis-safar, wal-khalīfatu fil-ahl…',
    meaning:
      'Allah is the Greatest (×3). Glory be to Him who has placed this at our service, for we could never have done it ourselves, and to our Lord we shall surely return. O Allah, we ask You on this journey for righteousness and piety, and deeds that please You. O Allah, make this journey easy for us and fold up its distance. O Allah, You are the Companion on the journey and the Guardian of the family…',
    meaningBn:
      'আল্লাহ সবচেয়ে বড় (৩ বার)। পবিত্র তিনি, যিনি একে আমাদের বশীভূত করেছেন, আমরা নিজেরা একে বশ করতে পারতাম না, আর অবশ্যই আমরা আমাদের রবের কাছে ফিরে যাব। হে আল্লাহ, এই সফরে আমরা তোমার কাছে নেকি, তাকওয়া ও তোমার পছন্দনীয় আমল চাই। হে আল্লাহ, এই সফর আমাদের জন্য সহজ করো এবং এর দূরত্ব সংক্ষিপ্ত করো। হে আল্লাহ, তুমিই সফরের সাথী এবং পরিবারের তত্ত্বাবধায়ক…',
    source: 'Ṣaḥīḥ Muslim 1342',
    url: 'https://sunnah.com/muslim:1342',
    grade: 'Ṣaḥīḥ',
  },
  {
    id: 'up_down',
    emoji: '⛰️',
    when: 'Going up (take-off, a hill) and coming down',
    whenBn: 'উপরে ওঠার সময় (টেক-অফ, পাহাড়) ও নামার সময়',
    arabic: 'اللَّهُ أَكْبَرُ … سُبْحَانَ اللَّهِ',
    translit: 'Allāhu akbar (going up) … Subḥānallāh (coming down)',
    meaning:
      'Jābir: whenever we went up we said “Allāhu akbar”, and whenever we went down we said “Subḥānallāh”.',
    meaningBn: 'জাবির (রা.): আমরা উপরে উঠতে “আল্লাহু আকবার” আর নিচে নামতে “সুবহানাল্লাহ” বলতাম।',
    source: 'Ṣaḥīḥ al-Bukhārī 2993',
    url: 'https://sunnah.com/bukhari:2993',
    grade: 'Ṣaḥīḥ',
  },
  {
    id: 'stopping',
    emoji: '🏕️',
    when: 'Arriving at a hotel, rest stop or any new place',
    whenBn: 'হোটেল, বিরতিস্থল বা নতুন কোনো জায়গায় পৌঁছালে',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    translit: 'Aʿūdhu bi-kalimātillāhit-tāmmāti min sharri mā khalaq',
    meaning:
      'I seek refuge in the perfect words of Allah from the evil of what He has created. (Nothing will harm him until he leaves that place.)',
    meaningBn:
      'আল্লাহর পরিপূর্ণ বাণীসমূহের আশ্রয় চাই তাঁর সৃষ্টির অনিষ্ট থেকে। (সে জায়গা ছাড়া পর্যন্ত কিছুই তার ক্ষতি করবে না।)',
    source: 'Ṣaḥīḥ Muslim 2708',
    url: 'https://sunnah.com/muslim:2708',
    grade: 'Ṣaḥīḥ',
  },
  {
    id: 'returning',
    emoji: '🏡',
    when: 'On the way home (the riding du‘ā, then add this)',
    whenBn: 'ফেরার পথে (বাহনের দু‘আর পর এটি যোগ করুন)',
    arabic: 'آيِبُونَ، تَائِبُونَ، عَابِدُونَ، لِرَبِّنَا حَامِدُونَ',
    translit: 'Āyibūna, tāʾibūna, ʿābidūna, li-rabbinā ḥāmidūn',
    meaning: 'We return, repenting, worshipping, and praising our Lord.',
    meaningBn: 'আমরা প্রত্যাবর্তনকারী, তাওবাকারী, ইবাদতকারী, আমাদের রবের প্রশংসাকারী।',
    source: 'Ṣaḥīḥ Muslim 1342',
    url: 'https://sunnah.com/muslim:1342',
    grade: 'Ṣaḥīḥ',
    returning: true,
  },
];

// Per-day "said it" marks for the du'a checklist. Device-local on purpose: a
// tiny daily habit tracker, not account data.
export function getDuasSaid(today: string): string[] {
  try {
    const raw = localStorage.getItem(DUAS_SAID_KEY);
    const p = raw ? (JSON.parse(raw) as { date?: string; ids?: unknown }) : null;
    return p?.date === today && Array.isArray(p.ids)
      ? p.ids.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

export function setDuasSaid(today: string, ids: string[]): void {
  try {
    localStorage.setItem(DUAS_SAID_KEY, JSON.stringify({ date: today, ids }));
  } catch {
    /* private mode */
  }
}
