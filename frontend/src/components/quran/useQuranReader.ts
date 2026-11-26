import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  useQuranSummary,
  useReadAyat,
  useToggleBookmark,
  useSetResume,
} from '../../hooks/useQuran.js';
import { useQuranReadingSession } from '../../hooks/useQuranReadingSession.js';
import { QURANIC_DUAS } from '../../utils/quranMeta.js';
import { locateGlobalAyah } from '../../utils/quranData.js';
import { useReaderAudio } from './useReaderAudio.js';
import { useReaderFullscreen } from './useReaderFullscreen.js';
import { useReaderNavigation } from './useReaderNavigation.js';
import { useReaderPrefs } from './useReaderPrefs.js';
import { useReaderTafsir } from './useReaderTafsir.js';
import { useReaderText, type ReaderMode } from './useReaderText.js';

/**
 * Everything the reading room needs: the route (surah, mode, bounds), the
 * summary and its writes, the reader's own state split by concern (prefs, text,
 * audio, navigation, fullscreen, tafsir), and the values derived from them.
 */
export function useQuranReader() {
  const { surah: surahParam } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { t, i18n } = useTranslation();

  const surahNo = Math.min(114, Math.max(1, Number(surahParam) || 1));
  const mode = (params.get('mode') ?? 'free') as ReaderMode;
  // When opened from "Duas from the Quran": carries the story/evidence panel
  const dua = useMemo(() => {
    const id = params.get('dua');
    return id ? (QURANIC_DUAS.find((d) => d.id === id) ?? null) : null;
  }, [params]);
  const [contextOpen, setContextOpen] = useState(false);
  const hasStart = params.get('start') != null;
  const startAyah = Number(params.get('start')) || 1;
  const endAyah = Number(params.get('end')) || null; // bundle bound

  const { data: summary } = useQuranSummary();
  const { mutate: readAyat } = useReadAyat();
  const toggleBookmark = useToggleBookmark();
  const { mutate: setResumeServer } = useSetResume();
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const readingSession = useQuranReadingSession({
    extendedIdle: tafsirOpen,
    // Designing a share card isn't reading time.
    paused: shareOpen,
    enabled: !!user && !isDemoMode,
  });
  const { arabicFont, showTranslit, zoom, changeZoom, fs, editions, editionLabel } =
    useReaderPrefs();

  // free/single reads track a resume position; khatam uses the server bookmark,
  // bundles are bounded — neither uses local resume.
  const usesResume = mode === 'free' || mode === 'single';
  const countsGoal = mode !== 'bundle';
  const seenRef = useRef(new Set<number>());
  const suppressSaveRef = useRef(false);

  const {
    surahs,
    ayat,
    loading,
    idx,
    setIdx,
    resumeAyah,
    setResumeAyah,
    surahMeta,
    current,
    lastIdx,
    firstIdx,
  } = useReaderText({
    surahNo,
    startAyah,
    endAyah,
    hasStart,
    mode,
    usesResume,
    showTranslit,
    user,
    summary,
    seenRef,
    suppressSaveRef,
    t,
  });

  const { registerSurah, registerAyahRead } = readingSession;
  useEffect(() => {
    registerSurah(surahNo);
  }, [registerSurah, surahNo]);

  const { playing, wordIdx, volume, stopAudio, playAyah, changeVolume } = useReaderAudio(
    current,
    idx,
    t
  );

  const { pendingRef, syncResume, goToIdx, goNext, goPrev } = useReaderNavigation({
    user,
    surahNo,
    mode,
    countsGoal,
    usesResume,
    readAyat,
    setResumeServer,
    ayat,
    summary,
    registerAyahRead,
    stopAudio,
    idx,
    setIdx,
    lastIdx,
    firstIdx,
    surahMeta,
    dua,
    navigate,
    t,
    i18n,
    seenRef,
    suppressSaveRef,
  });

  const {
    fullscreen,
    splitTafsir,
    setSplitTafsir,
    splitPct,
    cardRef,
    toggleFullscreen,
    onDragStart,
  } = useReaderFullscreen();

  const { tafsirEdition, changeTafsirEdition, tafsir, tafsirTextStyle, ayahNo } = useReaderTafsir({
    surahNo,
    current,
    tafsirOpen,
    splitTafsir,
    fs,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
      // Esc exits fullscreen natively
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, toggleFullscreen]);

  const isBookmarked = !!summary?.bookmarks?.some(
    (b) => b.surah === surahNo && b.ayah === (current?.numberInSurah ?? 0)
  );
  const todayCount = (summary?.todayAyat ?? 0) + pendingRef.current;
  const khatamPos =
    mode === 'khatam' && summary && surahs.length
      ? locateGlobalAyah(summary.profile.currentAyah, surahs)
      : null;

  const words = useMemo(() => (current ? current.arabic.split(' ') : []), [current]);

  return {
    user,
    isDemoMode,
    mode,
    surahNo,
    dua,
    contextOpen,
    setContextOpen,
    summary,
    toggleBookmark,
    tafsirOpen,
    setTafsirOpen,
    shareOpen,
    setShareOpen,
    readingSession,
    arabicFont,
    showTranslit,
    zoom,
    changeZoom,
    fs,
    editions,
    editionLabel,
    countsGoal,
    surahs,
    ayat,
    loading,
    idx,
    setIdx,
    resumeAyah,
    setResumeAyah,
    surahMeta,
    current,
    lastIdx,
    firstIdx,
    playing,
    wordIdx,
    volume,
    playAyah,
    changeVolume,
    syncResume,
    goToIdx,
    goNext,
    goPrev,
    fullscreen,
    splitTafsir,
    setSplitTafsir,
    splitPct,
    cardRef,
    toggleFullscreen,
    onDragStart,
    tafsirEdition,
    changeTafsirEdition,
    tafsir,
    tafsirTextStyle,
    ayahNo,
    isBookmarked,
    todayCount,
    khatamPos,
    words,
  };
}

export type QuranReaderState = ReturnType<typeof useQuranReader>;
