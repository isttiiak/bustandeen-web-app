import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  SpeakerWaveIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';
import ConfirmDialog from './ConfirmDialog.js';
import { useUiStore } from '../store/useUiStore.js';

const TASBIH_TARGET_PRESETS = [33, 34, 99, 100];

export default function ZikrSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const tasbihMode = useUiStore((s) => s.tasbihMode);
  const setTasbihMode = useUiStore((s) => s.setTasbihMode);
  const tasbihTarget = useUiStore((s) => s.tasbihTarget);
  const setTasbihTarget = useUiStore((s) => s.setTasbihTarget);
  const [customTarget, setCustomTarget] = useState('');
  const zikrSoundEnabled = useUiStore((s) => s.zikrSoundEnabled);
  const setZikrSoundEnabled = useUiStore((s) => s.setZikrSoundEnabled);
  const zikrAudioEnabled = useUiStore((s) => s.zikrAudioEnabled);
  const setZikrAudioEnabled = useUiStore((s) => s.setZikrAudioEnabled);
  const zikrAudioVolume = useUiStore((s) => s.zikrAudioVolume);
  const setZikrAudioVolume = useUiStore((s) => s.setZikrAudioVolume);

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.post('/api/zikr/reset');
      queryClient.invalidateQueries({ queryKey: ['zikr'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(t('zikr.toast.resetDone', 'Counters reset — your history is still there'), {
        icon: '📿',
      });
      setConfirmReset(false);
      onClose();
    } catch {
      toast.error(t('zikr.toast.resetFail', 'Could not reset — try again'));
    } finally {
      setResetting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-sm bg-brand-deep border-l border-brand-border overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={t('zikr.a11y.settings', 'Zikr settings')}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-brand-deep/95 backdrop-blur border-b border-brand-emerald/10">
              <h2 className="text-brand-emerald font-black text-lg">
                {t('zikr.a11y.settings', 'Zikr settings')}
              </h2>
              <button
                onClick={onClose}
                aria-label={t('zikr.a11y.closeSettings', 'Close zikr settings')}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-7">
              <section className="rounded-2xl border border-brand-emerald/20 bg-brand-emerald/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ArrowsRightLeftIcon className="w-4 h-4 text-brand-emerald" />
                    <h3 className="text-brand-emerald font-bold text-sm">
                      {t('zikr.tasbihMode', 'Tasbih mode')}
                    </h3>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-success toggle-sm"
                    checked={tasbihMode}
                    onChange={(e) => setTasbihMode(e.target.checked)}
                    aria-label={t('zikr.tasbihMode', 'Tasbih mode')}
                  />
                </div>
                <p className="text-white/40 text-xs leading-relaxed mt-2">
                  {t(
                    'zikr.tasbihModeDesc',
                    'Count down from a target instead of up — pick how many, then each tap counts down. A distinct vibration + celebration marks the set complete, then it starts over.'
                  )}
                </p>
                {tasbihMode && (
                  <div className="mt-3">
                    <p className="text-white/50 text-xs mb-1.5">
                      {t('zikr.tasbihTargetLabel', 'Target')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {TASBIH_TARGET_PRESETS.map((n) => (
                        <button
                          key={n}
                          onClick={() => {
                            setTasbihTarget(n);
                            setCustomTarget('');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            tasbihTarget === n
                              ? 'border-brand-emerald/50 bg-brand-emerald/15 text-brand-emerald'
                              : 'border-brand-emerald/10 bg-white/5 text-white/50 hover:border-brand-emerald/30'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        inputMode="numeric"
                        placeholder={t('zikr.tasbihCustom', 'Custom')}
                        value={customTarget}
                        onChange={(e) => setCustomTarget(e.target.value)}
                        onBlur={() => {
                          const n = parseInt(customTarget, 10);
                          if (Number.isFinite(n) && n > 0) setTasbihTarget(n);
                          setCustomTarget('');
                        }}
                        className={`w-20 px-2.5 py-1.5 rounded-xl text-xs font-bold border bg-white/5 text-white/80 placeholder:text-white/25 focus:outline-none ${
                          !TASBIH_TARGET_PRESETS.includes(tasbihTarget) && !customTarget
                            ? 'border-brand-emerald/50 bg-brand-emerald/15 text-brand-emerald'
                            : 'border-brand-emerald/10'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-brand-emerald/20 bg-brand-emerald/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MusicalNoteIcon className="w-4 h-4 text-brand-emerald" />
                    <h3 className="text-brand-emerald font-bold text-sm">
                      {t('zikr.tapSound', 'Tap sound')}
                    </h3>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-success toggle-sm"
                    checked={zikrSoundEnabled}
                    onChange={(e) => setZikrSoundEnabled(e.target.checked)}
                    aria-label={t('zikr.tapSound', 'Tap sound')}
                  />
                </div>
                <p className="text-white/40 text-xs leading-relaxed mt-2">
                  {t('zikr.tapSoundDesc', 'A soft click on every count, like wooden tasbih beads.')}
                </p>
              </section>

              <section className="rounded-2xl border border-brand-emerald/20 bg-brand-emerald/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <SpeakerWaveIcon className="w-4 h-4 text-brand-emerald" />
                    <h3 className="text-brand-emerald font-bold text-sm">
                      {t('zikr.audioToggle', 'Zikr audio')}
                    </h3>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-success toggle-sm"
                    checked={zikrAudioEnabled}
                    onChange={(e) => setZikrAudioEnabled(e.target.checked)}
                    aria-label={t('zikr.audioToggle', 'Zikr audio')}
                  />
                </div>
                <p className="text-white/40 text-xs leading-relaxed mt-2">
                  {t(
                    'zikr.audioDesc',
                    'Play the pronunciation of each dhikr. Enable auto-play to loop the audio and count automatically.'
                  )}
                </p>
                {zikrAudioEnabled && (
                  <div className="mt-3 flex items-center gap-3">
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
                    <span className="text-white/40 text-xs w-8 text-right">
                      {Math.round(zikrAudioVolume * 100)}%
                    </span>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.06] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowPathIcon className="w-4 h-4 text-brand-gold" />
                  <h3 className="text-brand-gold font-bold text-sm">
                    {t('zikr.resetCounters', 'Start fresh')}
                  </h3>
                </div>
                <p className="text-white/40 text-xs leading-relaxed mb-3">
                  {t(
                    'zikr.resetDesc',
                    'Zero your counts, streak and goal to begin again — your daily history stays saved in Analytics, nothing is deleted.'
                  )}
                </p>
                <button
                  onClick={() => setConfirmReset(true)}
                  className="btn btn-sm border border-brand-gold/30 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 gap-1.5"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" /> {t('zikr.resetCounters', 'Start fresh')}
                </button>
              </section>

              <p className="text-white/25 text-[11px] leading-relaxed border-t border-brand-emerald/10 pt-4">
                {t('zikr.dangerZoneHint', 'Looking for data deletion? Everything lives in')}{' '}
                <a
                  href="/settings"
                  className="text-brand-emerald/70 hover:text-brand-emerald underline underline-offset-2"
                >
                  {t('zikr.dangerZoneLink', 'Settings → Danger zone')}
                </a>
                .
              </p>
            </div>
          </motion.aside>

          <ConfirmDialog
            open={confirmReset}
            title={t('zikr.resetAllConfirmTitle', 'Start fresh?')}
            message={t(
              'zikr.resetConfirmMsg',
              'Your counts, streak and goal progress will be zeroed. Your daily history will not be touched.'
            )}
            confirmLabel={
              resetting
                ? t('zikr.resetting', 'Resetting…')
                : t('zikr.resetConfirm', 'Yes, start fresh')
            }
            onConfirm={() => void handleReset()}
            onCancel={() => setConfirmReset(false)}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
