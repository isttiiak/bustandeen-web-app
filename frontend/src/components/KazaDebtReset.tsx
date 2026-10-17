import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import ConfirmDialog from './ConfirmDialog.js';
import { BTN_SECONDARY } from './bustanStyles.js';
import { useResetSalatDebt, useSalatDebt } from '../hooks/useSalatLog.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { formatLocaleNumber } from '../utils/localeDate.js';

/**
 * "Reset kaza debt", with its confirm. Used in Salat settings and in the main
 * Settings' Fresh start card. It is NOT part of "Reset all stats": the debt
 * is a record of prayers owed, so it is only ever reset on its own. Each
 * reset is logged for the reset tracker (Journey).
 */
export default function KazaDebtReset({ row = false }: { row?: boolean }) {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { data: debt } = useSalatDebt();
  const resetDebt = useResetSalatDebt();
  const [confirm, setConfirm] = useState(false);
  const owed = debt?.totalOwed ?? 0;

  if (isDemoMode) return null;

  const run = () => {
    resetDebt.mutate(
      { today: getTrackingDay() },
      {
        onSuccess: () =>
          toast.success(
            t('salatTracker.kazaDebtResetDone', 'Kaza debt reset. Counting fresh from today.')
          ),
        onError: () =>
          toast.error(t('salatTracker.kazaDebtResetFail', 'Could not reset. Please try again.')),
      }
    );
    setConfirm(false);
  };

  const button = (
    <button
      onClick={() => setConfirm(true)}
      disabled={owed === 0 || resetDebt.isPending}
      className={`${BTN_SECONDARY} !px-3 !py-2 !text-xs disabled:opacity-50`}
      data-testid="kaza-debt-reset"
    >
      <ArrowUturnLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
      {row ? t('freshStart.reset') : t('salatTracker.kazaDebtReset', 'Reset kaza debt')}
    </button>
  );

  return (
    <>
      {row ? (
        <div className="flex items-center gap-3 rounded-control bg-shade/20 border border-brand-border px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold">{t('freshStart.area.kaza')}</p>
            <p className="text-white/70 text-[11px]">
              {owed > 0
                ? t('freshStart.kazaOwed', '{{n}} prayers owed', { n: formatLocaleNumber(owed) })
                : t('freshStart.kazaNone', 'Nothing owed')}
              {' · '}
              {t('freshStart.kazaApart', 'Not part of Reset all')}
            </p>
          </div>
          {button}
        </div>
      ) : (
        button
      )}
      <ConfirmDialog
        open={confirm}
        title={t('salatTracker.kazaDebtResetConfirmTitle', 'Reset kaza debt?')}
        message={t(
          'salatTracker.kazaDebtResetConfirmMsg',
          'All prayers owed will be set to 0 and counting restarts from today. Nothing is deleted: your logged prayers stay as they are, and you can add debt back by hand afterward if you need to.'
        )}
        confirmLabel={
          resetDebt.isPending
            ? t('salatTracker.kazaDebtResetting', 'Resetting…')
            : t('salatTracker.kazaDebtResetConfirm', 'Yes, start fresh')
        }
        onConfirm={run}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
