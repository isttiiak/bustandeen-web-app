import { useTranslation } from 'react-i18next';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { TAFSIRS } from '../../utils/tafsir.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import type { QuranReaderState } from './useQuranReader.js';

/** Fullscreen only: the draggable divider and the tafsir beside the āyah (stacked below on mobile). */
export function ReaderSplitTafsir({ reader }: { reader: QuranReaderState }) {
  const { t } = useTranslation();
  const {
    fullscreen,
    splitTafsir,
    onDragStart,
    tafsirEdition,
    changeTafsirEdition,
    tafsir,
    surahNo,
    ayahNo,
    tafsirTextStyle,
  } = reader;
  return (
    <>
      {fullscreen && splitTafsir && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t('quranReader.resizeTafsirPane', 'Resize the tafsir pane')}
          onPointerDown={onDragStart}
          className="hidden md:flex items-center justify-center w-3 -mx-1.5 h-full cursor-col-resize z-30 group shrink-0"
        >
          <div className="w-1 h-16 rounded-full bg-white/15 group-hover:bg-brand-emerald/60 transition-colors" />
        </div>
      )}

      {fullscreen && splitTafsir && (
        <div className="w-full md:flex-1 md:h-full md:overflow-y-auto bg-brand-deep px-5 sm:px-8 pb-10 pt-4 md:pt-6 border-t border-brand-gold/5 md:border-t-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3 md:sticky md:top-0 bg-brand-deep/95 backdrop-blur md:-mt-2 md:pt-2 pb-2 z-10">
              <BookOpenIcon className="w-4 h-4 text-brand-gold/60 shrink-0" />
              <select
                aria-label={t('quranReader.tafsirEdition', 'Tafsir edition')}
                className="select select-xs flex-1 max-w-xs bg-brand-surface/60 border-brand-border text-white/80 rounded-lg"
                value={tafsirEdition}
                onChange={(e) => changeTafsirEdition(Number(e.target.value))}
              >
                <optgroup label={t('quranReader.tafsirEnglish', 'English')}>
                  {TAFSIRS.filter((tf) => tf.language === 'en').map((tf) => (
                    <option key={tf.id} value={tf.id}>
                      {tf.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t('quranReader.tafsirBengali', 'বাংলা (Bengali)')}>
                  {TAFSIRS.filter((tf) => tf.language === 'bn').map((tf) => (
                    <option key={tf.id} value={tf.id}>
                      {tf.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            {tafsir.isLoading ? (
              <div className="py-10 grid place-items-center">
                <span className="loading loading-spinner text-brand-emerald" />
              </div>
            ) : tafsir.isError ? (
              <p className="text-white/50 text-sm">
                {t(
                  'quranReader.tafsirLoadErrorShort',
                  "Couldn't load this tafsir. Try another edition."
                )}
              </p>
            ) : (
              <>
                <p className="text-brand-gold/50 text-xs font-bold mb-3">
                  {formatLocaleNumber(surahNo)}:{formatLocaleNumber(ayahNo)} ·{' '}
                  {tafsir.data?.resourceName}
                </p>
                <div className={`whitespace-pre-line`} style={tafsirTextStyle}>
                  {tafsir.data?.text}
                </div>
                <p className="text-white/50 text-[10px] mt-4">
                  {t('quranReader.sourcedFromPrefix', 'Sourced from')}{' '}
                  <a className="underline" href={tafsir.data?.url} target="_blank" rel="noreferrer">
                    quran.com
                  </a>
                  , {t('quranReader.authenticUnedited', 'authentic, unedited.')}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
