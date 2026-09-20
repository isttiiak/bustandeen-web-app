import mongoose, { Schema, Document } from 'mongoose';

/** Standard Madani mushaf page count */
export const QURAN_TOTAL_PAGES = 604;
/** Total ayat in the Quran (Kufan count — the standard numbering) */
export const QURAN_TOTAL_AYAT = 6236;

export interface IQuranProfile extends Document {
  userId: string;
  /** Daily reading goal in pages */
  dailyGoalPages: number;
  /** Pages completed of the current khatm (0..603); reaching 604 completes it */
  currentPage: number;
  /** Number of complete read-throughs */
  khatmCount: number;
  /** Daily reading goal in AYAT (v4 engine; ~10 ayat ≈ 1 page). Default 0 —
   * fully OPT-IN (Istiak's spec): the user sets it themselves in settings. */
  dailyGoalAyat: number;
  /** Global ayah index of the khatam bookmark (0..6235) */
  currentAyah: number;
  /** When the user explicitly began their khatam journey (opt-in); null = not started */
  khatamStartedAt: Date | null;
  /** Reader resume positions per surah ("1".."114" → ayah) — server-side so
   * "continue where you left off" is consistent across devices */
  readerPos: Map<string, number>;
  /** Saved duʿā ids from the curated "Duas from the Quran" list */
  savedDuas: string[];
  /** Times each surah has been read to the end ("1".."114") — powers the
   * "top surahs" list (completions, not raw ayat). */
  surahCounts: Map<string, number>;
  /** Saved ayat [{surah, ayah}] — capped at 100 */
  bookmarks: Array<{ surah: number; ayah: number }>;
  /** Reading/display preferences — server-side so they're consistent across
   * devices, mirroring readerPos's own rationale above. Defaults here match
   * frontend/src/utils/quranPrefs.ts's pre-existing localStorage defaults
   * exactly, so a freshly-created profile changes nothing for an existing
   * single-device user. */
  arabicFont: 'clean' | 'naskh' | 'uthmani';
  fontArabicPx: number;
  fontTranslationPx: number;
  fontTranslitPx: number;
  fontTafsirPx: number;
  translitEnabled: boolean;
  listenCountsAsAyat: boolean;
  reciterId: string;
  /** Up to 2 translation edition ids, primary first */
  translations: string[];
  /** Flips true the first time any display-pref field above is explicitly
   * saved from a device — lets the client tell "never synced yet, safe to
   * push this device's local prefs up" apart from "already synced
   * elsewhere, pull those down instead" without comparing against defaults
   * (a user legitimately choosing the default value must not look
   * "unset"). */
  displayPrefsSet: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const quranProfileSchema = new Schema<IQuranProfile>(
  {
    userId: { type: String, required: true, unique: true },
    dailyGoalPages: { type: Number, default: 2, min: 1, max: 604 },
    currentPage: { type: Number, default: 0, min: 0, max: QURAN_TOTAL_PAGES - 1 },
    khatmCount: { type: Number, default: 0, min: 0 },
    dailyGoalAyat: { type: Number, default: 0, min: 0, max: 6236 },
    currentAyah: { type: Number, default: 0, min: 0, max: 6235 },
    khatamStartedAt: { type: Date, default: null },
    readerPos: { type: Map, of: Number, default: {} },
    savedDuas: { type: [String], default: [] },
    surahCounts: { type: Map, of: Number, default: {} },
    bookmarks: {
      type: [
        {
          surah: { type: Number, min: 1, max: 114 },
          ayah: { type: Number, min: 1, max: 286 },
          _id: false,
        },
      ],
      default: [],
    },
    arabicFont: { type: String, enum: ['clean', 'naskh', 'uthmani'], default: 'clean' },
    fontArabicPx: { type: Number, default: 30, min: 22, max: 52 },
    fontTranslationPx: { type: Number, default: 15, min: 12, max: 26 },
    fontTranslitPx: { type: Number, default: 14, min: 11, max: 24 },
    fontTafsirPx: { type: Number, default: 17, min: 13, max: 28 },
    translitEnabled: { type: Boolean, default: false },
    listenCountsAsAyat: { type: Boolean, default: true },
    reciterId: { type: String, default: 'dossari', maxlength: 40 },
    translations: { type: [String], default: ['en.sahih'] },
    displayPrefsSet: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IQuranProfile>('QuranProfile', quranProfileSchema);
