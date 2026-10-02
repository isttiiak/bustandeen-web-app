import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  HandRaisedIcon,
  ScaleIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useUpdateFastingProfile, useAddVow } from '../../hooks/useFasting.js';
import { OBLIGATORY_META } from '../../utils/fastingRules.js';
import { RefLink, ManageProgress } from './fastingParts.js';

export interface FastingSettingsSheetProps {
  addVow: ReturnType<typeof useAddVow>;
  kaffarahActive: boolean;
  qadaDone: number;
  qadaInput: string;
  qadaOwed: number;
  qadaRemaining: number;
  saveQadaOwed: () => void;
  setConfirmVowDelete: React.Dispatch<React.SetStateAction<{ id: string; title: string } | null>>;
  setQadaInput: React.Dispatch<React.SetStateAction<string>>;
  setShowManage: React.Dispatch<React.SetStateAction<boolean>>;
  setVowDays: React.Dispatch<React.SetStateAction<string>>;
  setVowTitle: React.Dispatch<React.SetStateAction<string>>;
  showManage: boolean;
  submitVow: () => void;
  summary: (import('../../hooks/useFasting.js').FastingSummary & { ok: boolean }) | undefined;
  updateProfile: ReturnType<typeof useUpdateFastingProfile>;
  vowDays: string;
  vowTitle: string;
  vows: import('../../hooks/useFasting.js').FastingVow[];
}

