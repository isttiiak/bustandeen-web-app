import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { m as motion, AnimatePresence } from 'framer-motion';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import { useZikrTypes } from '../../hooks/useZikrTypes.js';
import { useLogZikrCounts } from '../../hooks/useZikrLog.js';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { useZikrStore } from '../../store/useZikrStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { zikrDisplayName } from '../../utils/zikrLibrary.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import { getTrackingDayMiddayTsDaysBack } from '../../utils/trackingDay.js';
import {
  MAX_LOG_AMOUNT,
  logDayOptions,
  parseLogAmount,
  type LogDaysBack,
} from '../../utils/zikrLog.js';

export interface ZikrLogCountsModalProps {
  open: boolean;
  onClose: () => void;
  /** Server counts for today, when the caller already has them (analytics). */
  todayPerType?: Array<{ zikrType: string; total: number }>;
  /** Type to preselect (defaults to the counter's selected dhikr). */
  initialType?: string;
}

/**
 * "Log counts" (U4): counts made without the counter, for today or up to two
 * tracking days back (the streak grace window). Opened from Zikr analytics
 * and from Home's quick zikr section.
 */
export default function ZikrLogCountsModal({
  open,
  onClose,
  todayPerType,
  initialType,
}: ZikrLogCountsModalProps) {
  useEscapeKey(onClose, open);
  return createPortal(
    <AnimatePresence>
      {open && (
        <LogCountsForm onClose={onClose} todayPerType={todayPerType} initialType={initialType} />
      )}
    </AnimatePresence>,
    document.body
  );
}

