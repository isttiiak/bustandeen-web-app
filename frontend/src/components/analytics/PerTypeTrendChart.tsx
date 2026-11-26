import { useMemo, useState } from 'react';
import { m as motion } from 'framer-motion';
import { useUiStore } from '../../store/useUiStore.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';

// One colour per top-5 type line, from the theme's tokens (redefined on paper).
export const TYPE_COLORS = [
  'rgb(var(--c-data-good))',
  'rgb(var(--c-data-mid))',
  'var(--brand-info)',
  'var(--brand-pink)',
  'rgb(var(--c-data-low))',
];

export interface ChartDataPointWithBreakdown {
  date: string;
  total: number;
  breakdown?: Record<string, number>;
}

export function PerTypeTrendChart({
  data,
  topTypes,
}: {
  data: ChartDataPointWithBreakdown[];
  topTypes: string[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const reduceMotion = useUiStore((s) => s.reduceMotion);

  const VBW = 720,
    VBH = 260;
  const pad2Top = 12,
    pad2Right = 16,
    pad2Bottom = 28,
    pad2Left = 34;

  const model = useMemo(() => {
    const PAD2 = { top: pad2Top, right: pad2Right, bottom: pad2Bottom, left: pad2Left };
    if (!data.length || !topTypes.length) return null;
    const innerW = VBW - PAD2.left - PAD2.right;
    const innerH = VBH - PAD2.top - PAD2.bottom;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;

    const seriesData = topTypes.map((type) => data.map((d) => d.breakdown?.[type] ?? 0));
    const allVals = seriesData.flat();
    const yMax = Math.max(1, ...allVals);
    const niceCeil = (m: number) => {
      if (m <= 5) return 5;
      const mag = 10 ** Math.floor(Math.log10(m));
      for (const s of [1, 2, 2.5, 5, 10]) {
        const c = s * mag;
        if (c >= m) return c;
      }
      return 10 * mag;
    };
    const yTop = niceCeil(yMax);

    const pts = seriesData.map((series) =>
      series.map((v, i) => ({
        x: PAD2.left + i * step,
        y: PAD2.top + innerH - (v / yTop) * innerH,
      }))
    );

    const paths = pts.map((p) => {
      if (!p.length) return '';
      let d = `M ${p[0].x} ${p[0].y}`;
      for (let i = 0; i < p.length - 1; i++) {
        const p0 = p[i - 1] ?? p[i];
        const p1 = p[i];
        const p2 = p[i + 1];
        const p3 = p[i + 2] ?? p2;
        const c1x = p1.x + (p2.x - p0.x) / 6,
          c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6,
          c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    });

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      y: PAD2.top + innerH - f * innerH,
      value: Math.round(f * yTop),
    }));

    const labels = data.map((d, i) => ({
      label: formatLocaleDate(new Date(d.date + 'T12:00:00'), { month: 'short', day: 'numeric' }),
      x: PAD2.left + i * step,
    }));
    const labelEvery = Math.max(1, Math.ceil(data.length / 7));

    return { pts, paths, ticks, labels, labelEvery, step, innerH };
  }, [data, topTypes]);

  if (!model) return null;
  const { pts, paths, ticks, labels, labelEvery, step, innerH } = model;

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      preserveAspectRatio="none"
      className="w-full h-[220px] overflow-visible"
      onMouseLeave={() => setHover(null)}
    >
      {ticks.map((t) => (
        <g key={t.y}>
          <line
            x1={pad2Left}
            y1={t.y}
            x2={VBW - pad2Right}
            y2={t.y}
            stroke="var(--track)"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={pad2Left - 6}
            y={t.y + 4}
            textAnchor="end"
            className="fill-white/70"
            style={{ fontSize: 10 }}
          >
            {formatLocaleNumber(t.value)}
          </text>
        </g>
      ))}

      {paths.map((path, si) => (
        <motion.path
          key={topTypes[si]}
          d={path}
          fill="none"
          stroke={TYPE_COLORS[si % TYPE_COLORS.length]}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduceMotion ? undefined : { pathLength: 0 }}
          animate={reduceMotion ? undefined : { pathLength: 1 }}
          transition={{ duration: 0.8, delay: si * 0.1, ease: 'easeOut' }}
        />
      ))}

      {hover != null && (
        <line
          x1={pts[0][hover].x}
          y1={pad2Top}
          x2={pts[0][hover].x}
          y2={pad2Top + innerH}
          stroke="rgb(var(--c-ink) / 0.25)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {hover != null &&
        pts.map((p, si) => (
          <circle
            key={si}
            cx={p[hover].x}
            cy={p[hover].y}
            r={3.5}
            fill={TYPE_COLORS[si % TYPE_COLORS.length]}
            stroke="var(--brand-deep)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}

      {labels.map(({ label, x }, i) =>
        i % labelEvery === 0 ? (
          <text
            key={i}
            x={x}
            y={VBH - 6}
            textAnchor="middle"
            className="fill-white/70"
            style={{ fontSize: 10 }}
          >
            {label}
          </text>
        ) : null
      )}

      {data.map((_, i) => (
        <rect
          key={i}
          x={(pts[0][i]?.x ?? 0) - (step || VBW) / 2}
          y={0}
          width={step || VBW}
          height={VBH}
          fill="transparent"
          onMouseEnter={() => setHover(i)}
        />
      ))}
    </svg>
  );
}
