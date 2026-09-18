import { forwardRef } from 'react';
import { surahDisplayName } from '../utils/quranData.js';
import { getArabicFont } from '../utils/quranPrefs.js';
import type { SurahMeta, AyahText } from '../utils/quranData.js';

export const SHARE_CARD_SIZE = 1080;

export interface ShareCardTheme {
  id: string;
  label: string;
  /** decorative radial glow + base gradient — dark-first, matches the accent */
  background: string;
  border: string;
  /** used for the āyah reference, the footer dot, and the glow tint */
  accent: string;
}

/** All dark-first, built from the app's existing brand tokens (CLAUDE.md
 * design system) — emerald is the app's primary, gold/magenta are its
 * existing secondary accents, and slate is a quiet, unbranded option. */
export const SHARE_CARD_THEMES: ShareCardTheme[] = [
  {
    id: 'emerald',
    label: 'Emerald',
    background:
      'radial-gradient(circle at 25% 15%, rgba(16,185,129,0.14), transparent 55%), linear-gradient(135deg, #0d1b17 0%, #0a1412 55%, #0d1420 100%)',
    border: 'rgba(16,185,129,0.18)',
    accent: '#10b981',
  },
  {
    id: 'gold',
    label: 'Gold',
    background:
      'radial-gradient(circle at 25% 15%, rgba(245,158,11,0.14), transparent 55%), linear-gradient(135deg, #1a1510 0%, #120e0a 55%, #0d0b08 100%)',
    border: 'rgba(245,158,11,0.2)',
    accent: '#f59e0b',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    background:
      'radial-gradient(circle at 25% 15%, rgba(192,38,212,0.12), transparent 55%), linear-gradient(135deg, #0d1220 0%, #0a0a14 55%, #120a18 100%)',
    border: 'rgba(192,38,212,0.18)',
    accent: '#c026d3',
  },
  {
    id: 'slate',
    label: 'Slate',
    background: 'linear-gradient(135deg, #080c12 0%, #0a0e14 100%)',
    border: 'rgba(148,163,184,0.16)',
    accent: '#94a3b8',
  },
];

export const DEFAULT_SHARE_CARD_THEME = SHARE_CARD_THEMES[0]!;

const THEME_KEY = 'bustandeen_share_card_theme';

export function getShareCardTheme(): ShareCardTheme {
  const id = localStorage.getItem(THEME_KEY);
  return SHARE_CARD_THEMES.find((t) => t.id === id) ?? DEFAULT_SHARE_CARD_THEME;
}
export function setShareCardTheme(id: string): void {
  localStorage.setItem(THEME_KEY, id);
}

export interface AyahShareCardProps {
  surahMeta: SurahMeta | null;
  surahNo: number;
  ayah: AyahText | null;
  showTransliteration: boolean;
  lang: string;
  theme: ShareCardTheme;
}

/**
 * 1.0 = the original hand-tuned sizes below, for a short ayah. Scales down
 * for longer content so the fixed 1080×1080 capture frame doesn't overflow —
 * html-to-image has no scroll or reflow-to-fit, so anything that doesn't fit
 * the frame is just clipped or overlaps the footer. Anchored on the Quran's
 * actual longest ayah (2:282, ~1300 combined characters with a translation)
 * landing near the bottom of the range rather than falling off it entirely.
 */
function fontScale(charCount: number): number {
  const SHORT = 150;
  const LONG = 1100;
  const MIN_SCALE = 0.5;
  if (charCount <= SHORT) return 1;
  if (charCount >= LONG) return MIN_SCALE;
  return 1 - ((charCount - SHORT) / (LONG - SHORT)) * (1 - MIN_SCALE);
}

/**
 * The rasterized image itself (1080×1080, fixed px — no Tailwind/viewport
 * units) — captured via html-to-image. Kept a plain inline-styled node
 * because html-to-image clones computed styles, and fixed px avoids any
 * ambiguity from Tailwind's rem/breakpoint-relative classes at capture time.
 */
const AyahShareCard = forwardRef<HTMLDivElement, AyahShareCardProps>(function AyahShareCard(
  { surahMeta, surahNo, ayah, showTransliteration, lang, theme },
  ref
) {
  const arabicFont = getArabicFont();
  const ayahRef = ayah ? `${surahNo}:${ayah.numberInSurah}` : `${surahNo}`;

  // Arabic glyphs (with diacritics) run visually "heavier" per character than
  // Latin/Bengali text at the same font size, hence the 1.4x weighting.
  const contentLength =
    (ayah?.arabic?.length ?? 0) * 1.4 +
    (showTransliteration ? (ayah?.transliteration?.length ?? 0) : 0) +
    (ayah?.translations?.reduce((sum, tr) => sum + tr.length, 0) ?? 0);
  const scale = fontScale(contentLength);

  const arabicSize = Math.round(52 * scale);
  const arabicLineHeight = 1.5 + 0.4 * scale;
  const translitSize = Math.round(24 * scale);
  const translationSize = Math.round(26 * scale);
  const bodyGap = Math.round(36 * scale);

  return (
    <div
      ref={ref}
      style={{
        width: SHARE_CARD_SIZE,
        height: SHARE_CARD_SIZE,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        boxSizing: 'border-box',
        background: theme.background,
        border: `1px solid ${theme.border}`,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        // Last-resort safety net, not the primary fix (that's the scaling
        // above) — guarantees a rare extreme case clips cleanly at the
        // frame's own edge instead of overlapping the footer or bleeding
        // past the 1080×1080 capture bounds.
        overflow: 'hidden',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8', fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>
          {surahMeta ? `${surahNo}. ${surahDisplayName(surahMeta, lang)}` : `Surah ${surahNo}`}
        </span>
        <span style={{ color: theme.accent, fontSize: 22, fontWeight: 800 }}>{ayahRef}</span>
      </div>

      {/* body */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: bodyGap,
          textAlign: 'center',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <p
          dir="rtl"
          lang="ar"
          style={{
            fontFamily: arabicFont.stack,
            fontSize: arabicSize,
            lineHeight: arabicLineHeight,
            color: '#f1f5f9',
            margin: 0,
          }}
        >
          {ayah?.arabic ?? ''}
        </p>
        {showTransliteration && ayah?.transliteration && (
          <p
            style={{
              color: 'rgba(245,158,11,0.8)',
              fontStyle: 'italic',
              fontSize: translitSize,
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 820,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {ayah.transliteration}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860 }}>
          {ayah?.translations.map((tr, i) => (
            <p
              key={i}
              style={{
                color: i === 0 ? 'rgba(241,245,249,0.8)' : '#94a3b8',
                fontSize: translationSize,
                lineHeight: 1.65,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {tr}
            </p>
          ))}
        </div>
      </div>

      {/* footer — small brand mark */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: theme.accent,
            display: 'block',
          }}
        />
        <span style={{ color: '#64748b', fontSize: 17, fontWeight: 800, letterSpacing: 3 }}>
          BUSTANDEEN
        </span>
      </div>
    </div>
  );
});

export default AyahShareCard;
