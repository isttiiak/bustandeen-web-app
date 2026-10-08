import { UserAvatar } from '../components/icons/AvatarGlyphs.js';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { streakVisual } from '../components/StatusBadges.js';
import { CountryFlag } from '../components/profile/profileParts.js';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  REF_LINK,
  SECTION_TITLE,
} from '../components/bustanStyles.js';
import {
  CrescentIcon,
  FlowerIcon,
  LeafIcon,
  MosqueIcon,
  TasbihIcon,
} from '../components/icons/IslamicIcons.js';
import {
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  UserPlusIcon,
  UsersIcon,
  TrashIcon,
  NoSymbolIcon,
  BellIcon,
  EyeSlashIcon,
  BookOpenIcon,
  ArrowUpIcon,
  SparklesIcon,
  ShareIcon,
  LinkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import {
  useSocialSummary,
  type FriendStats,
  useUnfriend,
  useFriendsList,
  usePendingRequests,
  useAcceptRequest,
  useRejectRequest,
  useBlockedList,
  useBlockUser,
  useUnblockUser,
  useSetInvisible,
} from '../hooks/useSocial.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useIsFemale } from '../hooks/useCycle.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';

type SvgIcon = (p: { className?: string }) => React.ReactNode;

/** A row inside a card or dialog. */
const ROW = 'rounded-control border border-brand-border bg-brand-surface/50 p-3';
/** A chosen / not chosen option (board tabs), as in Settings. */
const OPTION_ON = 'bg-brand-emerald/10 border-brand-emerald text-white';
const OPTION_OFF =
  'bg-brand-surface/50 border-brand-border text-white/80 hover:text-white hover:border-brand-emerald/40';
const BTN_QUIET =
  'inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-brand-surface transition-colors disabled:opacity-50';
const BTN_SMALL_PRIMARY =
  'btn-solid inline-flex items-center justify-center gap-1 rounded-control px-3 py-1.5 text-xs font-bold text-on-color bg-brand-emerald-dim hover:brightness-110 shadow-elev-1 transition disabled:opacity-50';
const BTN_DANGER =
  'btn-solid inline-flex items-center justify-center gap-1 rounded-control px-3 py-1.5 text-xs font-bold text-on-color bg-red-600 hover:bg-red-700 shadow-elev-1 transition-colors disabled:opacity-50';
const ICON_DANGER =
  'p-2 rounded-control text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0';
/** Gold, silver and bronze rank discs. */
const RANK_TONE = [
  'border-brand-gold/60 bg-brand-gold/15 text-brand-gold',
  'border-white/40 bg-brand-surface text-white',
  'border-brand-warm/60 bg-brand-warm/15 text-brand-warm',
];

function Avatar({
  name,
  photoUrl,
  avatarId,
  size = 'w-10 h-10',
}: {
  name: string;
  photoUrl?: string;
  avatarId?: string;
  size?: string;
}) {
  return (
    <UserAvatar
      photoUrl={photoUrl}
      avatarId={avatarId}
      name={name}
      className={`${size} text-sm ring-2 ring-brand-border shrink-0`}
    />
  );
}

function formatConnectedSince(
  iso: string | null,
  translate: (key: string, opts?: Record<string, unknown>) => string
): string {
  if (!iso) return translate('friends.connectedAWhileAgo');
  const d = new Date(iso);
  return translate('friends.connectedSince', {
    date: formatLocaleDate(d, { month: 'short', day: 'numeric', year: 'numeric' }),
  });
}

/** A bottom sheet / dialog, portaled: the page sits in AnimatedBackground's
 *  `relative z-10`, under the sticky navbar. */
function Sheet({
  onClose,
  labelledBy,
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="bg-brand-deep rounded-card p-5 w-full max-w-md shadow-elev-3 border border-brand-border space-y-4 max-h-[85vh] overflow-y-auto"
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body
  );
}

function SheetHeader({
  id,
  Icon,
  title,
  subtitle,
  onClose,
}: {
  id: string;
  Icon: SvgIcon;
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30 shrink-0">
          <Icon className="w-5 h-5 text-brand-emerald" />
        </span>
        <div className="min-w-0">
          <h3 id={id} className="font-display text-lg font-bold text-white leading-tight">
            {title}
          </h3>
          <p className="text-white/70 text-xs">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="text-white/70 hover:text-white p-1 rounded-control transition-colors"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

const Spinner = ({ className = '' }: { className?: string }) => (
  <span className={`loading loading-spinner text-brand-emerald ${className}`} />
);

/** Incoming friend requests: accept/reject people who opened my invite link. */
function PendingRequestsModal({ onClose }: { onClose: () => void }) {
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

/** Manage-friends modal: full list, connected-since date, two-step confirm delete. */
function ManageFriendsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { data: friends, isLoading } = useFriendsList(true);
  const unfriend = useUnfriend();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const setInvisible = useSetInvisible();
  const { data: summary } = useSocialSummary();
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

      {/* Privacy: full leaderboard opt-out */}
      <label className={`${ROW} flex items-center gap-3 cursor-pointer`}>
        <EyeSlashIcon className="w-5 h-5 text-white/70 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{t('friends.invisibleTitle')}</p>
          <p className="text-white/70 text-xs leading-relaxed">{t('friends.invisibleDesc')}</p>
        </div>
        <input
          type="checkbox"
          className="toggle toggle-sm toggle-success shrink-0"
          checked={summary?.invisible ?? false}
          disabled={setInvisible.isPending}
          onChange={(e) => setInvisible.mutate(e.target.checked)}
          aria-label={t('friends.invisibleTitle')}
        />
      </label>

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

/** One stat chip under a leaderboard row. `on` = the gold "done today" look. */
function Chip({
  Icon,
  on = false,
  className = '',
  iconClassName = '',
  children,
}: {
  Icon: SvgIcon;
  on?: boolean;
  className?: string;
  iconClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${
        className ||
        (on
          ? 'bg-brand-gold/15 border-brand-gold/50 text-brand-gold'
          : 'bg-brand-surface/60 border-brand-border text-white/80')
      }`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${iconClassName}`} />
      {children}
    </span>
  );
}

export default function Friends() {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { data, isLoading, isError, refetch } = useSocialSummary();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  // The navbar "Connect a friend" button links to /friends?invite=1
  useEffect(() => {
    if (searchParams.get('invite') === '1') {
      setInviteOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const inviteLink = data?.inviteCode ? `${window.location.origin}/connect/${data.inviteCode}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(t('friends.shareMessage', { link: inviteLink }));
      setCopied(true);
      toast.success(t('friends.inviteCopied'), { id: 'invite-copy' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('friends.copyError'));
    }
  };

  // "Today" is the live daily Noor; "This week" is the Friday-to-Thursday
  // average, so someone who started late (or had a quiet day) can still climb.
  const [board, setBoard] = useState<'today' | 'week'>('today');
  // Cycle wording is only ever shown to sisters (the public Privacy page aside).
  const isFemale = useIsFemale();
  const shownScore = (f: FriendStats): number =>
    board === 'week' ? (f.weekScore ?? f.score) : f.score;
  const leaderboard = [...(data?.leaderboard ?? [])].sort(
    (a, b) =>
      shownScore(b) - shownScore(a) ||
      (b.actsToday ?? 0) - (a.actsToday ?? 0) ||
      // Everyone is 0 at the start of a day: rank by usual Noor, then streak,
      // so a long-standing streak never sits below someone who just began.
      (b.usualScore ?? 0) - (a.usualScore ?? 0) ||
      b.zikrStreak - a.zikrStreak ||
      a.displayName.localeCompare(b.displayName)
  );
  const friendsCount = Math.max(0, leaderboard.length - 1);

  const noorParts: { Icon: SvgIcon; tone: string; points: number; text: string }[] = [
    {
      Icon: MosqueIcon,
      tone: 'text-brand-emerald',
      points: 50,
      text: t('friends.noorPrayersV2', 'Prayers: 10 for each of the five fard (kaza counts)'),
    },
    {
      Icon: TasbihIcon,
      tone: 'text-brand-emerald',
      points: 15,
      text: t('friends.noorZikrV2', "Dhikr: today's count against your own daily goal"),
    },
    {
      Icon: BookOpenIcon,
      tone: 'text-brand-info',
      points: 15,
      text: t('friends.noorQuranV2', 'Quran: reading or listening against your own daily goal'),
    },
    {
      Icon: LeafIcon,
      tone: 'text-brand-emerald',
      points: 10,
      text: t(
        'friends.noorSteady',
        'Steadiness: 1 for each day in a row you show up, up to 10, once you have done something today'
      ),
    },
    {
      Icon: CrescentIcon,
      tone: 'text-brand-gold',
      points: 10,
      text: t(
        'friends.noorExtras',
        'Extras, 5 each (best two): a completed fast, nafl prayer, ṣalawāt or istighfār'
      ),
    },
  ];

  return (
    <AnimatedBackground variant="dark">
      <div className="p-4 sm:p-6 lg:p-8 pb-16">
        <div className="max-w-xl mx-auto space-y-5">
          {/* The arch: title, the verse, and the two actions */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center"
          >
            <div className="w-16 h-16 mx-auto rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30">
              <UsersIcon className="w-8 h-8 text-brand-emerald" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-4">
              {t('friends.srTitle')}
            </h1>
            <p className="font-display text-lg text-white/85 mt-2 leading-snug">
              {t('friends.verseCompete')}
            </p>
            <a
              href="https://quran.com/2/148"
              target="_blank"
              rel="noopener noreferrer"
              className={REF_LINK}
            >
              {t('friends.quranRef')}
            </a>
            {!isDemoMode && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setInviteOpen(true)} className={BTN_PRIMARY}>
                  <UserPlusIcon className="w-4 h-4" /> {t('friends.inviteFriend')}
                </button>
                {friendsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setManageOpen(true)}
                    className={BTN_SECONDARY}
                  >
                    <UsersIcon className="w-4 h-4" /> {t('friends.seeFriends')}
                  </button>
                )}
              </div>
            )}
          </motion.section>

          {/* Pending friend requests: shown regardless of friend count */}
          {!isDemoMode && !!data?.pendingCount && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setRequestsOpen(true)}
              className="w-full flex items-center gap-3 rounded-card border border-brand-gold/50 bg-brand-gold/10 shadow-elev-1 px-4 py-3 text-left hover:bg-brand-gold/15 transition-colors"
            >
              <BellIcon className="w-5 h-5 text-brand-gold shrink-0" />
              <span className="flex-1 text-sm font-bold text-white">
                {t(
                  data.pendingCount === 1 ? 'friends.pendingCount' : 'friends.pendingCountPlural',
                  { count: data.pendingCount }
                )}
              </span>
              <span className="text-brand-gold text-xs font-bold">{t('friends.viewRequests')}</span>
            </motion.button>
          )}

          {/* Leaderboard */}
          {isLoading ? (
            <div className="min-h-[30vh] grid place-items-center">
              <Spinner className="loading-lg" />
            </div>
          ) : friendsCount === 0 ? (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`${CARD} p-8 text-center space-y-3`}
            >
              <LeafIcon className="w-10 h-10 mx-auto text-brand-emerald" />
              <p className="font-display text-white font-bold text-base">
                {t('friends.noFriendsTitle')}
              </p>
              <p className="text-white/75 text-sm max-w-xs mx-auto leading-relaxed">
                {t('friends.noFriendsDesc')}
              </p>
              {!isDemoMode && (
                <button type="button" onClick={() => setInviteOpen(true)} className={BTN_PRIMARY}>
                  <UserPlusIcon className="w-4 h-4" /> {t('friends.connectFriend')}
                </button>
              )}
            </motion.section>
          ) : (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <h2 className={SECTION_TITLE}>
                  <SparklesIcon className="w-5 h-5 text-brand-gold" />
                  {t('friends.todaysCircle')}
                  <span className="text-white/70 text-sm font-normal font-sans">
                    {t(friendsCount === 1 ? 'friends.circleCount' : 'friends.circleCountPlural', {
                      count: friendsCount,
                    })}
                  </span>
                </h2>
                <div className="flex gap-1.5" role="tablist">
                  {(['today', 'week'] as const).map((b) => (
                    <button
                      type="button"
                      key={b}
                      role="tab"
                      aria-selected={board === b}
                      onClick={() => setBoard(b)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                        board === b ? OPTION_ON : OPTION_OFF
                      }`}
                    >
                      {b === 'today'
                        ? t('friends.boardToday', 'Today')
                        : t('friends.boardWeek', 'This week')}
                    </button>
                  ))}
                </div>
              </div>

              {leaderboard.map((f, i) => {
                const sv = streakVisual(f.zikrState, f.zikrStreak, t);
                const week = board === 'week' && f.week ? f.week : null;
                return (
                  <motion.div
                    key={f.uid}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 + i * 0.04 }}
                    className={`${CARD} p-3.5 ${f.isMe ? 'border-brand-emerald/60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold tabular-nums shrink-0 ${
                          i < 3 ? `border ${RANK_TONE[i]}` : 'text-white/70'
                        }`}
                      >
                        {formatLocaleNumber(i + 1)}
                      </span>
                      <Avatar name={f.displayName} photoUrl={f.photoUrl} avatarId={f.avatarId} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{f.displayName}</span>
                          {f.country && <CountryFlag countryName={f.country} />}
                          {f.isMe && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-brand-emerald/50 bg-brand-emerald/10 text-brand-emerald shrink-0">
                              {t('friends.you')}
                            </span>
                          )}
                        </p>
                        {f.onCycle !== undefined && (
                          <span
                            className={`inline-flex items-center gap-1 mt-0.5 text-[11px] font-semibold ${
                              f.onCycle ? 'text-brand-pink' : 'text-white/70'
                            }`}
                          >
                            {f.onCycle && <FlowerIcon className="w-3.5 h-3.5" />}
                            {f.onCycle
                              ? t('friends.onCycle', 'on her cycle')
                              : t('friends.notOnCycle', 'not on her cycle')}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-shade rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(0, shownScore(f)))}%` }}
                              transition={{ duration: 0.6, delay: 0.1 + i * 0.04, ease: 'easeOut' }}
                              className={`h-full rounded-full ${i === 0 ? 'bg-brand-gold' : 'bg-brand-emerald'}`}
                            />
                          </div>
                          <span className="inline-flex items-center gap-0.5 text-white text-xs font-bold tabular-nums w-12 justify-end">
                            <SparklesIcon className="w-3.5 h-3.5 text-brand-gold" />
                            {formatLocaleNumber(shownScore(f))}
                          </span>
                        </div>
                        {week && (
                          <p className="text-[11px] mt-1 text-white/70">
                            {t(
                              'friends.weekActiveDays',
                              'daily average · active {{active}} of {{days}} days',
                              {
                                active: formatLocaleNumber(week.activeDays),
                                days: formatLocaleNumber(week.days),
                              }
                            )}
                          </p>
                        )}
                        {board === 'today' && f.usualScore != null && (
                          <p
                            className={`text-[11px] mt-1 inline-flex items-center gap-0.5 ${
                              f.score > f.usualScore
                                ? 'text-brand-emerald font-semibold'
                                : 'text-white/70'
                            }`}
                          >
                            {f.score > f.usualScore && <ArrowUpIcon className="w-3 h-3" />}
                            {f.score > f.usualScore
                              ? t('friends.aboveUsual', '{{n}} above their usual', {
                                  n: formatLocaleNumber(f.score - f.usualScore),
                                })
                              : t('friends.usualNoor', 'usually {{n}} Noor', {
                                  n: formatLocaleNumber(f.usualScore),
                                })}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Stat chips: today's numbers on "Today", week-so-far totals on
                        "This week", so the chips always explain the Noor shown. */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5 pl-10">
                      {/* Someone who shares her cycle status: prayer and fasting are
                          paused for her, so those two chips would only confuse. */}
                      {!f.onCycle && (
                        <Chip Icon={MosqueIcon}>
                          {week ? (
                            t('friends.prayersWeekStat', '{{n}} prayers this week', {
                              n: formatLocaleNumber(week.salat),
                            })
                          ) : (
                            <>
                              {formatLocaleNumber(f.salatToday)}/{formatLocaleNumber(5)}{' '}
                              {t('friends.prayers')}
                            </>
                          )}
                        </Chip>
                      )}
                      <Chip
                        Icon={sv.Icon}
                        className={`text-white/85 ${sv.cls}`}
                        iconClassName={sv.iconCls ?? ''}
                      >
                        {t('friends.zikrStreakStat', { count: formatLocaleNumber(f.zikrStreak) })}
                      </Chip>
                      <Chip Icon={TasbihIcon}>
                        {week
                          ? t('friends.zikrWeekStat', '{{n}} this week', {
                              n: formatLocaleNumber(week.zikr),
                            })
                          : t('friends.zikrTodayStat', { count: formatLocaleNumber(f.zikrToday) })}
                      </Chip>
                      {!f.onCycle && (
                        <Chip Icon={CrescentIcon} on={week ? week.fasts > 0 : f.fastedToday}>
                          {week
                            ? t('friends.fastsWeekStat', '{{n}} fasts', {
                                n: formatLocaleNumber(week.fasts),
                              })
                            : f.fastedToday
                              ? t('friends.fastingToday')
                              : t('friends.notFasting')}
                        </Chip>
                      )}
                      <Chip Icon={BookOpenIcon}>
                        {week
                          ? t('friends.quranWeekStat', '{{n}} āyāt this week', {
                              n: formatLocaleNumber(week.quran),
                            })
                          : t('friends.quranPagesStat', {
                              current: formatLocaleNumber(f.quranPagesToday),
                              goal: formatLocaleNumber(f.quranGoal),
                            })}
                      </Chip>
                    </div>
                  </motion.div>
                );
              })}
            </section>
          )}

          {/* How Noor works */}
          <section className={`${CARD} overflow-hidden`}>
            <button
              type="button"
              onClick={() => setHowOpen(!howOpen)}
              className="w-full px-5 py-4 flex items-center justify-between gap-2 text-left"
              aria-expanded={howOpen}
            >
              <span className={SECTION_TITLE}>
                <SparklesIcon className="w-5 h-5 text-brand-gold" />
                {t('friends.whatIsNoor')}
              </span>
              <ChevronDownIcon
                className={`w-5 h-5 text-white/70 transition-transform ${howOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <AnimatePresence>
              {howOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-3 space-y-2.5 text-sm text-white/80 leading-relaxed border-t border-brand-border">
                    <p>
                      {t(
                        'friends.noorIntro',
                        'Your Noor starts at 0 every day and only ever goes up. Up to 100:'
                      )}
                    </p>
                    <ul className="space-y-2">
                      {noorParts.map(({ Icon, tone, points, text }) => (
                        <li key={text} className="flex items-start gap-2.5">
                          <Icon className={`w-5 h-5 shrink-0 ${tone}`} />
                          <span>
                            <b className="text-white tabular-nums">{formatLocaleNumber(points)}</b>{' '}
                            {text}
                          </span>
                        </li>
                      ))}
                      {isFemale && (
                        <li className="flex items-start gap-2.5">
                          <FlowerIcon className="w-5 h-5 shrink-0 text-brand-pink" />
                          <span>
                            {t(
                              'friends.noorExcusedV2',
                              'Rayhanah days (for sisters): prayer and fasting are excused, not lost. Dhikr and Quran count for more, and Noor still reaches 100.'
                            )}
                          </span>
                        </li>
                      )}
                    </ul>
                    <p>
                      <b className="text-white">{t('friends.boardToday', 'Today')}</b>{' '}
                      {t('friends.noorTodayDesc')}{' '}
                      <b className="text-white">{t('friends.boardWeek', 'This week')}</b>{' '}
                      {t(
                        'friends.noorWeekDesc',
                        '= your average daily Noor since Friday; a day with nothing counts 0.'
                      )}{' '}
                      <b className="text-white">{t('friends.noorAllTimeLabel')}</b>{' '}
                      {t('friends.noorAllTimeDesc')}
                    </p>
                    <p>
                      {t(
                        'friends.noorUsualDesc',
                        '"Above their usual" compares today with the average of their recent active days, so everyone races their own best.'
                      )}
                    </p>
                    <p className="text-white/70 text-xs italic">{t('friends.noorDisclaimer')}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>

      {/* Invite dialog */}
      <AnimatePresence>
        {inviteOpen && (
          <Sheet onClose={() => setInviteOpen(false)} labelledBy="friends-invite-title">
            <SheetHeader
              id="friends-invite-title"
              Icon={UserPlusIcon}
              title={t('friends.connectFriend')}
              subtitle={t('friends.inviteSubtitle')}
              onClose={() => setInviteOpen(false)}
            />

            <div className="text-center px-2">
              <p className="font-display text-base text-white/85">{t('friends.verseCompete')}</p>
              <a
                href="https://quran.com/2/148"
                target="_blank"
                rel="noopener noreferrer"
                className={REF_LINK}
              >
                {t('friends.quranRef')}
              </a>
            </div>

            {isError ? (
              <div className="text-center space-y-3 py-2">
                <p className="text-white/85 text-sm">{t('friends.inviteError')}</p>
                <button type="button" onClick={() => void refetch()} className={BTN_PRIMARY}>
                  {t('friends.tryAgain')}
                </button>
              </div>
            ) : inviteLink ? (
              <>
                <div className="flex gap-2">
                  <code className="flex-1 min-w-0 truncate px-3 py-2.5 rounded-control bg-shade border border-brand-border text-brand-emerald text-xs">
                    {inviteLink}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className={`${BTN_PRIMARY} shrink-0`}
                  >
                    {copied ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                    {copied ? t('friends.copied') : t('friends.copy')}
                  </button>
                </div>
                <ul className="space-y-2 text-xs text-white/80 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <ShareIcon className="w-4 h-4 shrink-0 text-brand-emerald" />
                    {t('friends.inviteShareTip')}
                  </li>
                  <li className="flex items-start gap-2">
                    <LinkIcon className="w-4 h-4 shrink-0 text-brand-emerald" />
                    {t('friends.inviteLinkTip')}
                  </li>
                  <li className="flex items-start gap-2">
                    <LockClosedIcon className="w-4 h-4 shrink-0 text-brand-emerald" />
                    {t('friends.invitePrivacy')}
                  </li>
                </ul>
              </>
            ) : (
              <div className="grid place-items-center py-4">
                <Spinner />
              </div>
            )}
          </Sheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {manageOpen && <ManageFriendsModal onClose={() => setManageOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {requestsOpen && <PendingRequestsModal onClose={() => setRequestsOpen(false)} />}
      </AnimatePresence>
    </AnimatedBackground>
  );
}
