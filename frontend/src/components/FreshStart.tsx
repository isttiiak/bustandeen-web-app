import { useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import {
  useResetStats,
  useStatsResets,
  useUndoStatsReset,
  STATS_AREAS,
  type StatsArea,
} from '../hooks/useStatsResets.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { formatDayLabel } from '../utils/localeDate.js';
import { BTN_PRIMARY, BTN_SECONDARY } from './bustanStyles.js';

/**
 * Stats "fresh start" (U7, prototype docs/design/u7-stats-reset.html). Used in
 * Settings (every area + Reset all) and in each feature's own settings (one
 * area). Nothing is deleted: the server records a start date per area.
 */

const LIST = [1, 2, 3] as const;

export default function FreshStart({
  areas = STATS_AREAS,
  withAll = false,
}: {
  areas?: readonly StatsArea[];
  /** Show "Reset all stats" (main Settings only). */
  withAll?: boolean;
}) {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { data: resets } = useStatsResets();
  const reset = useResetStats();
  const undo = useUndoStatsReset();
  const [pending, setPending] = useState<StatsArea[] | null>(null);
  const [note, setNote] = useState('');

  // Demo mode has no account to keep a start date on.
  if (isDemoMode) return null;

  const name = (a: StatsArea) => t(`freshStart.area.${a}`);
  const doUndo = (area: StatsArea) =>
    undo.mutate(area, {
      onSuccess: () => toast.success(t('freshStart.undone', { area: name(area) })),
      onError: () => toast.error(t('freshStart.failed')),
    });

  const confirm = () => {
    if (!pending || reset.isPending) return;
    const areasNow = pending;
    reset.mutate(
      { areas: areasNow, note: note.trim() },
      {
        onSuccess: () => {
          setPending(null);
          setNote('');
          const msg =
            areasNow.length > 1
              ? t('freshStart.doneAll')
              : t('freshStart.done', { area: name(areasNow[0]!) });
          toast(
            (tt) => (
              <span className="flex items-center gap-3 text-sm">
                {msg}
                {areasNow.length === 1 && (
                  <button
                    className="font-bold text-brand-emerald underline underline-offset-2"
                    onClick={() => {
                      toast.dismiss(tt.id);
                      doUndo(areasNow[0]!);
                    }}
                  >
                    {t('freshStart.undo')}
                  </button>
                )}
              </span>
            ),
            { duration: 6000 }
          );
        },
        onError: () => toast.error(t('freshStart.failed')),
      }
    );
  };

  return (
    <div data-testid="fresh-start">
      <div className="space-y-2">
        {areas.map((a) => {
          const date = resets?.[a]?.date ?? null;
          return (
            <div
              key={a}
              className="flex items-center gap-3 rounded-control bg-shade/20 border border-brand-border px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold">{name(a)}</p>
                <p className="text-white/70 text-[11px]">
                  {date
                    ? t('freshStart.since', { date: formatDayLabel(date) })
                    : t('freshStart.never')}
                  {date && (
                    <>
                      {' · '}
                      <button
                        className="text-brand-emerald underline underline-offset-2"
                        onClick={() => doUndo(a)}
                        disabled={undo.isPending}
                      >
                        {t('freshStart.undo')}
                      </button>
                    </>
                  )}
                </p>
              </div>
              <button
                className={`${BTN_SECONDARY} !px-3 !py-2 !text-xs`}
                onClick={() => setPending([a])}
                data-testid={`fresh-start-${a}`}
              >
                <ArrowPathIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {t('freshStart.reset')}
              </button>
            </div>
          );
        })}
      </div>
      {withAll && (
        <button
          className={`${BTN_SECONDARY} w-full mt-3`}
          onClick={() => setPending([...areas])}
          data-testid="fresh-start-all"
        >
          <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
          {t('freshStart.all')}
        </button>
      )}

      {createPortal(
        <AnimatePresence>
          {pending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setPending(null)}
            >
              <motion.div
                initial={{ y: 24 }}
                animate={{ y: 0 }}
                exit={{ y: 24 }}
                transition={{ type: 'spring', damping: 26 }}
                className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-card sm:rounded-card bg-brand-deep border border-brand-border shadow-elev-3 p-5"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="fresh-start-title"
              >
                <h3 id="fresh-start-title" className="font-display text-white font-bold text-lg">
                  {pending.length > 1
                    ? t('freshStart.sheetAll')
                    : t('freshStart.sheetTitle', { area: name(pending[0]!) })}
                </h3>
                <p className="text-white/75 text-xs leading-relaxed mt-1 mb-3">
                  {t('freshStart.lead')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['changes', 'stays'] as const).map((kind) => (
                    <div key={kind} className="rounded-control bg-shade/20 px-3 py-2">
                      <p
                        className={`text-[11px] font-extrabold uppercase tracking-wide mb-1 ${kind === 'changes' ? 'text-brand-gold' : 'text-brand-emerald'}`}
                      >
                        {t(`freshStart.${kind}`)}
                      </p>
                      <ul className="list-disc pl-4 text-white/85 text-[11px] leading-relaxed">
                        {pending.length > 1
                          ? pending.map((a) => (
                              <li key={a}>
                                <b>{name(a)}:</b>{' '}
                                {t(`freshStart.${a}.${kind === 'changes' ? 'chg' : 'stay'}1`)}
                              </li>
                            ))
                          : LIST.map((n) => (
                              <li key={n}>
                                {t(
                                  `freshStart.${pending[0]}.${kind === 'changes' ? 'chg' : 'stay'}${n}`
                                )}
                              </li>
                            ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <label className="block text-white/75 text-[11px] mt-3 mb-1" htmlFor="fresh-note">
                  {t('freshStart.noteLabel')}
                </label>
                <input
                  id="fresh-note"
                  value={note}
                  maxLength={120}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('freshStart.notePlaceholder')}
                  className="w-full rounded-control border border-brand-border bg-brand-void text-white text-sm px-3 py-2"
                />
                <div className="flex gap-2 mt-4">
                  <button className={`${BTN_SECONDARY} flex-1`} onClick={() => setPending(null)}>
                    {t('common.cancel')}
                  </button>
                  <button
                    className={`${BTN_PRIMARY} flex-1`}
                    onClick={confirm}
                    disabled={reset.isPending}
                    data-testid="fresh-start-confirm"
                  >
                    {t('freshStart.confirm')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
