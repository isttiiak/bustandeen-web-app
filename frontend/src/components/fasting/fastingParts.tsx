// Fasting tracker building blocks (audit T2.4: moved out of pages/FastingTracker.tsx unchanged).
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { localTodayStr } from '../../hooks/useFasting.js';
import { withAlpha } from '../../utils/color.js';
import { FastingCategory, FastingStatus, FastingRef } from '../../utils/fastingRules.js';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { translateReference } from '../../utils/localeReference.js';

// ─── date helpers ─────────────────────────────────────────────────────────────

export function offsetDate(base: string, delta: number): string {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function friendlyDate(
  dateStr: string,
  translate?: (key: string, fallback: string) => string
): string {
  const tr = translate ?? ((_k: string, fb: string) => fb);
  const today = localTodayStr();
  if (dateStr === today) return tr('common.today', 'Today');
  if (dateStr === offsetDate(today, -1)) return tr('common.yesterday', 'Yesterday');
  if (dateStr === offsetDate(today, 1)) return tr('common.tomorrow', 'Tomorrow');
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ─── tiny pieces ──────────────────────────────────────────────────────────────

export function RefLink({ r }: { r: FastingRef }) {
  const { i18n } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {r.grade && (
        <span className="text-brand-emerald/60 text-[10px] font-semibold bg-brand-emerald/10 px-1.5 py-0.5 rounded-full">
          {translateReference(r.grade, i18n.language)}
        </span>
      )}
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-gold/60 text-[10px] underline hover:text-brand-gold/90 transition-colors"
      >
        {translateReference(r.source, i18n.language)} ↗
      </a>
    </span>
  );
}

/** Progress bar + countdown + finish estimate for the Manage sheet */
export function ManageProgress({
  done,
  target,
  color,
  doneLabel,
  extra,
}: {
  done: number;
  target: number;
  color: string;
  doneLabel: string;
  extra?: string;
}) {
  const { t } = useTranslation();
  const pct = Math.min(100, Math.round((done / Math.max(1, target)) * 100));
  const remaining = Math.max(0, target - done);
  const finish = new Date();
  finish.setDate(finish.getDate() + remaining);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline text-[11px]">
        <span className="font-bold tabular-nums" style={{ color }}>
          {done}/{target} <span className="text-white/40 font-semibold">({pct}%)</span>
        </span>
        <span className={remaining === 0 ? 'text-brand-emerald font-bold' : 'text-white/50'}>
          {doneLabel}
        </span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${withAlpha(color, '70')}` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/25">
        <span>{extra ?? ''}</span>
        {remaining > 0 && (
          <span>
            {t('fasting.estimateFinish', "1 fast/day → done {{date}}, in sha' Allah", {
              date: formatLocaleDate(finish, { month: 'short', day: 'numeric' }),
            })}
          </span>
        )}
      </div>
    </div>
  );
}

export const STATUS_META: Record<FastingStatus, { label: string; emoji: string; color: string }> = {
  intended: { label: 'Intending to fast', emoji: '🌅', color: 'rgb(var(--c-info))' },
  completed: { label: 'Fasted', emoji: '✨', color: 'rgb(var(--c-emerald))' },
  broken: { label: 'Fast broken', emoji: '💔', color: '#f87171' },
};

export const CATEGORY_LABEL: Record<FastingCategory, { label: string; emoji: string }> = {
  voluntary: { label: 'Voluntary', emoji: '💚' },
  qada: { label: 'Qaḍā', emoji: '🔄' },
  kaffarah: { label: 'Kaffārah', emoji: '⚖️' },
  nadhr: { label: 'Vow', emoji: '🤝' },
  ramadan: { label: 'Ramadan', emoji: '🌙' },
};

// Celebration sparkles around the hero emoji after logging a completed fast
export const SPARKLES = [
  { x: -46, y: -30, d: 0.0 },
  { x: 42, y: -38, d: 0.08 },
  { x: -30, y: 26, d: 0.16 },
  { x: 52, y: 18, d: 0.24 },
  { x: 0, y: -52, d: 0.12 },
  { x: -56, y: -4, d: 0.2 },
];
