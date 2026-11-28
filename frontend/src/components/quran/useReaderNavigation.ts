import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import toast from 'react-hot-toast';
import type { TFunction, i18n as I18n } from 'i18next';
import type { NavigateFunction } from 'react-router';
import type { useQuranSummary, useReadAyat, useSetResume } from '../../hooks/useQuran.js';
import type { useQuranReadingSession } from '../../hooks/useQuranReadingSession.js';
import type { QuranicDua } from '../../utils/quranMeta.js';
import { setLastRead } from '../../utils/quranLastRead.js';
import { clearResume, saveResume } from '../../utils/quranReaderResume.js';
import { surahDisplayName, type AyahText, type SurahMeta } from '../../utils/quranData.js';
import { celebrateGoal, celebrateKhatm, celebrateSmall } from '../../utils/celebrate.js';
import type { ReaderMode } from './useReaderText.js';

/** Counting what is read, saving the place, and moving between ayat and surahs. */
export function useReaderNavigation({
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
}: {
  user: unknown;
  surahNo: number;
  mode: ReaderMode;
  countsGoal: boolean;
  usesResume: boolean;
  readAyat: ReturnType<typeof useReadAyat>['mutate'];
  setResumeServer: ReturnType<typeof useSetResume>['mutate'];
  ayat: AyahText[];
  summary: ReturnType<typeof useQuranSummary>['data'];
  registerAyahRead: ReturnType<typeof useQuranReadingSession>['registerAyahRead'];
  stopAudio: () => void;
  idx: number;
  setIdx: (idx: number) => void;
  lastIdx: number;
  firstIdx: number;
  surahMeta: SurahMeta | null;
  dua: QuranicDua | null;
  navigate: NavigateFunction;
  t: TFunction;
  i18n: I18n;
  seenRef: MutableRefObject<Set<number>>;
  suppressSaveRef: MutableRefObject<boolean>;
}) {
  const resumeSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ayat advanced past but not yet flushed to the server
  const pendingRef = useRef(0);

  // Push the resume position to the server, debounced — cheap and idempotent.
  const syncResume = useCallback(
    (ayah: number) => {
      if (!user) return;
      if (resumeSyncTimerRef.current) clearTimeout(resumeSyncTimerRef.current);
      resumeSyncTimerRef.current = setTimeout(() => {
        setResumeServer({ surah: surahNo, ayah });
      }, 1500);
    },
    [user, surahNo, setResumeServer]
  );

  // ── logging: count each NEW ayah the reader moves past, flush in batches ──
  const flush = useCallback(
    (completedSurah = false) => {
      const n = pendingRef.current;
      // Khatam is its own journey: its surahs never count toward "top surahs".
      const credit = completedSurah && mode !== 'khatam';
      if ((n <= 0 && !credit) || !user || !countsGoal) return;
      pendingRef.current = 0;
      readAyat(
        {
          count: n,
          surah: surahNo,
          advanceKhatm: mode === 'khatam',
          completedSurah: credit,
        },
        {
          onSuccess: (r) => {
            if (r.khatmCompleted) celebrateKhatm();
          },
        }
      );
    },
    [user, surahNo, mode, countsGoal, readAyat]
  );

  useEffect(() => () => flush(), [flush]); // flush on unmount / surah change

  const markRead = useCallback(
    (ayahIdx: number) => {
      if (!countsGoal) return; // bundles/duas don't count toward the goal
      const a = ayat[ayahIdx];
      if (!a || seenRef.current.has(a.number)) return;
      seenRef.current.add(a.number);
      pendingRef.current += 1;
      registerAyahRead(1);
      const before = (summary?.todayAyat ?? 0) + pendingRef.current - 1;
      const goal = summary?.profile.dailyGoalAyat ?? 1;
      if (before < goal && before + 1 >= goal) celebrateGoal();
      if (pendingRef.current >= 5) flush();
    },
    [ayat, flush, summary, countsGoal, registerAyahRead, seenRef]
  );

  // ── navigation ──
  const goToIdx = useCallback(
    (next: number) => {
      stopAudio();
      setIdx(next);
      // Home's Quran "Continue" (khatam off) goes to the last place read, in
      // any mode except a bounded bundle.
      const at = ayat[next];
      if (at && mode !== 'bundle') setLastRead({ surah: surahNo, ayah: at.numberInSurah });
      if (usesResume && !suppressSaveRef.current) {
        const a = ayat[next];
        if (a) {
          saveResume(surahNo, a.numberInSurah);
          syncResume(a.numberInSurah);
        }
      }
    },
    [stopAudio, usesResume, ayat, surahNo, syncResume, mode, setIdx, suppressSaveRef]
  );

  const finishAndRedirect = useCallback(
    (msg: string) => {
      suppressSaveRef.current = true;
      clearResume(surahNo);
      syncResume(0); // clear on the server too
      celebrateSmall();
      toast.success(msg, { id: 'reader-done', duration: 2200 });
      // Finishing a duʿā returns to the DUA SECTION of the Quran home, not the
      // top of the page (Istiak: landing mid-page felt wrong).
      setTimeout(() => navigate(dua ? '/quran#duas' : '/quran'), 850);
    },
    [surahNo, navigate, syncResume, dua, suppressSaveRef]
  );

  const goNext = useCallback(() => {
    stopAudio();
    if (idx < lastIdx) {
      markRead(idx); // moving past the current ayah = it was read
      goToIdx(idx + 1);
      return;
    }
    // At the last ayah of this view.
    if (mode === 'bundle') {
      finishAndRedirect(t('quranReader.bundleComplete', 'Complete. May it protect and bless you'));
      return;
    }
    // free / khatam / single reached the surah's end
    markRead(idx);
    flush(true); // credits the surah completion
    clearResume(surahNo);
    syncResume(0);
    if (mode === 'single') {
      finishAndRedirect(
        t('quranReader.singleComplete', '{{name}} complete', {
          name: surahMeta
            ? surahDisplayName(surahMeta, i18n.language)
            : t('quranReader.surah', 'Surah'),
        })
      );
      return;
    }
    if (surahNo < 114) {
      suppressSaveRef.current = true;
      celebrateSmall();
      toast.success(
        t('quranReader.surahDone', '{{name}} completed. Onward!', {
          name: surahMeta
            ? surahDisplayName(surahMeta, i18n.language)
            : t('quranReader.surah', 'Surah'),
        }),
        { id: 'surah-done', duration: 2200 }
      );
      // REPLACE so Back returns to where you came from — not the finished surah
      // — and so you can't step back into the previous surah.
      navigate(`/quran/read/${surahNo + 1}?mode=${mode}`, { replace: true });
    } else {
      finishAndRedirect(t('quranReader.khatmComplete', 'Khatm complete. Allahu akbar!'));
      celebrateKhatm();
    }
  }, [
    idx,
    lastIdx,
    markRead,
    stopAudio,
    flush,
    mode,
    surahNo,
    surahMeta,
    navigate,
    goToIdx,
    finishAndRedirect,
    syncResume,
    t,
    i18n.language,
    suppressSaveRef,
  ]);

  const goPrev = useCallback(() => {
    if (idx > firstIdx) goToIdx(idx - 1);
  }, [idx, firstIdx, goToIdx]);

  return { pendingRef, syncResume, goToIdx, goNext, goPrev };
}
