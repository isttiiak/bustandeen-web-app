import { useTranslation } from 'react-i18next';
import { BellIcon } from '@heroicons/react/24/outline';
import { useAcceptRequest, usePendingRequests, useRejectRequest } from '../../hooks/useSocial.js';
import { Avatar, BTN_QUIET, ROW, Sheet, SheetHeader, Spinner } from './friendsParts.js';

const BTN_SMALL_PRIMARY =
  'btn-solid inline-flex items-center justify-center gap-1 rounded-control px-3 py-1.5 text-xs font-bold text-on-color bg-brand-emerald-dim hover:brightness-110 shadow-elev-1 transition disabled:opacity-50';

/** Incoming friend requests: accept/reject people who opened my invite link. */
export function PendingRequestsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { data: requests, isLoading } = usePendingRequests(true);
  const accept = useAcceptRequest();
  const reject = useRejectRequest();

  return (
    <Sheet onClose={onClose} labelledBy="friends-requests-title">
      <SheetHeader
        id="friends-requests-title"
        Icon={BellIcon}
        title={t('friends.requestsTitle')}
        subtitle={t('friends.requestsSubtitle')}
        onClose={onClose}
      />

      {isLoading ? (
        <div className="grid place-items-center py-8">
          <Spinner />
        </div>
      ) : !requests || requests.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <BellIcon className="w-8 h-8 mx-auto text-white/50" />
          <p className="text-white/75 text-sm">{t('friends.noRequests')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.uid} className={`${ROW} flex items-center gap-3`}>
              <Avatar name={r.displayName} photoUrl={r.photoUrl} avatarId={r.avatarId} />
              <p className="flex-1 min-w-0 text-white font-bold text-sm truncate">
                {r.displayName}
              </p>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => reject.mutate(r.uid)}
                  disabled={reject.isPending || accept.isPending}
                  className={BTN_QUIET}
                >
                  {t('friends.reject')}
                </button>
                <button
                  type="button"
                  onClick={() => accept.mutate(r.uid)}
                  disabled={reject.isPending || accept.isPending}
                  className={BTN_SMALL_PRIMARY}
                >
                  {t('friends.accept')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
