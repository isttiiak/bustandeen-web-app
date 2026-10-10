import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import { useCorrectZikrDay, useZikrDayCounts } from '../../hooks/useZikrLog.js';
import { zikrDisplayName } from '../../utils/zikrLibrary.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import { correctDayOptions, correctionChanges, getFixDays } from '../../utils/zikrLog.js';

/**
 * "Correct a day" (U7, the U4 gap): set the exact count of each zikr on a
 * past day, from yesterday back to the window chosen in Zikr settings
 * (3 days by default, up to 30). Totals, streak and Noor follow on the
 * server; counter sessions stay as they were.
 */
export default function ZikrCorrectDay({
  openedAt,
  allTypes,
  onClose,
}: {
  openedAt: Date;
  allTypes: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [days] = useState(() => correctDayOptions(getFixDays(), openedAt));
  const [date, setDate] = useState(days[0]!);
  const { data: counts, isLoading, isError } = useZikrDayCounts(date);

  const dayLabel = (d: string, i: number) =>
    i === 0
      ? t('zikrAnalytics.yesterday')
      : formatLocaleDate(new Date(`${d}T12:00:00`), {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="zikr-fix-day"
          className="block text-xs text-white/70 uppercase tracking-wider font-bold"
        >
          {t('zikrFix.day')}
        </label>
        <select
          id="zikr-fix-day"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="select select-bordered w-full rounded-control bg-brand-surface/50 border-brand-border text-white focus:border-brand-emerald text-sm"
        >
          {days.map((d, i) => (
            <option key={d} value={d} className="bg-brand-deep text-white">
              {dayLabel(d, i)}
            </option>
          ))}
        </select>
        <p className="text-white/70 text-[11px]">
          {t('zikrFix.windowNote', { count: days.length })}
        </p>
      </div>

      {isLoading ? (
        <div className="py-6 grid place-items-center">
          <span className="loading loading-spinner text-brand-emerald" />
        </div>
      ) : isError || !counts ? (
        <p className="text-red-400 text-xs" role="alert">
          {t('zikrFix.loadError')}
        </p>
      ) : (
        // Remount per day so the boxes start from that day's numbers.
        <DayRows
          key={date}
          date={date}
          dayText={dayLabel(date, days.indexOf(date))}
          was={counts}
          allTypes={allTypes}
          onClose={onClose}
        />
      )}
    </div>
  );
}

function DayRows({
  date,
  dayText,
  was,
  allTypes,
  onClose,
}: {
  date: string;
  dayText: string;
  was: Record<string, number>;
  allTypes: string[];
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const correct = useCorrectZikrDay();
  // That day's zikr first (most counted on top), then the rest of the list.
  const rows = [
    ...Object.keys(was)
      .filter((k) => (was[k] ?? 0) > 0)
      .sort((a, b) => (was[b] ?? 0) - (was[a] ?? 0)),
    ...allTypes.filter((k) => !((was[k] ?? 0) > 0)),
  ];
  const [typed, setTyped] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((k) => [k, String(was[k] ?? 0)]))
  );
  const changes = correctionChanges(was, typed);
  const delta = changes
    ? Object.entries(changes).reduce((n, [k, v]) => n + v - (was[k] ?? 0), 0)
    : 0;
  const changed = !!changes && Object.keys(changes).length > 0;

  const save = () => {
    if (!changes || !changed || correct.isPending) return;
    correct.mutate(
      { date, counts: changes },
      {
        onSuccess: () => {
          toast.success(t('zikrFix.done', { day: dayText }), { id: 'zikr-fix' });
          onClose();
        },
        onError: () => toast.error(t('zikrFix.saveError'), { id: 'zikr-fix' }),
      }
    );
  };

  const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + formatLocaleNumber(Math.abs(n));

  return (
    <>
      <p className="text-white/75 text-xs leading-relaxed">{t('zikrFix.help')}</p>
      <div className="divide-y divide-brand-border/60" data-testid="zikr-fix-rows">
        {rows.map((k) => (
          <label key={k} className="flex items-center gap-2 py-2">
            <span className="flex-1 min-w-0 text-white text-sm truncate">
              {zikrDisplayName(k, i18n.language)}
            </span>
            <span className="text-white/60 text-[11px] tabular-nums w-20 text-right">
              {t('zikrFix.was', { n: formatLocaleNumber(was[k] ?? 0) })}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={typed[k] ?? ''}
              onChange={(e) => setTyped((s) => ({ ...s, [k]: e.target.value }))}
              aria-label={t('zikrFix.inputLabel', { zikr: zikrDisplayName(k, i18n.language) })}
              className="input input-bordered input-sm w-24 rounded-control bg-brand-surface/50 border-brand-border text-white text-right tabular-nums"
            />
          </label>
        ))}
      </div>
      {!changes && (
        <p className="text-red-400 text-xs" role="alert">
          {t('zikrFix.invalid')}
        </p>
      )}
      <p className="text-brand-info text-[11px] flex items-start gap-1">
        <InformationCircleIcon className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
        {t('zikrFix.note')}
      </p>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className={`${BTN_SECONDARY} flex-1`}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!changed || correct.isPending}
          className={`${BTN_PRIMARY} flex-1`}
          data-testid="zikr-fix-save"
        >
          {correct.isPending ? (
            <span className="loading loading-spinner loading-sm" />
          ) : changed ? (
            t('zikrFix.saveDelta', { delta: signed(delta) })
          ) : (
            t('zikrFix.save')
          )}
        </button>
      </div>
    </>
  );
}
