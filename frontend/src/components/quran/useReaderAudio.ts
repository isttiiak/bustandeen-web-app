import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { TFunction } from 'i18next';
import { ayahAudioUrl, type AyahText } from '../../utils/quranData.js';

/** Recite only the current ayah, highlight its words, and the volume. */
export function useReaderAudio(current: AyahText | null, idx: number, t: TFunction) {
  const [playing, setPlaying] = useState(false);
  const [wordIdx, setWordIdx] = useState(-1);
  const [volume, setVolume] = useState<number>(() => {
    const raw = localStorage.getItem('bustandeen_quran_volume');
    const v = Number(raw);
    return raw !== null && Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.4; // 40% default
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── audio: play ONLY the current ayah, highlight words while it runs ──
  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    setPlaying(false);
    setWordIdx(-1);
  }, []);

  const playAyah = useCallback(() => {
    if (!current) return;
    if (playing) {
      stopAudio();
      return;
    }
    const a = new Audio(ayahAudioUrl(current.number));
    a.volume = volume;
    audioRef.current = a;
    const words = current.arabic.split(' ').length;
    a.addEventListener('loadedmetadata', () => {
      // Even word pacing across the recitation — simple, calm, good enough
      const per = (a.duration * 1000) / Math.max(1, words);
      let w = 0;
      setWordIdx(0);
      wordTimerRef.current = setInterval(() => {
        w += 1;
        if (w >= words) {
          if (wordTimerRef.current) clearInterval(wordTimerRef.current);
          return;
        }
        setWordIdx(w);
      }, per);
    });
    a.addEventListener('ended', () => {
      stopAudio();
    }); // ONE ayah, then stop
    a.addEventListener('error', () => {
      stopAudio();
      toast.error(t('quranReader.audioError', 'Audio unavailable. Try again.'), {
        id: 'ayah-audio',
      });
    });
    void a
      .play()
      .then(() => setPlaying(true))
      .catch(() =>
        toast.error(t('quranReader.audioTapAgain', 'Tap again to allow audio.'), {
          id: 'ayah-audio',
        })
      );
  }, [current, playing, stopAudio, volume, t]);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    localStorage.setItem('bustandeen_quran_volume', String(v));
  }, []);

  useEffect(() => stopAudio, [idx, stopAudio]); // stop when the ayah changes

  return { playing, wordIdx, volume, stopAudio, playAyah, changeVolume };
}
