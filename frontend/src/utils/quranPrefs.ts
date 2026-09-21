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

export function getReciterId(): string {
  return localStorage.getItem(RECITER_KEY) || 'dossari';
}
export function setReciterId(id: string): void {
  localStorage.setItem(RECITER_KEY, id);
}
