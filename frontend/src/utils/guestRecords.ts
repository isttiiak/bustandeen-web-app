// U10 follow-up: the Quran habit, khatam, hifz and bookmarks pages are open to
// guests. Their queries are off without an account, so these stand in for the
// server's answer: a brand-new account's record (the same defaults as the
// backend models), never a sample. Nothing here is saved anywhere.
import type { QuranSummary } from '../hooks/useQuran.js';
import type { HifzQueue, HifzSummary } from '../hooks/useHifz.js';

export const GUEST_QURAN_SUMMARY: QuranSummary = {
  profile: {
    dailyGoalPages: 2,
    currentPage: 0,
    khatmCount: 0,
    totalPages: 0,
    dailyGoalAyat: 0,
    currentAyah: 0,
    totalAyat: 0,
    khatamStartedAt: null,
    readerPos: {},
    savedDuas: [],
    arabicFont: 'clean',
    fontArabicPx: 30,
    fontTranslationPx: 15,
    fontTranslitPx: 14,
    fontTafsirPx: 17,
    translitEnabled: false,
    listenCountsAsAyat: true,
    reciterId: 'dossari',
    translations: ['en.sahih'],
    displayPrefsSet: false,
  },
  todayPages: 0,
  todayAyat: 0,
  goalMet: false,
  streak: 0,
  bestStreak: 0,
  last7: [],
  stats: { last30Pages: 0, allTimePages: 0, last30Units: 0, allTimeUnits: 0 },
  pace: null,
  estDaysToKhatm: null,
  topSurahs: [],
  since: null,
  bookmarks: [],
};

export const GUEST_HIFZ_SUMMARY: HifzSummary = {
  profile: { dailyNewTarget: 3, dailyRevisionTarget: 15, nextSurah: 1, nextAyah: 1 },
  today: { newCount: 0, revisionCount: 0 },
  newGoalMet: false,
  revisionGoalMet: false,
  dueCount: 0,
  streak: 0,
  bestStreak: 0,
  totals: { new: 0, learning: 0, consolidating: 0, solid: 0, total: 0 },
  heatmap: [],
};

export const GUEST_HIFZ_QUEUE: HifzQueue = { due: [], nextNew: { surah: 1, ayah: 1 } };
