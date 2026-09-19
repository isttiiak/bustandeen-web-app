import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { streakVisual } from '../components/StatusBadges.js';
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

const COUNTRY_CODES: Record<string, string> = {
  Afghanistan: 'AF',
  Algeria: 'DZ',
  Australia: 'AU',
  Azerbaijan: 'AZ',
  Bangladesh: 'BD',
  Belgium: 'BE',
  'Bosnia and Herzegovina': 'BA',
  Brazil: 'BR',
  Brunei: 'BN',
  Canada: 'CA',
  China: 'CN',
  Egypt: 'EG',
  France: 'FR',
  Germany: 'DE',
  Ghana: 'GH',
  India: 'IN',
  Indonesia: 'ID',
  Iran: 'IR',
  Iraq: 'IQ',
  Jordan: 'JO',
  Kazakhstan: 'KZ',
  Kenya: 'KE',
  Kuwait: 'KW',
  Kyrgyzstan: 'KG',
  Lebanon: 'LB',
  Libya: 'LY',
  Malaysia: 'MY',
  Maldives: 'MV',
  Mali: 'ML',
  Mauritania: 'MR',
  Morocco: 'MA',
  Netherlands: 'NL',
  Niger: 'NE',
  Nigeria: 'NG',
  Oman: 'OM',
  Pakistan: 'PK',
  Palestine: 'PS',
  Philippines: 'PH',
  Qatar: 'QA',
  Russia: 'RU',
  'Saudi Arabia': 'SA',
  Senegal: 'SN',
  'Sierra Leone': 'SL',
  Somalia: 'SO',
  'South Africa': 'ZA',
  Spain: 'ES',
  Sudan: 'SD',
  Syria: 'SY',
  Tajikistan: 'TJ',
  Tanzania: 'TZ',
  Tunisia: 'TN',
  Turkey: 'TR',
  Turkmenistan: 'TM',
  Uganda: 'UG',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
  Uzbekistan: 'UZ',
  Yemen: 'YE',
};

function CountryFlag({ country }: { country?: string }) {
  if (!country) return null;
  const code = COUNTRY_CODES[country]?.toLowerCase();
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/w20/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 2x`}
      width="16"
      alt={country}
      title={country}
      className="inline-block rounded-sm align-middle ml-1.5 shrink-0"
    />
  );
}

const RANK_BADGE = ['🥇', '🥈', '🥉'];

function Avatar({
  name,
  photoUrl,
  size = 'w-10 h-10',
}: {
  name: string;
  photoUrl?: string;
  size?: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${size} rounded-full object-cover ring-2 ring-white/15 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full bg-brand-emerald/20 ring-2 ring-brand-emerald/30 grid place-items-center shrink-0`}
    >
      <span className="text-sm font-black text-brand-emerald">
        {name?.[0]?.toUpperCase() ?? '؟'}
      </span>
    </div>
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

