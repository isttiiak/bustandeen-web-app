// Recitations tied to a specific prayer or time, each linked straight into the
// Quran reader so the habit is one tap away instead of a search.
//
// AUTHENTICITY POLICY (Istiak's standing rule, reaffirmed 2026-07-26):
// only ṣaḥīḥ/ḥasan narrations appear here. Popular time-linked virtues that
// rest on weak chains are deliberately ABSENT — most notably "whoever recites
// al-Wāqiʿah every night will never be afflicted by poverty" (al-Bayhaqī,
// Shuʿab al-Īmān 2269), graded ḍaʿīf by al-Albānī and others. The app already
// lists al-Wāqiʿah, Yā-Sīn and ar-Raḥmān WITHOUT virtue claims for this reason.

import type { PrayerId } from '../hooks/useSalatLog.js';

export interface SalatRecitation {
  id: string;
  /** Display name */
  label: string;
  /** True when the virtue rests on a WEAK chain. The UI must show the caveat
   * inline — never let a ḍaʿīf virtue read like a ṣaḥīḥ one. */
  weak?: boolean;
  /** Why it is still offered despite the weakness (shown with the caveat). */
  caveat?: string;
  /** Surah number for the reader link */
  surah: number;
  /** Optional ayah bounds — used for Ayat al-Kursi (2:255) */
  start?: number;
  end?: number;
  emoji: string;
  note: string;
  source: string;
  sourceUrl: string;
  grade: string;
  /** 'all' = after every fard prayer; otherwise the specific prayers */
  prayers: PrayerId[] | 'all';
  /** Restrict to Fridays */
  fridayOnly?: boolean;
}

export const SALAT_RECITATIONS: SalatRecitation[] = [
  {
    id: 'ayatul-kursi',
    label: 'Ayatul Kursi',
    surah: 2,
    start: 255,
    end: 255,
    emoji: '📖',
    note: 'Nothing prevents him from entering Paradise except death.',
    source: "an-Nasāʾī, ʿAmal al-Yawm wa'l-Layla 100",
    sourceUrl: 'https://quran.com/2/255',
    grade: 'Ṣaḥīḥ (al-Albānī, Silsilah aṣ-Ṣaḥīḥah 972)',
    prayers: 'all',
  },
  {
    id: 'ikhlas',
    label: 'Al-Ikhlāṣ',
    surah: 112,
    emoji: '🕊️',
    note: 'Among the Muʿawwidhāt the Prophet ﷺ ordered after every prayer.',
    source: 'Sunan Abī Dāwūd 1523',
    sourceUrl: 'https://sunnah.com/abudawud:1523',
    grade: 'Ṣaḥīḥ (al-Albānī)',
    prayers: 'all',
  },
  {
    id: 'falaq',
    label: 'Al-Falaq',
    surah: 113,
    emoji: '🌅',
    note: 'Among the Muʿawwidhāt the Prophet ﷺ ordered after every prayer.',
    source: 'Sunan Abī Dāwūd 1523',
    sourceUrl: 'https://sunnah.com/abudawud:1523',
    grade: 'Ṣaḥīḥ (al-Albānī)',
    prayers: 'all',
  },
  {
    id: 'nas',
    label: 'An-Nās',
    surah: 114,
    emoji: '🛡️',
    note: 'Among the Muʿawwidhāt the Prophet ﷺ ordered after every prayer.',
    source: 'Sunan Abī Dāwūd 1523',
    sourceUrl: 'https://sunnah.com/abudawud:1523',
    grade: 'Ṣaḥīḥ (al-Albānī)',
    prayers: 'all',
  },
  {
    id: 'kahf',
    label: 'Al-Kahf',
    surah: 18,
    emoji: '🌟',
    note: 'Read on Friday — "a light will shine for him between the two Fridays."',
    source: 'Ṣaḥīḥ at-Targhīb 736 (al-Ḥākim)',
    sourceUrl: 'https://sunnah.com/virtues:36',
    grade: 'Ṣaḥīḥ',
    prayers: ['fajr', 'dhuhr', 'asr'],
    fridayOnly: true,
  },
  {
    id: 'waqiah',
    label: 'Al-Wāqiʿah',
    surah: 56,
    emoji: '🌾',
    // Deliberately describes the PRACTICE, not the reward — the reward claim is
    // what the weak chain carries.
    note: 'Ibn Masʿūd (ra) told his daughters to read it each night.',
    source: 'al-Bayhaqī, Shuʿab al-Īmān 2269',
    sourceUrl: 'https://quran.com/56',
    grade: 'Ḍaʿīf — weak chain',
    weak: true,
    caveat:
      'The famous wording "whoever reads al-Wāqiʿah every night will never be afflicted by poverty" has a weak chain (ḍaʿīf per al-Albānī; some routes graded fabricated). What IS established is that ʿAbdullāh ibn Masʿūd (ra) himself instructed his daughters to recite it nightly. Many scholars permit acting on a weak narration for encouragement (faḍāʾil al-aʿmāl); others do not. Read it as a good habit — not as a guarantee of wealth. Note the narration says "every night", not specifically after Maghrib.',
    prayers: ['maghrib'],
  },
  {
    id: 'mulk',
    label: 'Al-Mulk',
    surah: 67,
    emoji: '🌙',
    note: 'Recited each night before sleeping — it pleads for the one who reads it.',
    source: 'Jāmiʿ at-Tirmidhī 2891',
    sourceUrl: 'https://sunnah.com/tirmidhi:2891',
    grade: 'Ḥasan',
    prayers: ['isha'],
  },
];

/** Reader deep link. Bounded ranges open in bundle mode (they show a Finish
 * button and don't count toward the daily goal); whole surahs open in single
 * mode, which does count. Mirrors the existing reader contract. */
export function recitationHref(r: SalatRecitation): string {
  if (r.start != null && r.end != null) {
    return `/quran/read/${r.surah}?start=${r.start}&end=${r.end}&mode=bundle`;
  }
  return `/quran/read/${r.surah}?mode=single`;
}

/** Which recitations belong to this prayer today. */
export function recitationsFor(prayer: PrayerId, friday: boolean): SalatRecitation[] {
  return SALAT_RECITATIONS.filter((r) => {
    if (r.fridayOnly && !friday) return false;
    return r.prayers === 'all' || r.prayers.includes(prayer);
  });
}
