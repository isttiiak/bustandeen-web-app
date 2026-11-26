import { useCallback, useMemo, useState } from 'react';
import { getArabicFont, getFontPx, translitEnabled } from '../../utils/quranPrefs.js';
import { selectedTranslations, TRANSLATIONS } from '../../utils/quranData.js';

/** The reader's typography, in-app zoom and the translations in use. */
export function useReaderPrefs() {
  // Typography prefs — read once per mount (the settings drawer writes them)
  const arabicFont = useMemo(() => getArabicFont(), []);
  const baseFs = useMemo(
    () => ({
      arabic: getFontPx('arabic'),
      translation: getFontPx('translation'),
      translit: getFontPx('translit'),
      tafsir: getFontPx('tafsir'),
    }),
    []
  );
  const showTranslit = useMemo(() => translitEnabled(), []);
  // In-app ZOOM (Istiak's spec): big screens have room to spare — scale every
  // reader text together, without touching the browser zoom. Persisted.
  const [zoom, setZoom] = useState<number>(() => {
    const v = Number(localStorage.getItem('bustandeen_reader_zoom'));
    return Number.isFinite(v) && v >= 0.8 && v <= 1.8 ? v : 1;
  });
  const changeZoom = useCallback((delta: number) => {
    setZoom((z) => {
      const n = delta === 0 ? 1 : Math.min(1.8, Math.max(0.8, Math.round((z + delta) * 10) / 10));
      localStorage.setItem('bustandeen_reader_zoom', String(n));
      return n;
    });
  }, []);
  const fs = useMemo(
    () => ({
      arabic: Math.round(baseFs.arabic * zoom),
      translation: Math.round(baseFs.translation * zoom),
      translit: Math.round(baseFs.translit * zoom),
      tafsir: Math.round(baseFs.tafsir * zoom),
    }),
    [baseFs, zoom]
  );
  const editions = useMemo(() => selectedTranslations(), []);
  const editionLabel = (id: string) => TRANSLATIONS.find((tf) => tf.id === id)?.label ?? id;

  return { arabicFont, showTranslit, zoom, changeZoom, fs, editions, editionLabel };
}
