import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { InfoButton } from '../ChartInfoModal.js';
import MosqueTrendChart from '../analytics/MosqueTrendChart.js';
import type { SalatAnalytics, useSalatCorrelation } from '../../hooks/useSalatLog.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import type { ChartInfo, SetInfoTopic } from './useSalatAnalyticsPage.js';

// Same Fri-first ordering as DAY_LABELS, mapped to JS Date#getDay() indices
// (0=Sun…6=Sat) — that's how the backend keys byWeekday.
const FRI_FIRST_JS_DAYS = [5, 6, 0, 1, 2, 3, 4];

/** By day of week: the completion rate per weekday, Islamic-week order. */
export function SalatWeekdayCard({
  data,
  dayLabels,
  chartInfo,
  setInfoTopic,
}: {
  data: SalatAnalytics;
  dayLabels: string[];
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t } = useTranslation();
  const DAY_LABELS = dayLabels;
  return (
    <>
      {data.byWeekday && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
          <div className="p-5 space-y-3">
            <h2 className={SECTION_TITLE}>
              <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
              {t('salatAnalytics.byWeekday', 'By Day of Week')}
              <InfoButton
                onClick={() => setInfoTopic('byWeekday')}
                label={chartInfo.byWeekday!.title}
              />
            </h2>
            <div className="flex items-end justify-between gap-2 h-24">
              {FRI_FIRST_JS_DAYS.map((jsDay, idx) => {
                const w = data.byWeekday[jsDay] ?? {
                  completed: 0,
                  kaza: 0,
                  missed: 0,
                  total: 0,
                };
                const pct = w.total > 0 ? Math.round(((w.completed + w.kaza) / w.total) * 100) : 0;
                const h = w.total > 0 ? Math.max(6, pct) : 4;
                return (
                  <div
                    key={jsDay}
                    className="flex-1 flex flex-col items-center gap-1 tooltip"
                    data-tip={`${DAY_LABELS[idx]}: ${formatLocaleNumber(pct)}%`}
                  >
                    <span className="text-[10px] font-bold text-white/70 h-3 leading-none">
                      {w.total > 0 ? `${formatLocaleNumber(pct)}%` : ''}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="w-full rounded-t-[4px] bg-brand-emerald"
                      style={{ opacity: w.total > 0 ? 0.5 + (pct / 100) * 0.5 : 0.15 }}
                    />
                    <span className="text-[10px] text-white/70">{DAY_LABELS[idx]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}

/** Prayer timing and the missed reasons, side by side on wider screens. */
export function SalatTimingAndReasons({
  data,
  chartInfo,
  setInfoTopic,
}: {
  data: SalatAnalytics;
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t } = useTranslation();
  return (
    <>
      {(data.timeOfWindow || data.missedReasons) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Prayer timing: how far into the window prayers were marked done */}
          {data.timeOfWindow &&
            data.timeOfWindow.early + data.timeOfWindow.mid + data.timeOfWindow.late > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={CARD}
              >
                <div className="p-5 space-y-3">
                  <h2 className={SECTION_TITLE}>
                    <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
                    {t('salatAnalytics.prayerTiming', 'Prayer Timing')}
                    <InfoButton
                      onClick={() => setInfoTopic('prayerTiming')}
                      label={chartInfo.prayerTiming!.title}
                    />
                  </h2>
                  {(() => {
                    const { early, mid, late } = data.timeOfWindow;
                    const known = early + mid + late;
                    return (
                      <>
                        <div className="w-full h-4 rounded-full overflow-hidden flex bg-track">
                          {[
                            { count: early, color: 'bg-brand-emerald' },
                            { count: mid, color: 'bg-brand-gold' },
                            { count: late, color: 'bg-data-none' },
                          ].map(({ count, color }, i) => (
                            <motion.div
                              key={i}
                              initial={{ width: 0 }}
                              animate={{ width: `${(count / known) * 100}%` }}
                              transition={{ duration: 0.7 }}
                              className={`h-full ${color}`}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs">
                          {[
                            {
                              label: t('salatAnalytics.timingEarly', 'Early'),
                              count: early,
                              color: 'bg-brand-emerald',
                            },
                            {
                              label: t('salatAnalytics.timingMid', 'Mid-window'),
                              count: mid,
                              color: 'bg-brand-gold',
                            },
                            {
                              label: t('salatAnalytics.timingLate', 'Late'),
                              count: late,
                              color: 'bg-data-none',
                            },
                          ].map(({ label, count, color }) => (
                            <div key={label} className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                              <span className="text-white/70">{label}</span>
                              <span className="text-white font-bold">
                                {formatLocaleNumber(count)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-white/70 text-[10px]">
                          {t(
                            'salatAnalytics.timingHint',
                            "How far into each prayer's window it was marked done. Only counted when your location was set at the time."
                          )}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}

          {/* Missed reasons — only the ones the user actually picked */}
          {data.missedReasons && Object.values(data.missedReasons).some((c) => c > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={CARD}
            >
              <div className="p-5 space-y-3">
                <h2 className={SECTION_TITLE}>
                  <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
                  {t('salatAnalytics.missedReasonsTitle', 'Missed Reasons')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.missedReasons)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([reason, count]) => (
                      <div
                        key={reason}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-brand-surface/50 border border-brand-border text-xs"
                      >
                        <span className="text-white/60">
                          {t(`salatTracker.missedReason.${reason}`, reason)}
                        </span>
                        <span className="text-white font-bold">{formatLocaleNumber(count)}</span>
                      </div>
                    ))}
                </div>
                <p className="text-white/70 text-[10px]">
                  {t(
                    'salatAnalytics.missedReasonsHint',
                    'Only counts prayers where you picked a reason after marking them missed. Picking a reason is optional.'
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </>
  );
}

/** Isha time against catching Fajr the next morning. */
export function SalatCorrelationCard({
  correlation,
  chartInfo,
  setInfoTopic,
}: {
  correlation: ReturnType<typeof useSalatCorrelation>['data'];
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t } = useTranslation();
  return (
    <>
      {correlation?.available && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
          <div className="p-5 space-y-3">
            <h2 className={SECTION_TITLE}>
              <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
              {t('salatAnalytics.correlationTitle', 'Isha & Fajr connection')}
              <InfoButton
                onClick={() => setInfoTopic('correlation')}
                label={chartInfo.correlation!.title}
              />
            </h2>
            <p className="text-white/70 text-xs">
              {t(
                'salatAnalytics.correlationDesc',
                'How your Isha time relates to whether you catch Fajr the next morning.'
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-control border border-brand-emerald/25 bg-brand-emerald/10 p-3">
                <p className="text-white/70 text-[11px]">
                  {t('salatAnalytics.correlationEarly', 'Isha before 11pm')}
                </p>
                <p className="text-brand-emerald font-bold text-lg mt-0.5">
                  {t('salatAnalytics.correlationRate', '{{rate, number}}%', {
                    rate: correlation.earlyIshaFajrRate ?? 0,
                  })}
                </p>
                <p className="text-white/70 text-[10px] mt-0.5">
                  {t('salatAnalytics.correlationFajrOnTime', 'Fajr on time')}
                </p>
              </div>
              <div className="rounded-control border border-brand-gold/25 bg-brand-gold/10 p-3">
                <p className="text-white/70 text-[11px]">
                  {t('salatAnalytics.correlationLate', 'Isha after 11pm')}
                </p>
                <p className="text-brand-gold font-bold text-lg mt-0.5">
                  {t('salatAnalytics.correlationRate', '{{rate, number}}%', {
                    rate: correlation.lateIshaFajrRate ?? 0,
                  })}
                </p>
                <p className="text-white/70 text-[10px] mt-0.5">
                  {t('salatAnalytics.correlationFajrOnTime', 'Fajr on time')}
                </p>
              </div>
            </div>
            <p className="text-white/70 text-[10px]">
              {t(
                'salatAnalytics.correlationHint',
                'Based on the last 90 days of prayer times you already logged.'
              )}
            </p>
          </div>
        </motion.div>
      )}
    </>
  );
}

/** Mosque attendance trend (weekly, up to 12 steps). */
export function SalatMosqueTrendSection({
  data,
  chartInfo,
  setInfoTopic,
}: {
  data: SalatAnalytics;
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t } = useTranslation();
  return (
    <>
      {data.weeklyMosqueTrend.length > 0 && (
        <div className="space-y-3">
          <h2 className={SECTION_TITLE}>
            <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
            {t('salatAnalytics.mosqueTrend')}
            <InfoButton
              onClick={() => setInfoTopic('mosqueTrend')}
              label={chartInfo.mosqueTrend!.title}
            />
          </h2>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <MosqueTrendChart data={data.weeklyMosqueTrend} />
          </motion.div>
        </div>
      )}
    </>
  );
}
