import { useState, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CARD } from '../bustanStyles.js';
import type { DailyActivitySeries, DailyActivityPoint } from '../../hooks/useAdminStats.js';

/**
 * Daily activity, last 90 days (audit T4.6): one small line per measure, so
 * each tile has a single series and no colour has to tell series apart.
 * Counts only; days are Bangladesh days. Hover a line for a day's value; the
 * table below reads the same numbers without a chart.
 */

type Measure = Exclude<keyof DailyActivityPoint, 'day'>;

const W = 300;
const H = 64;
const PAD = 4;

function Sparkline({
  points,
  measure,
  label,
}: {
  points: DailyActivityPoint[];
  measure: Measure;
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const values = points.map((p) => p[measure]);
  const max = Math.max(1, ...values.map((v) => v ?? 0));
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / Math.max(1, points.length - 1);
  const y = (v: number) => H - PAD - (v / max) * (H - 2 * PAD);

  // One path, broken where a value is missing (opened-the-app before counting).
  let d = '';
  values.forEach((v, i) => {
    if (v === null) return;
    d += `${i > 0 && values[i - 1] !== null ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
  });

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rel - PAD) / (W - 2 * PAD)) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };
  const hv = hover === null ? null : values[hover];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-16 text-brand-emerald touch-none"
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <line
          x1={PAD}
          x2={W - PAD}
          y1={H - PAD}
          y2={H - PAD}
          className="stroke-brand-border"
          strokeWidth={1}
        />
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD}
              y2={H - PAD}
              className="stroke-white/40"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {hv !== null && (
              <circle
                cx={x(hover)}
                cy={y(hv)}
                r={4}
                fill="currentColor"
                className="stroke-brand-deep"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-7 rounded-control border border-brand-border bg-brand-surface px-2 py-0.5 text-[11px] text-white shadow-elev-1 whitespace-nowrap"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > points.length * 0.7 ? '-100%' : hover < points.length * 0.3 ? '0' : '-50%'})`,
          }}
        >
          {points[hover].day}: <span className="font-bold tabular-nums">{hv ?? '–'}</span>
        </div>
      )}
    </div>
  );
}

export default function DailyActivityPanel({ series }: { series: DailyActivitySeries }) {
  const { t } = useTranslation();
  const { days, activeSince } = series;
  const last = days[days.length - 1];
  const prev7 = days.slice(-8, -1);

  const measures: { key: Measure; label: string }[] = [
    { key: 'active', label: t('adminHome.dailyOpened', 'Opened the app') },
    { key: 'salat', label: t('adminHome.dailySalat', 'Logged salat') },
    { key: 'zikr', label: t('adminHome.dailyZikr', 'Logged zikr') },
    { key: 'quran', label: t('adminHome.dailyQuran', 'Logged Quran') },
    { key: 'fasting', label: t('adminHome.dailyFasting', 'Logged a fast') },
  ];

  const avg7 = (key: Measure) => {
    const vals = prev7.map((p) => p[key]).filter((v): v is number => v !== null);
    return vals.length
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : null;
  };

  return (
    <section className="space-y-3" aria-labelledby="admin-daily-title">
      <h2 id="admin-daily-title" className="font-display font-bold text-white">
        {t('adminHome.dailyTitle', 'Day by day (last 90 days)')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {measures.map(({ key, label }) => {
          const avg = avg7(key);
          return (
            <div key={key} className={`${CARD} p-4 space-y-2`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-white">{label}</h3>
                <p className="text-xs text-white/70 text-right">
                  {t('adminHome.dailyToday', 'Today so far')}{' '}
                  <span className="text-white font-bold text-base tabular-nums">
                    {last[key] ?? '–'}
                  </span>
                </p>
              </div>
              <Sparkline points={days} measure={key} label={label} />
              <p className="text-[11px] text-white/70">
                {avg === null
                  ? t('adminHome.dailyStarts', 'Counting started {{day}}', {
                      day: activeSince ?? t('adminHome.dailyToday', 'today'),
                    })
                  : t('adminHome.dailyAvg', 'Average of the last 7 full days: {{avg}}', { avg })}
              </p>
            </div>
          );
        })}
      </div>
      <details className={`${CARD} p-4`}>
        <summary className="cursor-pointer text-sm font-bold text-white min-h-[44px] flex items-center">
          {t('adminHome.dailyTable', 'Show the last 30 days as a table')}
        </summary>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-left text-white/70 border-b border-brand-border">
                <th className="py-1.5 pr-3">{t('adminHome.dailyDay', 'Day')}</th>
                {measures.map((m) => (
                  <th key={m.key} className="py-1.5 pr-3 text-right">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...days]
                .slice(-30)
                .reverse()
                .map((p) => (
                  <tr key={p.day} className="border-b border-brand-border/60 last:border-0">
                    <td className="py-1 pr-3 text-white/80">{p.day}</td>
                    {measures.map((m) => (
                      <td key={m.key} className="py-1 pr-3 text-right text-white">
                        {p[m.key] ?? '–'}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="text-[11px] text-white/70">
        {t(
          'adminHome.dailyNote',
          'Counts only, never who. Days are Bangladesh days. "Opened the app" counts each person once a day from {{since}}; the logged numbers come from the worship logs (salat counts Done or Kaza, not the automatic Miss).',
          { since: activeSince ?? '–' }
        )}
      </p>
    </section>
  );
}
