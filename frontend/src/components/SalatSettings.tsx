import { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  XMarkIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  AdjustmentsHorizontalIcon,
  BookOpenIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  HashtagIcon,
  ListBulletIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import api from '../lib/api.js';
import ConfirmDialog from './ConfirmDialog.js';
import { BTN_SECONDARY, ITEM, REF_LINK, SECTION_TITLE } from './bustanStyles.js';
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
 * Salat settings: a right-side DRAWER in Bustan Arch (T3.2), same shape as
 * PrayerTimeSettings.
 *
 * Two genuinely personal choices live here:
 *  1. WHICH after-ṣalāh tasbīḥ you pray, so the tracker credits the right
 *     counts to your dhikr when you tap the tasbīḥ tag.
 *  2. WHICH sunnah/nafl guidance the tracker shows around each farḍ.
 *
 * Both are stored locally (utils/salatPrefs.ts), with no server round-trip.
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
      toast.success(t('salatSettings.resetDone', 'Salat tracking reset. Your history is kept.'));
      setConfirmReset(false);
      onClose();
    } catch {
      toast.error(t('salatSettings.resetFail', 'Could not reset. Please try again.'));
    } finally {
      setResetting(false);
    }
  };

  const chooseTasbih = (m: TasbihMode) => {
    setTasbih(m);
    setTasbihMode(m);
    toast.success(t('salatSettings.tasbihUpdated', 'Tasbīḥ counting updated'), { duration: 1800 });
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
            t('salatTracker.kazaDebtResetDone', 'Kaza debt reset. Counting fresh from today.')
          );
        },
        onError: () =>
          toast.error(t('salatTracker.kazaDebtResetFail', 'Could not reset. Please try again.')),
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
            aria-label={t('salatSettings.title', 'Salat settings')}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3 bg-brand-deep/95 backdrop-blur border-b border-brand-border">
              <h2 className="font-display text-white font-bold text-lg flex items-center gap-2">
                <AdjustmentsHorizontalIcon
                  className="w-5 h-5 text-brand-emerald"
                  aria-hidden="true"
                />
                {t('salatSettings.title', 'Salat settings')}
              </h2>
              <button
                onClick={onClose}
                aria-label={t('salatSettings.close', 'Close salat settings')}
                className="p-1.5 rounded-control text-white/70 hover:text-white hover:bg-brand-surface"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* ── auto-count dhikr ───────────────────────────────────── */}
              <section>
                <h3 className={SECTION_TITLE}>
                  <HashtagIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
                  {t('salatSettings.autoCountTitle', 'Auto-count dhikr')}
                </h3>
                <label className={`${ITEM} mt-3 flex items-center gap-3 cursor-pointer`}>
                  <span className="flex-1 min-w-0 text-white/70 text-xs leading-relaxed">
                    {t(
                      'salatSettings.autoCountDesc',
                      'When on, tapping Tasbīḥ or Ayatul Kursi on a prayer adds the counts straight to your dhikr counter. Turn it off to just mark them as done, and count them yourself with Tasbih mode on the Zikr counter.'
                    )}
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-success shrink-0"
                    checked={autoCount}
                    onChange={(e) => toggleAutoCount(e.target.checked)}
                    aria-label={t('salatSettings.autoCountTitle', 'Auto-count dhikr')}
                  />
                </label>
              </section>

              {/* ── after-salah tasbih ─────────────────────────────────── */}
              <section>
                <h3 className={SECTION_TITLE}>
                  <ListBulletIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
                  {t('salatSettings.tasbihTitle', 'After-ṣalāh tasbīḥ')}
                </h3>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">
                  {t(
                    'salatSettings.tasbihDesc',
                    'Both ways of reaching a hundred are authentic. Pick the one you actually pray: tapping "Tasbīḥ" on a prayer adds exactly these counts to your dhikr.'
                  )}
                </p>

                <div className="mt-3 space-y-2.5">
                  {TASBIH_MODES.map((m) => {
                    const active = tasbih === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`rounded-control border transition-colors ${
                          active
                            ? 'border-brand-emerald/50 bg-brand-emerald/10 shadow-elev-1'
                            : 'border-brand-border bg-brand-surface/50 hover:border-brand-emerald/40'
                        }`}
                      >
                        <button
                          onClick={() => chooseTasbih(m.id)}
                          aria-pressed={active}
                          className="w-full text-left px-3.5 pt-3.5 pb-1"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={`font-black text-sm ${active ? 'text-brand-emerald' : 'text-white/80'}`}
                            >
                              {m.label}
                            </span>
                            {active && (
                              <span className="flex items-center gap-1 text-brand-emerald text-xs font-bold shrink-0">
                                <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                {t('salatSettings.using', 'Using')}
                              </span>
                            )}
                          </span>
                          <span className="block text-white/70 text-xs mt-1">{m.summary}</span>

                          <span className="flex flex-wrap gap-1.5 mt-2.5">
                            {m.steps.map((s) => (
                              <span
                                key={s.zikr}
                                className="px-2 py-0.5 rounded-full bg-shade/30 border border-brand-border text-[11px] text-white/70"
                              >
                                {s.zikr.length > 18 ? 'Tahlīl' : s.zikr}{' '}
                                <b className="text-white/80">×{s.count}</b>
                              </span>
                            ))}
                          </span>

                          {m.virtue && (
                            <span className="block text-white/80 text-[11px] mt-2 italic leading-relaxed">
                              {m.virtue}
                            </span>
                          )}
                        </button>
                        {/* A sibling of the choice button, so following the
                            source never also switches the tasbīḥ. */}
                        <a
                          href={m.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`${REF_LINK} !inline-flex items-center gap-1 mx-3.5 mb-3.5`}
                        >
                          {translateReference(m.source, i18n.language)} ·{' '}
                          {translateReference(m.grade, i18n.language)}
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ── Ayatul Kursi note ──────────────────────────────────── */}
              <section className="rounded-control border border-brand-gold/30 bg-brand-gold/[0.06] p-3.5">
                <h3 className={SECTION_TITLE}>
                  <BookOpenIcon className="w-4 h-4 text-brand-gold" aria-hidden="true" />
                  {t('salatSettings.ayatulKursiTitle', 'Ayatul Kursi')}
                </h3>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">
                  {t(
                    'salatSettings.ayatulKursiDesc',
                    'Tapping "Ayatul Kursi" on a prayer adds one count to that dhikr.'
                  )}
                </p>
                <p className="text-white/80 text-[11px] mt-2 italic leading-relaxed">
                  "{AYATUL_KURSI_REF.virtue}"
                </p>
                <p className="text-brand-gold text-[11px] mt-1">
                  {translateReference(AYATUL_KURSI_REF.source, i18n.language)} ·{' '}
                  {translateReference(AYATUL_KURSI_REF.grade, i18n.language)}
                </p>
              </section>

              {/* ── Sunnah/nafl rakʿah guidance ─────────────────────── */}
              <section>
                <h3 className={SECTION_TITLE}>
                  <ClipboardDocumentListIcon
                    className="w-4 h-4 text-brand-emerald"
                    aria-hidden="true"
                  />
                  {t('salatSettings.sunnahGuideTitle', 'Sunnah & nafl guidance')}
                </h3>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">
                  {t(
                    'salatSettings.sunnahGuideDesc',
                    "Which rakʿahs to pray around each farḍ, shown on the tracker once that prayer's time starts."
                  )}
                </p>

                <div className="mt-3 space-y-2.5">
                  <label className={`${ITEM} flex items-center gap-3 cursor-pointer`}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-white text-sm font-semibold">
                        {t('salatSettings.sunnahMuakkadahToggle', 'Sunnah Muʾakkadah')}
                      </span>
                      <span className="block text-white/70 text-xs mt-0.5 leading-snug">
                        {t(
                          'salatSettings.sunnahMuakkadahToggleDesc',
                          'The confirmed rawātib: Fajr, Ẓuhr, Maghrib, ʿIshāʾ'
                        )}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      className="toggle toggle-success toggle-sm shrink-0"
                      checked={showSunnah}
                      onChange={(e) => toggleShowSunnah(e.target.checked)}
                      aria-label={t('salatSettings.sunnahMuakkadahToggle', 'Sunnah Muʾakkadah')}
                    />
                  </label>

                  <label className={`${ITEM} flex items-center gap-3 cursor-pointer`}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-white text-sm font-semibold">
                        {t('salatSettings.naflGuideToggle', 'Nafl guidance')}
                      </span>
                      <span className="block text-white/70 text-xs mt-0.5 leading-snug">
                        {t(
                          'salatSettings.naflGuideToggleDesc',
                          'Lighter-emphasis extras: 4 before ʿAṣr, 2 before Maghrib'
                        )}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      className="toggle toggle-success toggle-sm shrink-0"
                      checked={showNafl}
                      onChange={(e) => toggleShowNafl(e.target.checked)}
                      aria-label={t('salatSettings.naflGuideToggle', 'Nafl guidance')}
                    />
                  </label>
                </div>
              </section>

              {/* ── Kaza debt reset ─────────────────────────────────── */}
              {(debt?.totalOwed ?? 0) > 0 && (
                <section>
                  <h3 className={SECTION_TITLE}>
                    <ScaleIcon className="w-4 h-4 text-brand-gold" aria-hidden="true" />
                    {t('salatTracker.kazaDebtTitle', 'Kaza Debt')}
                  </h3>
                  <p className="text-white/70 text-xs leading-relaxed mt-1 mb-3">
                    {t(
                      'salatSettings.kazaDebtResetDesc',
                      "Fallen behind for a while? A running total can feel discouraging rather than useful, so reset it and count fresh from today. Your prayer history isn't affected, and you can always add debt back on the tracker if you need to."
                    )}
                  </p>
                  <button
                    onClick={() => setConfirmDebtReset(true)}
                    className={`${BTN_SECONDARY} !px-3 !py-2 !text-xs`}
                  >
                    <ArrowUturnLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('salatTracker.kazaDebtReset', 'Reset kaza debt')}
                  </button>
                </section>
              )}

              {/* ── Reset tracking ─────────────────────────────────── */}
              <section>
                <h3 className={SECTION_TITLE}>
                  <ArrowPathIcon className="w-4 h-4 text-brand-gold" aria-hidden="true" />
                  {t('salatSettings.startFresh', 'Start fresh')}
                </h3>
                <p className="text-white/70 text-xs leading-relaxed mt-1 mb-3">
                  {t(
                    'salatSettings.startFreshDesc',
                    "Analytics and streaks will count from today. All past prayer logs stay intact: you can still view them, but they won't affect your new stats."
                  )}
                </p>
                <button
                  onClick={() => setConfirmReset(true)}
                  className={`${BTN_SECONDARY} !px-3 !py-2 !text-xs`}
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('salatSettings.resetTracking', 'Reset tracking')}
                </button>
              </section>

              <p className="text-white/70 text-[11px] leading-relaxed border-t border-brand-border pt-4">
                {t(
                  'salatSettings.dangerZoneHint',
                  'Looking for data deletion? Everything lives in'
                )}{' '}
                <Link
                  to="/settings"
                  onClick={onClose}
                  className="text-brand-emerald hover:brightness-110 underline underline-offset-2"
                >
                  {t('nav.settings', 'Settings')}
                </Link>
                .
              </p>
            </div>
          </motion.aside>

          <ConfirmDialog
            open={confirmReset}
            title={t('salatSettings.resetConfirmTitle', 'Reset salat tracking?')}
            message={t(
              'salatSettings.resetConfirmMsg',
              "Your streak and analytics will start fresh from today. All past prayer logs are kept; they just won't count toward the new stats."
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
              'All prayers owed will be set to 0 and counting restarts from today. Nothing is deleted: your logged prayers stay as they are, and you can add debt back by hand afterward if you need to.'
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
