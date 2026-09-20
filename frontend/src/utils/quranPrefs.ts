// Reader typography preferences (Istiak's spec, v4.9):
// - selectable Arabic font, with the EASIEST-to-read one as default
// - free-range px sliders for arabic / translation / transliteration / tafsir
// - optional transliteration line (free source: alquran.cloud en.transliteration)

export interface ArabicFont {
  id: string;
  label: string;
  stack: string;
}

/** Order matters — first is the default. Tahoma's Arabic glyphs are famously
 * clear on every OS; the mushaf-style faces load from Google Fonts. */
export const ARABIC_FONTS: ArabicFont[] = [
  {
    id: 'clean',
    label: 'Clean — easiest to read (default)',
    stack: "Tahoma, 'Segoe UI', 'Noto Naskh Arabic', system-ui, sans-serif",
  },
  {
    id: 'naskh',
    label: 'Naskh — traditional print',
    stack: "'Scheherazade New', 'Noto Naskh Arabic', 'Times New Roman', serif",
  },
  {
    id: 'uthmani',
    label: 'Uthmani — muṣḥaf calligraphy',
    stack: "'Amiri', 'Scheherazade New', serif",
  },
];

const FONT_KEY = 'bustandeen_arabic_font';

export function getArabicFont(): ArabicFont {
  const id = localStorage.getItem(FONT_KEY);
  return ARABIC_FONTS.find((f) => f.id === id) ?? ARABIC_FONTS[0]!;
}
export function setArabicFont(id: string): void {
  localStorage.setItem(FONT_KEY, id);
}

// ── Font size sliders (px) ───────────────────────────────────────────────────

export type FontKind = 'arabic' | 'translation' | 'translit' | 'tafsir';

export const FONT_RANGES: Record<FontKind, { min: number; max: number; def: number }> = {
  arabic: { min: 22, max: 52, def: 30 },
  translation: { min: 12, max: 26, def: 15 },
  translit: { min: 11, max: 24, def: 14 },
  tafsir: { min: 13, max: 28, def: 17 },
};

const sizeKey = (kind: FontKind) => `bustandeen_qfs_${kind}`;

export function getFontPx(kind: FontKind): number {
  const { min, max, def } = FONT_RANGES[kind];
  const v = Number(localStorage.getItem(sizeKey(kind)));
  return Number.isFinite(v) && v >= min && v <= max ? v : def;
}
export function setFontPx(kind: FontKind, px: number): void {
  localStorage.setItem(sizeKey(kind), String(px));
}

// ── Transliteration toggle ───────────────────────────────────────────────────

const TRANSLIT_KEY = 'bustandeen_quran_translit';

export function translitEnabled(): boolean {
  return localStorage.getItem(TRANSLIT_KEY) === '1';
}
export function setTranslitEnabled(on: boolean): void {
  localStorage.setItem(TRANSLIT_KEY, on ? '1' : '0');
}

// ── Listening → ayat counting toggle ────────────────────────────────────────

const LISTEN_COUNTS_KEY = 'bustandeen_quran_listen_counts';

export function listenCountsAsAyat(): boolean {
  const v = localStorage.getItem(LISTEN_COUNTS_KEY);
  return v !== '0';
}
export function setListenCountsAsAyat(on: boolean): void {
  localStorage.setItem(LISTEN_COUNTS_KEY, on ? '1' : '0');
}

// ── Reciter + translations (also read directly by quranData.ts) ────────────

const RECITER_KEY = 'bustandeen_reciter';
const TRANSLATIONS_KEY = 'bustandeen_quran_translations';

export function getReciterId(): string {
  return localStorage.getItem(RECITER_KEY) || 'dossari';
}
export function setReciterId(id: string): void {
  localStorage.setItem(RECITER_KEY, id);
}

// ── Cross-device sync ────────────────────────────────────────────────────────
// Every getter/setter above stays a plain synchronous localStorage read/write
// — callers throughout the reader (AyahShareCard, QuranReader, etc.) read
// these inline on every render with no React Query involved, so keeping them
// synchronous avoids a much larger refactor. Cross-device sync instead layers
// on top: QuranSettings.tsx pulls the server's values into localStorage via
// applyServerQuranPrefs() once per session (mirroring server → local, same
// direction as goal/readerPos), then every local change is also pushed to
// the server via useUpdateQuranProfile so the next device to open Settings
// pulls the same values.

export interface ServerQuranPrefs {
  arabicFont: 'clean' | 'naskh' | 'uthmani';
  fontArabicPx: number;
  fontTranslationPx: number;
  fontTranslitPx: number;
  fontTafsirPx: number;
  translitEnabled: boolean;
  listenCountsAsAyat: boolean;
  reciterId: string;
  translations: string[];
}

/** Overwrites local prefs with the server's — call only when the server is
 *  the known-authoritative source (see displayPrefsSet's doc comment on the
 *  backend model for why "already synced" vs "never synced" matters here). */
export function applyServerQuranPrefs(prefs: ServerQuranPrefs): void {
  setArabicFont(prefs.arabicFont);
  setFontPx('arabic', prefs.fontArabicPx);
  setFontPx('translation', prefs.fontTranslationPx);
  setFontPx('translit', prefs.fontTranslitPx);
  setFontPx('tafsir', prefs.fontTafsirPx);
  setTranslitEnabled(prefs.translitEnabled);
  setListenCountsAsAyat(prefs.listenCountsAsAyat);
  setReciterId(prefs.reciterId);
  if (prefs.translations.length) {
    localStorage.setItem(TRANSLATIONS_KEY, JSON.stringify(prefs.translations));
  }
}

/** This device's current local prefs, shaped for the PATCH /api/quran/profile
 *  body — used for the one-time "push local up" side of the sync above. */
export function getLocalQuranPrefsForSync(): ServerQuranPrefs {
  return {
    arabicFont: getArabicFont().id as 'clean' | 'naskh' | 'uthmani',
    fontArabicPx: getFontPx('arabic'),
    fontTranslationPx: getFontPx('translation'),
    fontTranslitPx: getFontPx('translit'),
    fontTafsirPx: getFontPx('tafsir'),
    translitEnabled: translitEnabled(),
    listenCountsAsAyat: listenCountsAsAyat(),
    reciterId: getReciterId(),
    translations: JSON.parse(localStorage.getItem(TRANSLATIONS_KEY) ?? '["en.sahih"]'),
  };
}
