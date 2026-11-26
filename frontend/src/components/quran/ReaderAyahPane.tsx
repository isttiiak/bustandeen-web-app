import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { surahDisplayName, surahMeaningDisplay } from '../../utils/quranData.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import type { QuranReaderState } from './useQuranReader.js';

/** The āyah and its meaning (the left pane in fullscreen), with Previous and Next. */
export function ReaderAyahPane({ reader }: { reader: QuranReaderState }) {
  const { t, i18n } = useTranslation();
  const {
    fullscreen,
    splitTafsir,
    splitPct,
    loading,
    current,
    surahMeta,
    surahNo,
    fs,
    arabicFont,
    words,
    playing,
    wordIdx,
    showTranslit,
    editions,
    editionLabel,
    idx,
    firstIdx,
    lastIdx,
    mode,
    goPrev,
    goNext,
  } = reader;
  return (
    <div
      className={
        fullscreen
          ? `relative md:h-full grid place-items-center md:overflow-y-auto p-6 pt-16 sm:p-12 w-full shrink-0 md:shrink ${splitTafsir ? 'md:border-r md:border-brand-emerald/15 min-h-[70vh] md:min-h-0 md:w-[var(--split)]' : ''}`
          : 'contents'
      }
      style={
        fullscreen && splitTafsir ? ({ '--split': `${splitPct}%` } as CSSProperties) : undefined
      }
    >
      {loading || !current ? (
        <div className="min-h-[40vh] grid place-items-center">
          <span className="loading loading-spinner loading-lg text-brand-emerald" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.number}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className={`${fullscreen ? 'max-w-4xl' : ''} w-full text-center space-y-6 sm:space-y-8 pt-2 sm:pt-8`}
          >
            <div className="space-y-0.5">
              <p className="text-white/50 text-xs font-bold tracking-widest">
                {surahMeta?.name} ·{' '}
                <span className="text-brand-emerald/80 text-sm">
                  {formatLocaleNumber(current.numberInSurah)}
                </span>
                <span className="text-white/50">
                  /{surahMeta ? formatLocaleNumber(surahMeta.numberOfAyahs) : ''}
                </span>
              </p>
              {surahMeta?.englishNameTranslation && (
                <p className="text-white/60 text-[11px]">
                  {surahDisplayName(surahMeta, i18n.language)}: “
                  {surahMeaningDisplay(surahMeta, i18n.language)}”
                </p>
              )}
            </div>

            {/* Arabic — word hover highlight; timed highlight while reciting */}
            <p
              dir="rtl"
              lang="ar"
              className="leading-[2.1] text-reader-text"
              style={{ fontSize: fs.arabic, fontFamily: arabicFont.stack }}
            >
              {words.map((w, i) => (
                <span
                  key={i}
                  className={`transition-colors duration-150 rounded px-0.5 cursor-default ${playing && i === wordIdx ? 'bg-brand-emerald/30 text-white' : 'hover:bg-shade/15'}`}
                >
                  {w}{' '}
                </span>
              ))}
            </p>

            {/* Transliteration — Latin pronunciation aid (optional) */}
            {showTranslit && current.transliteration && (
              <p
                className="text-brand-gold/60 italic leading-relaxed max-w-2xl mx-auto"
                style={{ fontSize: fs.translit }}
              >
                {current.transliteration}
              </p>
            )}

            <div className="space-y-3 max-w-2xl mx-auto">
              {current.translations.map((tr, i) => (
                <p
                  key={editions[i] ?? i}
                  className={`${i === 0 ? 'text-white/60' : 'text-brand-info/50'} leading-relaxed`}
                  style={{ fontSize: fs.translation }}
                >
                  {tr}
                </p>
              ))}
            </div>
            <p className="text-white/50 text-[10px]">
              <a className="underline" href="https://tanzil.net" target="_blank" rel="noreferrer">
                Tanzil
              </a>{' '}
              · {editions.map(editionLabel).join(' · ')} ·{' '}
              <a
                className="underline"
                href={`https://quran.com/${surahNo}/${current.numberInSurah}`}
                target="_blank"
                rel="noreferrer"
              >
                quran.com/{surahNo}/{current.numberInSurah}
              </a>
            </p>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Prev/Next stay IN FLOW. They used to be md:absolute with
              left-8/right-8 in fullscreen, which is measured against the
              nearest positioned ancestor — with the tafsir split that is not
              the reading pane, so the row overflowed and "Next" sat off-screen
              behind a horizontal scroll. In-flow + min-w-0 + shrink can't
              overflow regardless of pane width. */}
      {!loading && current && (
        <div
          className={`flex items-center justify-between gap-3 w-full max-w-4xl mx-auto mt-8 ${fullscreen ? 'md:mt-6' : ''}`}
        >
          <button
            aria-label={t('quranReader.previousAyah', 'Previous ayah')}
            onClick={goPrev}
            disabled={idx <= firstIdx}
            className="flex items-center gap-1.5 min-w-0 px-4 py-2.5 rounded-control bg-brand-deep border border-brand-border shadow-elev-1 text-white/80 hover:text-white disabled:opacity-30 text-sm font-bold"
          >
            <ChevronLeftIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('quranReader.previous', 'Previous')}</span>
          </button>
          <button
            aria-label={t('quranReader.nextAyah', 'Next ayah')}
            onClick={goNext}
            className="flex items-center gap-1.5 min-w-0 px-5 py-2.5 rounded-control bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-110 shadow-elev-1 text-on-color text-sm font-bold border-0"
          >
            <span className="truncate">
              {idx >= lastIdx
                ? mode === 'bundle'
                  ? t('quranReader.finishDua', 'Finish')
                  : mode === 'single'
                    ? t('quranReader.finishLeaf', 'Finish')
                    : surahNo < 114
                      ? t('quranReader.nextSurah', 'Next surah')
                      : t('quranReader.finish', 'Finish')
                : t('quranReader.next', 'Next')}
            </span>
            <ChevronRightIcon className="w-4 h-4 shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}