function LogCountsForm({
  onClose,
  todayPerType,
  initialType,
}: Omit<ZikrLogCountsModalProps, 'open'>) {
  const { t, i18n } = useTranslation();
  const types = useZikrStore((s) => s.types);
  const selected = useZikrStore((s) => s.selected);
  const localCounts = useZikrStore((s) => s.counts);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { data: fetchedTypes } = useZikrTypes();
  const logCounts = useLogZikrCounts();

  // The day choices are computed once, from the moment the form opened: saved
  // after the day boundary passes, "Today" still means the day it showed.
  const [openedAt] = useState(() => {
    // Counts left over from an earlier tracking day must not show as today's.
    useZikrStore.getState().checkAndResetIfNewDay();
    return new Date();
  });

  const allTypes = [...new Set([...types, ...(fetchedTypes ?? []).map((ft) => ft.name)])];
  const [selectedType, setSelectedType] = useState(() => {
    const want = initialType ?? selected;
    return allTypes.includes(want) ? want : (allTypes[0] ?? 'SubhanAllah');
  });
  const [amount, setAmount] = useState('');
  const dayOptions = logDayOptions(isDemoMode);
  const [daysBack, setDaysBack] = useState<LogDaysBack>(0);
  const [submitError, setSubmitError] = useState('');
  // Guards the Enter key as well as the button: a second Enter while the
  // first save is on its way used to post the same counts twice. After a
  // successful save it stays closed: the form is still mounted (and focused)
  // while the dialog animates out, and an Enter then would save again.
  const savingRef = useRef(false);

  const dayLabel = (n: number): string => {
    if (n === 0) return t('common.today');
    if (n === 1) return t('zikrAnalytics.yesterday');
    return formatLocaleDate(new Date(getTrackingDayMiddayTsDaysBack(n, openedAt)), {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const serverCount = todayPerType?.find((tp) => tp.zikrType === selectedType)?.total ?? 0;
  const existingCount = Math.max(serverCount, localCounts[selectedType] ?? 0);

  const { amount: parsedAmount, error: amountError } = parseLogAmount(amount);
  const amountErrorText =
    amountError === 'tooLarge'
      ? t('zikrAnalytics.amountTooLarge', {
          max: formatLocaleNumber(MAX_LOG_AMOUNT),
        })
      : amountError === 'notWhole'
        ? t('zikrAnalytics.amountWhole')
        : '';

  const handleSubmit = async () => {
    if (parsedAmount <= 0 || savingRef.current) return;
    savingRef.current = true;
    setSubmitError('');
    try {
      const { queued } = await logCounts.mutateAsync({
        zikrType: selectedType,
        amount: parsedAmount,
        daysBack,
        openedAt,
      });
      if (queued) {
        toast(t('zikrAnalytics.logQueuedOffline'), { id: 'zikr-backfill' });
      } else {
        toast.success(
          t('zikrAnalytics.backfillToast', {
            amount: formatLocaleNumber(parsedAmount),
            type: zikrDisplayName(selectedType, i18n.language),
            day: dayLabel(daysBack).toLowerCase(),
          }),
          { id: 'zikr-backfill' }
        );
      }
      onClose();
    } catch {
      savingRef.current = false; // let the user try again
      setSubmitError(t('zikrAnalytics.saveError'));
    }
  };

  const submitting = logCounts.isPending;

  // Portaled to <body>: rendering inside the page's transformed/animated
  // ancestors created a stacking context that let the sticky navbar float
  // OVER the form. max-h + scroll keep it usable with the keyboard open.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-brand-deep rounded-card w-full max-w-md shadow-elev-3 border border-brand-border overflow-hidden max-h-[88vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zikr-log-title"
        data-testid="zikr-log-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-brand-border/60">
          <div>
            <h3 id="zikr-log-title" className="font-display text-lg font-bold text-brand-emerald">
              {t('zikrAnalytics.logMissedCounts')}
            </h3>
            <p className="text-white/70 text-xs mt-0.5">
              {dayOptions.length > 1
                ? t('zikrAnalytics.logMissedSubtitle')
                : t('zikrAnalytics.logTodaySubtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="shrink-0 w-9 h-9 grid place-items-center rounded-full text-white/70 hover:text-white hover:bg-brand-surface transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Which day: today or up to 2 days back (streak grace window) */}
          {dayOptions.length > 1 && (
            <div className="space-y-1.5">
              <span className="block text-xs text-white/70 uppercase tracking-wider font-bold">
                {t('zikrAnalytics.whichDay')}
              </span>
              <div className="flex gap-1.5">
                {dayOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={daysBack === n}
                    onClick={() => {
                      setDaysBack(n);
                      setSubmitError('');
                    }}
                    className={`flex-1 px-2 py-1.5 rounded-control text-xs font-bold border transition-colors ${
                      daysBack === n
                        ? 'bg-brand-emerald/20 border-brand-emerald/60 text-brand-emerald'
                        : 'bg-brand-surface/50 border-brand-border text-white/70 hover:text-white'
                    }`}
                  >
                    {dayLabel(n)}
                  </button>
                ))}
              </div>
              {daysBack > 0 && (
                <p className="text-brand-info text-[11px] flex items-start gap-1">
                  <InformationCircleIcon
                    className="w-3.5 h-3.5 shrink-0 mt-px"
                    aria-hidden="true"
                  />
                  {t('zikrAnalytics.backfillNote')}
                </p>
              )}
            </div>
          )}

          {/* Type selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="zikr-log-type"
              className="block text-xs text-white/70 uppercase tracking-wider font-bold"
            >
              {t('zikrAnalytics.zikrType')}
            </label>
            <select
              id="zikr-log-type"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setAmount('');
                setSubmitError('');
              }}
              className="select select-bordered w-full rounded-control bg-brand-surface/50 border-brand-border text-white focus:border-brand-emerald text-sm"
            >
              {allTypes.map((tn) => (
                <option key={tn} value={tn} className="bg-brand-deep text-white">
                  {zikrDisplayName(tn, i18n.language)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount FIRST (Istiak: type → save, fastest path), context after */}
          <div className="space-y-1.5">
            <label
              htmlFor="zikr-log-amount"
              className="block text-xs text-white/70 uppercase tracking-wider font-bold"
            >
              {t('zikrAnalytics.countsToAdd')}
            </label>
            <input
              id="zikr-log-amount"
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_LOG_AMOUNT}
              step="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setSubmitError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSubmit();
              }}
              placeholder={t('zikrAnalytics.egAmount')}
              aria-invalid={amountError ? true : undefined}
              aria-describedby={amountError ? 'zikr-log-amount-error' : undefined}
              className="input input-bordered w-full rounded-control bg-brand-surface/50 border-brand-border text-white focus:border-brand-emerald text-lg font-bold"
              // eslint-disable-next-line jsx-a11y-x/no-autofocus -- opened by the user to type an amount; focus moves into the dialog
              autoFocus
            />
            {amountErrorText && (
              <p id="zikr-log-amount-error" className="text-red-400 text-xs">
                {amountErrorText}
              </p>
            )}
          </div>

          {/* Today's existing count (only meaningful for today) */}
          {daysBack === 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-control bg-shade/10 border border-brand-border">
              <span className="text-white/70 text-sm">{t('zikrAnalytics.todaysCountSoFar')}</span>
              <span className="text-white font-black text-lg tabular-nums">
                {formatLocaleNumber(existingCount)}
              </span>
            </div>
          )}

          {/* Total preview */}
          {parsedAmount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-4 py-3 rounded-control bg-brand-emerald/10 border border-brand-emerald/30"
            >
              {daysBack === 0 ? (
                <>
                  <span className="text-brand-emerald/80 text-sm font-semibold">
                    {formatLocaleNumber(existingCount)} + {formatLocaleNumber(parsedAmount)}
                  </span>
                  <span className="text-brand-emerald font-black text-xl tabular-nums">
                    = {formatLocaleNumber(existingCount + parsedAmount)}
                  </span>
                </>
              ) : (
                <span className="text-brand-emerald font-bold text-sm">
                  {t('zikrAnalytics.backfillPreview', {
                    amount: formatLocaleNumber(parsedAmount),
                    day: dayLabel(daysBack),
                  })}
                </span>
              )}
            </motion.div>
          )}

          {submitError && (
            <p className="text-red-400 text-xs" role="alert">
              {submitError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={`${BTN_SECONDARY} flex-1`}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={parsedAmount <= 0 || submitting}
              className={`${BTN_PRIMARY} flex-1`}
              data-testid="zikr-log-save"
            >
              {submitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                t('zikrAnalytics.saveCounts')
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
