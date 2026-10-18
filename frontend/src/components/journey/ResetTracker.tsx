import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { useStatsResets, type TrackedArea } from '../../hooks/useStatsResets.js';
import { areaResets, fullResets } from '../../utils/resetTracker.js';
import { formatDayLabel, formatLocaleNumber } from '../../utils/localeDate.js';

/** Dates shown per area before "Show all". */
const SHOWN = 3;

/**
 * The reset tracker: how many times each area was started fresh, with the
 * dates. Journey page: every area plus "Reset all"; an analytics Journey tab:
 * its own area (Salat: Salat and Kaza debt).
 */
export default function ResetTracker({
  areas,
  withAll = false,
}: {
  areas: readonly TrackedArea[];
  /** Also count the uses of "Reset all stats" (Journey page). */
  withAll?: boolean;
}) {
  const { t } = useTranslation();
  const { data: resets, isLoading } = useStatsResets();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const rows = areas.map((a) => ({
    key: a as string,
    label: t(`freshStart.area.${a}`),
    list: areaResets(resets, a),
  }));
  if (withAll) {
    rows.push({
      key: 'all',
      label: t('journey.resetAll'),
      list: fullResets(resets).map((r) => ({ ...r, area: 'zikr' as const, note: '', all: true })),
    });
  }

  return (
    <section className={`${CARD} p-4 space-y-3`} data-testid="reset-tracker">
      <div>
        <h2 className={SECTION_TITLE}>
          <ArrowPathIcon className="w-4 h-4 text-brand-gold" aria-hidden="true" />
          {t('journey.trackerTitle')}
        </h2>
        <p className="text-white/70 text-xs mt-1">{t('journey.trackerSub')}</p>
      </div>
      {isLoading ? (
        <p className="text-white/70 text-sm">{t('journey.loading')}</p>
      ) : (
        <ul className="divide-y divide-brand-border">
          {rows.map(({ key, label, list }) => {
            const all = open[key] ?? false;
            const shown = all ? list : list.slice(0, SHOWN);
            return (
              <li key={key} className="py-2.5" data-testid={`reset-tracker-${key}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-white text-sm font-bold">{label}</p>
                  <p className="text-xs font-bold text-brand-gold tabular-nums">
                    {list.length
                      ? t('journey.times', {
                          count: list.length,
                          n: formatLocaleNumber(list.length),
                        })
                      : t('journey.never')}
                  </p>
                </div>
                {shown.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {shown.map((r, i) => (
                      <li
                        key={`${r.resetAt}-${i}`}
                        className="flex flex-wrap items-center gap-x-2 text-xs text-white/70"
                      >
                        <span className="font-semibold text-white/85">
                          {formatDayLabel(r.date)}
                        </span>
                        {key !== 'all' && r.all && (
                          <span className="rounded-full border border-brand-border px-1.5 text-[10px] font-bold">
                            {t('journey.viaAll')}
                          </span>
                        )}
                        {typeof r.owedBefore === 'number' && (
                          <span>
                            {t('journey.owedCleared', {
                              count: r.owedBefore,
                              n: formatLocaleNumber(r.owedBefore),
                            })}
                          </span>
                        )}
                        {r.note && <span className="italic">“{r.note}”</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {list.length > SHOWN && (
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [key]: !all }))}
                    className="mt-1 min-h-[44px] text-xs font-bold text-brand-emerald underline underline-offset-2"
                  >
                    {all
                      ? t('journey.showLess')
                      : t('journey.showAll', { n: formatLocaleNumber(list.length) })}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
