import { useTranslation } from 'react-i18next';
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  BookmarkIcon as BookmarkOutline,
  BookOpenIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid, PauseIcon, PlayIcon } from '@heroicons/react/24/solid';
import type { useSignInGate } from '../SignInSheet.js';
import type { QuranReaderState } from './useQuranReader.js';

/**
 * Zoom, recite, bookmark, share, tafsir and fullscreen. In-flow row on phones
 * (they overlapped the āyah header), floating top-right from sm up.
 */
export function ReaderCardControls({
  reader,
  gate,
}: {
  reader: QuranReaderState;
  gate: ReturnType<typeof useSignInGate>;
}) {
  const { t } = useTranslation();
  const {
    zoom,
    changeZoom,
    playing,
    playAyah,
    isBookmarked,
    current,
    toggleBookmark,
    surahNo,
    setShareOpen,
    fullscreen,
    splitTafsir,
    setSplitTafsir,
    toggleFullscreen,
  } = reader;
  return (
    <div
      className={`flex items-center justify-end gap-2 z-20 ${fullscreen ? 'absolute top-3 right-3 sm:top-4 sm:right-4' : 'sm:absolute sm:top-4 sm:right-4 mb-2 sm:mb-0'}`}
    >
      {/* in-app zoom — works in the card AND fullscreen (Istiak's spec) */}
      <div className="flex items-center rounded-full bg-brand-deep border border-brand-border overflow-hidden">
        <button
          aria-label={t('quranReader.zoomOut', 'Zoom out')}
          onClick={() => changeZoom(-0.1)}
          disabled={zoom <= 0.8}
          className="w-8 h-9 sm:h-10 grid place-items-center text-white/50 hover:text-white disabled:opacity-25 text-base font-black"
        >
          −
        </button>
        <button
          aria-label={t('quranReader.resetZoom', 'Reset zoom')}
          title={t('quranReader.resetZoom', 'Reset zoom')}
          onClick={() => changeZoom(0)}
          className={`px-1 text-[10px] font-bold tabular-nums ${zoom === 1 ? 'text-white/50' : 'text-brand-emerald'}`}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          aria-label={t('quranReader.zoomIn', 'Zoom in')}
          onClick={() => changeZoom(0.1)}
          disabled={zoom >= 1.8}
          className="w-8 h-9 sm:h-10 grid place-items-center text-white/50 hover:text-white disabled:opacity-25 text-base font-black"
        >
          ＋
        </button>
      </div>
      <button
        aria-label={
          playing
            ? t('quranReader.stopRecitation', 'Stop recitation')
            : t('quranReader.reciteAyah', 'Recite this ayah')
        }
        title={t('quranReader.reciteOnlyThis', 'Recite only this ayah')}
        onClick={playAyah}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center border transition-all ${playing ? 'bg-brand-emerald-dim text-on-color border-brand-emerald-dim' : 'bg-brand-deep text-brand-emerald border-brand-emerald/10 hover:border-brand-emerald/50'}`}
      >
        {playing ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4 ml-0.5" />}
      </button>
      {/* A guest sees it too: the first save asks to sign in (U10). */}
      <button
        aria-label={
          isBookmarked
            ? t('quranReader.removeBookmark', 'Remove bookmark')
            : t('quranReader.bookmarkAyah', 'Bookmark this ayah')
        }
        onClick={() =>
          current &&
          gate.canSave() &&
          toggleBookmark.mutate({ surah: surahNo, ayah: current.numberInSurah })
        }
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center border bg-brand-deep border-brand-border shadow-elev-1 text-brand-gold hover:border-brand-gold/50"
      >
        {isBookmarked ? (
          <BookmarkSolid className="w-4 h-4" />
        ) : (
          <BookmarkOutline className="w-4 h-4" />
        )}
      </button>
      {current && (
        <button
          aria-label={t('shareAyah.shareButton', 'Share as image')}
          title={t('shareAyah.shareButton', 'Share as image')}
          onClick={() => setShareOpen(true)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center border bg-brand-deep border-brand-border shadow-elev-1 text-white/50 hover:text-white hover:border-brand-emerald/50"
        >
          <ShareIcon className="w-4 h-4" />
        </button>
      )}
      {/* fullscreen-only: open the tafsir (split on desktop, stacked below on mobile) */}
      {fullscreen && (
        <button
          aria-label={
            splitTafsir
              ? t('quranReader.hideTafsir', 'Hide tafsir')
              : t('quranReader.readTafsir', 'Read tafsir')
          }
          title={t('quranReader.tafsir', 'Tafsir')}
          onClick={() => setSplitTafsir((v) => !v)}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center border transition-all ${splitTafsir ? 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/50' : 'bg-brand-deep shadow-elev-1 text-white/60 border-brand-emerald/10 hover:text-white'}`}
        >
          <BookOpenIcon className="w-4 h-4" />
        </button>
      )}
      <button
        aria-label={
          fullscreen
            ? t('quranReader.exitFullscreen', 'Exit fullscreen')
            : t('quranReader.fullscreen', 'Fullscreen')
        }
        onClick={toggleFullscreen}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center border bg-brand-deep border-brand-border shadow-elev-1 text-white/50 hover:text-white"
      >
        {fullscreen ? (
          <ArrowsPointingInIcon className="w-4 h-4" />
        ) : (
          <ArrowsPointingOutIcon className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
