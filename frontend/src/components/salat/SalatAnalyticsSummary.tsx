import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { ArrowPathIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE, TILE } from '../bustanStyles.js';
import type { SalatAnalytics, useSalatDebt } from '../../hooks/useSalatLog.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { ALL_TIME_DAYS } from './useSalatAnalyticsPage.js';

/** The period note, the stat tiles and the overall breakdown strip. */
export function SalatAnalyticsSummary({
  data,
  days,
  debt,
}: {
  data: SalatAnalytics;
  days: number;
  debt: ReturnType<typeof useSalatDebt>['data'];
}) {
  const { t } = useTranslation();
  return (
    <>
      {/* Period note — shown when tracking start or a reset shortened the window (not for "All time", which is expected to) */}
      {data.totalDays < data.periodDays && days !== ALL_TIME_DAYS && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-control bg-brand-emerald/10 border border-brand-emerald/20">
          <ArrowPathIcon className="w-5 h-5 shrink-0 text-brand-emerald" aria-hidden="true" />
          <p className="text-sm text-white/70">
            {t('salatAnalytics.resetNote', {
              actual: formatLocaleNumber(data.totalDays),
              requested: formatLocaleNumber(data.periodDays),
              defaultValue:
                'Showing {{actual}} of {{requested}} days: analytics count only from when you started tracking or last reset.',
            })}
          </p>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: t('salatAnalytics.completion'),
            value: `${formatLocaleNumber(data.completionRate)}%`,
            accent: 'text-brand-emerald',
          },
          {
            label: t('salatAnalytics.currentStreak'),
            value: formatLocaleNumber(data.currentStreak),
            accent: 'text-brand-gold',
          },
          {
            label: t('salatAnalytics.bestRun'),
            value: formatLocaleNumber(data.bestStreak),
            accent: 'text-brand-info',
          },
          {
            label: t('salatAnalytics.naflDays'),
            value: formatLocaleNumber(data.naflDays ?? 0),
            accent: 'text-brand-warm',
          },
          {
            label: t('salatAnalytics.kazaDebt'),
            value: formatLocaleNumber(debt?.totalOwed ?? 0),
            accent: 'text-brand-pink',
          },
          ...(data.fridayCount > 0
            ? [
                {
                  label: t('salatAnalytics.jumuahAttendance'),
                  value: `${formatLocaleNumber(Math.round((data.jumuahAttendedCount / data.fridayCount) * 100))}%`,
                  accent: 'text-brand-gold',
                },
              ]
            : []),
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={TILE}
          >
            <p className={`font-display text-3xl font-bold tabular-nums ${s.accent}`}>{s.value}</p>
            <p className="text-white/70 text-[10px] font-bold uppercase mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Breakdown strip */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className={SECTION_TITLE}>{t('salatAnalytics.overallBreakdown')}</h2>
            <span className="text-white/70 text-xs">
              {t('salatAnalytics.totalSummary', {
                days: formatLocaleNumber(data.totalDays),
                total: formatLocaleNumber(data.totalPossiblePrayers),
              })}
            </span>
          </div>
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-track">
            {data.totalPossiblePrayers > 0 && (
              <>
                {[
                  {
                    count: data.completedCount,
                    color: 'bg-brand-emerald',
                    tip: t('salatAnalytics.onTime'),
                  },
                  {
                    count: data.kazaCount,
                    color: 'bg-brand-gold',
                    tip: t('salatAnalytics.kaza'),
                  },
                  {
                    count: data.missedCount,
                    color: 'bg-data-none',
                    tip: t('salatAnalytics.missed'),
                  },
                ].map(({ count, color, tip }) => (
                  <motion.div
                    key={tip}
                    title={`${tip}: ${formatLocaleNumber(count)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / data.totalPossiblePrayers) * 100}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full ${color}`}
                  />
                ))}
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {[
              {
                label: t('salatAnalytics.onTime'),
                count: data.completedCount,
                color: 'bg-brand-emerald',
              },
              {
                label: t('salatAnalytics.kaza'),
                count: data.kazaCount,
                color: 'bg-brand-gold',
              },
              {
                label: t('salatAnalytics.missed'),
                count: data.missedCount,
                color: 'bg-data-none',
              },
              {
                label: t('salatAnalytics.mosque'),
                count: data.mosqueCount,
                color: 'bg-brand-info',
              },
              {
                label: t('salatAnalytics.jamat'),
                count: data.jamaatCount,
                color: 'bg-brand-info',
              },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                <span className="text-white/70">{label}</span>
                <span className="text-white font-bold">{formatLocaleNumber(count)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-0.5 pt-1 border-t border-brand-emerald/10">
            <p className="text-white/70 text-xs flex items-center gap-1">
              <InformationCircleIcon className="w-3 h-3 shrink-0" />
              {t('salatAnalytics.completionFormula', {
                days: formatLocaleNumber(data.totalDays),
              })}{' '}
              <strong className="text-white/70">{formatLocaleNumber(data.completionRate)}%</strong>
            </p>
            <p className="text-white/70 text-xs flex items-center gap-1">
              <InformationCircleIcon className="w-3 h-3 shrink-0" />
              {t(
                'salatAnalytics.missedNote',
                'Missed includes prayers left unmarked on past days, not only those you tapped as "missed".'
              )}
            </p>
            <p className="text-white/70 text-xs flex items-center gap-1">
              <InformationCircleIcon className="w-3 h-3 shrink-0" />
              {t('salatAnalytics.mosqueJamatNote')}
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
