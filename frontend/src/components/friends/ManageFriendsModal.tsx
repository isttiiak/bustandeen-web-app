import type { TFunction } from 'i18next';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, NoSymbolIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';
import { LeafIcon } from '../icons/IslamicIcons.js';
import {
  useBlockedList,
  useBlockUser,
  useFriendsList,
  useUnblockUser,
  useUnfriend,
} from '../../hooks/useSocial.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import { Avatar, BTN_QUIET, ROW, Sheet, SheetHeader, Spinner } from './friendsParts.js';

const BTN_DANGER =
  'btn-solid inline-flex items-center justify-center gap-1 rounded-control px-3 py-1.5 text-xs font-bold text-on-color bg-red-600 hover:bg-red-700 shadow-elev-1 transition-colors disabled:opacity-50';
const ICON_DANGER =
  'p-2 rounded-control text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0';

function formatConnectedSince(iso: string | null, translate: TFunction): string {
  if (!iso) return translate('friends.connectedAWhileAgo');
  const d = new Date(iso);
  return translate('friends.connectedSince', {
    date: formatLocaleDate(d, { month: 'short', day: 'numeric', year: 'numeric' }),
  });
}

/** Manage-friends modal: full list, connected-since date, two-step confirm delete. */
export function ManageFriendsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { data: friends, isLoading } = useFriendsList(true);
  const unfriend = useUnfriend();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { data: blocked, isLoading: blockedLoading } = useBlockedList(true);
  // Two-step confirm: null, then "confirm-1" (Remove?), then "confirm-2" (Are you sure?), then delete
  const [confirmStep, setConfirmStep] = useState<{ uid: string; step: 1 | 2 } | null>(null);
  // Block only needs one confirm step: it's already the more protective action
  const [blockConfirmUid, setBlockConfirmUid] = useState<string | null>(null);
  const [blockedListOpen, setBlockedListOpen] = useState(false);

  const startConfirm = (uid: string) => setConfirmStep({ uid, step: 1 });
  const advanceConfirm = (uid: string) => setConfirmStep({ uid, step: 2 });
  const cancelConfirm = () => setConfirmStep(null);
  const finalizeRemove = (uid: string) => {
    unfriend.mutate(uid);
    setConfirmStep(null);
  };
  const finalizeBlock = (uid: string) => {
    blockUser.mutate(uid);
    setBlockConfirmUid(null);
  };

  const confirmPanel = (
    warning: string,
    tone: 'danger' | 'quiet',
    onYes: () => void,
    yesLabel: React.ReactNode,
    busy = false
  ) => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div
        className={`mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2 ${
          tone === 'danger' ? 'border-red-400/30' : 'border-brand-border'
        }`}
      >
        <p
          className={`text-xs flex-1 min-w-[10rem] ${
            tone === 'danger' ? 'text-red-400 font-semibold' : 'text-white/80'
          }`}
        >
          {warning}
        </p>
        <div className="flex gap-1.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => {
              cancelConfirm();
              setBlockConfirmUid(null);
            }}
            className={BTN_QUIET}
          >
            {t('common.cancel')}
          </button>
          <button type="button" onClick={onYes} disabled={busy} className={BTN_DANGER}>
            {yesLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <Sheet onClose={onClose} labelledBy="friends-manage-title">
      <SheetHeader
        id="friends-manage-title"
        Icon={UsersIcon}
        title={t('friends.yourFriends')}
        subtitle={
          friends ? t('friends.connectedCount', { count: friends.length }) : t('common.loading')
        }
        onClose={onClose}
      />

      {isLoading ? (
        <div className="grid place-items-center py-8">
          <Spinner />
        </div>
      ) : !friends || friends.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <LeafIcon className="w-8 h-8 mx-auto text-brand-emerald" />
          <p className="text-white/75 text-sm">{t('friends.noFriendsYet')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {friends.map((f) => {
            const confirming = confirmStep?.uid === f.uid;
            const blockConfirming = blockConfirmUid === f.uid;
            return (
              <div
                key={f.uid}
                className={`${ROW} transition-colors ${
                  confirming || blockConfirming ? 'border-red-400/50 bg-red-500/[0.06]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={f.displayName} photoUrl={f.photoUrl} avatarId={f.avatarId} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{f.displayName}</p>
                    <p className="text-white/70 text-xs truncate">
                      {formatConnectedSince(f.connectedSince, t)}
                    </p>
                  </div>
                  {!confirming && !blockConfirming && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setBlockConfirmUid(f.uid)}
                        aria-label={t('friends.blockFriendAria', { name: f.displayName })}
                        title={t('friends.blockFriendTooltip')}
                        className={ICON_DANGER}
                      >
                        <NoSymbolIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startConfirm(f.uid)}
                        aria-label={t('friends.removeFriendAria', { name: f.displayName })}
                        title={t('friends.removeFriendTooltip')}
                        className={ICON_DANGER}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {blockConfirming &&
                    confirmPanel(
                      t('friends.blockWarning', { name: f.displayName }),
                      'danger',
                      () => finalizeBlock(f.uid),
                      blockUser.isPending ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        t('friends.yesBlock')
                      ),
                      blockUser.isPending
                    )}
                  {confirming &&
                    confirmStep?.step === 1 &&
                    confirmPanel(
                      t('friends.removeConfirm', { name: f.displayName }),
                      'quiet',
                      () => advanceConfirm(f.uid),
                      t('common.remove')
                    )}
                  {confirming &&
                    confirmStep?.step === 2 &&
                    confirmPanel(
                      t('friends.removeWarning', { name: f.displayName }),
                      'danger',
                      () => finalizeRemove(f.uid),
                      unfriend.isPending ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        t('friends.yesRemove')
                      ),
                      unfriend.isPending
                    )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Blocked users */}
      <div className="rounded-control border border-brand-border bg-brand-surface/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setBlockedListOpen((o) => !o)}
          className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left"
          aria-expanded={blockedListOpen}
        >
          <span className="flex items-center gap-2 text-white/85 font-bold text-xs">
            <NoSymbolIcon className="w-4 h-4 text-red-400" />
            {t('friends.blockedUsers')}
            {blocked && blocked.length > 0 ? ` (${formatLocaleNumber(blocked.length)})` : ''}
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-white/70 transition-transform ${blockedListOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence>
          {blockedListOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-1 border-t border-brand-border space-y-1.5">
                {blockedLoading ? (
                  <div className="grid place-items-center py-3">
                    <Spinner className="loading-sm" />
                  </div>
                ) : !blocked || blocked.length === 0 ? (
                  <p className="text-white/70 text-xs py-2 text-center">
                    {t('friends.noBlockedUsers', "You haven't blocked anyone.")}
                  </p>
                ) : (
                  blocked.map((b) => (
                    <div key={b.uid} className="flex items-center gap-2.5 py-1.5">
                      <Avatar
                        name={b.displayName}
                        photoUrl={b.photoUrl}
                        avatarId={b.avatarId}
                        size="w-7 h-7"
                      />
                      <p className="flex-1 min-w-0 text-white/85 text-xs font-semibold truncate">
                        {b.displayName}
                      </p>
                      <button
                        type="button"
                        onClick={() => unblockUser.mutate(b.uid)}
                        disabled={unblockUser.isPending}
                        className={BTN_QUIET}
                      >
                        {t('friends.unblock')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
