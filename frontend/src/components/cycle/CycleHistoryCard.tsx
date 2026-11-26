import { useTranslation } from 'react-i18next';
import {
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  HeartIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { FlowerIcon } from '../icons/IslamicIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import type { CycleSummary } from '../../hooks/useCycle.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { daysBetween } from '../../utils/cycleStats.js';
import type { CycleEditTarget } from '../CycleEditModal.js';
import { FOOT, fmtFull } from './cycleAnalyticsParts.js';

/** Full history: every logged cycle, edit and delete, "log a past period" and the CSV export. */
export function CycleHistoryCard({
  summary,
  today,
  setPastStart,
  setPastEnd,
  setPastType,
  setPastOpen,
  setEditTarget,
  setPendingDelete,
}: {
  summary: CycleSummary | undefined;
  today: string;
  setPastStart: (date: string) => void;
  setPastEnd: (date: string) => void;
  setPastType: (type: 'hayd' | 'nifas') => void;
  setPastOpen: (open: boolean) => void;
  setEditTarget: (target: CycleEditTarget | null) => void;
  setPendingDelete: (target: { id: string; label: string } | null) => void;
}) {
  const { t } = useTranslation();

  const exportCsv = () => {
    const logs = summary?.logs ?? [];
    const days = summary?.days ?? [];
    const lines = ['Type,Start Date,End Date,Duration (days),Flow,Symptoms,Moods'];
    for (const l of logs) {
      const dur = l.endDate ? daysBetween(l.startDate, l.endDate) + 1 : 'ongoing';
      const periodDays = days.filter(
        (d) => d.date >= l.startDate && d.date <= (l.endDate ?? today)
      );
      if (periodDays.length > 0) {
        for (const d of periodDays) {
          lines.push(
            [
              l.type,
              d.date,
              l.endDate ?? '',
              String(dur),
              d.flow ?? '',
              d.symptoms.join('; '),
              (d.moods ?? []).join('; '),
            ]
              .map((v) => `"${v}"`)
              .join(',')
          );
        }
      } else {
        lines.push(
          [l.type, l.startDate, l.endDate ?? '', String(dur), '', '', '']
            .map((v) => `"${v}"`)
            .join(',')
        );
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rayhanah-cycle-export-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={`${CARD} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className={SECTION_TITLE}>
          <CalendarDaysIcon className="w-5 h-5 text-brand-pink" />
          {t('cycleAnalytics.fullHistoryTitle', 'Full history')}
        </h2>
        <div className="flex items-center gap-2">
          {(summary?.logs ?? []).length > 0 && (
            <button
              className="inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold border border-brand-border bg-brand-surface/50 text-white/85 hover:border-brand-info/50 transition-colors"
              onClick={exportCsv}
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              {t('cycleAnalytics.exportCsv', 'Export CSV')}
            </button>
          )}
          <button
            className="inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold border border-brand-pink/50 bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20 transition-colors"
            onClick={() => {
              setPastStart('');
              setPastEnd('');
              setPastType('hayd');
              setPastOpen(true);
            }}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            {t('cycleAnalytics.logPastPeriod', 'Log a past period')}
          </button>
        </div>
      </div>
      {(summary?.logs ?? []).length === 0 ? (
        <p className="text-white/70 text-xs">
          {t(
            'cycleAnalytics.nothingYetHistory',
            'Nothing yet. Add your last few periods and predictions wake up immediately.'
          )}
        </p>
      ) : (
        <div className="space-y-1.5">
          {(summary?.logs ?? []).map((l) => (
            <div
              key={l._id}
              className="flex items-center gap-3 rounded-control border border-brand-border bg-brand-surface/50 px-3 py-2 text-xs"
            >
              {l.type === 'nifas' ? (
                <HeartIcon className="w-4 h-4 shrink-0 text-brand-warm" aria-hidden="true" />
              ) : (
                <FlowerIcon className="w-4 h-4 shrink-0 text-brand-pink" aria-hidden="true" />
              )}
              <span className="text-white/85 flex-1">
                {fmtFull(l.startDate)} –{' '}
                {l.endDate ? fmtFull(l.endDate) : t('cycleAnalytics.ongoing', 'ongoing')}
                {l.endDate && (
                  <span className="text-white/70">
                    {' '}
                    · {formatLocaleNumber(daysBetween(l.startDate, l.endDate) + 1)}d
                  </span>
                )}
              </span>
              <button
                aria-label={t('rayhanah.editEntry', 'Edit entry')}
                className="p-1 text-white/70 hover:text-brand-pink"
                onClick={() =>
                  setEditTarget({
                    _id: l._id,
                    startDate: l.startDate,
                    endDate: l.endDate,
                  })
                }
              >
                <PencilSquareIcon className="w-4 h-4" />
              </button>
              <button
                aria-label={t('cycleAnalytics.deleteEntry', 'Delete entry')}
                className="p-1 text-white/70 hover:text-red-300"
                onClick={() =>
                  setPendingDelete({
                    id: l._id,
                    label: `${fmtFull(l.startDate)} – ${l.endDate ? fmtFull(l.endDate) : t('cycleAnalytics.ongoing', 'ongoing')}`,
                  })
                }
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className={FOOT}>
        {t(
          'cycleAnalytics.historyDisclaimer',
          'Estimates only. They help you prepare; they never define you. If bleeding patterns worry you, speak to a doctor; for the fiqh of unusual bleeding see the istiḥāḍa note on the Cycle page.'
        )}
      </p>
    </section>
  );
}
