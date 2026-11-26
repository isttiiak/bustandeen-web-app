import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { PrayerGlyph } from '../icons/IslamicIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { InfoButton } from '../ChartInfoModal.js';
import KazaDebtChart from '../analytics/KazaDebtChart.js';
import type {
  PrayerId,
  useSalatDebtHistory,
  useSalatDebtInsights,
} from '../../hooks/useSalatLog.js';
import { PRAYER_META, translateSalatName } from '../../utils/prayerTimes.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import type { ChartInfo, SetInfoTopic } from './useSalatAnalyticsPage.js';

/** Kaza debt chart: accumulation against payback, grouped bars. */
export function SalatKazaDebtSection({
  debtHistory,
  chartInfo,
  setInfoTopic,
}: {
  debtHistory: ReturnType<typeof useSalatDebtHistory>['data'];
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t } = useTranslation();
  return (
    <>
      {debtHistory && debtHistory.some((w) => w.accumulated > 0 || w.paidBack > 0) && (
        <div className="space-y-3">
          <h2 className={SECTION_TITLE}>
            <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
            {t('salatAnalytics.kazaDebtChart')}
            <InfoButton
              onClick={() => setInfoTopic('kazaDebtChart')}
              label={chartInfo.kazaDebtChart!.title}
            />
          </h2>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <KazaDebtChart data={debtHistory} />
          </motion.div>
        </div>
      )}
    </>
  );
}

/** Kaza insights, derived from the itemized ledger. */
export function SalatKazaInsightsCard({
  kazaInsights,
  chartInfo,
  setInfoTopic,
}: {
  kazaInsights: ReturnType<typeof useSalatDebtInsights>['data'];
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t } = useTranslation();
  return (
    <>
      {kazaInsights &&
        (kazaInsights.itemizedOwedCount > 0 || kazaInsights.itemizedPaidCount > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={CARD}
          >
            <div className="p-5 space-y-3">
              <h2 className={SECTION_TITLE}>
                <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
                {t('salatAnalytics.kazaInsightsTitle', 'Kaza insights')}
                <InfoButton
                  onClick={() => setInfoTopic('kazaInsights')}
                  label={chartInfo.kazaInsights!.title}
                />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {kazaInsights.oldestOwed && (
                  <div className="rounded-control border border-data-none/30 bg-data-none/10 p-3">
                    <p className="text-white/70 text-[11px]">
                      {t('salatAnalytics.kazaOldestOwed', 'Oldest still owed')}
                    </p>
                    <p className="text-white font-bold text-sm mt-0.5">
                      {translateSalatName(
                        kazaInsights.oldestOwed.prayer,
                        kazaInsights.oldestOwed.prayer,
                        t
                      )}{' '}
                      ·{' '}
                      {formatLocaleDate(
                        new Date(kazaInsights.oldestOwed.missedDate + 'T12:00:00'),
                        { month: 'short', day: 'numeric', year: 'numeric' }
                      )}
                    </p>
                  </div>
                )}
                {kazaInsights.avgPayoffDays !== null && (
                  <div className="rounded-control border border-brand-emerald/25 bg-brand-emerald/10 p-3">
                    <p className="text-white/70 text-[11px]">
                      {t('salatAnalytics.kazaAvgPayoff', 'Average time to pay back')}
                    </p>
                    <p className="text-brand-emerald font-bold text-sm mt-0.5">
                      {t('salatAnalytics.kazaAvgPayoffDays', '{{days}} days', {
                        days: formatLocaleNumber(kazaInsights.avgPayoffDays),
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Per-prayer payoff speed — which prayer's kaza lingers longest */}
              {kazaInsights.perPrayer && Object.keys(kazaInsights.perPrayer).length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-white/70 text-[11px] font-bold uppercase tracking-wide">
                    {t('salatAnalytics.kazaPerPrayer', 'By prayer')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRAYER_META.filter((p) => p.isTrackable).map((prayer) => {
                      const pp = kazaInsights.perPrayer[prayer.id as PrayerId];
                      if (!pp) return null;
                      return (
                        <div
                          key={prayer.id}
                          className="flex items-center justify-between gap-2 rounded-control bg-brand-surface/50 border border-brand-border px-2.5 py-1.5 text-xs"
                        >
                          <span className="text-white/60 flex items-center gap-1.5">
                            <PrayerGlyph
                              id={prayer.id}
                              className="w-4 h-4 text-brand-emerald"
                              aria-hidden="true"
                            />
                            {translateSalatName(prayer.id, prayer.name, t)}
                          </span>
                          <span className="text-white/70">
                            {pp.owedCount > 0 &&
                              t('salatAnalytics.kazaOwedCount', '{{n}} owed', {
                                n: formatLocaleNumber(pp.owedCount),
                              })}
                            {pp.owedCount > 0 && pp.avgPayoffDays !== null && ' · '}
                            {pp.avgPayoffDays !== null &&
                              t('salatAnalytics.kazaAvgPayoffDays', '{{days}} days', {
                                days: formatLocaleNumber(pp.avgPayoffDays),
                              })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-white/70 text-[10px]">
                {t(
                  'salatAnalytics.kazaInsightsHint',
                  'Based on prayers the tracker knows an exact missed date for. A rough estimate you added by hand may not be counted here.'
                )}
              </p>
            </div>
          </motion.div>
        )}
    </>
  );
}
