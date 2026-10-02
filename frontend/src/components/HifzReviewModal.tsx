import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { loadSurahText, surahDisplayName, type SurahMeta } from '../utils/quranData.js';
import type { HifzResult } from '../hooks/useHifz.js';

interface Props {
  surah: number;
  ayah: number;
  surahMeta: SurahMeta | undefined;
  onClose: () => void;
  onResult: (result: HifzResult) => void;
  submitting?: boolean;
}

/** Recall session for one due ayah: progressive word-masking so the user can
 * self-test before revealing, then a three-way self-assessment that drives
 * the next SM-2 interval. */
export default function HifzReviewModal({
  surah,
  ayah,
  surahMeta,
  onClose,
  onResult,
  submitting,
}: Props) {
  const { t, i18n } = useTranslation();
  const [arabic, setArabic] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  // 0 = fully hidden (max self-test), 100 = fully revealed
  const [revealPct, setRevealPct] = useState(0);
  const [tappedOpen, setTappedOpen] = useState<Set<number>>(new Set());

  useEffect(() => {
    let alive = true;
    setArabic(null);
    setLoadError(false);
    setRevealPct(0);
    setTappedOpen(new Set());
    loadSurahText(surah)
      .then((ayat) => {
        if (!alive) return;
        const found = ayat.find((a) => a.numberInSurah === ayah);
        setArabic(found?.arabic ?? '');
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, [surah, ayah]);

  const words = useMemo(() => (arabic ?? '').split(/\s+/).filter(Boolean), [arabic]);
  const revealCount = Math.round((revealPct / 100) * words.length);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-brand-deep border border-brand-border rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-black text-sm">
              {surahMeta ? surahDisplayName(surahMeta, i18n.language) : `Surah ${surah}`}{' '}
              <span className="text-white/40">
                · {t('hifz.ayahNo', { n: ayah, defaultValue: 'Āyah {{n}}' })}
              </span>
            </h2>
            <button
              aria-label={t('common.close', 'Close')}
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Arabic text with progressive masking */}
          <div
            dir="rtl"
            className="min-h-[100px] rounded-2xl bg-brand-surface/60 border border-brand-border p-4 text-right leading-loose text-xl font-arabic text-white"
          >
            {loadError && (
              <p className="text-white/40 text-sm" dir="ltr">
                {t('hifz.loadError', 'Could not load the ayah text.')}
              </p>
            )}
            {!loadError && arabic === null && (
              <p className="text-white/30 text-sm" dir="ltr">
                {t('common.loading', 'Loading…')}
              </p>
            )}
            {!loadError &&
              arabic !== null &&
              words.map((w, i) => {
                const revealed = i < revealCount || tappedOpen.has(i);
                return (
                  <span
                    key={i}
                    onClick={() =>
                      setTappedOpen((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    className={`inline-block mx-0.5 cursor-pointer select-none ${
                      revealed ? '' : 'bg-white/10 text-transparent rounded'
                    }`}
                  >
                    {w}
                  </span>
                );
              })}
          </div>

          {/* Masking control */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-white/30 text-[10px] font-bold uppercase shrink-0">
              {t('hifz.hint', 'Hint')}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={revealPct}
              onChange={(e) => setRevealPct(Number(e.target.value))}
              className="range range-xs range-success flex-1"
            />
            <button
              onClick={() => setRevealPct(100)}
              className="text-brand-emerald text-[10px] font-bold uppercase shrink-0"
            >
              {t('hifz.revealAll', 'Reveal all')}
            </button>
          </div>

          {/* Self-assessment */}
          <p className="text-white/40 text-xs text-center mt-5 mb-2">
            {t('hifz.howWasRecall', 'How was your recall?')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              disabled={submitting}
              onClick={() => onResult('forgot')}
              className="btn btn-sm bg-red-500/15 hover:bg-red-500/25 text-red-400 border-0 flex-col h-auto py-2.5 gap-0.5"
            >
              <span className="text-lg">😞</span>
              <span className="text-[10px] font-bold">{t('hifz.forgot', 'Forgot')}</span>
            </button>
            <button
              disabled={submitting}
              onClick={() => onResult('hesitant')}
              className="btn btn-sm bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border-0 flex-col h-auto py-2.5 gap-0.5"
            >
              <span className="text-lg">🤔</span>
              <span className="text-[10px] font-bold">{t('hifz.hesitant', 'Hesitant')}</span>
            </button>
            <button
              disabled={submitting}
              onClick={() => onResult('easy')}
              className="btn btn-sm bg-brand-emerald/15 hover:bg-brand-emerald/25 text-brand-emerald border-0 flex-col h-auto py-2.5 gap-0.5"
            >
              <span className="text-lg">😊</span>
              <span className="text-[10px] font-bold">{t('hifz.easy', 'Easy')}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
