import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import toast from 'react-hot-toast';
import type { TFunction } from 'i18next';
import type { useQuranSummary } from '../../hooks/useQuran.js';
import { getResume, saveResume } from '../../utils/quranReaderResume.js';
import {
  loadSurahList,
  loadSurahText,
  type AyahText,
  type SurahMeta,
} from '../../utils/quranData.js';

export type ReaderMode = 'free' | 'khatam' | 'bundle' | 'single';

/** The surah's text, the position in it, and the "continue where you left off?" offer. */
export function useReaderText({
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
}: {
  surahNo: number;
  startAyah: number;
  endAyah: number | null;
  hasStart: boolean;
  mode: ReaderMode;
  usesResume: boolean;
  showTranslit: boolean;
  user: unknown;
  summary: ReturnType<typeof useQuranSummary>['data'];
  seenRef: MutableRefObject<Set<number>>;
  suppressSaveRef: MutableRefObject<boolean>;
  t: TFunction;
}) {
  const resumePromptDoneRef = useRef(false);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [ayat, setAyat] = useState<AyahText[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0); // index within `ayat`
  const [resumeAyah, setResumeAyah] = useState<number | null>(null); // continue-or-restart prompt

  const surahMeta = useMemo(
    () => surahs.find((s) => s.number === surahNo) ?? null,
    [surahs, surahNo]
  );

  const current = ayat[idx] ?? null;
  const lastIdx = endAyah ? Math.min(ayat.length - 1, endAyah - 1) : ayat.length - 1;
  const firstIdx = mode === 'bundle' ? startAyah - 1 : 0;

  // ── data ──
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setResumeAyah(null);
    resumePromptDoneRef.current = false;
    suppressSaveRef.current = false;
    seenRef.current = new Set();
    // The surah list is only the header (name, ayah count); the Arabic is
    // bundled, so a failed list (offline before it was ever cached) must not
    // stop the surah from opening.
    Promise.all([
      loadSurahList().catch((): SurahMeta[] => []),
      loadSurahText(surahNo, undefined, showTranslit),
    ])
      .then(([list, text]) => {
        if (!alive) return;
        setSurahs(list);
        setAyat(text);
        const initialIdx = Math.min(text.length - 1, Math.max(0, startAyah - 1));
        setIdx(initialIdx);
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setLoading(false);
          toast.error(
            t('quranReader.loadError', 'Could not load the surah. Check your connection.'),
            { id: 'quran-load' }
          );
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload the surah text only when the surah number changes; showTranslit, startAyah and t are read at that moment, so a language or option change must not reload it and reset the reading position
  }, [surahNo]);

  // Offer "continue where you left off?" once text (and, when signed in, the
  // server summary) is available. Server position wins over the local cache.
  useEffect(() => {
    if (loading || !usesResume || hasStart || resumePromptDoneRef.current) return;
    if (user && !summary) return; // wait for the authoritative copy
    resumePromptDoneRef.current = true;
    const serverPos = Number(summary?.profile.readerPos?.[String(surahNo)] ?? 0);
    const saved = serverPos > 0 ? serverPos : getResume(surahNo);
    if (saved > 1 && saved <= ayat.length) {
      saveResume(surahNo, saved); // refresh the local cache from the server
      setResumeAyah(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- offer the resume prompt once the text and the server summary are ready (resumePromptDoneRef stops repeats); ayat.length is read at that moment
  }, [loading, summary, surahNo, usesResume, hasStart, user]);

  return {
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
  };
}
