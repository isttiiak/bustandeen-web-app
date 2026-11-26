import { useTranslation } from 'react-i18next';
import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { DuaHandsIcon } from '../icons/IslamicIcons.js';
import { TAFSIRS } from '../../utils/tafsir.js';
import { translateReference } from '../../utils/localeReference.js';
import type { QuranReaderState } from './useQuranReader.js';

/** Tafsir (authentic, sourced; the Quran rooms carry NO AI) and the story behind a duʿā. */
export function ReaderTafsirSection({ reader }: { reader: QuranReaderState }) {
  const { t, i18n } = useTranslation();
  const {
    loading,
    current,
    user,
    tafsirOpen,
    setTafsirOpen,
    dua,
    contextOpen,
    setContextOpen,
    tafsirEdition,
    changeTafsirEdition,
    tafsir,
    tafsirTextStyle,
  } = reader;
  return (
    <>
      {!loading && current && user && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTafsirOpen((o) => !o)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-bold border shadow-elev-1 transition-colors ${tafsirOpen ? 'bg-brand-emerald/15 border-brand-emerald/30 text-brand-emerald' : 'bg-brand-deep border-brand-border text-white/80 hover:text-white'}`}
            >
              <BookOpenIcon className="w-4 h-4" /> {t('quranReader.tafsir', 'Tafsir')}
            </button>
            {dua?.context && (
              <button
                onClick={() => setContextOpen((o) => !o)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-bold border shadow-elev-1 transition-colors ${contextOpen ? 'bg-brand-gold/15 border-brand-gold/30 text-brand-gold' : 'bg-brand-deep border-brand-border text-white/80 hover:text-white'}`}
              >
                <DocumentTextIcon className="w-4 h-4" aria-hidden="true" />
                {t('quranReader.whyThisDua', 'Why this duʿā')}
              </button>
            )}
          </div>

          {/* The story & evidence behind this duʿā (verified reference) */}
          {contextOpen && dua?.context && (
            <div className="rounded-card border border-brand-gold/30 bg-brand-surface shadow-elev-1 p-4 sm:p-5 space-y-2.5">
              <p className="text-brand-gold text-xs font-bold flex items-center gap-1.5">
                <DuaHandsIcon className="w-4 h-4" aria-hidden="true" />
                {i18n.language === 'bn' && dua.titleBn ? dua.titleBn : dua.title}
              </p>
              <p className="text-reader-note text-sm leading-relaxed">
                {i18n.language === 'bn' && dua.context.textBn
                  ? dua.context.textBn
                  : dua.context.text}
              </p>
              <a
                className="inline-flex items-center gap-1 text-brand-gold text-[11px] underline"
                href={dua.context.ref.url}
                target="_blank"
                rel="noreferrer"
              >
                {translateReference(dua.context.ref.text, i18n.language)}
                <ArrowTopRightOnSquareIcon className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          )}

          {/* Calm reading surface: warm dark ground + warm ink, never pure white */}
          {tafsirOpen && (
            <div className="rounded-card border border-brand-border bg-brand-deep shadow-elev-1 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <select
                  aria-label={t('quranReader.tafsirEdition', 'Tafsir edition')}
                  className="select select-xs flex-1 bg-brand-surface/60 border-brand-border text-white/80 rounded-lg"
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
                <button
                  className="text-white/60 hover:text-white text-xs shrink-0"
                  onClick={() => setTafsirOpen(false)}
                >
                  {t('quranReader.close', 'Close')}
                </button>
              </div>

              {tafsir.isLoading ? (
                <div className="py-6 grid place-items-center">
                  <span className="loading loading-spinner text-brand-emerald" />
                </div>
              ) : tafsir.isError ? (
                <p className="text-white/50 text-sm py-2">
                  {t(
                    'quranReader.tafsirLoadErrorLong',
                    "Couldn't load this tafsir. Check your connection or try another edition."
                  )}
                </p>
              ) : (
                <>
                  <div
                    className={`max-h-96 overflow-y-auto pr-2 whitespace-pre-line`}
                    style={tafsirTextStyle}
                  >
                    {tafsir.data?.text}
                  </div>
                  <p className="text-white/60 text-[11px]">
                    <BookOpenIcon className="w-3.5 h-3.5 inline -mt-0.5 mr-1" aria-hidden="true" />
                    {tafsir.data?.resourceName} ·{' '}
                    {t('quranReader.sourcedFromLower', 'sourced from')}{' '}
                    <a
                      className="underline"
                      href={tafsir.data?.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      quran.com
                    </a>
                    , {t('quranReader.authenticUnedited', 'authentic, unedited.')}
                    <span className="mx-1.5">·</span>
                    <a
                      className="underline text-white/60 hover:text-brand-emerald"
                      href="/feedback"
                    >
                      {t('quranReader.reportReferenceIssue', 'Report a reference issue')}
                    </a>
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
