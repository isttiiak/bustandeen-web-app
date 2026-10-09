import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { toBlob } from 'html-to-image';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ClipboardDocumentIcon,
  SparklesIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';
import AyahShareCard from './AyahShareCard.js';
import { OPTION_OFF, OPTION_ON } from './bustanStyles.js';
import {
  SHARE_CARD_THEMES,
  SHARE_CARD_RATIOS,
  SHARE_CARD_PATTERNS,
  SHARE_CARD_ORNAMENTS,
  SHARE_CARD_INTENSITIES,
  CUSTOM_THEME_ID,
  getShareCardPrefs,
  setShareCardPrefs,
  resolveShareCardTheme,
  type ShareCardPrefs,
} from '../utils/shareCardDesign.js';
import { loadSurahText, TRANSLATIONS, type SurahMeta, type AyahText } from '../utils/quranData.js';

interface ShareAyahModalProps {
  open: boolean;
  onClose: () => void;
  surahNo: number;
  surahMeta: SurahMeta | null;
  ayahNumberInSurah: number;
  initialEditions: string[];
  initialTranslit: boolean;
}

// Preview scales the fixed-size capture node down to fit the modal, the DOM
// node stays full-resolution so html-to-image captures it 1:1.
const PREVIEW_MAX_W = 320;
const PREVIEW_MAX_H = 400;

const chipClass = (active: boolean) =>
  `px-2.5 py-1 rounded-control text-[11px] font-bold border transition-colors ${
    active ? OPTION_ON : OPTION_OFF
  }`;

const pickRandom = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

