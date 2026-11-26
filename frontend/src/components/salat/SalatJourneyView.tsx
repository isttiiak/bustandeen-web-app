import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { ArrowPathIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import ResetTracker from '../journey/ResetTracker.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { InfoButton } from '../ChartInfoModal.js';
import type { useSalatJourney } from '../../hooks/useSalatLog.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import type { ChartInfo, SetInfoTopic } from './useSalatAnalyticsPage.js';

/** The journey view: tracking phases and the reset tracker. */
export function SalatJourneyView({
  journeyPhases,
  journeyLoading,
  chartInfo,
  setInfoTopic,
}: {
  journeyPhases: ReturnType<typeof useSalatJourney>['data'];
  journeyLoading: boolean;
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className={SECTION_TITLE}>{t('salatAnalytics.journeyTabTitle', 'Your Journey')}</h2>
        <InfoButton onClick={() => setInfoTopic('journey')} label={chartInfo.journey!.title} />
      </div>
      {journeyLoading && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-brand-emerald" />
        </div>
      )}
      {!journeyLoading && journeyPhases && journeyPhases.length === 0 && (
        <div className={`${CARD} p-8 text-center`}>
          <p className="text-white/70 text-sm">
            {t(
              'salatAnalytics.journeyEmpty',
              'Start tracking your prayers to see your journey here.'
            )}
          </p>
        </div>
      )}
      {!journeyLoading &&
        journeyPhases &&
        journeyPhases.map((phase, i) => {
          const isCurrentPhase = phase.to === null;
          const totalPossible = phase.days * 5;
          return (
            <motion.div
              key={phase.index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {/* Reset divider above every non-current phase */}
              {!isCurrentPhase && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-brand-emerald/10" />
                  <span className="inline-flex items-center gap-1 text-[11px] text-brand-emerald font-semibold px-2 py-0.5 rounded-full bg-brand-emerald/10 border border-brand-emerald/20">
                    <ArrowPathIcon className="w-3 h-3" aria-hidden="true" />
                    {t('salatAnalytics.journeyReset', 'Reset')}
                    {phase.resetNote ? `: ${phase.resetNote}` : ''}
                  </span>
                  <div className="flex-1 h-px bg-brand-emerald/10" />
                </div>
              )}

              <div
                className={`rounded-card border shadow-elev-2 p-5 space-y-4 ${
                  isCurrentPhase
                    ? 'bg-brand-emerald/10 border-brand-emerald/30'
                    : 'bg-brand-deep border-brand-border'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${isCurrentPhase ? 'text-brand-emerald' : 'text-white/70'}`}
                    >
                      {isCurrentPhase
                        ? t('salatAnalytics.journeyCurrent', 'Current journey')
                        : t('salatAnalytics.journeyPhase', 'Phase {{n}}', {
                            n: formatLocaleNumber(journeyPhases.length - i),
                          })}
                    </p>
                    <p className="text-white/70 text-xs">
                      {formatLocaleDate(new Date(phase.from + 'T12:00:00'), {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {' – '}
                      {phase.to
                        ? formatLocaleDate(new Date(phase.to + 'T12:00:00'), {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : t('salatAnalytics.journeyNow', 'now')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-2xl font-black ${isCurrentPhase ? 'text-brand-emerald' : 'text-white/70'}`}
                    >
                      {formatLocaleNumber(phase.completionRate)}%
                    </p>
                    <p className="text-white/70 text-[10px]">
                      {t('salatAnalytics.journeyDays', '{{n}} days', {
                        n: formatLocaleNumber(phase.days),
                      })}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-track">
                  {totalPossible > 0 && (
                    <>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${((phase.done - phase.kaza) / totalPossible) * 100}%`,
                        }}
                        transition={{ duration: 0.7, delay: i * 0.06 }}
                        className="h-full bg-brand-emerald"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(phase.kaza / totalPossible) * 100}%` }}
                        transition={{ duration: 0.7, delay: i * 0.06 + 0.05 }}
                        className="h-full bg-brand-gold"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(phase.missed / totalPossible) * 100}%` }}
                        transition={{ duration: 0.7, delay: i * 0.06 + 0.1 }}
                        className="h-full bg-data-none"
                      />
                    </>
                  )}
                </div>

                {/* Stat chips */}
                <div className="flex flex-wrap gap-3 text-xs">
                  {[
                    {
                      label: t('salatAnalytics.onTime'),
                      count: phase.done - phase.kaza,
                      color: 'text-brand-emerald',
                    },
                    {
                      label: t('salatAnalytics.kaza'),
                      count: phase.kaza,
                      color: 'text-brand-gold',
                    },
                    {
                      label: t('salatAnalytics.missed'),
                      count: phase.missed,
                      color: 'text-data-none',
                    },
                  ].map(({ label, count, color }) => (
                    <span key={label} className={`font-bold ${color}`}>
                      {formatLocaleNumber(count)}{' '}
                      <span className="font-normal text-white/70">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      <p className="text-white/70 text-[11px] text-center pt-2 flex items-center justify-center gap-1">
        <InformationCircleIcon className="w-3 h-3 shrink-0" />
        {t('salatAnalytics.journeyNote', 'Missed includes prayers left unmarked on past days.')}
      </p>
      {/* Two trackers here: Salat's fresh starts and the Kaza debt resets */}
      <ResetTracker areas={['salat', 'kaza']} />
    </div>
  );
}
