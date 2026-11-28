import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HandRaisedIcon, TrashIcon } from '@heroicons/react/24/outline';
import ConfirmDialog from '../ConfirmDialog.js';
import { useDeleteNudges, useNudgeHistory } from '../../hooks/useSocial.js';
import { formatLocaleDate, formatLocaleTime } from '../../utils/localeDate.js';
import { Avatar, BTN_QUIET, ROW, Sheet, SheetHeader, Spinner } from './friendsParts.js';

/** The nudges I have received: read them again, delete one, or delete them all. */
export function NudgeHistorySheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { data: history, isLoading } = useNudgeHistory(true);
  const remove = useDeleteNudges();
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <Sheet onClose={onClose} labelledBy="friends-nudge-history-title">
      <SheetHeader
        id="friends-nudge-history-title"
        Icon={HandRaisedIcon}
        title={t('friends.nudge.historyTitle', 'Nudge history')}
        subtitle={t('friends.nudge.historySubtitle', 'Nudges your friends sent you')}
        onClose={onClose}
      />

      {isLoading ? (
        <div className="grid place-items-center py-8">
          <Spinner />
        </div>
      ) : !history || history.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <HandRaisedIcon className="w-8 h-8 mx-auto text-white/50" aria-hidden="true" />
          <p className="text-white/75 text-sm">
            {t('friends.nudge.historyEmpty', 'No nudges yet.')}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {history.map((n) => {
              const at = new Date(n.nudgedAt);
              return (
                <li key={n.id} className={`${ROW} flex items-start gap-3`}>
                  <Avatar name={n.displayName} photoUrl={n.photoUrl} avatarId={n.avatarId} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{n.displayName}</p>
                    <p className="text-white/70 text-[11px]">
                      {formatLocaleDate(at, { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      {formatLocaleTime(at, { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    {n.message && (
                      <p className="mt-1.5 text-white/85 text-sm italic border-l-2 border-brand-emerald/50 pl-3 break-words">
                        {n.message}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove.mutate(n.id)}
                    disabled={remove.isPending}
                    aria-label={t('friends.nudge.deleteOne', 'Delete this nudge from {{name}}', {
                      name: n.displayName,
                    })}
                    className="shrink-0 w-11 h-11 grid place-items-center rounded-control text-white/70 hover:text-red-300 hover:bg-brand-surface transition-colors disabled:opacity-50"
                  >
                    <TrashIcon className="w-5 h-5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => setConfirmAll(true)}
            disabled={remove.isPending}
            className={`${BTN_QUIET} w-full justify-center min-h-[44px]`}
          >
            <TrashIcon className="w-4 h-4" aria-hidden="true" />
            {t('friends.nudge.deleteAll', 'Delete all history')}
          </button>
        </>
      )}

      <ConfirmDialog
        open={confirmAll}
        title={t('friends.nudge.deleteAllTitle', 'Delete all nudge history?')}
        message={t(
          'friends.nudge.deleteAllBody',
          'Every nudge in this list will be removed from your account. This cannot be undone.'
        )}
        confirmLabel={t('friends.nudge.deleteAllYes', 'Yes, delete all')}
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => {
          setConfirmAll(false);
          remove.mutate(undefined);
        }}
      />
    </Sheet>
  );
}
