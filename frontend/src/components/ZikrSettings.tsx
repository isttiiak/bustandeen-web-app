import { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  SpeakerWaveIcon,
  MusicalNoteIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';
import ConfirmDialog from './ConfirmDialog.js';
import ZikrQuickSettings from './zikr/ZikrQuickSettings.js';
import { useUiStore } from '../store/useUiStore.js';

const TASBIH_TARGET_PRESETS = [33, 34, 99, 100];

export default function ZikrSettings({
  open,
  onClose,
  onManageList,
}: {
  open: boolean;
  onClose: () => void;
  /** Opens the counter's "My zikr list" (edit / remove) dialog. */
  onManageList?: () => void;
}) {
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
  const zikrPlayOnTap = useUiStore((s) => s.zikrPlayOnTap);
  const setZikrPlayOnTap = useUiStore((s) => s.setZikrPlayOnTap);

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.post('/api/zikr/reset');
      queryClient.invalidateQueries({ queryKey: ['zikr'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(t('zikr.toast.resetDone', 'Counters reset. Your history is still there'));
      setConfirmReset(false);
      onClose();
    } catch {
      toast.error(t('zikr.toast.resetFail', 'Could not reset. Please try again'));
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
            className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-sm bg-brand-deep border-l border-brand-border shadow-elev-3 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={t('zikr.a11y.settings', 'Zikr settings')}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3 bg-brand-deep/95 backdrop-blur border-b border-brand-border">
              <h2 className="font-display text-white font-bold text-lg">
                {t('zikr.a11y.settings', 'Zikr settings')}
              </h2>
              <button
                onClick={onClose}
                aria-label={t('zikr.a11y.closeSettings', 'Close zikr settings')}
                className="p-1.5 rounded-control text-white/70 hover:text-white hover:bg-brand-surface"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {onManageList && (
                <button
                  onClick={onManageList}
                  className="w-full flex items-center gap-3 rounded-card border border-brand-emerald/30 bg-brand-emerald/[0.08] shadow-elev-1 p-4 text-left hover:border-brand-emerald/60 transition-colors"
                >
                  <PencilSquareIcon className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-brand-emerald font-bold text-sm">
                      {t('zikr.manageList', 'Edit my zikr list')}
                    </span>
                    <span className="block text-white/75 text-xs leading-relaxed mt-0.5">
                      {t(
                        'zikr.manageListDesc',
                        'Edit your own zikr, or remove ones you no longer want in the dropdown.'
                      )}
                    </span>
                  </span>
                </button>
              )}

              <section className="rounded-card border border-brand-border bg-brand-surface/50 shadow-elev-1 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ArrowsRightLeftIcon className="w-4 h-4 text-brand-emerald" />
                    <h3 className="text-white font-bold text-sm">
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
                <p className="text-white/75 text-xs leading-relaxed mt-2">
                  {t(
                    'zikr.tasbihModeDesc',
                    'Count down from a target instead of up: pick how many, then each tap counts down. A distinct vibration and celebration mark the set complete, then it starts over.'
                  )}
                </p>
                {tasbihMode && (
                  <div className="mt-3">
                    <p className="text-white/80 text-xs font-semibold mb-1.5">
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
                          aria-pressed={tasbihTarget === n}
                          className={`px-3 py-1.5 rounded-control text-xs font-bold border transition-colors ${
                            tasbihTarget === n
                              ? 'border-brand-emerald bg-brand-emerald/10 text-white'
                              : 'border-brand-border bg-brand-deep text-white/80 hover:border-brand-emerald/40'
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
                        className={`w-20 px-2.5 py-1.5 rounded-control text-xs font-bold border bg-brand-deep text-white placeholder:text-white/50 focus:outline-none focus:border-brand-emerald ${
                          !TASBIH_TARGET_PRESETS.includes(tasbihTarget) && !customTarget
                            ? 'border-brand-emerald bg-brand-emerald/10'
                            : 'border-brand-border'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </section>

              <ZikrQuickSettings />

              <section className="rounded-card border border-brand-border bg-brand-surface/50 shadow-elev-1 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MusicalNoteIcon className="w-4 h-4 text-brand-emerald" />
                    <h3 className="text-white font-bold text-sm">
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
                <p className="text-white/75 text-xs leading-relaxed mt-2">
                  {t('zikr.tapSoundDesc', 'A soft click on every count, like wooden tasbih beads.')}
                </p>
              </section>

              <section className="rounded-card border border-brand-border bg-brand-surface/50 shadow-elev-1 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <SpeakerWaveIcon className="w-4 h-4 text-brand-emerald" />
                    <h3 className="text-white font-bold text-sm">
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
                <p className="text-white/75 text-xs leading-relaxed mt-2">
                  {t(
                    'zikr.audioDesc',
                    'Play the pronunciation of each dhikr. Enable auto-play to loop the audio and count automatically.'
                  )}
                </p>
                {zikrAudioEnabled && (
                  <div className="mt-3 rounded-control border border-brand-border bg-brand-deep p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-white text-xs font-semibold">
                        {t('zikr.playOnTap', 'Play on every tap')}
                      </span>
                      <input
                        type="checkbox"
                        className="toggle toggle-success toggle-xs"
                        checked={zikrPlayOnTap}
                        onChange={(e) => setZikrPlayOnTap(e.target.checked)}
                        aria-label={t('zikr.playOnTap', 'Play on every tap')}
                      />
                    </div>
                    <p className="text-white/75 text-[11px] leading-relaxed mt-1.5">
                      {t(
                        'zikr.playOnTapDesc',
                        'Hear the dhikr each time you count. If you tap again while it is still playing, it finishes instead of starting over.'
                      )}
                    </p>
                  </div>
                )}
                {zikrAudioEnabled && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-white/80 text-xs shrink-0">
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
                    <span className="text-white/80 text-xs w-9 text-right tabular-nums">
                      {Math.round(zikrAudioVolume * 100)}%
                    </span>
                  </div>
                )}
              </section>

              <section className="rounded-card border border-brand-border bg-brand-surface/50 shadow-elev-1 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowPathIcon className="w-4 h-4 text-brand-gold" />
                  <h3 className="text-white font-bold text-sm">
                    {t('zikr.resetCounters', 'Start fresh')}
                  </h3>
                </div>
                <p className="text-white/75 text-xs leading-relaxed mb-3">
                  {t(
                    'zikr.resetDesc',
                    'Zero your counts, streak and goal to begin again. Your daily history stays saved in Analytics; nothing is deleted.'
                  )}
                </p>
                <button
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-xs font-bold border border-brand-gold/40 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 transition-colors"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  {t('zikr.resetCounters', 'Start fresh')}
                </button>
              </section>

              <p className="text-white/70 text-[11px] leading-relaxed border-t border-brand-border pt-4">
                {t('zikr.dangerZoneHint', 'Looking for data deletion? Everything lives in')}{' '}
                <a
                  href="/settings"
                  className="text-brand-emerald hover:brightness-110 underline underline-offset-2"
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
