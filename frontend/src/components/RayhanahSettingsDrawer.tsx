import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  useBodyStats,
  useUpdateBodyStats,
  useCycleSummary,
  useSetMadhab,
} from '../hooks/useCycle.js';
import { useUiStore } from '../store/useUiStore.js';
import {
  parseHeightToCm,
  parseWeightToKg,
  formatHeight,
  formatWeight,
  computeBmi,
  bmiCategory,
  type HeightUnit,
  type WeightUnit,
} from '../utils/bodyStats.js';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Right-side settings drawer for the Rayhanah pages (Cycle and Analytics share
 * it). Height/weight are sent to the server, which stores them AES-256-GCM
 * encrypted (see cycle.service.ts); the unit choice and the "hide BMI" switch
 * are purely local display preferences.
 */
export default function RayhanahSettingsDrawer({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { data: bodyStats } = useBodyStats();
  const updateBodyStats = useUpdateBodyStats();
  const { data: summary } = useCycleSummary();
  const setMadhab = useSetMadhab();

  const heightUnit = useUiStore((s) => s.cycleHeightUnit);
  const weightUnit = useUiStore((s) => s.cycleWeightUnit);
  const hideBmi = useUiStore((s) => s.hideBmi);
  const setHeightUnit = useUiStore((s) => s.setCycleHeightUnit);
  const setWeightUnit = useUiStore((s) => s.setCycleWeightUnit);
  const setHideBmi = useUiStore((s) => s.setHideBmi);

  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');

  // Fill the fields from what's saved (in the preferred units) each time the
  // drawer opens, so it never shows stale text from an earlier edit.
  useEffect(() => {
    if (!open) return;
    setHeightInput(bodyStats?.heightCm != null ? formatHeight(bodyStats.heightCm, heightUnit) : '');
    setWeightInput(bodyStats?.weightKg != null ? formatWeight(bodyStats.weightKg, weightUnit) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refill only when the drawer opens or saved data changes, not on every unit toggle (that converts the typed text instead)
  }, [open, bodyStats?.heightCm, bodyStats?.weightKg]);

  const changeHeightUnit = (next: HeightUnit) => {
    if (next === heightUnit) return;
    const cm = parseHeightToCm(heightInput, heightUnit);
    setHeightInput(cm ? formatHeight(cm, next) : '');
    setHeightUnit(next);
  };
  const changeWeightUnit = (next: WeightUnit) => {
    if (next === weightUnit) return;
    const kg = parseWeightToKg(weightInput, weightUnit);
    setWeightInput(kg ? formatWeight(kg, next) : '');
    setWeightUnit(next);
  };

  const cmH = parseHeightToCm(heightInput, heightUnit);
  const kgW = parseWeightToKg(weightInput, weightUnit);
  const bmi = cmH && kgW ? computeBmi(cmH, kgW) : null;
  const cat = bmi ? bmiCategory(bmi) : null;
  const hasSaved = bodyStats?.heightCm != null || bodyStats?.weightKg != null;

  const save = () => {
    // An emptied field means "remove it"; an unreadable one is left alone.
    const heightCm = heightInput.trim() === '' ? null : (cmH ?? undefined);
    const weightKg = weightInput.trim() === '' ? null : (kgW ?? undefined);
    if (heightCm === undefined && weightKg === undefined) {
      toast.error(
        t('rayhanah.bodyStatsInvalid', 'Please check the height and weight you entered.'),
        {
          id: 'body-stats',
        }
      );
      return;
    }
    updateBodyStats.mutate(
      { heightCm, weightKg },
      {
        onSuccess: () => {
          toast.success(t('rayhanah.bodyStatsSaved', 'Body stats saved 🌸'), { id: 'body-stats' });
          onClose();
        },
      }
    );
  };

  const clearAll = () => {
    updateBodyStats.mutate(
      { heightCm: null, weightKg: null },
      {
        onSuccess: () => {
          setHeightInput('');
          setWeightInput('');
          toast.success(t('rayhanah.bodyStatsCleared', 'Height and weight removed'), {
            id: 'body-stats',
          });
        },
      }
    );
  };

  const unitSelect = 'select select-sm w-20 bg-white/5 border-brand-border text-white';
  const inputCls =
    'input input-sm flex-1 bg-white/5 border-brand-border text-white placeholder:text-white/20';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-y-0 right-0 w-80 max-w-[90vw] bg-brand-deep border-l border-brand-pink/20 flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={t('rayhanah.settingsTitle', 'Rayhanah settings')}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-brand-border/60">
              <h3 className="text-white font-black text-base">
                {t('rayhanah.settingsTitle', 'Rayhanah settings')}
              </h3>
              <button
                onClick={onClose}
                aria-label={t('common.close', 'Close')}
                className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 px-5 py-5 space-y-6">
              {/* ── Body stats ─────────────────────────────────────────────── */}
              <section className="space-y-4">
                <h4 className="text-brand-pink/80 text-[11px] font-black uppercase tracking-wide">
                  {t('rayhanah.bodyStatsSection', 'Height and weight')}
                </h4>

                <div>
                  <label className="text-white/50 text-xs font-bold block mb-2">
                    {t('rayhanah.heightLabel', 'Height')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={heightUnit === 'm' ? '1.63' : '5\'4"'}
                      value={heightInput}
                      onChange={(e) => setHeightInput(e.target.value)}
                      className={inputCls}
                    />
                    <select
                      value={heightUnit}
                      onChange={(e) => changeHeightUnit(e.target.value as HeightUnit)}
                      className={unitSelect}
                    >
                      <option value="m">m</option>
                      <option value="ft">ft</option>
                    </select>
                  </div>
                  <p className="text-white/25 text-[10px] mt-1">
                    {heightUnit === 'm'
                      ? t('rayhanah.heightHintM', 'e.g. 1.63 (meters)')
                      : t('rayhanah.heightHintFt', 'e.g. 5\'4" or 5.33')}
                  </p>
                </div>

                <div>
                  <label className="text-white/50 text-xs font-bold block mb-2">
                    {t('rayhanah.weightLabel', 'Weight')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={weightUnit === 'kg' ? '58' : '128'}
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className={inputCls}
                    />
                    <select
                      value={weightUnit}
                      onChange={(e) => changeWeightUnit(e.target.value as WeightUnit)}
                      className={unitSelect}
                    >
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                </div>

                {bmi && cat && cmH && kgW && (
                  <div className="space-y-2">
                    <div className="rounded-2xl bg-white/5 border border-brand-border p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-wide">
                          {t('rayhanah.bmi', 'BMI')}
                        </p>
                        <p className={`text-3xl font-black ${cat.color}`}>{bmi}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${cat.color}`}>
                          {t(`rayhanah.${cat.key}`, cat.label)}
                        </p>
                        <p className="text-white/30 text-[10px] mt-0.5">
                          {cmH} cm · {kgW} kg
                        </p>
                      </div>
                    </div>
                    <p className="text-white/25 text-[10px] leading-relaxed">
                      {t(
                        'rayhanah.bmiNote',
                        'BMI is a general guide, not a medical diagnosis. Your doctor knows your full picture.'
                      )}
                    </p>
                  </div>
                )}

                <button
                  className="w-full btn rounded-2xl bg-brand-pink/20 border-brand-pink/30 text-brand-pink hover:bg-brand-pink/30 font-black disabled:opacity-40"
                  disabled={updateBodyStats.isPending}
                  onClick={save}
                >
                  {updateBodyStats.isPending ? (
                    <span className="loading loading-spinner" />
                  ) : (
                    t('rayhanah.saveBodyStats', 'Save')
                  )}
                </button>

                {hasSaved && (
                  <button
                    className="w-full text-xs text-white/40 hover:text-red-300 transition-colors"
                    disabled={updateBodyStats.isPending}
                    onClick={clearAll}
                  >
                    {t('rayhanah.clearBodyStats', 'Remove my saved height and weight')}
                  </button>
                )}

                <p className="text-white/25 text-[10px] text-center leading-relaxed">
                  {t('rayhanah.bodyStatsNote', '🔒 Encrypted. Visible only to you.')}
                </p>
              </section>

              {/* ── Preferences ────────────────────────────────────────────── */}
              <section className="space-y-4 border-t border-brand-border/60 pt-5">
                <h4 className="text-brand-pink/80 text-[11px] font-black uppercase tracking-wide">
                  {t('rayhanah.preferencesSection', 'Preferences')}
                </h4>

                <div>
                  <p className="text-white/50 text-xs font-bold mb-2">
                    {t('rayhanah.haydMaximumTitle', 'Hayd maximum (madhab)')}
                  </p>
                  <div className="join">
                    {(['majority', 'hanafi'] as const).map((m) => (
                      <button
                        key={m}
                        className={`join-item btn btn-xs ${summary?.madhab === m ? 'bg-brand-pink/30 border-brand-pink/40 text-brand-pink' : 'bg-white/5 border-brand-border text-white/50'}`}
                        disabled={setMadhab.isPending}
                        onClick={() => summary?.madhab !== m && setMadhab.mutate(m)}
                      >
                        {m === 'hanafi'
                          ? t('rayhanah.madhabHanafi', 'Ḥanafī')
                          : t('rayhanah.madhabMajority', 'Majority')}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <span>
                    <span className="block text-white/60 text-xs font-bold">
                      {t('rayhanah.hideBmi', 'Hide BMI in analytics')}
                    </span>
                    <span className="block text-white/25 text-[10px] leading-relaxed mt-0.5">
                      {t(
                        'rayhanah.hideBmiHint',
                        'Keeps your height and weight saved but stops showing the BMI card. Stored on this device only.'
                      )}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm toggle-secondary mt-0.5"
                    checked={hideBmi}
                    onChange={(e) => setHideBmi(e.target.checked)}
                  />
                </label>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
