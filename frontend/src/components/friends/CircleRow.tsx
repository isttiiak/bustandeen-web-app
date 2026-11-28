import type React from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import {
  ArrowUpIcon,
  BookOpenIcon,
  CheckIcon,
  HandRaisedIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { streakVisual } from '../StatusBadges.js';
import { CountryFlag } from '../profile/profileParts.js';
import { CARD } from '../bustanStyles.js';
import {
  CrescentIcon,
  FlowerIcon,
  LeafIcon,
  MosqueIcon,
  Star8Icon,
  TasbihIcon,
} from '../icons/IslamicIcons.js';
import type { FriendStats } from '../../hooks/useSocial.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { Avatar, type SvgIcon } from './friendsParts.js';

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
export type Board = 'today' | 'week' | 'all';

export function CircleRow({
  f,
  i,
  board,
  allTime,
  allTimeLoading,
  onNudge,
}: {
  f: FriendStats;
  i: number;
  board: Board;
  /** All time tab: this person's all-time Noor (absent: not shared) */
  allTime?: number;
  allTimeLoading: boolean;
  /** Opens the nudge sheet for a quiet friend. Absent in demo mode. */
  onNudge?: (f: FriendStats) => void;
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
        {/* A friend with no active day this week can be nudged, once a day */}
        {f.canNudge && onNudge && !f.isMe && (
          <button
            type="button"
            onClick={() => onNudge(f)}
            disabled={f.nudged}
            aria-label={
              f.nudged
                ? t('friends.nudge.sentAria', 'You nudged {{name}} today', { name: f.displayName })
                : t('friends.nudge.buttonAria', 'Nudge {{name}}', { name: f.displayName })
            }
            className={`shrink-0 inline-flex items-center gap-1 min-h-[44px] rounded-control border px-3 text-xs font-bold transition-colors ${
              f.nudged
                ? 'border-brand-border text-white/60 cursor-default'
                : 'border-brand-gold/50 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20'
            }`}
          >
            {f.nudged ? (
              <CheckIcon className="w-4 h-4" aria-hidden="true" />
            ) : (
              <HandRaisedIcon className="w-4 h-4" aria-hidden="true" />
            )}
            {f.nudged ? t('friends.nudge.sent', 'Nudged') : t('friends.nudge.button', 'Nudge')}
          </button>
        )}
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