export default function ShareAyahModal({
  open,
  onClose,
  surahNo,
  surahMeta,
  ayahNumberInSurah,
  initialEditions,
  initialTranslit,
}: ShareAyahModalProps) {
  const { t, i18n } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [editions, setEditions] = useState<string[]>(initialEditions.slice(0, 2));
  const [translitOn, setTranslitOn] = useState(initialTranslit);
  const [prefs, setPrefs] = useState<ShareCardPrefs>(getShareCardPrefs);
  const [ayah, setAyah] = useState<AyahText | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<'copy' | 'download' | 'share' | null>(null);

  const theme = resolveShareCardTheme(prefs);
  const ratio = SHARE_CARD_RATIOS.find((r) => r.id === prefs.ratio) ?? SHARE_CARD_RATIOS[0]!;
  const previewScale = Math.min(PREVIEW_MAX_W / ratio.width, PREVIEW_MAX_H / ratio.height);

  useEffect(() => {
    if (!open) return;
    setEditions(initialEditions.slice(0, 2));
    setTranslitOn(initialTranslit);
    setPrefs(getShareCardPrefs());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the modal opens
  }, [open]);

  const updatePrefs = (patch: Partial<ShareCardPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setShareCardPrefs(next);
  };

  const shuffleDesign = () =>
    updatePrefs({
      themeId: pickRandom(SHARE_CARD_THEMES).id,
      pattern: pickRandom(SHARE_CARD_PATTERNS.filter((p) => p.id !== 'none')).id,
      ornament: pickRandom(SHARE_CARD_ORNAMENTS).id,
      intensity: pickRandom(SHARE_CARD_INTENSITIES).id,
    });

  useEffect(() => {
    if (!open || editions.length === 0) return;
    let alive = true;
    setLoading(true);
    loadSurahText(surahNo, editions, translitOn)
      .then((text) => {
        if (!alive) return;
        setAyah(text.find((a) => a.numberInSurah === ayahNumberInSurah) ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, surahNo, ayahNumberInSurah, editions, translitOn]);

  const toggleEdition = (id: string) => {
    setEditions((prev) => {
      if (prev.includes(id)) return prev.filter((e) => e !== id);
      if (prev.length >= 2) return [prev[1]!, id]; // drop the oldest, keep 2
      return [...prev, id];
    });
  };

  const capture = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    return toBlob(cardRef.current, {
      width: ratio.width,
      height: ratio.height,
      pixelRatio: 1,
      cacheBust: true,
    });
  };

  const handleCopy = async () => {
    setBusyAction('copy');
    try {
      const blob = await capture();
      if (!blob) throw new Error('capture failed');
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success(t('shareAyah.copied', 'Copied. Paste it anywhere'));
    } catch {
      toast.error(t('shareAyah.copyError', "Couldn't copy the image. Try downloading instead."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownload = async () => {
    setBusyAction('download');
    try {
      const blob = await capture();
      if (!blob) throw new Error('capture failed');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bustandeen-ayah-${surahNo}-${ayahNumberInSurah}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('shareAyah.captureError', "Couldn't generate the image. Try again."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleShare = async () => {
    setBusyAction('share');
    try {
      const blob = await capture();
      if (!blob) throw new Error('capture failed');
      const file = new File([blob], `bustandeen-ayah-${surahNo}-${ayahNumberInSurah}.png`, {
        type: 'image/png',
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        toast.error(t('shareAyah.captureError', "Couldn't generate the image. Try again."));
      }
    } finally {
      setBusyAction(null);
    }
  };

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    (() => {
      try {
        return navigator.canShare({ files: [new File([], 'x.png', { type: 'image/png' })] });
      } catch {
        return false;
      }
    })();

  // Clipboard image writes need both the API and a secure context (https or
  // localhost); plain http falls through to Download/Share instead of a
  // silently-failing Copy button.
  const canCopyImage =
    typeof navigator !== 'undefined' &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof ClipboardItem !== 'undefined' &&
    window.isSecureContext;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 8 }}
            transition={{ type: 'spring', damping: 24 }}
            className="w-full max-w-sm rounded-card bg-brand-deep border border-brand-border shadow-elev-3 p-5 my-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-ayah-title"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 id="share-ayah-title" className="font-display text-white font-bold text-base">
                {t('shareAyah.title', 'Share this āyah')}
              </h3>
              <button
                aria-label={t('common.close', 'Close')}
                className="p-1.5 rounded-control text-white/70 hover:text-white hover:bg-shade/20"
                onClick={onClose}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* scaled preview of the fixed-size capture node */}
            <div
              className="mx-auto rounded-control overflow-hidden border border-brand-border grid place-items-center bg-shade/20"
              style={{ width: ratio.width * previewScale, height: ratio.height * previewScale }}
            >
              {loading || !ayah ? (
                <span className="loading loading-spinner text-brand-emerald" />
              ) : (
                <div
                  style={{
                    width: ratio.width,
                    height: ratio.height,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <AyahShareCard
                    ref={cardRef}
                    surahMeta={surahMeta}
                    surahNo={surahNo}
                    ayah={ayah}
                    showTransliteration={translitOn}
                    lang={i18n.language}
                    theme={theme}
                    ratio={ratio}
                    pattern={prefs.pattern}
                    ornament={prefs.ornament}
                    intensity={prefs.intensity}
                  />
                </div>
              )}
            </div>

            {/* options */}
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-white/70 text-[11px] font-bold">
                    {t('shareAyah.theme', 'Card style')}
                  </p>
                  <button
                    type="button"
                    onClick={shuffleDesign}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-emerald hover:text-white transition-colors"
                  >
                    <SparklesIcon className="w-3.5 h-3.5" />
                    {t('shareAyah.shuffle', 'Surprise me')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SHARE_CARD_THEMES.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      aria-label={th.label}
                      aria-pressed={prefs.themeId === th.id}
                      title={th.label}
                      onClick={() => updatePrefs({ themeId: th.id })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        prefs.themeId === th.id
                          ? 'border-white scale-110'
                          : 'border-brand-border hover:border-brand-emerald/40'
                      }`}
                      style={{ background: th.background }}
                    />
                  ))}
                  <label
                    title={t('shareAyah.customColor', 'Custom color')}
                    className={`relative w-8 h-8 rounded-full border-2 cursor-pointer overflow-hidden transition-all grid place-items-center ${
                      prefs.themeId === CUSTOM_THEME_ID
                        ? 'border-white scale-110'
                        : 'border-brand-border hover:border-brand-emerald/40 bg-brand-surface'
                    }`}
                    style={
                      prefs.themeId === CUSTOM_THEME_ID
                        ? { background: prefs.customAccent }
                        : undefined
                    }
                  >
                    {prefs.themeId !== CUSTOM_THEME_ID && (
                      <PaintBrushIcon className="w-4 h-4 text-white/80" aria-hidden="true" />
                    )}
                    <input
                      type="color"
                      aria-label={t('shareAyah.customColor', 'Custom color')}
                      value={prefs.customAccent}
                      onChange={(e) =>
                        updatePrefs({ themeId: CUSTOM_THEME_ID, customAccent: e.target.value })
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="text-white/70 text-[11px] font-bold mb-1.5">
                  {t('shareAyah.shape', 'Shape')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SHARE_CARD_RATIOS.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      aria-pressed={prefs.ratio === x.id}
                      onClick={() => updatePrefs({ ratio: x.id })}
                      className={chipClass(prefs.ratio === x.id)}
                    >
                      {t(`shareAyah.ratio.${x.id}`, x.label)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white/70 text-[11px] font-bold mb-1.5">
                  {t('shareAyah.pattern', 'Background pattern')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SHARE_CARD_PATTERNS.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      aria-pressed={prefs.pattern === x.id}
                      onClick={() => updatePrefs({ pattern: x.id })}
                      className={chipClass(prefs.pattern === x.id)}
                    >
                      {t(`shareAyah.patterns.${x.id}`, x.label)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white/70 text-[11px] font-bold mb-1.5">
                  {t('shareAyah.ornament', 'Decoration')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SHARE_CARD_ORNAMENTS.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      aria-pressed={prefs.ornament === x.id}
                      onClick={() => updatePrefs({ ornament: x.id })}
                      className={chipClass(prefs.ornament === x.id)}
                    >
                      {t(`shareAyah.ornaments.${x.id}`, x.label)}
                    </button>
                  ))}
                </div>
              </div>

              {(prefs.pattern !== 'none' || prefs.ornament !== 'none') && (
                <div>
                  <p className="text-white/70 text-[11px] font-bold mb-1.5">
                    {t('shareAyah.intensity', 'Graphics strength')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SHARE_CARD_INTENSITIES.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        aria-pressed={prefs.intensity === x.id}
                        onClick={() => updatePrefs({ intensity: x.id })}
                        className={chipClass(prefs.intensity === x.id)}
                      >
                        {t(`shareAyah.intensities.${x.id}`, x.label)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-white/70 text-[11px] font-bold mb-1.5">
                  {t('shareAyah.translations', 'Translations (up to 2)')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TRANSLATIONS.map((ed) => (
                    <button
                      key={ed.id}
                      onClick={() => toggleEdition(ed.id)}
                      aria-pressed={editions.includes(ed.id)}
                      className={chipClass(editions.includes(ed.id))}
                    >
                      {ed.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-white/70 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-success"
                  checked={translitOn}
                  onChange={(e) => setTranslitOn(e.target.checked)}
                />
                {t('shareAyah.includeTransliteration', 'Include transliteration')}
              </label>
            </div>

            {/* Copy always leads: it's the fastest path to "paste into WhatsApp/
                Messenger" without a download round-trip. Share only appears
                alongside a real native share sheet (Download vs. Share would
                otherwise be two buttons doing the exact same thing), see
                `canShareFiles`. Whichever action is last gets the highlighted
                style, so there's always exactly one obvious primary action.
                Icon-over-label (not icon+label in a row) so a narrow column
                on mobile never squeezes "Download" into a wrap that escapes
                the button's box; a fixed-height row layout did exactly that. */}
            <div
              className="grid gap-2 mt-5"
              style={{
                gridTemplateColumns: `repeat(${1 + (canCopyImage ? 1 : 0) + (canShareFiles ? 1 : 0)}, minmax(0, 1fr))`,
              }}
            >
              {canCopyImage && (
                <button
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-control border bg-brand-deep border-brand-border text-white/80 hover:text-white shadow-elev-1 transition-colors disabled:opacity-50"
                  onClick={handleCopy}
                  disabled={!!busyAction || loading || !ayah}
                >
                  {busyAction === 'copy' ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-5 h-5" />
                      <span className="text-[11px] font-bold">{t('shareAyah.copy', 'Copy')}</span>
                    </>
                  )}
                </button>
              )}
              <button
                className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-control border transition-colors disabled:opacity-50 ${
                  canShareFiles
                    ? 'bg-brand-deep border-brand-border text-white/80 hover:text-white shadow-elev-1'
                    : 'btn-solid border-0 text-on-color bg-brand-emerald-dim shadow-elev-1'
                }`}
                onClick={handleDownload}
                disabled={!!busyAction || loading || !ayah}
              >
                {busyAction === 'download' ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span className="text-[11px] font-bold">
                      {t('shareAyah.download', 'Download')}
                    </span>
                  </>
                )}
              </button>
              {canShareFiles && (
                <button
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-control btn-solid border-0 text-on-color bg-brand-emerald-dim shadow-elev-1 disabled:opacity-50"
                  onClick={handleShare}
                  disabled={!!busyAction || loading || !ayah}
                >
                  {busyAction === 'share' ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <>
                      <ShareIcon className="w-5 h-5" />
                      <span className="text-[11px] font-bold">{t('shareAyah.share', 'Share')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
