// Sunnah/nafl rak'ah guidance tied to each fard prayer — "what should I pray
// around this fard, and how many rak'ahs." Same AUTHENTICITY POLICY as
// postSalatQuran.ts: only ṣaḥīḥ/ḥasan narrations, and anything less than
// ṣaḥīḥ is graded plainly rather than presented as equally certain.
//
// muakkadah  = Sunnah Mu'akkadah — confirmed/emphasized, the Prophet ﷺ
//              prayed these consistently. The 12 rak'ah "rawātib" set
//              (4+2 Dhuhr, 2 Maghrib, 2 Isha, 2 Fajr) comes from one hadith
//              (Umm Ḥabībah, Ṣaḥīḥ Muslim 728 / Jāmiʿ at-Tirmidhī 415):
//              "Whoever prays twelve rak'ahs during a day and a night, a
//              house will be built for him in Paradise."
// ghairMuakkadah = recommended but not confirmed/emphasized the same way —
//              authentically reported, but either a lighter narration
//              ("for whoever wishes") or not part of the 12-rak'ah set.

import type { PrayerId } from '../hooks/useSalatLog.js';

export type SunnahEmphasis = 'muakkadah' | 'ghairMuakkadah';

export interface SunnahSlot {
  rakat: number;
  emphasis: SunnahEmphasis;
  note: string;
  source: string;
  sourceUrl: string;
  grade: string;
}

export interface PrayerSunnahGuide {
  fardRakat: number;
  before?: SunnahSlot;
  after?: SunnahSlot;
}

export const SUNNAH_GUIDE: Partial<Record<PrayerId, PrayerSunnahGuide>> = {
  fajr: {
    fardRakat: 2,
    before: {
      rakat: 2,
      emphasis: 'muakkadah',
      note: 'The most emphasized of all the rawātib — never left even on a journey.',
      source: 'Ṣaḥīḥ Muslim 725',
      sourceUrl: 'https://sunnah.com/muslim:725',
      grade: 'Ṣaḥīḥ — "better than the world and everything in it"',
    },
  },
  dhuhr: {
    fardRakat: 4,
    before: {
      rakat: 4,
      emphasis: 'muakkadah',
      note: "Part of the Prophet's ﷺ twelve daily rawātib.",
      source: 'Ṣaḥīḥ Muslim 728',
      sourceUrl: 'https://sunnah.com/muslim:728',
      grade: 'Ṣaḥīḥ',
    },
    after: {
      rakat: 2,
      emphasis: 'muakkadah',
      note: "Part of the Prophet's ﷺ twelve daily rawātib.",
      source: 'Ṣaḥīḥ Muslim 728',
      sourceUrl: 'https://sunnah.com/muslim:728',
      grade: 'Ṣaḥīḥ',
    },
  },
  asr: {
    fardRakat: 4,
    before: {
      rakat: 4,
      emphasis: 'ghairMuakkadah',
      note: 'Recommended, not among the confirmed twelve — a lighter emphasis than the Dhuhr/Fajr rawātib.',
      source: 'Jāmiʿ at-Tirmidhī 430',
      sourceUrl: 'https://sunnah.com/tirmidhi:430',
      grade: 'Ḥasan — "May Allah have mercy on one who prays four before ʿAṣr"',
    },
  },
  maghrib: {
    fardRakat: 3,
    before: {
      rakat: 2,
      emphasis: 'ghairMuakkadah',
      note: 'The Prophet ﷺ said it three times then added "for whoever wishes" — genuinely optional, not a fixed rawātib slot.',
      source: 'Ṣaḥīḥ al-Bukhārī 1183',
      sourceUrl: 'https://sunnah.com/bukhari:1183',
      grade: 'Ṣaḥīḥ',
    },
    after: {
      rakat: 2,
      emphasis: 'muakkadah',
      note: "Part of the Prophet's ﷺ twelve daily rawātib.",
      source: 'Ṣaḥīḥ Muslim 728',
      sourceUrl: 'https://sunnah.com/muslim:728',
      grade: 'Ṣaḥīḥ',
    },
  },
  isha: {
    fardRakat: 4,
    after: {
      rakat: 2,
      emphasis: 'muakkadah',
      note: "Part of the Prophet's ﷺ twelve daily rawātib — Witr comes after this, separately (see the Witr reminder below).",
      source: 'Ṣaḥīḥ Muslim 728',
      sourceUrl: 'https://sunnah.com/muslim:728',
      grade: 'Ṣaḥīḥ',
    },
  },
};

