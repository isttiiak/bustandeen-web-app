import { useTranslation } from 'react-i18next';
import { ArrowDownTrayIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import type { ChartDataPointWithBreakdown } from '../analytics/PerTypeTrendChart.js';
import type { AnalyticsResponse } from '../../types/api.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';

function exportCsv(data: ChartDataPointWithBreakdown[], allTypes: string[]) {
  const header = ['date', 'total', ...allTypes].join(',');
  const rows = data.map((d) => {
    const cols = [d.date, d.total, ...allTypes.map((t) => d.breakdown?.[t] ?? 0)];
    return cols.join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zikr-${data[0]?.date ?? 'export'}-to-${data[data.length - 1]?.date ?? 'export'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Personal records (best day, longest streak, averages) and the CSV export. */
export function ZikrRecordsCard({
  chartData,
  yearData,
  allTime,
  streak,
}: {
  chartData: AnalyticsResponse['chartData'];
  yearData: AnalyticsResponse | undefined;
  allTime: AnalyticsResponse['allTime'];
  streak: AnalyticsResponse['streak'];
}) {
  const { t } = useTranslation();
  const yearDays = yearData?.chartData ?? [];
  const activeDays = yearDays.filter((d) => d.total > 0);
  const avgActive = activeDays.length
    ? Math.round(activeDays.reduce((s, d) => s + d.total, 0) / activeDays.length)
    : 0;
  const dayOfWeekTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const d of yearDays) {
    const dow = new Date(d.date + 'T12:00:00').getDay();
    dayOfWeekTotals[dow] = (dayOfWeekTotals[dow] ?? 0) + d.total;
  }
  const bestDow = dayOfWeekTotals.indexOf(Math.max(...dayOfWeekTotals));
  // 7 Jan 2024 was a Sunday: weekday names in the UI language.
  const dowName = (dow: number) =>
    formatLocaleDate(new Date(2024, 0, 7 + dow, 12), { weekday: 'long' });
  const records = [
    {
      label: t('zikrAnalytics.bestDayRecord', 'Best day'),
      value: allTime?.bestDay?.count ? formatLocaleNumber(allTime.bestDay.count) : '-',
      sub: allTime?.bestDay?.date
        ? formatLocaleDate(new Date(allTime.bestDay.date), {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '',
      accent: 'text-brand-emerald',
    },
    {
      label: t('zikrAnalytics.longestStreak', 'Longest streak'),
      value: streak?.longestStreak
        ? t('zikrAnalytics.streakDaysValue', '{{n}} d', {
            n: formatLocaleNumber(streak.longestStreak),
          })
        : '-',
      sub: '',
      accent: 'text-brand-gold',
    },
    {
      label: t('zikrAnalytics.avgActiveDay', 'Avg on active days'),
      value: avgActive ? formatLocaleNumber(avgActive) : '-',
      sub: t('zikrAnalytics.activeDaysCount', '{{n}} active days', {
        n: formatLocaleNumber(activeDays.length),
      }),
      accent: 'text-brand-info',
    },
    {
      label: t('zikrAnalytics.mostActiveDay', 'Most active day'),
      value: dayOfWeekTotals[bestDow] > 0 ? dowName(bestDow) : '-',
      sub: '',
      accent: 'text-brand-warm',
    },
  ];
  return (
    <div className={`${CARD} p-4 sm:p-5 space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={SECTION_TITLE}>
          <TrophyIcon className="w-5 h-5 text-brand-gold" />
          {t('zikrAnalytics.personalRecords', 'Personal records')}
        </h2>
        <button
          onClick={() =>
            exportCsv(chartData, [
              ...new Set(chartData.flatMap((d) => Object.keys(d.breakdown ?? {}))),
            ])
          }
          className="flex items-center gap-1.5 text-white/70 hover:text-brand-emerald text-xs font-semibold transition-colors"
          title={t('zikrAnalytics.exportCsv', 'Export CSV')}
        >
          <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
          CSV
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {records.map((r) => (
          <div
            key={r.label}
            className="rounded-control bg-brand-surface/60 border border-brand-border shadow-elev-1 p-3 text-center"
          >
            <p className={`text-xl font-black ${r.accent}`}>{r.value}</p>
            <p className="text-white/70 text-[10px] font-bold uppercase mt-1">{r.label}</p>
            {r.sub && <p className="text-white/70 text-[10px] mt-0.5">{r.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
