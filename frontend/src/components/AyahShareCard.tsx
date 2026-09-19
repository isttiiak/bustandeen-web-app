import { forwardRef, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { surahDisplayName } from '../utils/quranData.js';
import { getArabicFont } from '../utils/quranPrefs.js';
import type { SurahMeta, AyahText } from '../utils/quranData.js';
import {
  SHARE_CARD_INTENSITIES,
  SHARE_CARD_RATIOS,
  hexToRgb,
  type ShareCardIntensityId,
  type ShareCardOrnamentId,
  type ShareCardPatternId,
  type ShareCardRatio,
  type ShareCardTheme,
} from '../utils/shareCardDesign.js';
import { OrnamentLayer, PatternLayer } from './ShareCardGraphics.js';

export interface AyahShareCardProps {
  surahMeta: SurahMeta | null;
  surahNo: number;
  ayah: AyahText | null;
  showTransliteration: boolean;
  lang: string;
  theme: ShareCardTheme;
  ratio?: ShareCardRatio;
  pattern?: ShareCardPatternId;
  ornament?: ShareCardOrnamentId;
  intensity?: ShareCardIntensityId;
}

const BENGALI = /[ঀ-৿]/;
const LATIN_STACK = "'Plus Jakarta Sans', system-ui, sans-serif";
// Bengali conjuncts are visually denser and taller than Latin, so they get a
// Bengali-first stack, a slightly larger size and a looser line height.
const BENGALI_STACK =
  "'Noto Sans Bengali', 'Hind Siliguri', 'Kalpurush', 'Nirmala UI', 'Plus Jakarta Sans', system-ui, sans-serif";

/**
 * 1.0 = the original hand-tuned sizes for a short ayah. Scales down for longer
 * content so the fixed capture frame doesn't overflow: html-to-image has no
 * scroll or reflow-to-fit. `room` is how much taller than the square frame the
 * text area is, so a portrait or story card tolerates proportionally more text.
 * Anchored on the Quran's longest ayah (2:282, ~1300 combined characters).
 */
function fontScale(charCount: number, room: number): number {
  const SHORT = 150 * room;
  const LONG = 1100 * room;
  const MIN_SCALE = 0.5;
  if (charCount <= SHORT) return 1;
  if (charCount >= LONG) return MIN_SCALE;
  return 1 - ((charCount - SHORT) / (LONG - SHORT)) * (1 - MIN_SCALE);
}

const FADE_MASK = 'linear-gradient(to bottom, #000 0, #000 calc(100% - 1.7em), transparent 100%)';

/**
 * A translation clamped to N lines. When the text is actually cut off, the last
 * line fades out so it reads as "there is more" rather than a rendering glitch.
 */
function ClampedText({
  text,
  lines,
  style,
  deps,
}: {
  text: string;
  lines: number;
  style: CSSProperties;
  deps: unknown[];
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [clipped, setClipped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setClipped(el.scrollHeight > el.clientHeight + 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure when layout inputs change
  }, [text, lines, ...deps]);

  return (
    <p
      ref={ref}
      style={{
        margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: lines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        ...(clipped ? { WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK } : null),
        ...style,
      }}
    >
      {text}
    </p>
  );
}

/**
 * The rasterized image itself (fixed px, no Tailwind/viewport units), captured
 * via html-to-image. Kept a plain inline-styled node because html-to-image
 * clones computed styles, and fixed px avoids any ambiguity from Tailwind's
 * rem/breakpoint-relative classes at capture time.
 */
const AyahShareCard = forwardRef<HTMLDivElement, AyahShareCardProps>(function AyahShareCard(
  {
    surahMeta,
    surahNo,
    ayah,
    showTransliteration,
    lang,
    theme,
    ratio = SHARE_CARD_RATIOS[0]!,
    pattern = 'none',
    ornament = 'none',
    intensity = 'medium',
  },
  ref
) {
  const arabicFont = getArabicFont();
  const ayahNo = ayah ? ayah.numberInSurah : null;
  const { width, height } = ratio;
  const strength = SHARE_CARD_INTENSITIES.find((i) => i.id === intensity)?.mult ?? 1;
  const { r, g, b } = hexToRgb(theme.accent);

  // Arabic glyphs (with diacritics) run visually "heavier" per character than
  // Latin/Bengali text at the same font size, hence the 1.4x weighting.
  const contentLength =
    (ayah?.arabic?.length ?? 0) * 1.4 +
    (showTransliteration ? (ayah?.transliteration?.length ?? 0) : 0) +
    (ayah?.translations?.reduce((sum, tr) => sum + tr.length, 0) ?? 0);
  const room = height / 1080;
  const scale = fontScale(contentLength, room) * ratio.fontBoost;

  const arabicSize = Math.round(52 * scale);
  const arabicLineHeight = 1.5 + 0.4 * Math.min(scale, 1);
  const translitSize = Math.round(24 * scale);
  const translationSize = Math.round(26 * scale);
  const bodyGap = Math.round(36 * scale);
  // taller frames can show more translation lines before clamping
  const translationLines = Math.round(5 * room);
  const translitLines = Math.round(3 * room);

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        boxSizing: 'border-box',
        background: theme.background,
        border: `1px solid ${theme.border}`,
        fontFamily: LATIN_STACK,
        // Last-resort safety net, not the primary fix (that's the scaling
        // above): a rare extreme case clips cleanly at the frame's own edge.
        overflow: 'hidden',
      }}
    >
      <PatternLayer
        pattern={pattern}
        width={width}
        height={height}
        accent={theme.accent}
        strength={strength}
      />
      <OrnamentLayer
        ornament={ornament}
        width={width}
        height={height}
        accent={theme.accent}
        strength={strength}
      />

      {/* header */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: theme.muted, fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>
          {surahMeta ? `${surahNo}. ${surahDisplayName(surahMeta, lang)}` : `Surah ${surahNo}`}
        </span>
        <span
          style={{
            color: theme.accent,
            background: `rgba(${r},${g},${b},0.14)`,
            border: `1px solid rgba(${r},${g},${b},0.4)`,
            borderRadius: 999,
            padding: '6px 18px',
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          {ayahNo !== null ? `${surahNo}:${ayahNo}` : surahNo}
        </span>
      </div>

      {/* body */}
      <div
        style={{
          position: 'relative',
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
            color: theme.text,
            margin: 0,
          }}
        >
          {ayah?.arabic ?? ''}
        </p>
        {showTransliteration && ayah?.transliteration && (
          <ClampedText
            text={ayah.transliteration}
            lines={translitLines}
            deps={[translitSize, width, height]}
            style={{
              color: theme.translit,
              fontStyle: 'italic',
              fontSize: translitSize,
              lineHeight: 1.6,
              maxWidth: 820,
            }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860 }}>
          {ayah?.translations.map((tr, i) => {
            const bn = BENGALI.test(tr);
            return (
              <ClampedText
                key={i}
                text={tr}
                lines={translationLines}
                deps={[translationSize, width, height]}
                style={{
                  color: i === 0 ? theme.body : theme.muted,
                  fontFamily: bn ? BENGALI_STACK : LATIN_STACK,
                  fontSize: Math.round(translationSize * (bn ? 1.1 : 1)),
                  lineHeight: bn ? 1.85 : 1.65,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* footer: small brand mark */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: theme.accent,
            display: 'block',
          }}
        />
        <span style={{ color: theme.muted, fontSize: 17, fontWeight: 800, letterSpacing: 3 }}>
          BUSTANDEEN
        </span>
      </div>
    </div>
  );
});

export default AyahShareCard;