/** Incoming friend requests — accept/reject people who opened my invite link. */
function PendingRequestsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { data: requests, isLoading } = usePendingRequests(true);
  const accept = useAcceptRequest();
  const reject = useRejectRequest();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 26 }}
        className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-emerald/30 space-y-4 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🤝</span>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">
                {t('friends.requestsTitle')}
              </h3>
              <p className="text-white/30 text-[11px]">{t('friends.requestsSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-white/30 hover:text-white p-1"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-8">
            <span className="loading loading-spinner text-brand-emerald" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="text-center py-6 space-y-1.5">
            <p className="text-3xl">📭</p>
            <p className="text-white/50 text-sm">{t('friends.noRequests')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.uid}
                className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-3 flex items-center gap-3"
              >
                <Avatar name={r.displayName} photoUrl={r.photoUrl} />
                <p className="flex-1 min-w-0 text-white font-bold text-sm truncate">
                  {r.displayName}
                </p>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => reject.mutate(r.uid)}
                    disabled={reject.isPending || accept.isPending}
                    className="btn btn-xs bg-white/10 hover:bg-white/20 text-white/60 border-0"
                  >
                    {t('friends.reject')}
                  </button>
                  <button
                    onClick={() => accept.mutate(r.uid)}
                    disabled={reject.isPending || accept.isPending}
                    className="btn btn-xs bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0"
                  >
                    {t('friends.accept')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
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
  // Two-step confirm: null → "confirm-1" (Remove?) → "confirm-2" (Are you sure?) → delete
  const [confirmStep, setConfirmStep] = useState<{ uid: string; step: 1 | 2 } | null>(null);
  // Block only needs one confirm step — it's already the more protective action
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 26 }}
        className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-emerald/30 space-y-4 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">👥</span>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">
                {t('friends.yourFriends')}
              </h3>
              <p className="text-white/30 text-[11px]">
                {friends
                  ? t('friends.connectedCount', { count: friends.length })
                  : t('common.loading')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-white/30 hover:text-white p-1"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-8">
            <span className="loading loading-spinner text-brand-emerald" />
          </div>
        ) : !friends || friends.length === 0 ? (
          <div className="text-center py-6 space-y-1.5">
            <p className="text-3xl">🌱</p>
            <p className="text-white/50 text-sm">{t('friends.noFriendsYet')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => {
              const confirming = confirmStep?.uid === f.uid;
              const blockConfirming = blockConfirmUid === f.uid;
              return (
                <div
                  key={f.uid}
                  className={`rounded-2xl border p-3 transition-colors ${
                    confirming || blockConfirming
                      ? 'border-red-500/40 bg-red-500/[0.06]'
                      : 'border-brand-emerald/10 bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={f.displayName} photoUrl={f.photoUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{f.displayName}</p>
                      <p className="text-white/30 text-[11px] truncate">
                        {formatConnectedSince(f.connectedSince, t)}
                      </p>
                    </div>
                    {!confirming && !blockConfirming && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => setBlockConfirmUid(f.uid)}
                          aria-label={t('friends.blockFriendAria', { name: f.displayName })}
                          title={t('friends.blockFriendTooltip')}
                          className="p-1.5 sm:p-2 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                        >
                          <NoSymbolIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startConfirm(f.uid)}
                          aria-label={t('friends.removeFriendAria', { name: f.displayName })}
                          title={t('friends.removeFriendTooltip')}
                          className="p-1.5 sm:p-2 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {blockConfirming && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-red-500/20 space-y-2">
                          <p className="text-red-300/90 text-xs font-semibold">
                            {t('friends.blockWarning', { name: f.displayName })}
                          </p>
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => setBlockConfirmUid(null)}
                              className="btn btn-xs btn-ghost text-white/50"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              onClick={() => finalizeBlock(f.uid)}
                              disabled={blockUser.isPending}
                              className="btn btn-xs bg-red-500 hover:bg-red-600 text-white border-0"
                            >
                              {blockUser.isPending ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                t('friends.yesBlock')
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {confirming && confirmStep?.step === 1 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-brand-emerald/10 flex items-center justify-between gap-2">
                          <p className="text-white/60 text-xs">
                            {t('friends.removeConfirm', { name: f.displayName })}
                          </p>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={cancelConfirm}
                              className="btn btn-xs btn-ghost text-white/50"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              onClick={() => advanceConfirm(f.uid)}
                              className="btn btn-xs bg-red-500/80 hover:bg-red-500 text-white border-0"
                            >
                              {t('common.remove')}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {confirming && confirmStep?.step === 2 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-red-500/20 space-y-2">
                          <p className="text-red-300/90 text-xs font-semibold">
                            {t('friends.removeWarning', { name: f.displayName })}
                          </p>
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={cancelConfirm}
                              className="btn btn-xs btn-ghost text-white/50"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              onClick={() => finalizeRemove(f.uid)}
                              disabled={unfriend.isPending}
                              className="btn btn-xs bg-red-500 hover:bg-red-600 text-white border-0"
                            >
                              {unfriend.isPending ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                t('friends.yesRemove')
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Privacy: full leaderboard opt-out ── */}
        <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-3 flex items-center gap-3">
          <EyeSlashIcon className="w-5 h-5 text-white/40 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">{t('friends.invisibleTitle')}</p>
            <p className="text-white/30 text-[11px] leading-relaxed">
              {t('friends.invisibleDesc')}
            </p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-success shrink-0"
            checked={summary?.invisible ?? false}
            disabled={setInvisible.isPending}
            onChange={(e) => setInvisible.mutate(e.target.checked)}
            aria-label={t('friends.invisibleTitle')}
          />
        </div>

        {/* ── Blocked users ── */}
        <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] overflow-hidden">
          <button
            onClick={() => setBlockedListOpen((o) => !o)}
            className="w-full px-3 py-2.5 flex items-center justify-between text-left"
            aria-expanded={blockedListOpen}
          >
            <p className="text-white/60 font-bold text-xs">
              🚫 {t('friends.blockedUsers')}
              {blocked && blocked.length > 0 ? ` (${formatLocaleNumber(blocked.length)})` : ''}
            </p>
            <motion.span animate={{ rotate: blockedListOpen ? 180 : 0 }} className="text-white/30">
              <ChevronDownIcon className="w-4 h-4" />
            </motion.span>
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
                <div className="px-3 pb-3 pt-1 border-t border-brand-emerald/5 space-y-1.5">
                  {blockedLoading ? (
                    <div className="grid place-items-center py-3">
                      <span className="loading loading-spinner loading-sm text-brand-emerald" />
                    </div>
                  ) : !blocked || blocked.length === 0 ? (
                    <p className="text-white/30 text-xs py-2 text-center">
                      {t('friends.noBlockedUsers', "You haven't blocked anyone.")}
                    </p>
                  ) : (
                    blocked.map((b) => (
                      <div key={b.uid} className="flex items-center gap-2.5 py-1.5">
                        <Avatar name={b.displayName} photoUrl={b.photoUrl} size="w-7 h-7" />
                        <p className="flex-1 min-w-0 text-white/70 text-xs font-semibold truncate">
                          {b.displayName}
                        </p>
                        <button
                          onClick={() => unblockUser.mutate(b.uid)}
                          disabled={unblockUser.isPending}
                          className="btn btn-xs bg-white/10 hover:bg-white/20 text-white/60 border-0 shrink-0"
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
      </motion.div>
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
  const maxScore = Math.max(1, ...leaderboard.map(shownScore));

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('friends.srTitle')}</h1>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl mx-auto space-y-4">
          {/* ── Verse banner ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4 space-y-1.5"
          >
            <motion.p
              className="text-xl sm:text-2xl font-black leading-snug bg-gradient-to-r from-brand-emerald via-brand-info to-brand-gold bg-clip-text text-transparent"
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              style={{ backgroundSize: '200% 100%' }}
            >
              {t('friends.verseCompete')}
            </motion.p>
            <a
              href="https://quran.com/2/148"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold/60 text-xs underline underline-offset-4 hover:text-brand-gold/90"
            >
              {t('friends.quranRef')}
            </a>
          </motion.div>

          {/* ── Pending friend requests — shown regardless of friend count ── */}
          {!isDemoMode && !!data?.pendingCount && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setRequestsOpen(true)}
              className="w-full flex items-center gap-2.5 rounded-2xl border border-brand-gold/30 bg-brand-gold/[0.08] px-4 py-3 text-left hover:bg-brand-gold/[0.12] transition-colors"
            >
              <BellIcon className="w-5 h-5 text-brand-gold shrink-0" />
              <span className="flex-1 text-sm font-bold text-brand-gold">
                {t(
                  data.pendingCount === 1 ? 'friends.pendingCount' : 'friends.pendingCountPlural',
                  { count: data.pendingCount }
                )}
              </span>
              <span className="text-brand-gold/60 text-xs font-bold">
                {t('friends.viewRequests')}
              </span>
            </motion.button>
          )}

          {/* ── Leaderboard ── */}
          {isLoading ? (
            <div className="min-h-[30vh] grid place-items-center">
              <span className="loading loading-spinner loading-lg text-brand-emerald" />
            </div>
          ) : friendsCount === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-8 text-center space-y-3"
            >
              <p className="text-4xl">🌱</p>
              <p className="text-white/70 font-bold text-sm">{t('friends.noFriendsTitle')}</p>
              <p className="text-white/30 text-xs max-w-xs mx-auto leading-relaxed">
                {t('friends.noFriendsDesc')}
              </p>
              <button
                onClick={() => setInviteOpen(true)}
                className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 gap-1.5"
              >
                <UserPlusIcon className="w-4 h-4" /> {t('friends.connectFriend')}
              </button>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-white/30 text-xs font-semibold uppercase tracking-wide">
                  {t('friends.todaysCircle')}{' '}
                  <span className="normal-case font-normal">
                    —{' '}
                    {t(friendsCount === 1 ? 'friends.circleCount' : 'friends.circleCountPlural', {
                      count: friendsCount,
                    })}
                  </span>
                </p>
                <div className="flex items-center gap-3 shrink-0">
                  {!isDemoMode && (
                    <button
                      onClick={() => setManageOpen(true)}
                      className="flex items-center gap-1 text-white/40 hover:text-white text-xs font-bold"
                    >
                      <UsersIcon className="w-3.5 h-3.5" /> {t('friends.seeFriends')}
                    </button>
                  )}
                  <button
                    onClick={() => (isDemoMode ? void null : setInviteOpen(true))}
                    className="flex items-center gap-1 text-brand-emerald/70 hover:text-brand-emerald text-xs font-bold"
                  >
                    <UserPlusIcon className="w-3.5 h-3.5" /> {t('friends.inviteFriend')}
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 px-1" role="tablist">
                {(['today', 'week'] as const).map((b) => (
                  <button
                    key={b}
                    role="tab"
                    aria-selected={board === b}
                    onClick={() => setBoard(b)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                      board === b
                        ? 'bg-brand-emerald/20 border-brand-emerald/40 text-brand-emerald'
                        : 'bg-white/5 border-brand-emerald/10 text-white/40 hover:text-white/70'
                    }`}
                  >
                    {b === 'today'
                      ? t('friends.boardToday', 'Today')
                      : t('friends.boardWeek', 'This week')}
                  </button>
                ))}
              </div>
              {leaderboard.map((f, i) => {
                const sv = streakVisual(f.zikrState, f.zikrStreak, t);
                return (
                  <motion.div
                    key={f.uid}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.06 }}
                    className={`rounded-2xl border p-3.5 ${
                      f.isMe
                        ? 'border-brand-emerald/40 bg-brand-emerald/10'
                        : 'border-brand-emerald/10 bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 text-center text-lg font-black shrink-0">
                        {RANK_BADGE[i] ?? (
                          <span className="text-white/30 text-sm">{formatLocaleNumber(i + 1)}</span>
                        )}
                      </span>
                      <Avatar name={f.displayName} photoUrl={f.photoUrl} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">
                          {f.displayName}
                          <CountryFlag country={f.country} />
                          {f.isMe && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-brand-emerald/25 text-brand-emerald align-middle">
                              {t('friends.you')}
                            </span>
                          )}
                          {f.onCycle !== undefined && (
                            <span
                              className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full align-middle ${
                                f.onCycle
                                  ? 'bg-brand-pink/25 text-brand-pink'
                                  : 'bg-white/10 text-white/40'
                              }`}
                            >
                              {f.onCycle
                                ? t('friends.onCycle', '🌸 on her cycle')
                                : t('friends.notOnCycle', 'not on her cycle')}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(shownScore(f) / maxScore) * 100}%` }}
                              transition={{
                                duration: 0.7,
                                delay: 0.15 + i * 0.06,
                                ease: 'easeOut',
                              }}
                              className={`h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-brand-gold to-brand-gold' : 'bg-brand-emerald/80'}`}
                            />
                          </div>
                          <span className="text-white/70 text-xs font-black tabular-nums w-10 text-right">
                            ✨{formatLocaleNumber(shownScore(f))}
                          </span>
                        </div>
                        {board === 'today' && f.usualScore != null && (
                          <p
                            className={`text-[10px] mt-1 ${
                              f.score > f.usualScore ? 'text-brand-emerald/80' : 'text-white/25'
                            }`}
                          >
                            {f.score > f.usualScore
                              ? t('friends.aboveUsual', '▲ {{n}} above their usual', {
                                  n: formatLocaleNumber(f.score - f.usualScore),
                                })
                              : t('friends.usualNoor', 'usually ✨{{n}}', {
                                  n: formatLocaleNumber(f.usualScore),
                                })}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Stat chips — prayer, zikr streak, today's zikr, fasted today, quran pages */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5 pl-10">
                      {/* Someone who shares her cycle status: prayer and fasting are
                          paused for her, so those two chips would only confuse. */}
                      {!f.onCycle && (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 border border-brand-emerald/10 text-[10px] font-bold text-white/60">
                          🕌 {formatLocaleNumber(f.salatToday)}
                          <span className="text-white/35">/{formatLocaleNumber(5)}</span>{' '}
                          {t('friends.prayers')}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold text-white/70 ${sv.cls}`}
                      >
                        <span className={sv.iconCls}>{sv.icon}</span>{' '}
                        {t('friends.zikrStreakStat', { count: formatLocaleNumber(f.zikrStreak) })}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 border border-brand-emerald/10 text-[10px] font-bold text-white/60">
                        📿 {t('friends.zikrTodayStat', { count: formatLocaleNumber(f.zikrToday) })}
                      </span>
                      {!f.onCycle && (
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            f.fastedToday
                              ? 'bg-brand-gold/15 border-brand-gold/40 text-brand-gold'
                              : 'bg-white/10 border-brand-emerald/10 text-white/30'
                          }`}
                        >
                          🌙 {f.fastedToday ? t('friends.fastingToday') : t('friends.notFasting')}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-white/10 border border-brand-emerald/10 text-[10px] font-bold text-white/60">
                        📖{' '}
                        {t('friends.quranPagesStat', {
                          current: formatLocaleNumber(f.quranPagesToday),
                          goal: formatLocaleNumber(f.quranGoal),
                        })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── How Noor works ── */}
          <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] overflow-hidden">
            <button
              onClick={() => setHowOpen(!howOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
              aria-expanded={howOpen}
            >
              <p className="text-white/60 font-bold text-sm">✨ {t('friends.whatIsNoor')}</p>
              <motion.span animate={{ rotate: howOpen ? 180 : 0 }} className="text-white/30">
                <ChevronDownIcon className="w-4 h-4" />
              </motion.span>
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
                  <div className="px-4 pb-4 pt-1 space-y-1.5 text-xs text-white/40 border-t border-brand-emerald/5">
                    <p>
                      {t(
                        'friends.noorIntro',
                        'Your Noor starts at 0 every day and only ever goes up. Up to 100:'
                      )}
                    </p>
                    <p>
                      🕌 <b className="text-white/60">{formatLocaleNumber(50)}</b>{' '}
                      {t(
                        'friends.noorPrayersV2',
                        'Prayers: 10 for each of the five fard (kaza counts)'
                      )}
                    </p>
                    <p>
                      📿 <b className="text-white/60">{formatLocaleNumber(15)}</b>{' '}
                      {t('friends.noorZikrV2', "Dhikr: today's count against your own daily goal")}
                    </p>
                    <p>
                      📖 <b className="text-white/60">{formatLocaleNumber(15)}</b>{' '}
                      {t(
                        'friends.noorQuranV2',
                        'Quran: reading or listening against your own daily goal'
                      )}
                    </p>
                    <p>
                      🌱 <b className="text-white/60">{formatLocaleNumber(10)}</b>{' '}
                      {t(
                        'friends.noorSteady',
                        'Steadiness: 1 for each day in a row you show up, up to 10, once you have done something today'
                      )}
                    </p>
                    <p>
                      🌙 <b className="text-white/60">{formatLocaleNumber(10)}</b>{' '}
                      {t(
                        'friends.noorExtras',
                        'Extras, 5 each (best two): a completed fast, nafl prayer, ṣalawāt or istighfār'
                      )}
                    </p>
                    {isFemale && (
                      <p className="pt-1">
                        🌸{' '}
                        {t(
                          'friends.noorExcusedV2',
                          'Rayhanah days (for sisters): prayer and fasting are excused, not lost. Dhikr and Quran count for more, and Noor still reaches 100.'
                        )}
                      </p>
                    )}
                    <p className="pt-1">
                      <b className="text-white/60">{t('friends.boardToday', 'Today')}</b>{' '}
                      {t('friends.noorTodayDesc')}{' '}
                      <b className="text-white/60">{t('friends.boardWeek', 'This week')}</b>{' '}
                      {t(
                        'friends.noorWeekDesc',
                        '= your average daily Noor since Friday; a day with nothing counts 0.'
                      )}{' '}
                      <b className="text-white/60">{t('friends.noorAllTimeLabel')}</b>{' '}
                      {t('friends.noorAllTimeDesc')}
                    </p>
                    <p>
                      {t(
                        'friends.noorUsualDesc',
                        '"Above their usual" compares today with the average of their recent active days, so everyone races their own best.'
                      )}
                    </p>
                    <p className="text-white/25 pt-1 italic">{t('friends.noorDisclaimer')}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Invite modal ── */}
      <AnimatePresence>
        {inviteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setInviteOpen(false);
            }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26 }}
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-emerald/30 space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">🤝</span>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight">
                      {t('friends.connectFriend')}
                    </h3>
                    <p className="text-white/30 text-[11px]">{t('friends.inviteSubtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInviteOpen(false)}
                  aria-label={t('common.close')}
                  className="text-white/30 hover:text-white p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <p className="text-center text-sm font-bold text-brand-emerald/90 italic px-2">
                {t('friends.verseCompete')}
                <a
                  href="https://quran.com/2/148"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-brand-gold/60 text-[10px] underline not-italic mt-1"
                >
                  {t('friends.quranRef')}
                </a>
              </p>

              {isError ? (
                <div className="text-center space-y-3 py-2">
                  <p className="text-brand-gold/80 text-sm">{t('friends.inviteError')}</p>
                  <button
                    onClick={() => void refetch()}
                    className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0"
                  >
                    {t('friends.tryAgain')}
                  </button>
                </div>
              ) : inviteLink ? (
                <>
                  <div className="flex gap-2">
                    <code className="flex-1 min-w-0 truncate px-3 py-2.5 rounded-xl bg-black/30 border border-brand-emerald/10 text-brand-emerald/90 text-xs">
                      {inviteLink}
                    </code>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => void copyLink()}
                      className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 gap-1.5 shrink-0 h-auto"
                    >
                      {copied ? (
                        <CheckIcon className="w-4 h-4" />
                      ) : (
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      )}
                      {copied ? t('friends.copied') : t('friends.copy')}
                    </motion.button>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-white/40 leading-relaxed">
                    <p>📤 {t('friends.inviteShareTip')}</p>
                    <p>🔗 {t('friends.inviteLinkTip')}</p>
                    <p>🔒 {t('friends.invitePrivacy')}</p>
                  </div>
                </>
              ) : (
                <div className="grid place-items-center py-4">
                  <span className="loading loading-spinner text-brand-emerald" />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Manage friends modal ── */}
      <AnimatePresence>
        {manageOpen && <ManageFriendsModal onClose={() => setManageOpen(false)} />}
      </AnimatePresence>

      {/* ── Pending requests modal ── */}
      <AnimatePresence>
        {requestsOpen && <PendingRequestsModal onClose={() => setRequestsOpen(false)} />}
      </AnimatePresence>
    </AnimatedBackground>
  );
}
