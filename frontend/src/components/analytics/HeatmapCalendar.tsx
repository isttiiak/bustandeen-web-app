import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import { getTrackingDay } from '../../utils/trackingDay.js';

interface HeatmapDay {
  date: string;
  total: number;
  status?: string;
}

const HEAT_DAYS = 365;
// Ink at a low alpha shows an empty day in both themes (white on dark, dark
// ink on paper); levels use the data token, bright on paper.
const HEAT_EMPTY = 'rgb(var(--c-ink) / 0.07)';
const HEAT_LEVELS = [0.3, 0.5, 0.75, 1].map((a) => `rgb(var(--c-data-good) / ${a})`);

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function HeatmapCalendar({ data }: { data: HeatmapDay[] }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<{ date: string; total: number } | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const today = getTrackingDay();

  // Always the full last 365 tracking days (padded to whole Sun-Sat weeks),
  // whatever range the data starts at, so the grid never looks clipped.
  const { weeks, monthAt } = useMemo(() => {
    const byDate = new Map(data.map((d) => [d.date, d.total]));
    const end = new Date(today + 'T12:00:00');
    const start = new Date(end);
    start.setDate(start.getDate() - (HEAT_DAYS - 1));
    const cells: Array<{ date: string; total: number } | null> = [];
    for (let i = 0; i < start.getDay(); i++) cells.push(null);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = isoDay(d);
      cells.push({ date: key, total: byDate.get(key) ?? 0 });
    }
    const wk: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += 7) wk.push(cells.slice(i, i + 7));
    // Label the week column in which a month begins (its 1st falls there).
    const labels = new Map<number, string>();
    wk.forEach((w, wi) => {
      const first = w.find((c) => c?.date.endsWith('-01'));
      if (first)
        labels.set(wi, formatLocaleDate(new Date(first.date + 'T12:00:00'), { month: 'short' }));
    });
    return { weeks: wk, monthAt: labels };
  }, [data, today]);

  // Levels from the user's own active days (quartiles), not from their best
  // day: one big day used to push every ordinary day into the faintest step.
  const cuts = useMemo(() => {
    const vals = data
      .map((d) => d.total)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    if (!vals.length) return [1, 1, 1];
    const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] ?? 1;
    return [q(0.25), q(0.5), q(0.75)];
  }, [data]);

  const colorFor = (total: number) => {
    if (total <= 0) return HEAT_EMPTY;
    const level = cuts.filter((c) => total > c).length;
    return HEAT_LEVELS[Math.min(level, 3)];
  };

  // On a phone the grid scrolls: start at the recent end.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollLeft = el.scrollWidth;
    });
    return () => cancelAnimationFrame(id);
  }, [weeks.length]);

  const grid = { gridTemplateColumns: `repeat(${weeks.length}, minmax(10px, 1fr))` };

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/60 h-4">
        {hovered && (
          <>
            {formatLocaleDate(new Date(hovered.date + 'T12:00:00'), {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              weekday: 'short',
            })}
            {' · '}
            <span className="text-white font-bold">{formatLocaleNumber(hovered.total)}</span>
          </>
        )}
      </p>
      {/* Focusable, so the sideways scroll works from the keyboard (axe). */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-1"
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- a scrollable region must be focusable for keyboard users (axe scrollable-region-focusable)
        tabIndex={0}
        role="region"
        aria-label={t('zikrAnalytics.heatmap', 'Activity heatmap')}
      >
        <div className="min-w-max sm:min-w-0">
          <div className="grid gap-[3px] mb-1 overflow-hidden" style={grid}>
            {weeks.map((_, wi) => (
              <span key={wi} className="text-[10px] leading-none text-white/60 whitespace-nowrap">
                {monthAt.get(wi) ?? ''}
              </span>
            ))}
          </div>
          <div className="grid grid-rows-7 grid-flow-col gap-[3px]" style={grid}>
            {weeks.flatMap((week, wi) =>
              Array.from({ length: 7 }, (_, di) => {
                const cell = week[di];
                if (!cell) return <div key={`${wi}-${di}`} className="aspect-square" />;
                return (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${formatLocaleNumber(cell.total)}`}
                    onMouseEnter={() => setHovered(cell)}
                    onMouseLeave={() => setHovered(null)}
                    className={`aspect-square rounded-[3px] cursor-default ${
                      cell.date === today
                        ? 'ring-1 ring-brand-gold ring-offset-1 ring-offset-brand-deep'
                        : ''
                    }`}
                    style={{ background: colorFor(cell.total) }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-white/60 text-[10px]">{t('zikrAnalytics.heatmapLess', 'Less')}</span>
        {[HEAT_EMPTY, ...HEAT_LEVELS].map((bg) => (
          <div key={bg} className="rounded-[3px] w-[11px] h-[11px]" style={{ background: bg }} />
        ))}
        <span className="text-white/60 text-[10px]">{t('zikrAnalytics.heatmapMore', 'More')}</span>
      </div>
    </div>
  );
}
