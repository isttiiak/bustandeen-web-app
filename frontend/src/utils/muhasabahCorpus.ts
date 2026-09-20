// The verified āyah/hadith corpus for the weekly muhāsabah report — the
// differentiator from the old weekly recap card (now removed). This is
// NEVER AI-generated: the AI (getMuhasabahReport) only ever writes the
// reflection/suggestion text, and the guardrail already strips any citation
// it might try to add. The reference shown alongside it always comes from
// this static, hand-picked list instead — same authenticity discipline as
// sunnahGuide.ts (only ṣaḥīḥ/ḥasan, graded plainly).
//
// Quran entries carry only the (surah, ayah) reference — the actual Arabic +
// translation text is fetched at render time via quranData.ts's
// loadSurahText(), the same verified alquran.cloud source the Quran reader
// itself trusts, so no verse text is ever hand-transcribed here.

export interface MuhasabahQuranRef {
  type: 'quran';
  surah: number;
  ayahStart: number;
  ayahEnd: number;
  surahName: string;
}

export interface MuhasabahHadithRef {
  type: 'hadith';
  textEn: string;
  textBn: string;
  source: string;
  sourceUrl: string;
  grade: string;
}

export type MuhasabahRef = MuhasabahQuranRef | MuhasabahHadithRef;

export const MUHASABAH_CORPUS: MuhasabahRef[] = [
  {
    type: 'hadith',
    textEn:
      'The wise one is the one who takes account of himself and works for what comes after death.',
    textBn: 'বুদ্ধিমান সেই ব্যক্তি, যে নিজের হিসাব নেয় এবং মৃত্যুর পরের জন্য আমল করে।',
    source: 'Jāmiʿ at-Tirmidhī 2459',
    sourceUrl: 'https://sunnah.com/tirmidhi:2459',
    grade: 'Ḥasan (graded by al-Albānī)',
  },
  { type: 'quran', surah: 59, ayahStart: 18, ayahEnd: 18, surahName: 'Al-Ḥashr' },
  { type: 'quran', surah: 13, ayahStart: 11, ayahEnd: 11, surahName: "Ar-Ra'd" },
  { type: 'quran', surah: 94, ayahStart: 5, ayahEnd: 6, surahName: 'Ash-Sharh' },
  { type: 'quran', surah: 39, ayahStart: 53, ayahEnd: 53, surahName: 'Az-Zumar' },
  { type: 'quran', surah: 2, ayahStart: 286, ayahEnd: 286, surahName: 'Al-Baqarah' },
  { type: 'quran', surah: 103, ayahStart: 1, ayahEnd: 3, surahName: "Al-'Asr" },
];

/** ISO-week-stable pick — same week always shows the same reference, next
 * week rotates to a different one. Same week numbering the Naseeh cards use. */
export function weekIdForMuhasabah(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function pickMuhasabahRef(weekId: string): MuhasabahRef {
  const idx = hashString(weekId) % MUHASABAH_CORPUS.length;
  return MUHASABAH_CORPUS[idx];
}
