import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { PlayIcon, StopIcon, PlayPauseIcon } from '@heroicons/react/24/outline';

export interface ZikrAutoPlayControlsProps {
  audio: import('../../hooks/useZikrAudio.js').ZikrAudioState;
  autoPlayTarget: string;
  setAutoPlayTarget: React.Dispatch<React.SetStateAction<string>>;
  setShowAutoPlay: React.Dispatch<React.SetStateAction<boolean>>;
  setZikrAudioVolume: (val: number) => void;
  showAutoPlay: boolean;
  zikrAudioEnabled: boolean;
  zikrAudioVolume: number;
}

export default function ZikrAutoPlayControls({
  audio,
  autoPlayTarget,
  setAutoPlayTarget,
  setShowAutoPlay,
  setZikrAudioVolume,
  showAutoPlay,
  zikrAudioEnabled,
  zikrAudioVolume,
}: ZikrAutoPlayControlsProps) {
  const { t } = useTranslation();
  return (
    <>
      {zikrAudioEnabled && audio.hasAudio && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {!audio.isAutoPlay ? (
            <div className="flex flex-col items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowAutoPlay(!showAutoPlay)}
                className={`flex items-center gap-2 px-4 py-2 rounded-control text-sm font-bold transition-colors border ${
                  showAutoPlay
                    ? 'bg-brand-gold/25 border-brand-gold/50 text-brand-gold'
                    : 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold/80 hover:text-brand-gold hover:bg-brand-gold/20'
                }`}
              >
                <PlayPauseIcon className="w-4 h-4" />
                {t('zikr.autoPlay', 'Auto-play')}
              </motion.button>
              <p className="text-white/50 text-[11px] text-center max-w-[240px]">
                {t('zikr.autoPlayHint', 'Plays the pronunciation and counts it for you, on repeat')}
              </p>
            </div>
          ) : (
            /* Active auto-play bar */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-card border border-brand-emerald/30 bg-brand-deep shadow-elev-1 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-2.5 h-2.5 rounded-full bg-brand-emerald"
                  />
                  <span className="text-brand-emerald font-bold text-sm">
                    {t('zikr.autoPlayActive', 'Auto-playing')}
                  </span>
                </div>
                <span className="text-white/50 text-sm font-mono tabular-nums">
                  {audio.loopCount}
                  {audio.targetCount !== null ? ` / ${audio.targetCount}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    audio.stopAutoPlay();
                    setShowAutoPlay(false);
                  }}
                  className="btn btn-sm bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400 gap-1.5"
                >
                  <StopIcon className="w-4 h-4" />
                  {t('zikr.stop', 'Stop')}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={zikrAudioVolume}
                  onChange={(e) => setZikrAudioVolume(parseFloat(e.target.value))}
                  className="range range-success range-xs flex-1"
                  aria-label={t('zikr.volume', 'Volume')}
                />
                <span className="text-white/50 text-xs w-8 text-right">
                  {Math.round(zikrAudioVolume * 100)}%
                </span>
              </div>
            </motion.div>
          )}

          {/* Auto-play setup panel */}
          <AnimatePresence>
            {showAutoPlay && !audio.isAutoPlay && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-card border border-brand-border bg-brand-deep shadow-elev-1 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-white/50 text-xs shrink-0">
                      {t('zikr.targetCount', 'Target count')}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="50"
                      value={autoPlayTarget}
                      onChange={(e) => setAutoPlayTarget(e.target.value)}
                      className="input input-bordered input-sm flex-1 bg-brand-deep border-brand-border text-white text-center"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/50 text-xs shrink-0">
                      {t('zikr.volume', 'Volume')}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={zikrAudioVolume}
                      onChange={(e) => setZikrAudioVolume(parseFloat(e.target.value))}
                      className="range range-success range-xs flex-1"
                      aria-label={t('zikr.volume', 'Volume')}
                    />
                    <span className="text-white/50 text-xs w-8 text-right">
                      {Math.round(zikrAudioVolume * 100)}%
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const target = parseInt(autoPlayTarget, 10);
                      audio.startAutoPlay(target > 0 ? target : 50);
                    }}
                    className="btn btn-sm w-full bg-brand-emerald/20 hover:bg-brand-emerald/30 border-brand-emerald/30 text-brand-emerald gap-2"
                  >
                    <PlayIcon className="w-4 h-4" />
                    {t('zikr.startAutoPlay', 'Start auto-play')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
