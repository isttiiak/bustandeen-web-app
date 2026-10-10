import { UserAvatar } from '../components/icons/AvatarGlyphs.js';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { streakVisual } from '../components/StatusBadges.js';
import { CountryFlag } from '../components/profile/profileParts.js';
import { BTN_PRIMARY, CARD, REF_LINK, SECTION_TITLE } from '../components/bustanStyles.js';
import {
  CrescentIcon,
  FlowerIcon,
  LeafIcon,
  MosqueIcon,
  Star8Icon,
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
  EyeIcon,
  FireIcon,
  BookOpenIcon,
  ArrowUpIcon,
  SparklesIcon,
  ShareIcon,
  LinkIcon,
  LockClosedIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import {
  useSocialSummary,
  useCircleAllTime,
  type FriendStats,
  useUnfriend,
  useFriendsList,
  usePendingRequests,
  useAcceptRequest,
  useRejectRequest,
  useBlockedList,
  useBlockUser,
  useUnblockUser,
  useSetPrivacy,
  type SecretArea,
  type Visibility,
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

const VISIBILITY_OPTIONS: { value: Visibility; Icon: SvgIcon }[] = [
  { value: 'hidden', Icon: EyeSlashIcon },
  { value: 'streaks', Icon: FireIcon },
  { value: 'detail', Icon: EyeIcon },
];
const SECRET_OPTIONS: { area: SecretArea; Icon: SvgIcon }[] = [
  { area: 'salat', Icon: MosqueIcon },
  { area: 'zikr', Icon: TasbihIcon },
  { area: 'quran', Icon: BookOpenIcon },
  { area: 'fasting', Icon: CrescentIcon },
];

/** What friends see of me (three levels) + secret deeds (T3.6, FIQH-03). */
function PrivacySettingsBlock() {
  const { t } = useTranslation();
  const { data: summary } = useSocialSummary();
  const setPrivacy = useSetPrivacy();
  const privacy = summary?.privacy;
  // Show the choice at once; the refetch after the save confirms it
  const pending = setPrivacy.isPending ? setPrivacy.variables : undefined;
  const visibility = pending?.visibility ?? privacy?.visibility;
  const isSecret = (area: SecretArea): boolean =>
    pending?.secret?.[area] ?? privacy?.secret[area] ?? false;

  return (
    <div className={`${ROW} space-y-3`}>
      <div role="radiogroup" aria-labelledby="friends-visibility-title" className="space-y-1.5">
        <p id="friends-visibility-title" className="text-white font-bold text-sm">
          {t('friends.privacy.title')}
        </p>
        {VISIBILITY_OPTIONS.map(({ value, Icon }) => {
          const on = visibility === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!privacy || setPrivacy.isPending}
              onClick={() => !on && setPrivacy.mutate({ visibility: value })}
              className={`w-full min-h-[44px] flex items-start gap-2.5 rounded-control border px-3 py-2 text-left transition-colors ${
                on ? OPTION_ON : OPTION_OFF
              }`}
            >
              <Icon
                className={`w-5 h-5 mt-0.5 shrink-0 ${on ? 'text-brand-emerald' : 'text-white/70'}`}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold">{t(`friends.privacy.${value}`)}</span>
                <span className="block text-xs text-white/70 leading-relaxed">
                  {t(`friends.privacy.${value}Desc`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="flex items-center gap-1.5 text-white font-bold text-sm">
          <LockClosedIcon className="w-4 h-4 text-brand-gold" />
          {t('friends.privacy.secretTitle')}
        </p>
        <p className="text-white/70 text-xs leading-relaxed">{t('friends.privacy.secretDesc')}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SECRET_OPTIONS.map(({ area, Icon }) => {
            const on = isSecret(area);
            return (
              <button
                key={area}
                type="button"
                aria-pressed={on}
                disabled={!privacy || setPrivacy.isPending}
                onClick={() => setPrivacy.mutate({ secret: { [area]: !on } })}
                className={`min-h-[44px] inline-flex items-center gap-2 rounded-control border px-3 py-2 text-xs font-bold transition-colors ${
                  on ? 'bg-brand-gold/10 border-brand-gold text-white' : OPTION_OFF
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-brand-gold' : 'text-white/70'}`} />
                <span className="flex-1 text-left">{t(`friends.privacy.area.${area}`)}</span>
                {on && <LockClosedIcon className="w-3.5 h-3.5 text-brand-gold shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** "What friends see" (U3: its own sheet in the Friends menu). */
function PrivacySheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet onClose={onClose} labelledBy="friends-privacy-title">
      <SheetHeader
        id="friends-privacy-title"
        Icon={EyeIcon}
        title={t('friends.privacy.title')}
        subtitle={t('friends.privacySubtitle')}
        onClose={onClose}
      />
      <PrivacySettingsBlock />
    </Sheet>
  );
}

/** The arch's top-right menu (U3): invite, see friends, what friends see. */
function FriendsMenu({
  onInvite,
  onSeeFriends,
  onPrivacy,
}: {
  onInvite: () => void;
  onSeeFriends: () => void;
  onPrivacy: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items: { Icon: SvgIcon; label: string; onClick: () => void }[] = [
    { Icon: UserPlusIcon, label: t('friends.inviteFriend'), onClick: onInvite },
    { Icon: UsersIcon, label: t('friends.seeFriends'), onClick: onSeeFriends },
    { Icon: EyeIcon, label: t('friends.privacy.title'), onClick: onPrivacy },
  ];

  return (
    <div ref={ref} className="absolute top-3 right-3 z-20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('friends.menu')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-11 h-11 grid place-items-center rounded-full text-white/80 hover:text-white hover:bg-brand-surface border border-transparent hover:border-brand-border transition-colors"
      >
        <EllipsisVerticalIcon className="w-6 h-6" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-64 max-w-[calc(100vw-3rem)] rounded-control border border-brand-border bg-brand-deep shadow-elev-3 p-1.5 text-left"
        >
          {items.map(({ Icon, label, onClick }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 text-left rounded-control text-sm font-semibold text-white/85 hover:text-white hover:bg-brand-surface transition-colors"
            >
              <Icon className="w-5 h-5 text-brand-emerald shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Manage-friends modal: full list, connected-since date, two-step confirm delete. */
function ManageFriendsModal({ onClose }: { onClose: () => void }) {
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

/** One person in the circle. A friend who shares consistency only gets the
 * streak chips; an area a friend keeps secret is simply absent (T3.6). */
type Board = 'today' | 'week' | 'all';

function CircleRow({
  f,
  i,
  board,
  allTime,
  allTimeLoading,
}: {
  f: FriendStats;
  i: number;
  board: Board;
  /** All time tab: this person's all-time Noor (absent: not shared) */
  allTime?: number;
  allTimeLoading: boolean;
}) {
  const { t } = useTranslation();
  const detail = f.visibility === 'detail' && f.score !== undefined;
  const shown = board === 'week' ? (f.weekScore ?? f.score ?? 0) : (f.score ?? 0);
  const week = board === 'week' && f.week ? f.week : null;
  const sv = f.zikrStreak !== undefined ? streakVisual(f.zikrState, f.zikrStreak, t) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + i * 0.04 }}
      className={`${CARD} p-3.5 ${f.isMe ? 'border-brand-emerald/60' : ''}`}
    >
      <div className="flex items-center gap-3">
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
          {/* U3: only ever "on her cycle"; nothing on other days */}
          {f.onCycle === true && (
            <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-semibold text-brand-pink">
              <FlowerIcon className="w-3.5 h-3.5" />
              {t('friends.onCycle', 'on her cycle')}
            </span>
          )}
          {board === 'all' && detail ? (
            <p className="inline-flex items-center gap-1 mt-1 text-xs text-white/70">
              <Star8Icon className="w-3.5 h-3.5 text-brand-gold" />
              {allTime !== undefined ? (
                <b className="text-white text-sm tabular-nums">{formatLocaleNumber(allTime)}</b>
              ) : allTimeLoading ? (
                <span className="loading loading-dots loading-xs text-brand-gold" />
              ) : (
                '-'
              )}{' '}
              {t('friends.allTimeNoor')}
            </p>
          ) : detail ? (
            <>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-track rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, shown))}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.04, ease: 'easeOut' }}
                    className="h-full rounded-full bg-brand-emerald"
                  />
                </div>
                <span className="inline-flex items-center gap-0.5 text-white text-xs font-bold tabular-nums w-12 justify-end">
                  <SparklesIcon className="w-3.5 h-3.5 text-brand-gold" />
                  {formatLocaleNumber(shown)}
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
              {board === 'today' && f.usualScore != null && f.score !== undefined && (
                <p
                  className={`text-[11px] mt-1 inline-flex items-center gap-0.5 ${
                    f.score > f.usualScore ? 'text-brand-emerald font-semibold' : 'text-white/70'
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
            </>
          ) : (
            <p className="text-[11px] mt-0.5 text-white/70">{t('friends.consistencyOnly')}</p>
          )}
        </div>
      </div>
      {/* Stat chips: today's numbers on "Today", week-so-far totals on "This
          week", so the chips always explain the Noor shown. */}
      <div className="flex flex-wrap gap-1.5 mt-2.5 pl-[52px]">
        {sv && (
          <Chip
            Icon={sv.Icon}
            className={`text-white/85 ${sv.cls}`}
            iconClassName={sv.iconCls ?? ''}
          >
            {t('friends.zikrStreakStat', { count: formatLocaleNumber(f.zikrStreak ?? 0) })}
          </Chip>
        )}
        {board === 'all' ? (
          // All time: the Noor number stands alone; only the streaks beside it
          f.quranStreak !== undefined && (
            <Chip Icon={BookOpenIcon}>
              {t('friends.quranStreakStat', { count: formatLocaleNumber(f.quranStreak) })}
            </Chip>
          )
        ) : !detail ? (
          <>
            {f.quranStreak !== undefined && (
              <Chip Icon={BookOpenIcon}>
                {t('friends.quranStreakStat', { count: formatLocaleNumber(f.quranStreak) })}
              </Chip>
            )}
            <Chip Icon={LeafIcon}>
              {t('friends.activeDaysStat', {
                active: formatLocaleNumber(f.activeDays),
                days: formatLocaleNumber(f.weekDays),
              })}
            </Chip>
          </>
        ) : (
          <>
            {/* Someone who shares her cycle status: prayer and fasting are
                paused for her, so those two chips would only confuse. */}
            {!f.onCycle && f.salatToday !== undefined && (
              <Chip Icon={MosqueIcon}>
                {week ? (
                  t('friends.prayersWeekStat', '{{n}} prayers this week', {
                    n: formatLocaleNumber(week.salat ?? 0),
                  })
                ) : (
                  <>
                    {formatLocaleNumber(f.salatToday)}/{formatLocaleNumber(5)}{' '}
                    {t('friends.prayers')}
                  </>
                )}
              </Chip>
            )}
            {f.zikrToday !== undefined && (
              <Chip Icon={TasbihIcon}>
                {week
                  ? t('friends.zikrWeekStat', '{{n}} this week', {
                      n: formatLocaleNumber(week.zikr ?? 0),
                    })
                  : t('friends.zikrTodayStat', { count: formatLocaleNumber(f.zikrToday) })}
              </Chip>
            )}
            {!f.onCycle && f.fastedToday !== undefined && (
              <Chip Icon={CrescentIcon} on={week ? (week.fasts ?? 0) > 0 : f.fastedToday}>
                {week
                  ? t('friends.fastsWeekStat', '{{n}} fasts', {
                      n: formatLocaleNumber(week.fasts ?? 0),
                    })
                  : f.fastedToday
                    ? t('friends.fastingToday')
                    : t('friends.notFasting')}
              </Chip>
            )}
            {f.quranPagesToday !== undefined && (
              <Chip Icon={BookOpenIcon}>
                {week
                  ? t('friends.quranWeekStat', '{{n}} āyāt this week', {
                      n: formatLocaleNumber(week.quran ?? 0),
                    })
                  : t('friends.quranPagesStat', {
                      current: formatLocaleNumber(f.quranPagesToday),
                      goal: formatLocaleNumber(f.quranGoal ?? 0),
                    })}
              </Chip>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function Friends() {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { data, isLoading, isError, refetch } = useSocialSummary();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
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
  // average, so someone who started late (or had a quiet day) still shows effort.
  const [board, setBoard] = useState<Board>('today');
  const allTime = useCircleAllTime(board === 'all');
  // Cycle wording is only ever shown to sisters (the public Privacy page aside).
  const isFemale = useIsFemale();
  // Server order: you first, then friends by longest streak. Never ranked
  // (FIQH-03): ordering by Noor would also reveal the score of anyone who
  // shares consistency only.
  const circle = data?.circle ?? [];
  const friendsCount = Math.max(0, circle.length - 1);

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
            className="relative rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center"
          >
            {!isDemoMode && (
              <FriendsMenu
                onInvite={() => setInviteOpen(true)}
                onSeeFriends={() => setManageOpen(true)}
                onPrivacy={() => setPrivacyOpen(true)}
              />
            )}
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

          {/* The circle */}
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
                  {isDemoMode ? (
                    <span className="text-white/70 text-sm font-normal font-sans">
                      {t(friendsCount === 1 ? 'friends.circleCount' : 'friends.circleCountPlural', {
                        count: friendsCount,
                      })}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setManageOpen(true)}
                      className="text-brand-emerald text-sm font-semibold font-sans underline-offset-2 hover:underline"
                    >
                      {t(friendsCount === 1 ? 'friends.circleCount' : 'friends.circleCountPlural', {
                        count: friendsCount,
                      })}
                    </button>
                  )}
                </h2>
                <div className="flex gap-1.5" role="tablist">
                  {(['today', 'week', 'all'] as const).map((b) => (
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
                        : b === 'week'
                          ? t('friends.boardWeek', 'This week')
                          : t('friends.boardAll')}
                    </button>
                  ))}
                </div>
              </div>

              {circle.map((f, i) => (
                <CircleRow
                  key={f.uid}
                  f={f}
                  i={i}
                  board={board}
                  allTime={allTime.data?.[f.uid]}
                  allTimeLoading={allTime.isLoading}
                />
              ))}

              {/* FIQH-03: the quiet framing under the circle */}
              <figure className="px-2 pt-1 text-center text-xs text-white/70 leading-relaxed">
                <p>{t('friends.framing')}</p>
                <blockquote className="mt-1 italic">{t('friends.framingHadith')}</blockquote>
                <figcaption>
                  <a
                    href="https://sunnah.com/bukhari:6464"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={REF_LINK}
                  >
                    {t('friends.framingRef')}
                  </a>
                </figcaption>
              </figure>
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
                  <code className="flex-1 min-w-0 truncate px-3 py-2.5 rounded-control bg-shade/20 border border-brand-border text-brand-emerald text-xs">
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
        {privacyOpen && <PrivacySheet onClose={() => setPrivacyOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {requestsOpen && <PendingRequestsModal onClose={() => setRequestsOpen(false)} />}
      </AnimatePresence>
    </AnimatedBackground>
  );
}
