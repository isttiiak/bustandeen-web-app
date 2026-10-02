import React from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { zikrDisplayName } from '../../utils/zikrLibrary.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { PlusIcon, XMarkIcon, PlayIcon, StopIcon } from '@heroicons/react/24/outline';

export interface ZikrFocusOverlayProps {
  audio: import('../../hooks/useZikrAudio.js').ZikrAudioState;
  currentCount: number;
  fullScreen: boolean;
  goalMet: boolean;
  goalProgress: number | null;
  meaning: { arabic: string; transliteration: string; meaning: string } | null;
  onIncrement: () => void;
  reduceMotion: boolean;
  selectType: (selected: string) => void;
  selected: string;
  setFullScreen: React.Dispatch<React.SetStateAction<boolean>>;
  streakCount: number | null;
  tasbihDoneInSegment: number;
  tasbihRemaining: number | null;
  tasbihTarget: number;
  types: string[];
  zikrAudioEnabled: boolean;
}

export default function ZikrFocusOverlay({
  audio,
  currentCount,
  fullScreen,
  goalMet,
  goalProgress,
  meaning,
  onIncrement,
  reduceMotion,
  selectType,
  selected,
  setFullScreen,
  streakCount,
  tasbihDoneInSegment,
  tasbihRemaining,
  tasbihTarget,
  types,
  zikrAudioEnabled,
}: ZikrFocusOverlayProps) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {createPortal(
        <AnimatePresence>
          {fullScreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 flex flex-col overflow-hidden"
              style={{ zIndex: 99999, background: '#0e0d0a' }}
            >
              {/* ── Calm ambiance (redesigned, Istiak's spec): ONE fixed emerald
                   tone — no per-tap rainbow cycling, no sparkle strobing.
                   Two slow breathing orbs, nothing else moves. ── */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: '75vw',
                    height: '75vw',
                    left: '0%',
                    top: '-15%',
                    background:
                      'radial-gradient(circle, rgba(122,158,110,0.10) 0%, transparent 70%)',
                    filter: 'blur(70px)',
                  }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: '60vw',
                    height: '60vw',
                    right: '-10%',
                    bottom: '-10%',
                    background: 'radial-gradient(circle, rgba(90,122,80,0.08) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                  }}
                  animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
                />
              </div>

              {/* ── Top bar: close (top-right) ── */}
              <div className="relative z-10 flex items-center justify-between px-5 sm:px-8 pt-5 pb-2 flex-shrink-0">
                <button
                  onClick={() => {
                    const el = document.getElementById('fs-zikr-select');
                    if (el instanceof HTMLSelectElement) el.showPicker?.();
                    else el?.click();
                  }}
                  className="flex items-center gap-1.5 opacity-55 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-[300px] text-brand-emerald/90">
                    {zikrDisplayName(selected, i18n.language)}
                  </span>
                  <svg
                    className="w-3 h-3 text-white/25 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <select
                  id="fs-zikr-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) selectType(e.target.value);
                  }}
                  className="absolute left-0 top-0 w-1 h-1 opacity-0 pointer-events-none"
                >
                  <option value="" disabled>
                    {t('zikr.switchZikr', 'Switch zikr...')}
                  </option>
                  {types
                    .filter((typ) => typ !== selected)
                    .map((typ) => (
                      <option key={typ} value={typ} className="bg-[#0e0d0a] text-white">
                        {zikrDisplayName(typ, i18n.language)}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => setFullScreen(false)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                  title={t('zikr.exitFocus', 'Exit focus mode (Esc)')}
                  aria-label={t('zikr.exitFocusAriaLabel', 'Exit full-screen focus mode')}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* ── Center content — whole area is tappable to count, for
                   eyes-free tasbih; the Count button and auto-play controls
                   below stop propagation so they don't double-fire. ── */}
              <div
                onClick={onIncrement}
                className="relative z-10 flex-1 flex flex-col items-center justify-center gap-5 px-6 -mt-6 cursor-pointer"
              >
                {/* Arabic text — very faint, above number */}
                {meaning?.arabic && (
                  <motion.p
                    key={`fs-ar:${selected}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    dir="rtl"
                    className="text-white/20 text-center"
                    style={{
                      fontFamily: "'Amiri', 'Scheherazade New', serif",
                      fontSize: 'clamp(22px, 5vw, 40px)',
                    }}
                  >
                    {meaning.arabic}
                  </motion.p>
                )}

                {/* Huge counter number — one soft pop per tap, steady gentle glow */}
                <motion.span
                  key={`fs:${selected}:${tasbihRemaining ?? currentCount}`}
                  initial={reduceMotion ? false : { scale: 0.94 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'tween', duration: 0.14, ease: 'easeOut' }}
                  className="font-black text-white/95 tabular-nums leading-none block text-center"
                  style={{
                    fontSize: 'clamp(100px, 28vw, 260px)',
                    textShadow: '0 0 60px rgba(122,158,110,0.35)',
                  }}
                >
                  {formatLocaleNumber(tasbihRemaining ?? currentCount)}
                </motion.span>

                {tasbihRemaining !== null && (
                  <p className="text-white/25 text-xs sm:text-sm -mt-2">
                    {t('zikr.tasbihOfTarget', '{{done}} of {{target}} · lifetime {{lifetime}}', {
                      done: formatLocaleNumber(tasbihDoneInSegment),
                      target: formatLocaleNumber(tasbihTarget),
                      lifetime: formatLocaleNumber(currentCount),
                    })}
                  </p>
                )}

                {/* Transliteration — faint caption below number */}
                {meaning?.transliteration && (
                  <p className="text-white/20 text-xs sm:text-sm italic tracking-widest -mt-2">
                    {meaning.transliteration}
                  </p>
                )}

                {/* Meaning — visible in fullscreen */}
                {meaning?.meaning && (
                  <p className="text-white/30 text-xs sm:text-sm text-center max-w-md leading-relaxed -mt-2">
                    {meaning.meaning}
                  </p>
                )}

                {/* Count button — deep calm emerald, tall for easy tap */}
                <div className="relative" style={{ width: 'min(92vw, 520px)' }}>
                  {!reduceMotion && (
                    <motion.div
                      key={`ripple:${currentCount}`}
                      className="absolute inset-0 rounded-3xl pointer-events-none"
                      initial={{ scale: 1, opacity: 0.25 }}
                      animate={{ scale: 1.25, opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{ background: '#7a9e6e' }}
                    />
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    // No onClick here — the tap bubbles up to the whole-screen
                    // tap target on the center-content wrapper, which counts
                    // it exactly once. An explicit handler here would double-count.
                    className="relative flex items-center justify-center gap-3 font-black rounded-3xl w-full select-none outline-none border border-brand-emerald/25 text-white"
                    style={{
                      height: 'clamp(120px, 18vh, 180px)',
                      fontSize: 'clamp(24px, 4vw, 36px)',
                      background:
                        'linear-gradient(180deg, rgba(122,158,110,0.32) 0%, rgba(90,122,80,0.45) 100%)',
                      boxShadow: '0 12px 40px rgba(122,158,110,0.18)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <PlusIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                    {t('zikr.countBtn', 'Count')}
                  </motion.button>
                </div>

                {/* Auto-play in focus mode */}
                {zikrAudioEnabled && audio.hasAudio && (
                  <div className="flex items-center gap-3 mt-1">
                    {audio.isAutoPlay ? (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          audio.stopAutoPlay();
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold"
                      >
                        <StopIcon className="w-5 h-5" />
                        {t('zikr.stop', 'Stop')}
                        <span className="text-white/40 font-mono ml-1">
                          {audio.loopCount}
                          {audio.targetCount !== null ? ` / ${audio.targetCount}` : ''}
                        </span>
                      </motion.button>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          audio.startAutoPlay();
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-gold/15 border border-brand-gold/40 text-brand-gold/90 hover:text-brand-gold text-sm font-bold transition-all"
                      >
                        <PlayIcon className="w-5 h-5" />
                        {t('zikr.autoPlay', 'Auto-play')}
                      </motion.button>
                    )}
                  </div>
                )}

                {/* Streak + goal — hidden once goal is met to keep focus */}
                {!goalMet && (streakCount !== null || goalProgress !== null) && (
                  <div className="flex items-center gap-6 opacity-35">
                    {streakCount !== null && (
                      <span className="text-brand-gold text-xs font-bold">
                        🔥 {t('zikr.streakDay', '{{count}} day', { count: streakCount })}
                      </span>
                    )}
                    {goalProgress !== null && (
                      <span className="text-white/60 text-xs font-bold">🎯 {goalProgress}%</span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom: keyboard hint on desktop */}
              <div className="relative z-10 flex flex-col items-center gap-3 pb-6 flex-shrink-0">
                <p className="hidden sm:block text-white/20 text-[11px] tracking-wider">
                  {t('zikr.spaceCount', 'SPACE to count · ESC to exit')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
