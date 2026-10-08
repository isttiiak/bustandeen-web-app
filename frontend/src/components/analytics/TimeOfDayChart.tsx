import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLocaleNumber } from '../../utils/localeDate.js';

/**
 * "When during the day do I count most?" — a plain-SVG bar chart, same
 * no-library approach as TrendChart (see that file's header comment for why).
 */

interface HourBucket {
  hour: number;
  total: number;
}

interface TimeOfDayChartProps {
  data?: HourBucket[];
}

const VB_W = 720;
const VB_H = 220;
const PAD = { top: 12, right: 8, bottom: 24, left: 8 };

function hourLabel(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
}

export default function TimeOfDayChart({ data }: TimeOfDayChartProps) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    const rows = data ?? [];
    if (!rows.length || rows.every((r) => r.total === 0)) return null;
    const max = Math.max(...rows.map((r) => r.total), 1);
    const innerW = VB_W - PAD.left - PAD.right;
    const innerH = VB_H - PAD.top - PAD.bottom;
    const gap = 2;
    const barW = innerW / rows.length - gap;
    const bars = rows.map((r, i) => {
      const h = (r.total / max) * innerH;
      return {
        x: PAD.left + i * (barW + gap),
        y: PAD.top + innerH - h,
        w: barW,
        h,
        ...r,
      };
    });
    return { bars, innerH };
  }, [data]);

  if (!model) {
    return (
      <div className="flex items-center justify-center h-40 text-white/70">
        <p>{t('zikrAnalytics.trendChart.noData', 'No data available')}</p>
      </div>
    );
  }

  const { bars, innerH } = model;
  const active = hover != null ? bars[hover] : null;

  return (
    // Bare: the page wraps it in its own titled card.
    <div>
      <div>
        <div className="flex items-baseline justify-end gap-3 mb-2 h-4">
          {active && (
            <p className="text-xs text-white/70 tabular-nums">
              <span className="text-white/70">{hourLabel(active.hour)}</span>{' '}
              <span className="font-bold text-white">{formatLocaleNumber(active.total)}</span>
            </p>
          )}
        </div>

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={t('zikrAnalytics.timeOfDay.title', 'Time of day')}
          className="w-full h-[180px] overflow-visible"
          onMouseLeave={() => setHover(null)}
        >
          {bars.map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={b.y}
              width={Math.max(0, b.w)}
              height={Math.max(0, b.h)}
              rx={2}
              fill={hover === i ? 'var(--brand-gold)' : 'var(--brand-emerald)'}
              opacity={b.total === 0 ? 0.15 : 1}
            />
          ))}
          {/* invisible hit columns spanning the full height for easy hover */}
          {bars.map((b, i) => (
            <rect
              key={`hit-${i}`}
              x={b.x}
              y={0}
              width={Math.max(0, b.w)}
              height={PAD.top + innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
          {/* x labels every 3 hours */}
          {bars.map((b, i) =>
            b.hour % 3 === 0 ? (
              <text
                key={`lbl-${i}`}
                x={b.x + b.w / 2}
                y={VB_H - 6}
                textAnchor="middle"
                className="fill-white/70"
                style={{ fontSize: 11 }}
              >
                {hourLabel(b.hour)}
              </text>
            ) : null
          )}
        </svg>
      </div>
    </div>
  );
}
