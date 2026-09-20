import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useEditCycleLog } from '../hooks/useCycle.js';

export interface CycleEditTarget {
  _id: string;
  startDate: string;
  endDate: string | null;
}

interface Props {
  target: CycleEditTarget | null;
  today: string;
  onClose: () => void;
}

/** Adjust a logged cycle's dates, or clear the end date to reopen it. Used from
 * the cycle history on the Rayhanah Analytics page. */
export default function CycleEditModal({ target, today, onClose }: Props) {
  const { t } = useTranslation();
  const editCycle = useEditCycleLog();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (target) {
      setStart(target.startDate);
      setEnd(target.endDate ?? '');
    }
  }, [target]);

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="w-full max-w-sm rounded-3xl bg-brand-deep border border-brand-pink/25 p-6 space-y-4"
            role="dialog"
            aria-label={t('rayhanah.editCycleAriaLabel', 'Edit cycle')}
          >
            <div>
              <h3 className="text-white font-black">
                {t('rayhanah.editThisCycle', '✏️ Edit this cycle')}
              </h3>
              <p className="text-white/40 text-xs mt-1 leading-relaxed">
                {t(
                  'rayhanah.editCycleDesc',
                  "Adjust the dates, or clear the end date if it hasn't truly finished. Your daily notes belong to their days and are never lost."
                )}
              </p>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="text-white/50 text-xs font-bold" htmlFor="edit-cycle-start">
                  {t('rayhanah.startDate', 'Start date')}
                </label>
                <input
                  id="edit-cycle-start"
                  type="date"
                  value={start}
                  max={today}
                  onChange={(e) => setStart(e.target.value)}
                  className="input input-sm w-full mt-1 bg-white/5 border-brand-pink/20 text-white rounded-xl"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs font-bold" htmlFor="edit-cycle-end">
                  {t('rayhanah.endDate', 'End date')}
                </label>
                <input
                  id="edit-cycle-end"
                  type="date"
                  value={end}
                  min={start}
                  max={today}
                  onChange={(e) => setEnd(e.target.value)}
                  className="input input-sm w-full mt-1 bg-white/5 border-brand-pink/20 text-white rounded-xl"
                />
                {target.endDate && (
                  <button
                    className="mt-1.5 text-brand-pink/70 hover:text-brand-pink text-[11px] underline"
                    onClick={() => setEnd('')}
                  >
                    {t('rayhanah.clearEndDate', 'Clear the end date, this cycle is still ongoing')}
                  </button>
                )}
                {end === '' && (
                  <p className="text-brand-pink/60 text-[11px] mt-1">
                    {t(
                      'rayhanah.savingReopensCycle',
                      '🌸 Saving without an end date reopens the cycle.'
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 btn btn-sm rounded-xl bg-white/5 border-white/20 text-white/60"
                onClick={onClose}
              >
                {t('rayhanah.cancel', 'Cancel')}
              </button>
              <button
                className="flex-1 btn btn-sm rounded-xl border-0 text-white font-bold bg-brand-pink/80 hover:bg-brand-pink"
                disabled={editCycle.isPending || !start}
                onClick={() =>
                  editCycle.mutate(
                    { logId: target._id, startDate: start, endDate: end === '' ? null : end },
                    {
                      onSuccess: () => {
                        toast.success(
                          end === ''
                            ? t('rayhanah.cycleReopenedShort', 'Cycle reopened 🌸')
                            : t('rayhanah.cycleUpdated', 'Cycle updated ✏️'),
                          { id: 'cycle-edit' }
                        );
                        onClose();
                      },
                    }
                  )
                }
              >
                {editCycle.isPending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  t('rayhanah.save', 'Save')
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
