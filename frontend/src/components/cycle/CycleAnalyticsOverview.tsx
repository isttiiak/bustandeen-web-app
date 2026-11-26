import { useTranslation } from 'react-i18next';
import {
  ArrowsRightLeftIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { CARD, TILE } from '../bustanStyles.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import type { CycleStats } from '../../utils/cycleStats.js';
import { NO_VALUE, TILE_LABEL, TILE_NUM } from './cycleAnalyticsParts.js';

/** The four headline tiles: cycles tracked, averages, regularity. */
export function CycleStatTiles({ stats }: { stats: CycleStats }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className={TILE}>
        <p className={`${TILE_NUM} text-brand-pink`}>{formatLocaleNumber(stats.haydCount)}</p>
        <p className={TILE_LABEL}>{t('cycleAnalytics.cyclesTracked', 'cycles tracked')}</p>
      </div>
      <div className={TILE}>
        <p className={`${TILE_NUM} text-brand-pink`}>
          {stats.gaps.length ? formatLocaleNumber(Math.round(stats.mean)) : NO_VALUE}
        </p>
        <p className={TILE_LABEL}>{t('cycleAnalytics.avgCycleDays', 'avg cycle days')}</p>
      </div>
      <div className={TILE}>
        <p className={`${TILE_NUM} text-brand-pink`}>
          {stats.lengths.length ? formatLocaleNumber(Math.round(stats.meanLen)) : NO_VALUE}
        </p>
        <p className={TILE_LABEL}>{t('cycleAnalytics.avgPeriodDays', 'avg period days')}</p>
      </div>
      <div className={TILE}>
        <p className={`text-sm font-bold mt-1.5 ${stats.regularity.tone}`}>
          {t(`cycleAnalytics.regularity.${stats.regularity.key}`, stats.regularity.label)}
        </p>
        <p className={`${TILE_LABEL} mt-1.5`}>
          {t('cycleAnalytics.regularityLabel', 'regularity')}{' '}
          {stats.gaps.length > 1 && (
            <span className="normal-case">(±{formatLocaleNumber(Math.round(stats.sd))}d)</span>
          )}
        </p>
      </div>
    </div>
  );
}

/** Shortest, longest, range and the trend. */
export function CycleInsightTiles({ stats }: { stats: CycleStats }) {
  const { t } = useTranslation();
  return (
    <>
      {stats.gaps.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={TILE}>
            <p className={`${TILE_NUM} text-brand-info`}>
              {stats.shortest != null ? formatLocaleNumber(stats.shortest) : NO_VALUE}
            </p>
            <p className={TILE_LABEL}>{t('cycleAnalytics.shortestCycle', 'shortest cycle')}</p>
          </div>
          <div className={TILE}>
            <p className={`${TILE_NUM} text-brand-info`}>
              {stats.longest != null ? formatLocaleNumber(stats.longest) : NO_VALUE}
            </p>
            <p className={TILE_LABEL}>{t('cycleAnalytics.longestCycle', 'longest cycle')}</p>
          </div>
          <div className={TILE}>
            <p className={`${TILE_NUM} text-brand-info`}>
              {stats.longest != null && stats.shortest != null
                ? formatLocaleNumber(stats.longest - stats.shortest)
                : NO_VALUE}
            </p>
            <p className={TILE_LABEL}>{t('cycleAnalytics.rangeDays', 'range (days)')}</p>
          </div>
          {stats.trend && (
            <div className={TILE}>
              <p
                className={`text-sm font-bold mt-1.5 ${stats.trend === 'stable' ? 'text-brand-emerald' : stats.trend === 'shorter' ? 'text-brand-info' : 'text-brand-gold'}`}
              >
                <span className="inline-flex items-center gap-1">
                  {stats.trend === 'shorter' ? (
                    <ArrowTrendingDownIcon className="w-4 h-4" aria-hidden="true" />
                  ) : stats.trend === 'longer' ? (
                    <ArrowTrendingUpIcon className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ArrowsRightLeftIcon className="w-4 h-4" aria-hidden="true" />
                  )}
                  {stats.trend === 'shorter'
                    ? t('cycleAnalytics.trendShorter', 'Getting shorter')
                    : stats.trend === 'longer'
                      ? t('cycleAnalytics.trendLonger', 'Getting longer')
                      : t('cycleAnalytics.trendStable', 'Stable')}
                </span>
              </p>
              <p className={`${TILE_LABEL} mt-1.5`}>{t('cycleAnalytics.trendLabel', 'trend')}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** "Cycle length change noticed", when the last cycle is far from the average. */
export function CycleIrregularityAlert({ stats }: { stats: CycleStats }) {
  const { t } = useTranslation();
  return (
    <>
      {stats.irregAlertDays != null && (
        <div
          className={`${CARD} border-brand-gold/40 p-4 text-brand-gold text-xs leading-relaxed flex gap-3`}
        >
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">
              {t('cycleAnalytics.irregAlertTitle', 'Cycle length change noticed')}
            </p>
            <p className="text-white/80 mt-1">
              {stats.irregAlertDirection === 'longer'
                ? t('cycleAnalytics.irregAlertLonger', {
                    defaultValue:
                      'Your last cycle was {{days, number}} days longer than average. Worth noting if this continues.',
                    days: stats.irregAlertDays,
                  })
                : t('cycleAnalytics.irregAlertShorter', {
                    defaultValue:
                      'Your last cycle was {{days, number}} days shorter than average. Worth noting if this continues.',
                    days: stats.irregAlertDays,
                  })}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
