import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { LeafIcon } from '../icons/IslamicIcons.js';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY, CARD, REF_LINK, SECTION_TITLE } from '../bustanStyles.js';
import type { FriendStats, useCircleAllTime } from '../../hooks/useSocial.js';
import { CircleRow, type Board } from './CircleRow.js';
import { OPTION_OFF, OPTION_ON, Spinner } from './friendsParts.js';

/** The circle: loading, nobody yet, or the leaderboard with its Today / week / all-time tabs. */
export function FriendsCircleSection({
  isLoading,
  friendsCount,
  isDemoMode,
  circle,
  board,
  setBoard,
  allTime,
  onInvite,
  onManage,
  onNudge,
}: {
  isLoading: boolean;
  friendsCount: number;
  isDemoMode: boolean;
  circle: FriendStats[];
  board: Board;
  setBoard: (b: Board) => void;
  allTime: ReturnType<typeof useCircleAllTime>;
  onInvite: () => void;
  onManage: () => void;
  onNudge: (f: FriendStats) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
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
            <button type="button" onClick={() => onInvite()} className={BTN_PRIMARY}>
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
                  onClick={() => onManage()}
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
              onNudge={isDemoMode ? undefined : onNudge}
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
    </>
  );
}
