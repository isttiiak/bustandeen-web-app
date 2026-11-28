import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { REF_LINK } from '../components/bustanStyles.js';
import { BellIcon, UsersIcon } from '@heroicons/react/24/outline';
import { FriendsCircleSection } from '../components/friends/FriendsCircleSection.js';
import { FriendsInviteSheet } from '../components/friends/FriendsInviteSheet.js';
import { FriendsMenu } from '../components/friends/FriendsMenu.js';
import { ManageFriendsModal } from '../components/friends/ManageFriendsModal.js';
import { NoorHowItWorks } from '../components/friends/NoorHowItWorks.js';
import { PendingRequestsModal } from '../components/friends/PendingRequestsModal.js';
import { NudgeSheet } from '../components/friends/NudgeSheet.js';
import { PrivacySheet } from '../components/friends/PrivacySheet.js';
import { useFriendsPage } from '../components/friends/useFriendsPage.js';
import { useAuthStore } from '../store/useAuthStore.js';

export default function Friends() {
  const { t } = useTranslation();
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const {
    data,
    isLoading,
    isError,
    refetch,
    inviteOpen,
    setInviteOpen,
    manageOpen,
    setManageOpen,
    privacyOpen,
    setPrivacyOpen,
    requestsOpen,
    setRequestsOpen,
    nudgeTarget,
    setNudgeTarget,
    copied,
    inviteLink,
    copyLink,
    board,
    setBoard,
    allTime,
    circle,
    friendsCount,
  } = useFriendsPage();

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

          <FriendsCircleSection
            isLoading={isLoading}
            friendsCount={friendsCount}
            isDemoMode={isDemoMode}
            circle={circle}
            board={board}
            setBoard={setBoard}
            allTime={allTime}
            onInvite={() => setInviteOpen(true)}
            onManage={() => setManageOpen(true)}
            onNudge={setNudgeTarget}
          />

          {/* How Noor works */}
          <NoorHowItWorks />
        </div>
      </div>

      {/* Invite dialog */}
      <AnimatePresence>
        {inviteOpen && (
          <FriendsInviteSheet
            onClose={() => setInviteOpen(false)}
            isError={isError}
            refetch={refetch}
            inviteLink={inviteLink}
            copied={copied}
            copyLink={copyLink}
          />
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

      <AnimatePresence>
        {nudgeTarget && <NudgeSheet friend={nudgeTarget} onClose={() => setNudgeTarget(null)} />}
      </AnimatePresence>
    </AnimatedBackground>
  );
}
