// Fasting tracker building blocks (audit T2.4: moved out of pages/FastingTracker.tsx unchanged).
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { localTodayStr } from '../../hooks/useFasting.js';
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
        <span className="text-brand-emerald text-[10px] font-semibold bg-brand-emerald/10 px-1.5 py-0.5 rounded-full">
          {translateReference(r.grade, i18n.language)}
        </span>
      )}
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-brand-gold text-[11px] underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        {translateReference(r.source, i18n.language)}
        <ArrowTopRightOnSquareIcon className="w-3 h-3" aria-hidden="true" />
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
          {done}/{target} <span className="text-white/60 font-semibold">({pct}%)</span>
        </span>
        <span className={remaining === 0 ? 'text-brand-emerald font-bold' : 'text-white/70'}>
          {doneLabel}
        </span>
      </div>
      <div className="w-full bg-track rounded-full h-2 overflow-hidden">
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/50">
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

export const STATUS_META: Record<FastingStatus, { label: string }> = {
  intended: { label: 'Intending to fast' },
  completed: { label: 'Fasted' },
  broken: { label: 'Fast broken' },
};

export const CATEGORY_LABEL: Record<FastingCategory, { label: string }> = {
  voluntary: { label: 'Voluntary' },
  qada: { label: 'Qaḍā' },
  kaffarah: { label: 'Kaffārah' },
  nadhr: { label: 'Vow' },
  ramadan: { label: 'Ramadan' },
};
