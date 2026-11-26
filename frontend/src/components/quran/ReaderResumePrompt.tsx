import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import { surahDisplayName } from '../../utils/quranData.js';
import { clearResume } from '../../utils/quranReaderResume.js';
import type { QuranReaderState } from './useQuranReader.js';

/** "Continue where you left off?": pick up from the saved āyah or start over. */
export function ReaderResumePrompt({ reader }: { reader: QuranReaderState }) {
  const { t, i18n } = useTranslation();
  const { resumeAyah, setResumeAyah, surahMeta, surahNo, ayat, syncResume, setIdx } = reader;
  return (
    <AnimatePresence>
      {resumeAyah !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
        >
          <motion.div
            initial={{ scale: 0.94, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 8 }}
            transition={{ type: 'spring', damping: 24 }}
            className="w-full max-w-xs rounded-card bg-brand-deep border border-brand-border shadow-elev-3 p-5 text-center"
            role="alertdialog"
            aria-modal="true"
          >
            <BookOpenIcon className="w-8 h-8 mx-auto mb-2 text-brand-emerald" aria-hidden="true" />
            <h3 className="font-display text-white font-bold text-base">
              {t('quranReader.continueReading', 'Continue reading?')}
            </h3>
            <p className="text-white/70 text-xs mt-1.5 leading-relaxed">
              {t('quranReader.leftOffAt', 'You left {{name}} at āyah', {
                name: surahMeta
                  ? surahDisplayName(surahMeta, i18n.language)
                  : t('quranReader.thisSurah', 'this surah'),
              })}{' '}
              <b className="text-brand-emerald">{resumeAyah}</b>.{' '}
              {t(
                'quranReader.pickUpOrRestart',
                'Pick up from there, or start over from the beginning.'
              )}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                className={`flex-1 !py-2 ${BTN_SECONDARY}`}
                onClick={() => {
                  clearResume(surahNo);
                  syncResume(0);
                  setIdx(0);
                  setResumeAyah(null);
                }}
              >
                {t('quranReader.startOver', 'Start over')}
              </button>
              <button
                className={`flex-1 !py-2 ${BTN_PRIMARY}`}
                onClick={() => {
                  setIdx(Math.min(ayat.length - 1, resumeAyah - 1));
                  setResumeAyah(null);
                }}
              >
                {t('quranReader.continue', 'Continue')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