/**
 * Jumu'ah replaces Ẓuhr on Friday (still tracked internally as `PrayerId`
 * 'dhuhr' — see useSalatLog.ts), but its sunnah guidance is genuinely
 * different and must NOT fall back to SUNNAH_GUIDE.dhuhr above: that entry's
 * citation (Ṣaḥīḥ Muslim 728, Umm Ḥabībah's 12-rawātib hadith) is specifically
 * about Ẓuhr and says nothing about Jumu'ah at all. Verified against
 * sunnah.com before writing:
 *
 * - BEFORE: no ṣaḥīḥ hadith prescribes a specific rak'ah count before Jumu'ah
 *   itself (unlike Ẓuhr's clearly-established 4-before from the same
 *   12-rawātib hadith). The 4-rak'ah practice is Ḥanafī tradition, based on
 *   the companion Ibn Mas'ūd's practice + qiyās with Ẓuhr — genuinely
 *   scholarly-disputed, not a confirmed Prophetic sunnah, so graded
 *   'ghairMuakkadah' here rather than 'muakkadah'.
 * - AFTER: TWO distinct authentic narrations exist, for two different
 *   contexts — Abū Hurayrah's ḥadīth (pray 4, general/anywhere — Ṣaḥīḥ
 *   Muslim 881) vs. Ibn 'Umar's report of the Prophet's ﷺ own practice (he
 *   never prayed after Jumu'ah until he returned home, then prayed 2 there —
 *   Ṣaḥīḥ Muslim 882 / Ṣaḥīḥ al-Bukhārī 937). The previous version of this
 *   guide cited "Ṣaḥīḥ Muslim 728" for a fixed 2 rak'ah — that hadith number
 *   doesn't exist for this narration at all (728 is Ẓuhr's), so both the
 *   rak'ah count and the source were wrong together.
 */
export const JUMUAH_SUNNAH_GUIDE: PrayerSunnahGuide = {
  fardRakat: 2,
  before: {
    rakat: 4,
    emphasis: 'ghairMuakkadah',
    note: "Widely practiced (especially in the Ḥanafī tradition, by analogy with Ẓuhr) while waiting for the khuṭbah — but unlike Ẓuhr's rawātib, no ṣaḥīḥ hadith prescribes a specific rak'ah count before Jumu'ah itself. General nafl prayer before the khuṭbah begins is always encouraged.",
    source: 'Ṣaḥīḥ al-Bukhārī 627',
    sourceUrl: 'https://sunnah.com/bukhari:627',
    grade:
      'Muttafaqun ʿalayhi — general principle ("between every two adhans there is a prayer"), no fixed rakʿah count specified for Jumuʿah',
  },
  after: {
    rakat: 2,
    emphasis: 'muakkadah',
    note: "The Prophet ﷺ never prayed after Jumu'ah until he returned home, then prayed 2 rak'ahs there. If praying anywhere other than home (e.g. staying in the mosque), 4 rak'ahs is the alternative sunnah instead.",
    source: 'Ṣaḥīḥ Muslim 882',
    sourceUrl: 'https://sunnah.com/muslim:882',
    grade: 'Ṣaḥīḥ — the 4-rakʿah alternative is also Ṣaḥīḥ (Muslim 881)',
  },
};
