import { useTranslation } from 'react-i18next';
import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import type { QuranReaderState } from './useQuranReader.js';

/** Jump to an āyah (left) and the recitation volume (right). */
export function ReaderBottomControls({ reader }: { reader: QuranReaderState }) {
  const { t } = useTranslation();
  const { loading, ayat, mode, idx, goToIdx, volume, changeVolume } = reader;
  return (
    <>
      {!loading && ayat.length > 0 && (
        <div className="flex items-center justify-between gap-3 text-xs text-white/60">
          {/* Khatam must be read serially — a jump dropdown here would let
                ayat get skipped without being counted, breaking the "read
                every āyah in order" invariant the khatam count relies on.
                Bundle mode already had no jump control; khatam now matches. */}
          {mode !== 'bundle' && mode !== 'khatam' ? (
            <div className="flex items-center gap-2">
              <label htmlFor="jump-ayah" className="font-bold">
                {t('quranReader.jumpToAyah', 'Jump to āyah')}
              </label>
              <select
                id="jump-ayah"
                className="select select-xs bg-brand-surface/60 border-brand-border text-white/80 rounded-lg"
                value={idx + 1}
                onChange={(e) => goToIdx(Number(e.target.value) - 1)}
              >
                {ayat.map((a) => (
                  <option key={a.number} value={a.numberInSurah}>
                    {a.numberInSurah}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span />
          )}

          {/* volume control (defaults to 40%) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              aria-label={
                volume === 0
                  ? t('quranReader.volumeOff', 'Volume off')
                  : t('quranReader.volume', 'Volume')
              }
              className="text-white/50 hover:text-white"
              onClick={() => changeVolume(volume === 0 ? 0.4 : 0)}
            >
              {volume === 0 ? (
                <SpeakerXMarkIcon className="w-4 h-4" />
              ) : (
                <SpeakerWaveIcon className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              aria-label={t('quranReader.recitationVolume', 'Recitation volume')}
              onChange={(e) => changeVolume(Number(e.target.value) / 100)}
              className="range range-xs w-24 [--range-shdw:theme(colors.brand.emerald-dim)]"
            />
          </div>
        </div>
      )}
    </>
  );
}
