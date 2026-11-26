import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { m as motion } from 'framer-motion';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { InfoButton } from '../ChartInfoModal.js';
import type { SalatAnalytics } from '../../hooks/useSalatLog.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import type { ChartInfo, SetInfoTopic } from './useSalatAnalyticsPage.js';

/** Calendar cell fill by prayers completed (0-5), from the theme's data colours. */
function calendarCellClass(completed: number, hasData: boolean) {
  if (!hasData) return 'bg-track border border-brand-border/40';
  if (completed === 0) return 'bg-data-none/30 border border-data-none/40';
  if (completed === 1) return 'bg-data-low/35 border border-data-low/45';
  if (completed === 2) return 'bg-data-mid/35 border border-data-mid/45';
  if (completed === 3) return 'bg-data-mid/55 border border-data-mid/60';
  if (completed === 4) return 'bg-data-good/45 border border-data-good/55';
  return 'bg-data-good/75 border border-data-good/85';
}

/** The prayer calendar: weeks flow left to right, days top to bottom. */
export function SalatPrayerCalendar({
  data,
  todayStr,
  dayLabels,
  chartInfo,
  setInfoTopic,
}: {
  data: SalatAnalytics;
  todayStr: string;
  dayLabels: string[];
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const DAY_LABELS = dayLabels;

  // Group calendar data into weeks (Fri–Thu, Islamic week) for the heatmap
  const calendarWeeks = (() => {
    if (!data?.calendarData?.length) return [];
    const cells = [...data.calendarData];
    const jsDay = new Date(cells[0].date + 'T12:00:00').getDay(); // 0=Sun
    const firstDay = (jsDay + 2) % 7; // Fri=0, Sat=1, ..., Thu=6
    const padded: ((typeof cells)[number] | null)[] = Array(firstDay).fill(null).concat(cells);
    const weeks: ((typeof cells)[number] | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }
    return weeks;
  })();

  // Month labels for heatmap (account for front-padding in calendarWeeks)
  const monthLabels = (() => {
    if (!data?.calendarData?.length) return [];
    const labels: { label: string; weekIdx: number }[] = [];
    let lastMonth = -1;
    const jsDay = new Date(data.calendarData[0].date + 'T12:00:00').getDay();
    const firstDay = (jsDay + 2) % 7;
    data.calendarData.forEach((d, i) => {
      const paddedIdx = firstDay + i;
      const weekIdx = Math.floor(paddedIdx / 7);
      const month = new Date(d.date + 'T12:00:00').getMonth();
      if (month !== lastMonth) {
        labels.push({
          label: formatLocaleDate(new Date(d.date + 'T12:00:00'), { month: 'short' }),
          weekIdx,
        });
        lastMonth = month;
      }
    });
    return labels;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className={SECTION_TITLE}>{t('salatAnalytics.prayerCalendar')}</h2>
        <InfoButton
          onClick={() => setInfoTopic('prayerCalendar')}
          label={chartInfo.prayerCalendar!.title}
        />
        <span className="text-white/70 text-xs">
          {t('salatAnalytics.lastDays', {
            count: formatLocaleNumber(data.calendarData.length),
          })}
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${CARD} overflow-x-auto`}
      >
        <div className="p-5">
          {/* Month labels across the top */}
          <div className="flex gap-1 mb-1.5 pl-10">
            {calendarWeeks.map((_, wi) => {
              const ml = monthLabels.find((m) => m.weekIdx === wi);
              return (
                <div key={wi} className="w-7 text-center shrink-0">
                  {ml ? (
                    <span className="text-white/70 text-[10px] leading-none">{ml.label}</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            {/* Day-of-week labels on the left (Islamic week: Fri→Thu) */}
            <div className="flex flex-col gap-1 w-9 shrink-0">
              {DAY_LABELS.map((d, i) => (
                <div
                  key={i}
                  className={`h-7 flex items-center text-[11px] ${i === 0 ? 'text-brand-emerald font-semibold' : 'text-white/70'}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Grid: each column = one week, rows = days of week */}
            <div className="flex gap-1">
              {calendarWeeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell, di) => {
                    if (!cell) return <div key={di} className="w-7 h-7" />;
                    // Was `data.calendarData.some((c) => c.date === cell.date)` —
                    // a tautology, since `cell` is itself drawn from that same
                    // array, so it was always true. That made every day with NO
                    // log row at all (including every future day) render as a
                    // bright-red "0 completed" cell, indistinguishable from a day
                    // actually logged with nothing done. `cell.logged` comes from
                    // the backend's own SalatLog existence check.
                    const isLogged = cell.logged;
                    const isToday = cell.date === todayStr;
                    const isFuture = cell.date > todayStr;
                    return (
                      <motion.div
                        key={di}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: (wi + di * calendarWeeks.length) * 0.004,
                          duration: 0.25,
                        }}
                        className="tooltip"
                        data-tip={t('salatAnalytics.calendarTip', {
                          date: cell.date,
                          completed: formatLocaleNumber(cell.completed),
                        })}
                      >
                        <button
                          onClick={() => !isFuture && navigate(`/salat?date=${cell.date}`)}
                          disabled={isFuture}
                          aria-label={`${cell.date}: ${cell.completed}/5`}
                          className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold transition-transform ${calendarCellClass(cell.completed, isLogged)} ${
                            isFuture ? 'cursor-default' : 'hover:scale-110 cursor-pointer'
                          } ${
                            isToday
                              ? 'ring-2 ring-brand-emerald ring-offset-1 ring-offset-brand-surface'
                              : ''
                          }`}
                        >
                          {isLogged && (
                            <span className={cell.completed > 0 ? 'text-white' : 'text-white/80'}>
                              {formatLocaleNumber(cell.completed)}
                            </span>
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-4 pl-10 flex-wrap">
            <span className="text-white/70 text-xs mr-1">{t('salatAnalytics.less')}</span>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white/80 ${calendarCellClass(n, true)}`}
              >
                {formatLocaleNumber(n)}
              </div>
            ))}
            <span className="text-white/70 text-xs ml-1">{t('salatAnalytics.more')}</span>
            <span className="text-white/70 text-xs ml-2">{t('salatAnalytics.prayersPerDay')}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
