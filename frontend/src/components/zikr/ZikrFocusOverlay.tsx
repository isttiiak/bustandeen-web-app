import React from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { zikrDisplayName } from '../../utils/zikrLibrary.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { FireIcon, PlusIcon, XMarkIcon, PlayIcon, StopIcon } from '@heroicons/react/24/outline';
import { TargetIcon } from '../icons/IslamicIcons.js';

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
              style={{ zIndex: 99999, background: 'rgb(var(--c-void))' }}
            >
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
                      <option key={typ} value={typ} className="bg-brand-void text-white">
                        {zikrDisplayName(typ, i18n.language)}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => setFullScreen(false)}
                  className="p-2.5 rounded-control border border-brand-border bg-brand-deep/60 text-white/50 hover:text-white hover:border-brand-emerald/40 transition-colors"
                  title={t('zikr.exitFocus', 'Exit focus mode (Esc)')}
                  aria-label={t('zikr.exitFocusAriaLabel', 'Exit full-screen focus mode')}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* ── Center content — whole area is tappable to count, for
                   eyes-free tasbih; the Count button and auto-play controls
                   below stop propagation so they don't double-fire. A pointer
                   convenience only (role="presentation"): keyboard and
                   screen-reader users count with the Count button. ── */}
              <div
                role="presentation"
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

                {/* Huge counter number: one soft pop per tap, no glow */}
                <motion.span
                  key={`fs:${selected}:${tasbihRemaining ?? currentCount}`}
                  initial={reduceMotion ? false : { scale: 0.94 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'tween', duration: 0.14, ease: 'easeOut' }}
                  className="font-black text-white/95 tabular-nums leading-none block text-center"
                  style={{ fontSize: 'clamp(100px, 28vw, 260px)' }}
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

                {/* Count button: calm sage, tall for easy tap */}
                <div className="relative" style={{ width: 'min(92vw, 520px)' }}>
                  {!reduceMotion && (
                    <motion.div
                      key={`ripple:${currentCount}`}
                      className="absolute inset-0 rounded-card pointer-events-none bg-brand-emerald"
                      initial={{ scale: 1, opacity: 0.25 }}
                      animate={{ scale: 1.25, opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    // No onClick here — the tap bubbles up to the whole-screen
                    // tap target on the center-content wrapper, which counts
                    // it exactly once. An explicit handler here would double-count.
                    className="relative flex items-center justify-center gap-3 font-black rounded-card w-full select-none outline-none border border-brand-emerald/40 bg-brand-emerald/25 text-white shadow-elev-2"
                    style={{
                      height: 'clamp(120px, 18vh, 180px)',
                      fontSize: 'clamp(24px, 4vw, 36px)',
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
                        className="flex items-center gap-2 px-5 py-2.5 rounded-control bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold"
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
                        className="flex items-center gap-2 px-5 py-2.5 rounded-control bg-brand-gold/15 border border-brand-gold/40 text-brand-gold/90 hover:text-brand-gold text-sm font-bold transition-colors"
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
                      <span className="flex items-center gap-1 text-brand-gold text-xs font-bold">
                        <FireIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        {t('zikr.streakDay', '{{count}} day', { count: streakCount })}
                      </span>
                    )}
                    {goalProgress !== null && (
                      <span className="flex items-center gap-1 text-white/60 text-xs font-bold">
                        <TargetIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        {goalProgress}%
                      </span>
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
