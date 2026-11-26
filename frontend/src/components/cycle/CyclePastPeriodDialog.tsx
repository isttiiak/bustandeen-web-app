import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY } from '../bustanStyles.js';
import type { useAddPastCycle } from '../../hooks/useCycle.js';
import { OfflineQueuedError } from '../../utils/syncOutbox.js';

/** "Log a past period": a portaled dialog with the two dates and the type. */
export function CyclePastPeriodDialog({
  pastOpen,
  setPastOpen,
  pastStart,
  setPastStart,
  pastEnd,
  setPastEnd,
  pastType,
  setPastType,
  addPast,
  today,
}: {
  pastOpen: boolean;
  setPastOpen: (open: boolean) => void;
  pastStart: string;
  setPastStart: (date: string) => void;
  pastEnd: string;
  setPastEnd: (date: string) => void;
  pastType: 'hayd' | 'nifas';
  setPastType: (type: 'hayd' | 'nifas') => void;
  addPast: ReturnType<typeof useAddPastCycle>;
  today: string;
}) {
  const { t } = useTranslation();
  if (!pastOpen) return null;
  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setPastOpen(false);
      }}
    >
      <div
        className="w-full max-w-sm rounded-card bg-brand-deep border border-brand-pink/40 shadow-elev-3 p-6 space-y-4"
        role="dialog"
        aria-label={t('cycleAnalytics.logPastPeriodTitle', 'Log a past period')}
      >
        <h3 className="font-display text-white font-bold text-xl flex items-center gap-2">
          <CalendarDaysIcon className="w-6 h-6 text-brand-pink" />
          {t('cycleAnalytics.logPastPeriodTitle', 'Log a past period')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/75 text-xs font-bold" htmlFor="past-start">
              {t('cycleAnalytics.started', 'Started')}
            </label>
            <input
              id="past-start"
              type="date"
              value={pastStart}
              max={today}
              onChange={(e) => setPastStart(e.target.value)}
              className="input input-bordered input-sm w-full mt-1 rounded-control bg-brand-surface/50 border-brand-border text-white"
            />
          </div>
          <div>
            <label className="text-white/75 text-xs font-bold" htmlFor="past-end">
              {t('cycleAnalytics.ended', 'Ended')}
            </label>
            <input
              id="past-end"
              type="date"
              value={pastEnd}
              max={today}
              onChange={(e) => setPastEnd(e.target.value)}
              className="input input-bordered input-sm w-full mt-1 rounded-control bg-brand-surface/50 border-brand-border text-white"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {(['hayd', 'nifas'] as const).map((item) => (
            <button
              key={item}
              aria-pressed={pastType === item}
              className={`flex-1 rounded-control border px-3 py-2 text-xs font-bold transition-colors ${pastType === item ? 'bg-brand-pink/15 border-brand-pink/60 text-brand-pink' : 'bg-brand-surface/50 border-brand-border text-white/75 hover:text-white'}`}
              onClick={() => setPastType(item)}
            >
              {item === 'hayd'
                ? t('cycleAnalytics.periodHayd', 'Period')
                : t('cycleAnalytics.postNatal', 'Nifās')}
            </button>
          ))}
        </div>
        <button
          className={`${BTN_PRIMARY} w-full`}
          disabled={!pastStart || !pastEnd || addPast.isPending}
          onClick={() =>
            addPast.mutate(
              { startDate: pastStart, endDate: pastEnd, type: pastType },
              {
                onSuccess: () => setPastOpen(false),
                onError: (e) => {
                  if (e instanceof OfflineQueuedError) setPastOpen(false);
                },
              }
            )
          }
        >
          {addPast.isPending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            t('cycleAnalytics.addToMyHistory', 'Add to my history')
          )}
        </button>
        <p className="text-white/70 text-[10px] text-center">
          {t(
            'cycleAnalytics.addPastPeriodsNote',
            'Add your last 3–6 periods and the predictions become genuinely yours.'
          )}
        </p>
      </div>
    </div>,
    document.body
  );
}
