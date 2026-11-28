import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { InfoButton } from '../ChartInfoModal.js';
import MosqueTrendChart from '../analytics/MosqueTrendChart.js';
import type { SalatAnalytics, useSalatBounceBack } from '../../hooks/useSalatLog.js';
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

/** How you prayed and the missed reasons, side by side on wider screens. */
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
      {(data.completedCount + data.kazaCount > 0 || data.missedReasons) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* How you prayed: Done, Kaza and kaza debt repaid. Not the time the
              Done button was tapped: many people fill the whole day in at night. */}
          {data.completedCount + data.kazaCount + (data.debtRepaidCount ?? 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={CARD}
            >
              <div className="p-5 space-y-3">
                <h2 className={SECTION_TITLE}>
                  <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
                  {t('salatAnalytics.howPrayed', 'How You Prayed')}
                  <InfoButton
                    onClick={() => setInfoTopic('howPrayed')}
                    label={chartInfo.howPrayed!.title}
                  />
                </h2>
                {(() => {
                  const rows = [
                    {
                      label: t('salatAnalytics.howPrayedDone', 'Done'),
                      count: data.completedCount,
                      color: 'bg-brand-emerald',
                    },
                    {
                      label: t('salatAnalytics.howPrayedKaza', 'Kaza'),
                      count: data.kazaCount,
                      color: 'bg-brand-gold',
                    },
                    {
                      label: t('salatAnalytics.howPrayedRepaid', 'Kaza debt repaid'),
                      count: data.debtRepaidCount ?? 0,
                      color: 'bg-brand-info',
                    },
                  ];
                  const total = rows.reduce((n, r) => n + r.count, 0);
                  return (
                    <>
                      <div className="w-full h-4 rounded-full overflow-hidden flex bg-track">
                        {rows.map(({ count, color, label }) => (
                          <motion.div
                            key={label}
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / total) * 100}%` }}
                            transition={{ duration: 0.7 }}
                            className={`h-full ${color}`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs">
                        {rows.map(({ label, count, color }) => (
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
                          'salatAnalytics.howPrayedHint',
                          'Prayers marked Done, prayers marked Kaza, and prayers you paid back from your kaza debt, in this period.'
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

/** How you recover: how often a full day follows a day with a missed prayer. */
export function SalatBounceBackCard({
  bounceBack,
  chartInfo,
  setInfoTopic,
}: {
  bounceBack: ReturnType<typeof useSalatBounceBack>['data'];
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t } = useTranslation();
  const cells = bounceBack
    ? [
        {
          label: t('salatAnalytics.bounceBackAfterSlip', 'After a day with a missed prayer'),
          rate: bounceBack.afterSlipRate ?? 0,
          days: bounceBack.afterSlipDays,
          box: 'border-brand-gold/25 bg-brand-gold/10',
          text: 'text-brand-gold',
        },
        {
          label: t('salatAnalytics.bounceBackAfterFull', 'After a day with all five done'),
          rate: bounceBack.afterFullRate ?? 0,
          days: bounceBack.afterFullDays,
          box: 'border-brand-emerald/25 bg-brand-emerald/10',
          text: 'text-brand-emerald',
        },
      ]
    : [];
  return (
    <>
      {bounceBack?.available && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
          <div className="p-5 space-y-3">
            <h2 className={SECTION_TITLE}>
              <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
              {t('salatAnalytics.bounceBackTitle', 'How you bounce back')}
              <InfoButton
                onClick={() => setInfoTopic('bounceBack')}
                label={chartInfo.bounceBack!.title}
              />
            </h2>
            <p className="text-white/70 text-xs">
              {t(
                'salatAnalytics.bounceBackDesc',
                'After a day with a missed prayer, how often the next day has all five done.'
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cells.map((c) => (
                <div key={c.label} className={`rounded-control border p-3 ${c.box}`}>
                  <p className="text-white/70 text-[11px]">{c.label}</p>
                  <p className={`font-bold text-lg mt-0.5 ${c.text}`}>
                    {t('salatAnalytics.bounceBackRate', '{{rate, number}}%', { rate: c.rate })}
                  </p>
                  <p className="text-white/70 text-[10px] mt-0.5">
                    {t('salatAnalytics.bounceBackNextFull', 'next day all five done')}
                    {' · '}
                    {t('salatAnalytics.bounceBackDays', '{{n}} days', {
                      n: formatLocaleNumber(c.days),
                    })}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-white/70 text-[10px]">
              {t(
                'salatAnalytics.bounceBackHint',
                'Last 90 days, from your Done, Kaza and Miss marks. Not from the time you tapped a button.'
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
