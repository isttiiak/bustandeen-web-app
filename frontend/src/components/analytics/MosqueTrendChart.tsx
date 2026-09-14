import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '../../store/useUiStore.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';

/**
 * Mosque attendance rate, week by week — plain-SVG line + area, same
 * approach as TrendChart (percentage is always 0-100, so the y-axis is
 * fixed rather than auto-scaled).
 *
 * Redesigned from the original bare-bars-with-a-label-on-top version
 * (2026-09): no axis, no hover detail beyond the always-visible rounded
 * percentage. This version adds real gridlines, a hover readout with the
 * exact "N of M prayers" fraction behind the percentage, and a curve
 * instead of disconnected bars so the week-to-week trend actually reads
 * as a trend.
 */

interface MosqueWeek {
  weekStart: string;
  weekEnd: string;
  mosqueCount: number;
  prayedCount: number;
  rate: number;
}

interface MosqueTrendChartProps {
  data?: MosqueWeek[];
}

const VB_W = 720;
const VB_H = 260;
const PAD = { top: 16, right: 12, bottom: 28, left: 30 };

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function MosqueTrendChart({ data }: MosqueTrendChartProps) {
  const { t } = useTranslation();
  const reduceMotion = useUiStore((s) => s.reduceMotion);
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    const rows = data ?? [];
    if (!rows.length) return null;

    const innerW = VB_W - PAD.left - PAD.right;
    const innerH = VB_H - PAD.top - PAD.bottom;
    const stepX = rows.length > 1 ? innerW / (rows.length - 1) : 0;

    const pts = rows.map((r, i) => ({
      x: PAD.left + i * stepX,
      y: PAD.top + innerH - (Math.min(100, Math.max(0, r.rate)) / 100) * innerH,
    }));

    const line = smoothPath(pts);
    const area = `${line} L ${pts[pts.length - 1]!.x} ${PAD.top + innerH} L ${pts[0]!.x} ${PAD.top + innerH} Z`;
    const ticks = [0, 25, 50, 75, 100].map((v) => ({
      y: PAD.top + innerH - (v / 100) * innerH,
      value: v,
    }));

    return { rows, pts, line, area, ticks, innerH, stepX };
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

  const { rows, pts, line, area, ticks } = model;
  const active = hover != null ? rows[hover] : null;
  const labelEvery = Math.max(1, Math.ceil(rows.length / 8));
  // In weekly-bucket mode weekStart !== weekEnd — a bare weekStart label
  // (e.g. "Sep 8") never showed the date the window actually ends on, which
  // made the last point's own day (today) look entirely absent from the
  // chart (reported directly: "today is Sep 14 and none of the trends have
  // anything for it"). In daily mode weekStart === weekEnd, so this is just
  // the one date, same as before.
  const weekLabel = (r: MosqueWeek): string =>
    r.weekStart === r.weekEnd
      ? formatLocaleDate(new Date(r.weekStart + 'T12:00:00'), { month: 'short', day: 'numeric' })
      : `${formatLocaleDate(new Date(r.weekStart + 'T12:00:00'), { month: 'short', day: 'numeric' })} – ${formatLocaleDate(
          new Date(r.weekEnd + 'T12:00:00'),
          { month: 'short', day: 'numeric' }
        )}`;

  return (
    <div className="card bg-brand-deep/80 border border-brand-border rounded-2xl overflow-x-auto">
      <div className="card-body p-5">
        <div className="min-h-[18px] mb-1">
          {active ? (
            <p className="text-xs text-white/70 tabular-nums">
              <span className="text-white/40">{weekLabel(active)}</span>{' '}
              <span className="font-bold text-brand-emerald">
                {formatLocaleNumber(active.rate)}%
              </span>{' '}
              <span className="text-white/40">
                (
                {t('salatAnalytics.mosqueTrendFraction', '{{mosque}} of {{prayed}} prayers', {
                  mosque: formatLocaleNumber(active.mosqueCount),
                  prayed: formatLocaleNumber(active.prayedCount),
                })}
                )
              </span>
            </p>
          ) : (
            <p className="text-xs text-white/30">{t('salatAnalytics.mosqueTrendHoverHint')}</p>
          )}
        </div>

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={t('salatAnalytics.mosqueTrend')}
          className="w-full h-[220px] overflow-visible"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="mosqueTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand-emerald, #7a9e6e)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--brand-emerald, #7a9e6e)" stopOpacity={0} />
            </linearGradient>
          </defs>

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
                {tk.value}%
              </text>
            </g>
          ))}

          <path d={area} fill="url(#mosqueTrendGradient)" />

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

          <circle
            cx={pts[pts.length - 1]!.x}
            cy={pts[pts.length - 1]!.y}
            r={3.5}
            fill="var(--brand-emerald, #7a9e6e)"
            stroke="var(--brand-deep, #211f16)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />

          {hover != null && (
            <g>
              <line
                x1={pts[hover]!.x}
                y1={PAD.top}
                x2={pts[hover]!.x}
                y2={PAD.top + model.innerH}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={pts[hover]!.x}
                cy={pts[hover]!.y}
                r={4}
                fill="var(--brand-emerald, #7a9e6e)"
                stroke="#0e0d0a"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}

          {rows.map((r, i) => {
            const isLast = i === rows.length - 1;
            if (!isLast && i % labelEvery !== 0) return null;
            return (
              <text
                key={`${r.weekStart}-${i}`}
                x={pts[i]!.x}
                y={VB_H - 8}
                textAnchor="middle"
                className="fill-white/40"
                style={{ fontSize: 10 }}
              >
                {isLast
                  ? weekLabel(r)
                  : formatLocaleDate(new Date(r.weekStart + 'T12:00:00'), {
                      month: 'short',
                      day: 'numeric',
                    })}
              </text>
            );
          })}

          {rows.map((r, i) => (
            <rect
              key={`hit-${i}`}
              x={pts[i]!.x - (model.stepX || VB_W) / 2}
              y={0}
              width={model.stepX || VB_W}
              height={VB_H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>

        <p className="text-white/25 text-[10px] mt-2">{t('salatAnalytics.mosqueTrendHint')}</p>
      </div>
    </div>
  );
}