export default function FastingSettingsSheet({
  addVow,
  kaffarahActive,
  qadaDone,
  qadaInput,
  qadaOwed,
  qadaRemaining,
  saveQadaOwed,
  setConfirmVowDelete,
  setQadaInput,
  setShowManage,
  setVowDays,
  setVowTitle,
  showManage,
  submitVow,
  summary,
  updateProfile,
  vowDays,
  vowTitle,
  vows,
}: FastingSettingsSheetProps) {
  const { t } = useTranslation();
  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showManage && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                onClick={() => setShowManage(false)}
              />
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="fixed right-0 top-0 bottom-0 z-[65] w-full max-w-sm bg-brand-deep border-l border-brand-border overflow-y-auto"
                role="dialog"
                aria-label={t('fasting.settingsAriaLabel', 'Fasting settings')}
              >
                <div className="sticky top-0 bg-brand-deep/95 backdrop-blur px-5 py-4 flex items-center justify-between border-b border-brand-border z-10">
                  <div>
                    <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                      <Cog6ToothIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
                      {t('fasting.settingsTitle', 'Fasting settings')}
                    </h3>
                    <p className="text-white/70 text-xs">
                      {t(
                        'fasting.settingsSubtitle',
                        'Obligations and vows. Each one gets a countdown on the main card.'
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowManage(false)}
                    aria-label={t('common.close')}
                    className="text-white/60 hover:text-white p-1"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* ── Qada ── */}
                  <div className="rounded-card border border-brand-border border-t-2 border-t-brand-gold bg-brand-surface shadow-elev-2 p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-control bg-brand-gold/10 text-brand-gold grid place-items-center shrink-0">
                        <ArrowPathIcon className="w-5 h-5" aria-hidden="true" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm leading-tight">
                          {t('fasting.qadaMissedDays', 'Qaḍā: missed Ramaḍān days')}
                        </p>
                        <p className="text-white/70 text-[11px]">
                          {t('fasting.qadaMakeupNote', 'Quran 2:184: make them up day by day')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/80 text-xs">{t('fasting.iOwe', 'I owe')}</span>
                      <input
                        type="number"
                        min="0"
                        value={qadaInput}
                        onChange={(e) => setQadaInput(e.target.value)}
                        aria-label={t('fasting.daysOwedAriaLabel', 'Days owed')}
                        className="input input-sm w-20 bg-brand-deep border-brand-border text-white text-center font-bold"
                      />
                      <span className="text-white/80 text-xs">{t('common.days')}</span>
                      <button
                        onClick={saveQadaOwed}
                        className="ml-auto px-3 py-1.5 rounded-control text-xs font-bold text-on-color bg-brand-emerald-dim hover:brightness-110 shadow-elev-1"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                    {qadaOwed > 0 && (
                      <ManageProgress
                        done={qadaDone}
                        target={qadaOwed}
                        color="rgb(var(--c-gold))"
                        doneLabel={
                          qadaRemaining === 0
                            ? t('fasting.allMadeUp', "All made up, māshā'Allāh!")
                            : t('fasting.daysRemaining', '{{count}} days remaining', {
                                count: qadaRemaining,
                              })
                        }
                      />
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {OBLIGATORY_META[0]!.refs.map((r) => (
                        <RefLink key={r.url} r={r} />
                      ))}
                    </div>
                  </div>

                  {/* ── Kaffarah ── */}
                  <div className="rounded-card border border-brand-border border-t-2 border-t-brand-warm bg-brand-surface shadow-elev-2 p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-control bg-brand-warm/10 text-brand-warm grid place-items-center shrink-0">
                        <ScaleIcon className="w-5 h-5" aria-hidden="true" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm leading-tight">
                          {t('fasting.kaffarahExpiation', 'Kaffārah: expiation')}
                        </p>
                        <p className="text-white/70 text-[11px]">
                          {t(
                            'fasting.kaffarahConsecutiveNote',
                            'Consecutive days required (Bukhārī 1936)'
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          updateProfile.mutate({
                            kaffarah: {
                              active: !kaffarahActive,
                              targetDays: summary?.profile.kaffarah.targetDays ?? 60,
                            },
                          })
                        }
                        className={`px-3 py-1.5 rounded-control text-xs font-bold shrink-0 shadow-elev-1 ${kaffarahActive ? 'bg-brand-deep border border-brand-border text-white/80' : 'bg-brand-emerald-dim text-on-color hover:brightness-110'}`}
                      >
                        {kaffarahActive ? t('fasting.stop', 'Stop') : t('fasting.start', 'Start')}
                      </button>
                    </div>
                    {kaffarahActive ? (
                      <>
                        <select
                          value={summary?.profile.kaffarah.targetDays ?? 60}
                          onChange={(e) =>
                            updateProfile.mutate({
                              kaffarah: { active: true, targetDays: parseInt(e.target.value, 10) },
                            })
                          }
                          aria-label={t('fasting.kaffarahTargetAriaLabel', 'Kaffarah target')}
                          className="select select-xs w-full bg-brand-deep border-brand-border text-white"
                        >
                          <option value={60}>
                            {t('fasting.kaffarah60Days', '60 consecutive days (Ramaḍān violation)')}
                          </option>
                          <option value={3}>
                            {t('fasting.kaffarah3Days', '3 days (broken oath)')}
                          </option>
                        </select>
                        <ManageProgress
                          done={summary?.kaffarah.currentRun ?? 0}
                          target={summary?.profile.kaffarah.targetDays ?? 60}
                          color="rgb(var(--c-warm))"
                          doneLabel={
                            (summary?.kaffarah.currentRun ?? 0) >=
                            (summary?.profile.kaffarah.targetDays ?? 60)
                              ? t('fasting.kaffarahComplete', "Complete, māshā'Allāh!")
                              : t('fasting.kaffarahDaysToGo', '{{count}} consecutive days to go', {
                                  count: Math.max(
                                    0,
                                    (summary?.profile.kaffarah.targetDays ?? 60) -
                                      (summary?.kaffarah.currentRun ?? 0)
                                  ),
                                })
                          }
                          extra={t(
                            'fasting.kaffarahExtra',
                            'current run: {{run}} · lifetime total: {{total}}',
                            {
                              run: summary?.kaffarah.currentRun ?? 0,
                              total: summary?.kaffarah.completed ?? 0,
                            }
                          )}
                        />
                        {summary?.kaffarah.runStale && (summary?.kaffarah.completed ?? 0) > 0 && (
                          <p className="flex items-start gap-2 text-red-400 text-xs rounded-control bg-red-400/10 border border-red-400/30 px-2.5 py-2">
                            <ExclamationTriangleIcon
                              className="w-4 h-4 shrink-0"
                              aria-hidden="true"
                            />
                            {t(
                              'fasting.chainBrokenWarning',
                              'Chain broken: an unexcused gap restarts the consecutive count. Log a fast today to start a new run. Consult a scholar about valid excuses.'
                            )}
                          </p>
                        )}
                        <p className="text-white/70 text-[11px] leading-relaxed">
                          {t(
                            'fasting.kaffarahAlternative',
                            'For a broken oath, feeding/clothing ten poor people comes first; fasting 3 days only if unable (Quran 5:89).'
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="text-white/70 text-xs">
                        {t('fasting.onlyIfApplies', 'Only activate if this applies to you.')}
                      </p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {OBLIGATORY_META[1]!.refs.map((r) => (
                        <RefLink key={r.url} r={r} />
                      ))}
                    </div>
                  </div>

                  {/* ── Vows ── */}
                  <div className="rounded-card border border-brand-border border-t-2 border-t-brand-info bg-brand-surface shadow-elev-2 p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-control bg-brand-info/10 text-brand-info grid place-items-center shrink-0">
                        <HandRaisedIcon className="w-5 h-5" aria-hidden="true" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm leading-tight">
                          {t('fasting.nadhrVowedFasts', 'Nadhr: vowed fasts')}
                        </p>
                        <p className="text-white/70 text-[11px]">
                          {t(
                            'fasting.nadhrHadith',
                            '"Whoever vows to obey Allah, let him obey Him" (Bukhārī 6696)'
                          )}
                        </p>
                      </div>
                    </div>
                    {vows.length === 0 && (
                      <p className="text-white/70 text-xs">
                        {t(
                          'fasting.noVowsYet',
                          'No vows yet. Add one below and it gets its own countdown.'
                        )}
                      </p>
                    )}
                    {vows.map((v) => (
                      <div
                        key={v.id}
                        className="rounded-control bg-brand-deep border border-brand-border p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-white text-xs font-bold flex-1 truncate">{v.title}</p>
                          <button
                            onClick={() => setConfirmVowDelete({ id: v.id, title: v.title })}
                            aria-label={t('fasting.deleteVowAriaLabel', 'Delete vow {{title}}', {
                              title: v.title,
                            })}
                            className="p-1 text-white/60 hover:text-red-400 shrink-0"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <ManageProgress
                          done={v.completed}
                          target={v.targetDays}
                          color="rgb(var(--c-info))"
                          doneLabel={
                            v.completed >= v.targetDays
                              ? t('fasting.vowFulfilled', 'Fulfilled')
                              : t('fasting.daysRemaining', '{{count}} days remaining', {
                                  count: v.targetDays - v.completed,
                                })
                          }
                        />
                      </div>
                    ))}
                    <div className="flex gap-1.5 pt-1">
                      <input
                        value={vowTitle}
                        onChange={(e) => setVowTitle(e.target.value)}
                        placeholder={t('fasting.vowPlaceholder', 'e.g. 3 days for shifa')}
                        aria-label={t('fasting.vowDescriptionAriaLabel', 'Vow description')}
                        className="input input-sm flex-1 bg-brand-deep border-brand-border text-white placeholder-white/50"
                      />
                      <input
                        type="number"
                        min="1"
                        value={vowDays}
                        onChange={(e) => setVowDays(e.target.value)}
                        placeholder={t('common.days')}
                        aria-label={t('fasting.vowDaysAriaLabel', 'Vow days')}
                        className="input input-sm w-16 bg-brand-deep border-brand-border text-white placeholder-white/50 text-center"
                      />
                      <button
                        onClick={submitVow}
                        disabled={!vowTitle.trim() || !vowDays || addVow.isPending}
                        className="px-3 rounded-control text-xs font-bold text-on-color bg-brand-emerald-dim hover:brightness-110 shadow-elev-1 disabled:opacity-40"
                      >
                        {t('common.add')}
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {OBLIGATORY_META[2]!.refs.map((r) => (
                        <RefLink key={r.url} r={r} />
                      ))}
                    </div>
                  </div>

                  <Link
                    to="/settings"
                    onClick={() => setShowManage(false)}
                    className="block text-center text-white/60 hover:text-red-400 text-xs underline underline-offset-2 pt-4 pb-2 transition-colors"
                  >
                    {t('fasting.deleteFastingData', 'Delete fasting data')}
                  </Link>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
