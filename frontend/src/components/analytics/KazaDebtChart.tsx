import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';

/**
 * Kaza debt, week by week — plain-SVG grouped bars, same no-library approach
 * as TrendChart/TimeOfDayChart (see TrendChart's header comment for why: no
 * recharts, it was the single heaviest dependency in the app).
 *
 * Redesigned from the original stacked-bar-with-title-attribute version
 * (2026-09) because it wasn't legible — no axis, no real tooltip, and two
 * colors stacked into one thin bar was hard to read at a glance. Grouped
 * bars + a real y-axis + a hover readout fix that without changing what
 * data is shown (still just "how much was added vs paid back, per week").
 */

interface DebtWeek {
  weekStart: string;
  weekEnd: string;
  accumulated: number;
  paidBack: number;
}

interface KazaDebtChartProps {
  data?: DebtWeek[];
}

const VB_W = 720;
const VB_H = 260;
const PAD = { top: 12, right: 8, bottom: 28, left: 30 };

function niceCeil(max: number): number {
  if (max <= 5) return 5;
  const mag = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * mag;
    if (candidate >= max) return candidate;
  }
  return 10 * mag;
}

export default function KazaDebtChart({ data }: KazaDebtChartProps) {
  const { t } = useTranslation();
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    const rows = data ?? [];
    if (!rows.length || rows.every((r) => r.accumulated === 0 && r.paidBack === 0)) return null;

    const yMax = niceCeil(Math.max(...rows.map((r) => Math.max(r.accumulated, r.paidBack)), 1));
    const innerW = VB_W - PAD.left - PAD.right;
    const innerH = VB_H - PAD.top - PAD.bottom;
    const groupW = innerW / rows.length;
    const barW = Math.min(16, groupW * 0.32);
    const gap = 3;

    const groups = rows.map((r, i) => {
      const cx = PAD.left + i * groupW + groupW / 2;
      const accH = (r.accumulated / yMax) * innerH;
      const paidH = (r.paidBack / yMax) * innerH;
      return {
        ...r,
        accX: cx - barW - gap / 2,
        accY: PAD.top + innerH - accH,
        accH,
        paidX: cx + gap / 2,
        paidY: PAD.top + innerH - paidH,
        paidH,
        cx,
      };
    });

    const ticks = [0, 0.5, 1].map((f) => ({
      y: PAD.top + innerH - f * innerH,
      value: Math.round(f * yMax),
    }));

    return { groups, ticks, innerH, groupW, barW };
  }, [data]);

  if (!model) {
    return (
      <div className="card bg-brand-deep/80 border border-brand-border rounded-2xl">
        <div className="card-body p-6">
          <div className="flex items-center justify-center h-40 text-white/40">
            <p>{t('zikrAnalytics.trendChart.noData', 'No data available')}</p>
          </div>
        </div>
      </div>
    );
  }

  const { groups, ticks, innerH, barW } = model;
  const active = hover != null ? groups[hover] : null;
  // Under 14 days, the backend buckets by day instead of by week (see
  // getDebtHistory's doc comment) — weekStart === weekEnd then, so show one
  // date instead of a redundant "Sep 3 – Sep 3" range.
  const weekLabel = (w: DebtWeek): string =>
    w.weekStart === w.weekEnd
      ? formatLocaleDate(new Date(w.weekStart + 'T12:00:00'), { month: 'short', day: 'numeric' })
      : `${formatLocaleDate(new Date(w.weekStart + 'T12:00:00'), { month: 'short', day: 'numeric' })} – ${formatLocaleDate(
          new Date(w.weekEnd + 'T12:00:00'),
          { month: 'short', day: 'numeric' }
        )}`;

  return (
    <div className="card bg-brand-deep/80 border border-brand-border rounded-2xl overflow-x-auto">
      <div className="card-body p-5">
        <div className="flex items-center gap-3 text-[11px] text-white/50 mb-1">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/70 inline-block" />{' '}
            {t('salatAnalytics.kazaDebtAccumulated')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-brand-emerald inline-block" />{' '}
            {t('salatAnalytics.kazaDebtPaidBack')}
          </span>
        </div>

        <div className="min-h-[18px] mb-1">
          {active && (
            <p className="text-xs text-white/70 tabular-nums">
              <span className="text-white/40">{weekLabel(active)}</span>{' '}
              <span className="font-bold text-red-400">
                +{formatLocaleNumber(active.accumulated)}
              </span>
              {' · '}
              <span className="font-bold text-brand-emerald">
                −{formatLocaleNumber(active.paidBack)}
              </span>
            </p>
          )}
        </div>

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={t('salatAnalytics.kazaDebtChart')}
          className="w-full h-[220px] overflow-visible"
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((tk) => (
            <g key={tk.y}>
              <line
                x1={PAD.left}
                y1={tk.y}
                x2={VB_W - PAD.right}
                y2={tk.y}
                stroke="rgba(255,255,255,0.10)"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.left - 6}
                y={tk.y + 4}
                textAnchor="end"
                className="fill-white/40"
                style={{ fontSize: 10 }}
              >
                {formatLocaleNumber(tk.value)}
              </text>
            </g>
          ))}

          {groups.map((g, i) => (
            <g key={g.weekStart}>
              <rect
                x={g.accX}
                y={g.accY}
                width={barW}
                height={Math.max(0, g.accH)}
                rx={2}
                className="fill-red-500/70"
                opacity={hover === null || hover === i ? 1 : 0.35}
              />
              <rect
                x={g.paidX}
                y={g.paidY}
                width={barW}
                height={Math.max(0, g.paidH)}
                rx={2}
                fill="var(--brand-emerald, #7a9e6e)"
                opacity={hover === null || hover === i ? 1 : 0.35}
              />
            </g>
          ))}

          {/* invisible hit columns, one per week */}
          {groups.map((g, i) => (
            <rect
              key={`hit-${i}`}
              x={g.cx - model.groupW / 2}
              y={0}
              width={model.groupW}
              height={PAD.top + innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}

          {groups.map((g, i) => {
            const isLast = i === groups.length - 1;
            if (!isLast && i % Math.max(1, Math.ceil(groups.length / 8)) !== 0) return null;
            return (
              <text
                key={`lbl-${i}`}
                x={g.cx}
                y={VB_H - 8}
                textAnchor="middle"
                className="fill-white/40"
                style={{ fontSize: 10 }}
              >
                {/* The LAST bucket always gets the full range (or, in daily
                    mode, its one date) rather than just weekStart — it's the
                    bucket whose window ends TODAY, and a bare "Sep 8" label
                    made today's data look absent (reported directly: "today
                    is Sep 14 and none of the trends have anything for it" —
                    the bucket's own end date just never rendered anywhere). */}
                {isLast
                  ? weekLabel(g)
                  : formatLocaleDate(new Date(g.weekStart + 'T12:00:00'), {
                      month: 'short',
                      day: 'numeric',
                    })}
              </text>
            );
          })}
        </svg>

        <p className="text-white/25 text-[10px] mt-2">{t('salatAnalytics.kazaDebtChartHint')}</p>
      </div>
    </div>
  );
}
