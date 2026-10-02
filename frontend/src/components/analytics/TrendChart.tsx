import { useMemo, useState } from 'react';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../store/useUiStore.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';

/**
 * Daily-total trend, drawn as plain SVG.
 *
 * This used to be a recharts <LineChart>. recharts was the single heaviest
 * asset in the app (~528 KB raw) for this one component, and because it was
 * named in vite's manualChunks it dragged React into the chart chunk — so
 * every page paid for it. The whole thing is ~120 lines of SVG instead: a
 * smooth path, a gradient fill, a grid, and hover readouts. Same look, no
 * dependency.
 */

interface DataPoint {
  date: string;
  total: number;
}

interface TrendChartProps {
  data?: DataPoint[];
  period: number;
}

// viewBox units — the SVG scales to its container, so these are just a grid to
// draw in, not pixels.
const VB_W = 720;
const VB_H = 300;
const PAD = { top: 16, right: 16, bottom: 28, left: 34 };

/** Catmull-Rom → cubic Bézier: the smooth curve recharts' type="monotone" gave
 * us, without pulling in a charting library. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Rounded, human y-axis ceiling (10 / 25 / 50 / 100 …). */
function niceCeil(max: number): number {
  if (max <= 5) return 5;
  const mag = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * mag;
    if (candidate >= max) return candidate;
  }
  return 10 * mag;
}

export default function TrendChart({ data, period }: TrendChartProps) {
  const { t } = useTranslation();
  const reduceMotion = useUiStore((s) => s.reduceMotion);
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    const rows = (data ?? []).map((d) => ({
      label: formatLocaleDate(new Date(d.date), { month: 'short', day: 'numeric' }),
      value: d.total,
    }));
    if (rows.length === 0) return null;

    const yMax = niceCeil(Math.max(...rows.map((r) => r.value), 1));
    const innerW = VB_W - PAD.left - PAD.right;
    const innerH = VB_H - PAD.top - PAD.bottom;
    const stepX = rows.length > 1 ? innerW / (rows.length - 1) : 0;

    const pts = rows.map((r, i) => ({
      x: PAD.left + i * stepX,
      y: PAD.top + innerH - (r.value / yMax) * innerH,
    }));

    const line = smoothPath(pts);
    const area = `${line} L ${pts[pts.length - 1].x} ${PAD.top + innerH} L ${pts[0].x} ${PAD.top + innerH} Z`;
    // 4 gridlines + baseline
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      y: PAD.top + innerH - f * innerH,
      value: Math.round(f * yMax),
    }));

    return { rows, pts, line, area, ticks, innerH, stepX };
  }, [data]);

  if (!model) {
    return (
      <div className="card bg-brand-surface border border-brand-border shadow-glass">
        <div className="card-body p-6">
          <h3 className="text-lg font-bold text-brand-emerald mb-4">
            {t('zikrAnalytics.trendChart.title', 'Trend Chart')}
          </h3>
          <div className="flex items-center justify-center h-64 text-white/40">
            <p>{t('zikrAnalytics.trendChart.noData', 'No data available')}</p>
          </div>
        </div>
      </div>
    );
  }

  const { rows, pts, line, area, ticks } = model;
  const active = hover != null ? rows[hover] : null;

  // Label every nth point so the axis never collides on a 30-day range.
  const labelEvery = Math.max(1, Math.ceil(rows.length / 7));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-brand-surface border border-brand-border shadow-glass"
    >
      <div className="card-body p-6">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-brand-emerald">
            {t('zikrAnalytics.trendChart.dayTrend', '{{period}}-Day Trend', {
              period: formatLocaleNumber(period),
            })}
          </h3>
          {active && (
            <p className="text-xs text-white/60 tabular-nums">
              <span className="text-white/40">{active.label}</span>{' '}
              <span className="font-bold text-white">{formatLocaleNumber(active.value)}</span>
            </p>
          )}
        </div>

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${period}-day zikr trend`}
          className="w-full h-[300px] overflow-visible"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand-emerald, #7a9e6e)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--brand-emerald, #7a9e6e)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* gridlines + y labels */}
          {ticks.map((t) => (
            <g key={t.y}>
              <line
                x1={PAD.left}
                y1={t.y}
                x2={VB_W - PAD.right}
                y2={t.y}
                stroke="rgba(255,255,255,0.10)"
                strokeWidth={1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.left - 8}
                y={t.y + 4}
                textAnchor="end"
                className="fill-white/40"
                style={{ fontSize: 11 }}
              >
                {formatLocaleNumber(t.value)}
              </text>
            </g>
          ))}

          <path d={area} fill="url(#trendGradient)" />

          <motion.path
            d={line}
            fill="none"
            stroke="var(--brand-emerald, #7a9e6e)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={reduceMotion ? undefined : { pathLength: 0 }}
            animate={reduceMotion ? undefined : { pathLength: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />

          {/* Permanent endpoint at last data point */}
          <circle
            cx={pts[pts.length - 1].x}
            cy={pts[pts.length - 1].y}
            r={3.5}
            fill="var(--brand-emerald, #7a9e6e)"
            stroke="var(--brand-surface, #211f16)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />

          {/* hover marker */}
          {hover != null && (
            <g>
              <line
                x1={pts[hover].x}
                y1={PAD.top}
                x2={pts[hover].x}
                y2={PAD.top + model.innerH}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={pts[hover].x}
                cy={pts[hover].y}
                r={4}
                fill="var(--brand-emerald, #7a9e6e)"
                stroke="#0e0d0a"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}

          {/* x labels */}
          {rows.map((r, i) =>
            i % labelEvery === 0 ? (
              <text
                key={`${r.label}-${i}`}
                x={pts[i].x}
                y={VB_H - 8}
                textAnchor="middle"
                className="fill-white/40"
                style={{ fontSize: 11 }}
              >
                {r.label}
              </text>
            ) : null
          )}

          {/* invisible hit areas — one column per point */}
          {rows.map((r, i) => (
            <rect
              key={`hit-${i}`}
              x={pts[i].x - (model.stepX || VB_W) / 2}
              y={0}
              width={model.stepX || VB_W}
              height={VB_H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      </div>
    </motion.div>
  );
}
