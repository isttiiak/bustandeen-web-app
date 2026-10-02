import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  loadSurahText,
  surahDisplayName,
  selectedTranslations,
  TRANSLATIONS,
  type SurahMeta,
} from '../utils/quranData.js';

interface Props {
  surah: number;
  ayah: number;
  surahMeta: SurahMeta | undefined;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}

interface LoadedAyah {
  arabic: string;
  transliteration?: string;
  translations: string[];
}

/**
 * Read-before-you-memorise step: full Arabic + transliteration + translation,
 * nothing masked. Memorising an āyah you have never actually read is
 * backwards — this always runs BEFORE an āyah becomes a HifzEntry (which then
 * only ever shows masked text in HifzReviewModal, since recall testing is the
 * opposite of this step).
 */
export default function HifzLearnModal({
  surah,
  ayah,
  surahMeta,
  onClose,
  onConfirm,
  confirming,
}: Props) {
  const { t, i18n } = useTranslation();
  const [ayat, setAyat] = useState<LoadedAyah | null>(null);
  const [loadError, setLoadError] = useState(false);
  const editions = selectedTranslations();

  useEffect(() => {
    let alive = true;
    setAyat(null);
    setLoadError(false);
    loadSurahText(surah, editions, true)
      .then((list) => {
        if (!alive) return;
        const found = list.find((a) => a.numberInSurah === ayah);
        if (!found) {
          setLoadError(true);
          return;
        }
        setAyat({
          arabic: found.arabic,
          transliteration: found.transliteration,
          translations: found.translations,
        });
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; editions is read fresh each call but shouldn't retrigger the fetch
  }, [surah, ayah]);

  const editionLabel = (id: string) => TRANSLATIONS.find((tr) => tr.id === id)?.label ?? id;

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
              {t('hifz.readFirstTitle', 'Read before you memorise')}
            </h2>
            <button
              aria-label={t('common.close', 'Close')}
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <p className="text-white/40 text-xs mb-3">
            {surahMeta ? surahDisplayName(surahMeta, i18n.language) : `Surah ${surah}`} ·{' '}
            {t('hifz.ayahNo', { n: ayah, defaultValue: 'Āyah {{n}}' })}
          </p>

          <div className="rounded-2xl bg-brand-surface/60 border border-brand-border p-4 space-y-4">
            {loadError && (
              <p className="text-white/40 text-sm">
                {t('hifz.loadError', 'Could not load the ayah text.')}
              </p>
            )}
            {!loadError && ayat === null && (
              <p className="text-white/30 text-sm">{t('common.loading', 'Loading…')}</p>
            )}
            {!loadError && ayat && (
              <>
                <p
                  dir="rtl"
                  lang="ar"
                  className="text-right leading-loose text-2xl font-arabic text-white"
                >
                  {ayat.arabic}
                </p>
                {ayat.transliteration && (
                  <p className="text-brand-gold/70 italic text-sm leading-relaxed">
                    {ayat.transliteration}
                  </p>
                )}
                <div className="space-y-2 border-t border-brand-border pt-3">
                  {ayat.translations.map((tr, i) => (
                    <p key={editions[i] ?? i} className="text-white/60 text-sm leading-relaxed">
                      <span className="text-white/30 text-[10px] font-bold uppercase block mb-0.5">
                        {editionLabel(editions[i] ?? '')}
                      </span>
                      {tr}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button onClick={onClose} className="btn btn-sm btn-ghost text-white/50 flex-1">
              {t('hifz.notYet', 'Not yet')}
            </button>
            <button
              disabled={confirming || !ayat}
              onClick={onConfirm}
              className="btn btn-sm bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 border-0 text-white flex-[2]"
            >
              {t('hifz.confirmMemorise', "I've read it — start memorising")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
