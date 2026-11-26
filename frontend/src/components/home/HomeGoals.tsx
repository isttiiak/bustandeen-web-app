import type React from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BookOpenIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CrescentIcon, MosqueIcon, TasbihIcon } from '../icons/IslamicIcons.js';
import { GoalBadge, StreakBadge } from '../StatusBadges.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { orderByFocus, type Habit } from '../../utils/onboarding.js';
import type { HomeState } from './useHomeData.js';

interface ActivityItem {
  id: string;
  icon: (p: { className?: string }) => React.ReactNode;
  title: string;
  stats: { label: string; value: string | number };
  link: string;
  accent: string;
  border: string;
  tag?: string;
  streakCount?: number | null;
  goalCompleted?: boolean;
  /** 0-100 for the goal bar, when the activity has a daily goal. */
  progress?: number | null;
}

/** Today's goals: rows in their own order (Settings → Home), each with its badges. */
export function HomeGoals({ home }: { home: HomeState }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    goals,
    analyticsData,
    effectiveToday,
    streakCount,
    goalCompleted,
    zikrGoalPct,
    isNewSalatUser,
    salatCompletedToday,
    salatAnalytics,
    fastingSummary,
    quranSummary,
    cycleActive,
    ramadan,
  } = home;

  const activities: ActivityItem[] = [
    {
      id: 'zikr',
      icon: TasbihIcon,
      title: t('home.zikrTitle'),
      stats: { label: t('home.today'), value: formatLocaleNumber(effectiveToday) },
      link: '/zikr',
      accent: 'brand-emerald',
      border: 'border-brand-emerald/15',
      streakCount,
      goalCompleted,
      progress: zikrGoalPct,
    },
    {
      id: 'salat',
      icon: MosqueIcon,
      title: t('home.salatTitle'),
      stats: cycleActive
        ? { label: t('home.rayhanah'), value: t('home.excused') }
        : isNewSalatUser
          ? { label: t('home.today'), value: t('home.salatStart', 'Tap to begin') }
          : {
              label: t('home.today'),
              value:
                salatCompletedToday !== null
                  ? `${formatLocaleNumber(salatCompletedToday)}/${formatLocaleNumber(5)}`
                  : `-/${formatLocaleNumber(5)}`,
            },
      link: '/salat',
      progress:
        !cycleActive && salatCompletedToday !== null
          ? Math.round((salatCompletedToday / 5) * 100)
          : null,
      accent: 'brand-info',
      border: 'border-brand-info/15',
      tag: salatAnalytics?.currentStreak
        ? `${formatLocaleNumber(salatAnalytics.currentStreak)}${t('home.daySuffix', 'd')} · ${t('home.all5', 'all 5')}`
        : undefined,
    },
    {
      id: 'fasting',
      icon: CrescentIcon,
      title: t('home.fastingTitle'),
      stats: cycleActive
        ? { label: t('home.rayhanah'), value: t('home.excused') }
        : {
            label: t('home.thisMonth'),
            value: fastingSummary
              ? `${formatLocaleNumber(fastingSummary.stats.thisMonth)} ${t('home.fasts')}`
              : '-',
          },
      link: '/fasting',
      accent: 'brand-gold',
      border: 'border-brand-gold/15',
    },
    {
      id: 'quran',
      icon: BookOpenIcon,
      title: t('home.quranTitle'),
      stats: {
        label: t('home.today'),
        value: quranSummary
          ? `${formatLocaleNumber(quranSummary.todayAyat)}/${formatLocaleNumber(quranSummary.profile.dailyGoalAyat)} āyāt`
          : '-',
      },
      link: '/quran',
      accent: 'brand-info',
      border: 'border-brand-info/15',
      streakCount: quranSummary?.streak ?? null,
      progress:
        quranSummary && quranSummary.profile.dailyGoalAyat > 0
          ? Math.min(
              100,
              Math.round((quranSummary.todayAyat / quranSummary.profile.dailyGoalAyat) * 100)
            )
          : null,
    },
  ];

  return (
    <>
      {goals.shown && (
        <>
          <h2 className="font-display text-base font-semibold text-white mb-2">
            {t('home.goalsTitle', "Today's goals")}
          </h2>
          <div className="grid gap-3 mb-2" data-testid="today-goals">
            {orderByFocus(
              activities.filter((a) => goals.rows.includes(a.id as Habit)),
              goals.rows
            ).map((a) => {
              const isZikr = a.id === 'zikr';
              const Icon = a.icon;
              return (
                <Link key={a.id} to={a.link} className="block group">
                  <div className="h-full rounded-card border border-brand-border/70 bg-brand-deep shadow-elev-1 p-3.5 sm:p-4 hover:border-brand-emerald/40 hover:shadow-hover transition-[border-color,box-shadow]">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 shrink-0 text-brand-emerald" />
                      <h3 className="font-display text-sm sm:text-base font-semibold text-white flex-1 min-w-0 truncate">
                        {a.title}
                      </h3>
                      <ChevronRightIcon className="w-4 h-4 shrink-0 text-white/40 group-hover:text-white/70 transition-colors" />
                    </div>
                    <div className="flex items-baseline flex-wrap gap-x-2">
                      <span className="font-display text-xl sm:text-2xl font-semibold text-white tabular-nums">
                        {a.stats.value}
                      </span>
                      <span className="text-white/50 text-[11px] font-semibold uppercase tracking-wide">
                        {a.stats.label}
                      </span>
                    </div>
                    {a.progress != null && (
                      <div
                        className="h-1.5 rounded-full bg-brand-border overflow-hidden mt-2"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={a.progress}
                        aria-label={a.title}
                      >
                        <span
                          className="block h-full bg-brand-emerald rounded-full"
                          style={{ width: `${a.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Badges: streak, goal, Ramadan */}
                    {goals.badges &&
                      (isZikr || a.id === 'quran' || a.tag || a.id === 'fasting') && (
                        <div className="mt-2.5 pt-2 border-t border-brand-border/60 flex flex-wrap items-center gap-1.5">
                          {isZikr && (
                            <>
                              <StreakBadge
                                streak={a.streakCount ?? 0}
                                state={analyticsData?.streak?.state}
                                size="sm"
                              />
                              <GoalBadge pct={zikrGoalPct} met={goalCompleted} size="sm" />
                            </>
                          )}
                          {/* A streak is only meaningful against a goal the user
                          actually set: with none, "streak" would just be
                          "days read at all," which isn't what this badge
                          communicates elsewhere (zikr/salat always have an
                          implicit goal). */}
                          {a.id === 'quran' &&
                            quranSummary &&
                            quranSummary.profile.dailyGoalAyat > 0 && (
                              <StreakBadge
                                streak={quranSummary.streak}
                                state={quranSummary.streak > 0 ? 'active' : 'none'}
                                size="sm"
                              />
                            )}
                          {a.tag && (
                            <StreakBadge
                              streak={salatAnalytics?.currentStreak ?? 0}
                              state={salatAnalytics?.currentStreak ? 'active' : 'none'}
                              size="sm"
                            />
                          )}
                          {a.id === 'fasting' && (
                            <button
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-control text-[11px] font-bold text-brand-gold border border-brand-gold/40 bg-brand-gold/10 hover:bg-brand-gold/20 transition-colors"
                              title={
                                ramadan.active ? 'Open the Ramadan tracker' : 'Countdown to Ramadan'
                              }
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate('/ramadan');
                              }}
                            >
                              <CrescentIcon className="w-3.5 h-3.5" />
                              {ramadan.active
                                ? t('home.ramadanDay', {
                                    day: formatLocaleNumber(ramadan.todayNumber ?? 0),
                                  })
                                : t('home.ramadanIn', {
                                    days: formatLocaleNumber(ramadan.daysUntil),
                                  })}
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
