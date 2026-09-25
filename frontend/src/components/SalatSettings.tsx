import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';
import ConfirmDialog from './ConfirmDialog.js';
import {
  TASBIH_MODES,
  getTasbihMode,
  setTasbihMode,
  type TasbihMode,
  AYATUL_KURSI_REF,
  getAutoCountDhikr,
  setAutoCountDhikr,
  getShowSunnahGuide,
  setShowSunnahGuide,
  getShowNaflGuide,
  setShowNaflGuide,
} from '../utils/salatPrefs.js';
import { translateReference } from '../utils/localeReference.js';
import { useSalatDebt, useResetSalatDebt } from '../hooks/useSalatLog.js';
import { getTrackingDay } from '../utils/trackingDay.js';

/**
 * Salat settings — a right-side DRAWER, same shape as QuranSettings.
 *
 * Two genuinely personal choices live here:
 *  1. WHICH after-ṣalāh tasbīḥ you pray, so the tracker credits the right
 *     counts to your dhikr when you tap the tasbīḥ tag.
 *  2. WHICH madhab's ʿAṣr timing you follow, which also moves the end of Ẓuhr.
 *
 * Both are stored locally (utils/salatPrefs.ts) — no server round-trip.
 */
export default function SalatSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [tasbih, setTasbih] = useState<TasbihMode>(() => getTasbihMode());
  const [autoCount, setAutoCount] = useState<boolean>(() => getAutoCountDhikr());
  const [showSunnah, setShowSunnah] = useState<boolean>(() => getShowSunnahGuide());
  const [showNafl, setShowNafl] = useState<boolean>(() => getShowNaflGuide());
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { data: debt } = useSalatDebt();
  const resetDebt = useResetSalatDebt();
  const [confirmDebtReset, setConfirmDebtReset] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await api.post('/api/salat/reset', { today });
      queryClient.invalidateQueries({ queryKey: ['salat'] });
      toast.success(
        t('salatSettings.resetDone', 'Salat tracking reset — your history is preserved'),
        { icon: '🕌' }
      );
      setConfirmReset(false);
      onClose();
    } catch {
      toast.error(t('salatSettings.resetFail', 'Could not reset — try again'));
    } finally {
      setResetting(false);
    }
  };

  const chooseTasbih = (m: TasbihMode) => {
    setTasbih(m);
    setTasbihMode(m);
    toast.success(t('salatSettings.tasbihUpdated', 'Tasbīḥ counting updated'), {
      icon: '📿',
      duration: 1800,
    });
  };

  const toggleAutoCount = (value: boolean) => {
    setAutoCount(value);
    setAutoCountDhikr(value);
  };

  const toggleShowSunnah = (value: boolean) => {
    setShowSunnah(value);
    setShowSunnahGuide(value);
  };

  const toggleShowNafl = (value: boolean) => {
    setShowNafl(value);
    setShowNaflGuide(value);
  };

  const handleDebtReset = () => {
    resetDebt.mutate(
      { today: getTrackingDay() },
      {
        onSuccess: () => {
          toast.success(
            t('salatTracker.kazaDebtResetDone', 'Kaza debt reset — counting fresh from today'),
            { icon: '🌱' }
          );
        },
        onError: () =>
          toast.error(t('salatTracker.kazaDebtResetFail', 'Could not reset — try again')),
      }
    );
    setConfirmDebtReset(false);
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
            aria-label={t('salatSettings.title', 'Salat settings')}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-brand-deep/95 backdrop-blur border-b border-brand-emerald/10">
              <h2 className="text-brand-emerald font-black text-lg">
                {t('salatSettings.title', 'Salat settings')}
              </h2>
              <button
                onClick={onClose}
                aria-label={t('salatSettings.close', 'Close salat settings')}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-7">
              {/* ── auto-count dhikr ───────────────────────────────────── */}
              <section className="rounded-2xl border border-brand-emerald/20 bg-brand-emerald/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-brand-emerald font-bold text-sm">
                    {t('salatSettings.autoCountTitle', '📿 Auto-count dhikr')}
                  </h3>
                  <input
                    type="checkbox"
                    className="toggle toggle-success"
                    checked={autoCount}
                    onChange={(e) => toggleAutoCount(e.target.checked)}
                    aria-label={t('salatSettings.autoCountTitle', '📿 Auto-count dhikr')}
                  />
                </div>
                <p className="text-white/40 text-xs leading-relaxed mt-2">
                  {t(
                    'salatSettings.autoCountDesc',
                    'When on, tapping Tasbīḥ or Ayatul Kursi below adds the counts straight to your dhikr counter. Turn it off to just mark them as done — use Tasbih mode on the Zikr counter to count them yourself instead.'
                  )}
                </p>
              </section>

              {/* ── after-salah tasbih ─────────────────────────────────── */}
              <section>
                <h3 className="text-white font-bold text-sm">
                  {t('salatSettings.tasbihTitle', '📿 After-ṣalāh tasbīḥ')}
                </h3>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">
                  {t(
                    'salatSettings.tasbihDesc',
                    'Both ways of reaching a hundred are authentic. Pick the one you actually pray — tapping "Tasbīḥ" on a prayer adds exactly these counts to your dhikr.'
                  )}
                </p>

                <div className="mt-3 space-y-2.5">
                  {TASBIH_MODES.map((m) => {
                    const active = tasbih === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => chooseTasbih(m.id)}
                        aria-pressed={active}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                          active
                            ? 'border-brand-emerald/40 bg-brand-emerald/10'
                            : 'border-brand-emerald/10 bg-white/5 hover:border-brand-emerald/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-black text-sm ${active ? 'text-brand-emerald' : 'text-white/80'}`}
                          >
                            {m.label}
                          </span>
                          {active && (
                            <span className="text-brand-emerald text-xs font-bold shrink-0">
                              {t('salatSettings.using', '✓ Using')}
                            </span>
                          )}
                        </div>
                        <p className="text-white/50 text-xs mt-1">{m.summary}</p>

                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {m.steps.map((s) => (
                            <span
                              key={s.zikr}
                              className="px-2 py-0.5 rounded-lg bg-black/30 border border-brand-emerald/10 text-[11px] text-white/60"
                            >
                              {s.zikr.length > 18 ? 'Tahlīl' : s.zikr}{' '}
                              <b className="text-white/80">×{s.count}</b>
                            </span>
                          ))}
                        </div>

                        {m.virtue && (
                          <p className="text-brand-gold/60 text-[11px] mt-2 italic">{m.virtue}</p>
                        )}
                        <a
                          href={m.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-block text-[11px] text-white/35 hover:text-brand-emerald mt-1.5 underline underline-offset-2"
                        >
                          {translateReference(m.source, i18n.language)} ·{' '}
                          {translateReference(m.grade, i18n.language)} ↗
                        </a>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ── Ayatul Kursi note ──────────────────────────────────── */}
              <section className="p-3.5 rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.06]">
                <h3 className="text-brand-gold font-bold text-sm">
                  {t('salatSettings.ayatulKursiTitle', '📖 Ayatul Kursi')}
                </h3>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">
                  {t(
                    'salatSettings.ayatulKursiDesc',
                    'Tapping "Ayatul Kursi" on a prayer adds one count to that dhikr.'
                  )}
                </p>
                <p className="text-brand-gold/60 text-[11px] mt-2 italic">
                  "{AYATUL_KURSI_REF.virtue}"
                </p>
                <p className="text-white/30 text-[11px] mt-1">
                  {translateReference(AYATUL_KURSI_REF.source, i18n.language)} ·{' '}
                  {translateReference(AYATUL_KURSI_REF.grade, i18n.language)}
                </p>
              </section>

              {/* ── Sunnah/nafl rakʿah guidance ─────────────────────── */}
              <section className="rounded-2xl border border-brand-emerald/20 bg-brand-emerald/[0.06] p-4 space-y-4">
                <div>
                  <h3 className="text-brand-emerald font-bold text-sm">
                    {t('salatSettings.sunnahGuideTitle', '🕋 Sunnah & nafl guidance')}
                  </h3>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed">
                    {t(
                      'salatSettings.sunnahGuideDesc',
                      "Which rakʿahs to pray around each farḍ — shown on the tracker once that prayer's time starts."
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white/80 text-xs font-semibold">
                      {t('salatSettings.sunnahMuakkadahToggle', 'Sunnah Muʾakkadah')}
                    </p>
                    <p className="text-white/35 text-[11px] mt-0.5">
                      {t(
                        'salatSettings.sunnahMuakkadahToggleDesc',
                        'The confirmed rawātib — Fajr, Ẓuhr, Maghrib, ʿIshāʾ'
                      )}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-success toggle-sm shrink-0"
                    checked={showSunnah}
                    onChange={(e) => toggleShowSunnah(e.target.checked)}
                    aria-label={t('salatSettings.sunnahMuakkadahToggle', 'Sunnah Muʾakkadah')}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white/80 text-xs font-semibold">
                      {t('salatSettings.naflGuideToggle', 'Nafl guidance')}
                    </p>
                    <p className="text-white/35 text-[11px] mt-0.5">
                      {t(
                        'salatSettings.naflGuideToggleDesc',
                        'Lighter-emphasis extras — 4 before ʿAṣr, 2 before Maghrib'
                      )}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-info toggle-sm shrink-0"
                    checked={showNafl}
                    onChange={(e) => toggleShowNafl(e.target.checked)}
                    aria-label={t('salatSettings.naflGuideToggle', 'Nafl guidance')}
                  />
                </div>
              </section>

              {/* ── Kaza debt reset ─────────────────────────────────── */}
              {(debt?.totalOwed ?? 0) > 0 && (
                <section className="rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.06] p-4">
                  <h3 className="text-brand-gold font-bold text-sm">
                    {t('salatTracker.kazaDebtTitle', 'Kaza Debt')}
                  </h3>
                  <p className="text-white/40 text-xs leading-relaxed mt-1 mb-3">
                    {t(
                      'salatSettings.kazaDebtResetDesc',
                      "Fallen behind for a while? A running total can feel discouraging rather than useful — reset it and count fresh from today. Your prayer history isn't affected, and you can always add debt back on the tracker if you need to."
                    )}
                  </p>
                  <button
                    onClick={() => setConfirmDebtReset(true)}
                    className="btn btn-sm border border-brand-gold/30 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 gap-1.5"
                  >
                    🌱 {t('salatTracker.kazaDebtReset', 'Reset kaza debt')}
                  </button>
                </section>
              )}

              {/* ── Reset tracking ─────────────────────────────────── */}
              <section className="rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.06] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowPathIcon className="w-4 h-4 text-brand-gold" />
                  <h3 className="text-brand-gold font-bold text-sm">
                    {t('salatSettings.startFresh', 'Start fresh')}
                  </h3>
                </div>
                <p className="text-white/40 text-xs leading-relaxed mb-3">
                  {t(
                    'salatSettings.startFreshDesc',
                    "Analytics and streaks will count from today. All past prayer logs stay intact — you can still view them, but they won't affect your new stats."
                  )}
                </p>
                <button
                  onClick={() => setConfirmReset(true)}
                  className="btn btn-sm border border-brand-gold/30 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 gap-1.5"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />{' '}
                  {t('salatSettings.resetTracking', 'Reset tracking')}
                </button>
              </section>

              <p className="text-white/25 text-[11px] leading-relaxed border-t border-brand-emerald/10 pt-4">
                {t(
                  'salatSettings.dangerZoneHint',
                  'Looking for data deletion? Everything lives in'
                )}{' '}
                <a
                  href="/settings"
                  className="text-brand-emerald/70 hover:text-brand-emerald underline underline-offset-2"
                >
                  {t('nav.settings', 'Settings')}
                </a>
                .
              </p>
            </div>
          </motion.aside>

          <ConfirmDialog
            open={confirmReset}
            title={t('salatSettings.resetConfirmTitle', 'Reset salat tracking?')}
            message={t(
              'salatSettings.resetConfirmMsg',
              "Your streak and analytics will start fresh from today. All past prayer logs will be preserved — they just won't count toward the new stats."
            )}
            confirmLabel={
              resetting
                ? t('salatSettings.resetting', 'Resetting…')
                : t('salatSettings.resetConfirm', 'Yes, start fresh')
            }
            onConfirm={() => void handleReset()}
            onCancel={() => setConfirmReset(false)}
          />

          <ConfirmDialog
            open={confirmDebtReset}
            title={t('salatTracker.kazaDebtResetConfirmTitle', 'Reset kaza debt?')}
            message={t(
              'salatTracker.kazaDebtResetConfirmMsg',
              'All prayers owed will be set to 0 and counting restarts from today. Nothing is deleted — your logged prayers stay as they are, and you can add debt back by hand afterward if you need to.'
            )}
            confirmLabel={
              resetDebt.isPending
                ? t('salatTracker.kazaDebtResetting', 'Resetting…')
                : t('salatTracker.kazaDebtResetConfirm', 'Yes, start fresh')
            }
            onConfirm={handleDebtReset}
            onCancel={() => setConfirmDebtReset(false)}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
