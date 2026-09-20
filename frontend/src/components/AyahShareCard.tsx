import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
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
 * The card is a fixed frame that html-to-image captures as-is (no scroll or
 * reflow), so the text has to be fitted by measuring. Long āyahs (2:282 is the
 * longest, ~1300 combined characters) are handled in stages, and the Arabic is
 * never cut:
 *   1. shrink everything down to SOFT_MIN,
 *   2. still too tall: drop the transliteration and all but the first
 *      translation, so Arabic + one translation stay readable,
 *   3. shrink further down to HARD_MIN,
 *   4. still too tall: clip the translation line by line (fades out).
 */
const SOFT_MIN = 0.8;
const HARD_MIN = 0.68;
// Translations stay legible on a phone screen even when the Arabic shrinks.
const TRANSLATION_MIN = 0.85;
const SHRINK = 0.94;

interface Fit {
  key: string;
  scale: number;
  lean: boolean;
  lines: number;
}

function nextFit(f: Fit): Fit | null {
  if (!f.lean && f.scale > SOFT_MIN) return { ...f, scale: f.scale * SHRINK };
  if (!f.lean) return { ...f, lean: true, scale: Math.min(1, f.scale / SHRINK / SHRINK) };
  if (f.scale > HARD_MIN) return { ...f, scale: f.scale * SHRINK };
  if (f.lines > 2) return { ...f, lines: f.lines - 1 };
  return null;
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

  const bodyRef = useRef<HTMLDivElement>(null);
  // Webfonts change text metrics once they load, so fitting restarts then.
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) setFontsTick(1);
    });
    return () => {
      live = false;
    };
  }, []);

  const key = [
    ayah?.arabic ?? '',
    (ayah?.translations ?? []).join('|'),
    showTransliteration ? (ayah?.transliteration ?? '') : '',
    width,
    height,
    ratio.fontBoost,
    arabicFont.stack,
    fontsTick,
  ].join('#');
  const [fitState, setFitState] = useState<Fit>({ key, scale: 1, lean: false, lines: 40 });
  const fit: Fit = fitState.key === key ? fitState : { key, scale: 1, lean: false, lines: 40 };

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || !ayah) return;
    if (el.scrollHeight > el.clientHeight + 1) {
      const next = nextFit(fit);
      if (next) setFitState(next);
    } else if (fitState.key !== key) {
      setFitState(fit);
    }
  });

  const scale = fit.scale * ratio.fontBoost;
  const translations = fit.lean
    ? (ayah?.translations ?? []).slice(0, 1)
    : (ayah?.translations ?? []);
  const showTranslit = showTransliteration && !fit.lean;

  const arabicSize = Math.round(52 * scale);
  const arabicLineHeight = 1.5 + 0.4 * Math.min(scale, 1);
  const translitSize = Math.round(24 * Math.max(scale, TRANSLATION_MIN * ratio.fontBoost));
  const translationSize = Math.round(26 * Math.max(scale, TRANSLATION_MIN * ratio.fontBoost));
  const bodyGap = Math.round(36 * scale);
  const translationLines = fit.lines;
  const translitLines = Math.max(2, Math.min(fit.lines, 6));

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
          flexShrink: 0,
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
        ref={bodyRef}
        style={{
          position: 'relative',
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: bodyGap,
          padding: '24px 0',
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
        {showTranslit && ayah?.transliteration && (
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
          {translations.map((tr, i) => {
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
          flexShrink: 0,
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
