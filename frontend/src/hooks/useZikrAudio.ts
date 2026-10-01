import { useCallback, useEffect, useRef, useState } from 'react';
import { getZikrAudioUrl, hasZikrAudio as _hasAudio } from '../utils/zikrAudio.js';
import { useZikrStore } from '../store/useZikrStore.js';
import { useUiStore } from '../store/useUiStore.js';

export interface ZikrAudioState {
  isPlaying: boolean;
  isAutoPlay: boolean;
  hasAudio: boolean;
  loopCount: number;
  targetCount: number | null;
  play: () => void;
  /** For the "play on every tap" setting: starts the clip unless it (or
   * auto-play) is already playing, so fast tapping never cuts it off. */
  playOnTap: () => void;
  stop: () => void;
  startAutoPlay: (target?: number) => void;
  stopAutoPlay: () => void;
}

export function useZikrAudio(zikrName: string): ZikrAudioState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handlerRef = useRef<(() => void) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [targetCount, setTargetCount] = useState<number | null>(null);

  const increment = useZikrStore((s) => s.increment);
  const scheduleFlush = useZikrStore((s) => s.scheduleFlush);
  const volume = useUiStore((s) => s.zikrAudioVolume);

  const hasAudio = _hasAudio(zikrName);
  const audioUrl = getZikrAudioUrl(zikrName);

  const loopCountRef = useRef(0);
  const targetCountRef = useRef<number | null>(null);
  const isAutoPlayRef = useRef(false);

  const getOrCreateAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }, []);

  const clearHandler = useCallback(() => {
    const audio = audioRef.current;
    if (audio && handlerRef.current) {
      audio.removeEventListener('ended', handlerRef.current);
      handlerRef.current = null;
    }
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Stop playback when zikr type changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      clearHandler();
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setIsAutoPlay(false);
    isAutoPlayRef.current = false;
    setLoopCount(0);
    loopCountRef.current = 0;
    setTargetCount(null);
    targetCountRef.current = null;
  }, [zikrName, clearHandler]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        if (handlerRef.current) audio.removeEventListener('ended', handlerRef.current);
        audio.pause();
        audio.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const play = useCallback(() => {
    if (!audioUrl) return;
    clearHandler();
    const audio = getOrCreateAudio();
    audio.src = audioUrl;
    audio.loop = false;
    audio.volume = volume;
    setIsPlaying(true);

    const onEnded = () => {
      setIsPlaying(false);
      clearHandler();
    };
    handlerRef.current = onEnded;
    audio.addEventListener('ended', onEnded);
    audio.play().catch(() => setIsPlaying(false));
  }, [audioUrl, volume, getOrCreateAudio, clearHandler]);

  const playOnTap = useCallback(() => {
    if (isAutoPlayRef.current) return;
    const audio = audioRef.current;
    if (audio && !audio.paused && !audio.ended) return;
    play();
  }, [play]);

  const stop = useCallback(() => {
    clearHandler();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setIsAutoPlay(false);
    isAutoPlayRef.current = false;
    setLoopCount(0);
    loopCountRef.current = 0;
    setTargetCount(null);
    targetCountRef.current = null;
  }, [clearHandler]);

  const startAutoPlay = useCallback(
    (target?: number) => {
      if (!audioUrl) return;
      clearHandler();
      const audio = getOrCreateAudio();

      setLoopCount(0);
      loopCountRef.current = 0;
      // Default to 50 if no target specified — prevents runaway counting
      const t = target ?? 50;
      setTargetCount(t);
      targetCountRef.current = t;
      setIsAutoPlay(true);
      isAutoPlayRef.current = true;
      setIsPlaying(true);

      audio.loop = false;
      audio.src = audioUrl;
      audio.volume = volume;

      const onEnded = () => {
        if (!isAutoPlayRef.current) return;

        increment();
        scheduleFlush();

        const newCount = loopCountRef.current + 1;
        loopCountRef.current = newCount;
        setLoopCount(newCount);

        if (targetCountRef.current !== null && newCount >= targetCountRef.current) {
          setIsAutoPlay(false);
          isAutoPlayRef.current = false;
          setIsPlaying(false);
          clearHandler();
          return;
        }

        audio.currentTime = 0;
        audio.play().catch(() => {});
      };

      handlerRef.current = onEnded;
      audio.addEventListener('ended', onEnded);
      audio.play().catch(() => setIsPlaying(false));
    },
    [audioUrl, volume, getOrCreateAudio, increment, scheduleFlush, clearHandler]
  );

  const stopAutoPlay = useCallback(() => {
    clearHandler();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsAutoPlay(false);
    isAutoPlayRef.current = false;
    setIsPlaying(false);
  }, [clearHandler]);

  return {
    isPlaying,
    isAutoPlay,
    hasAudio,
    loopCount,
    targetCount,
    play,
    playOnTap,
    stop,
    startAutoPlay,
    stopAutoPlay,
  };
}
