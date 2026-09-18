import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { useZikrStore } from '../store/useZikrStore.js';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { useSalatLog, useSalatAnalytics } from '../hooks/useSalatLog.js';
import { useFastingSummary } from '../hooks/useFasting.js';
import { useQuranSummary } from '../hooks/useQuran.js';
import { StreakBadge, GoalBadge } from '../components/StatusBadges.js';
import ComebackNudge from '../components/ComebackNudge.js';
import NaseehInsights from '../components/ai/NaseehInsights.js';
import MuhasabahReport from '../components/ai/MuhasabahReport.js';
import NaturalLogEntry from '../components/ai/NaturalLogEntry.js';
import StreakCoaching from '../components/ai/StreakCoaching.js';
import AnimatedBackground from '../components/AnimatedBackground.js';
import SadaqahVirtueCard from '../components/SadaqahVirtueCard.js';
import {
  calcPrayerTimes,
  formatTime,
  getMandatoryWidget,
  PRAYER_META,
  translateSalatName,
} from '../utils/prayerTimes.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import { isFriday, getTodaySpecialDays } from '../utils/islamicCalendar.js';
import { getTodaySadaqahVirtueDay } from '../utils/sadaqahVirtueDays.js';
import { useCycleActive, useCycleSummary } from '../hooks/useCycle.js';
import { useUiStore } from '../store/useUiStore.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { getRamadanWindow } from '../utils/ramadan.js';
import { getFridayHour, FRIDAY_HOUR_REF } from '../utils/fridayHour.js';

function localTodayForCycle(): string {
  return getTrackingDay();
}

interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  stats: { label: string; value: string | number };
  link: string;
  accent: string;
  border: string;
  tag?: string;
  streakCount?: number | null;
  goalCompleted?: boolean;
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const { counts = {}, hydrate } = useZikrStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const doHydrate = () => hydrate?.();
    doHydrate();
    const onFocus = () => doHydrate();
    const onVisibility = () => {
      if (!document.hidden) doHydrate();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [location.pathname]);

  const { data: analyticsData } = useAnalytics(1);
  // Salat itself is civil-dated (see useSalatLog's own note), but the
  // dashboard card is titled "today" and must agree with what SalatTracker
  // shows for "today" — which follows the user's fajr-to-fajr tracking day.
  // Without this, the card silently rolled onto the new civil date right at
  // midnight, showing 0/5 for prayers already logged under the still-open
  // tracking day until the next Fajr.
  const { data: salatLog } = useSalatLog(getTrackingDay());
  const { data: fastingSummary } = useFastingSummary();
  const { data: quranSummary } = useQuranSummary();
  const { data: salatAnalytics } = useSalatAnalytics(90);

  const totalToday = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);
  const analyticsGoal = analyticsData?.goal?.dailyTarget ?? null;
  const streakCount = analyticsData?.streak?.currentStreak ?? null;
  // Show max(local, server) so the capsule never lags behind live taps
  const effectiveToday = Math.max(totalToday, analyticsData?.today?.total ?? 0);
  const goalCompleted = analyticsGoal !== null ? effectiveToday >= analyticsGoal : false;
  // Confirmed zero LIFETIME zikr count (not "zero today") — strict equality
  // against 0 means this stays false while analyticsData hasn't loaded yet,
  // so an existing user never sees a flash of the brand-new-user treatment.
  const isNewZikrUser = analyticsData?.allTime?.totalCount === 0;
  const zikrGoalPct =
    analyticsGoal && !isNewZikrUser
      ? Math.min(100, Math.round((effectiveToday / analyticsGoal) * 100))
      : null;
  // Bounded to the same 90-day window already fetched for the streak tag
  // below — an accepted approximation of "brand new," not true lifetime.
  const isNewSalatUser = salatAnalytics?.prayedTotal === 0;

  // Salat completed count for today
  const salatCompletedToday = useMemo(() => {
    if (!salatLog) return null;
    return PRAYER_META.filter((p) => p.isTrackable).filter((p) => {
      const s = salatLog.prayers[p.id as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha']?.status;
      return s === 'completed' || s === 'kaza';
    }).length;
  }, [salatLog]);

  // Prayer times widget state
  const [prayerNow, setPrayerNow] = useState(new Date());
  // Widget shows hours+minutes only — 60s granularity is sufficient.
  useEffect(() => {
    const t = setInterval(() => setPrayerNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const todaySpecialDays = useMemo(() => getTodaySpecialDays(), []);
  const sadaqahVirtueDay = useMemo(() => getTodaySadaqahVirtueDay(), []);

  const prayerWidgetData = useMemo(() => {
    const stored = localStorage.getItem('bustandeen_location');
    if (!stored) return null;
    try {
      const loc = JSON.parse(stored) as { latitude: number; longitude: number };
      const times = calcPrayerTimes(loc.latitude, loc.longitude, prayerNow);
      const widget = getMandatoryWidget(times, prayerNow);

      // "Ends in" countdown for the currently active state
      const endTarget =
        widget.forbiddenWindow?.end ?? widget.currentMandatoryEnd ?? widget.naflWindow?.end;
      let endHh = 0,
        endMm = 0;
      if (endTarget) {
        const sec = Math.max(0, Math.floor((endTarget.getTime() - prayerNow.getTime()) / 1000));
        endHh = Math.floor(sec / 3600);
        endMm = Math.floor((sec % 3600) / 60);
      }
      return { ...widget, times, endHh, endMm };
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [prayerNow.getMinutes()]); // recalc every minute is enough for widget

  const cycleActive = useCycleActive();
  const { data: cycleSummary } = useCycleSummary();
  const discreetMode = useUiStore((s) => s.discreetMode);
  // The whole ummah counts down to Ramadan — a small pill on the fasting card
  const ramadan = useMemo(() => getRamadanWindow(), []);
  // Friday specials — reuse the same minute tick that drives the prayer widget
  const isFridayToday = useMemo(() => isFriday(), []);
  const fridayHour = useMemo(
    () => getFridayHour(prayerWidgetData?.times.asr, prayerWidgetData?.times.maghrib, prayerNow),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
    [prayerNow.getMinutes()]
  );

  // Gentle heads-up when the predicted period is ≤3 days away (female only)
  const upcomingCycleDays = (() => {
    const ns = cycleSummary?.prediction?.nextStart;
    if (!ns || cycleActive) return null;
    const diff = Math.round(
      (new Date(ns + 'T12:00:00').getTime() -
        new Date(localTodayForCycle() + 'T12:00:00').getTime()) /
        86_400_000
    );
    return diff >= 0 && diff <= 3 ? diff : null;
  })();

  const activities: ActivityItem[] = [
    {
      id: 'zikr',
      icon: '📿',
      title: t('home.zikrTitle'),
      stats: { label: t('home.today'), value: formatLocaleNumber(effectiveToday) },
      link: '/zikr',
      accent: 'brand-emerald',
      border: 'border-brand-emerald/15',
      streakCount,
      goalCompleted,
    },
    {
      id: 'salat',
      icon: '🕌',
      title: t('home.salatTitle'),
      stats: cycleActive
        ? { label: t('home.rayhanah'), value: `🌸 ${t('home.excused')}` }
        : isNewSalatUser
          ? { label: t('home.today'), value: t('home.salatStart', 'Tap to begin') }
          : {
              label: t('home.today'),
              value:
                salatCompletedToday !== null
                  ? `${formatLocaleNumber(salatCompletedToday)}/${formatLocaleNumber(5)}`
                  : `—/${formatLocaleNumber(5)}`,
            },
      link: '/salat',
      accent: 'brand-info',
      border: 'border-brand-info/15',
      tag: salatAnalytics?.currentStreak
        ? `🔥 ${formatLocaleNumber(salatAnalytics.currentStreak)}${t('home.daySuffix', 'd')} · ${t('home.all5', 'all 5')}`
        : undefined,
    },
    {
      id: 'fasting',
      icon: '🌙',
      title: t('home.fastingTitle'),
      stats: cycleActive
        ? { label: t('home.rayhanah'), value: `🌸 ${t('home.excused')}` }
        : {
            label: t('home.thisMonth'),
            value: fastingSummary
              ? `${formatLocaleNumber(fastingSummary.stats.thisMonth)} ${t('home.fasts')}`
              : '—',
          },
      link: '/fasting',
      accent: 'brand-gold',
      border: 'border-brand-gold/15',
    },
    {
      id: 'quran',
      icon: '📖',
      title: t('home.quranTitle'),
      stats: {
        label: t('home.today'),
        value: quranSummary
          ? `${formatLocaleNumber(quranSummary.todayAyat)}/${formatLocaleNumber(quranSummary.profile.dailyGoalAyat)} āyāt`
          : '—',
      },
      link: '/quran',
      accent: 'brand-info',
      border: 'border-brand-info/15',
      streakCount: quranSummary?.streak ?? null,
    },
  ];

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('home.srTitle', 'Bustandeen — Islamic Productivity')}</h1>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Welcome back after a quiet stretch — the gentlest possible restart */}
        <div className="mb-6 empty:mb-0">
          <ComebackNudge />
        </div>

        {/* AI streak coaching — fires on milestone or break */}
        <div className="mb-6 empty:mb-0">
          <StreakCoaching
            zikrStreak={streakCount}
            quranStreak={quranSummary?.streak ?? null}
            salatStreak={salatAnalytics?.currentStreak ?? null}
          />
        </div>

        {/* Pre-period heads-up — predicted start within 3 days */}
        {upcomingCycleDays !== null && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Link to="/cycle">
              <div
                className={
                  discreetMode
                    ? 'rounded-2xl border border-brand-border bg-white/5 px-5 py-3.5 hover:border-white/20 transition-all'
                    : 'rounded-2xl border border-brand-pink/20 bg-brand-pink/10 px-5 py-3.5 hover:border-brand-pink/30 transition-all'
                }
              >
                <p
                  className={
                    discreetMode
                      ? 'text-white/70 font-bold text-sm'
                      : 'text-brand-pink/90 font-bold text-sm'
                  }
                >
                  {discreetMode ? (
                    <>🔔 {t('home.discreetPrePeriod', 'Something to check')}</>
                  ) : (
                    <>
                      🌷{' '}
                      {upcomingCycleDays === 0
                        ? t('home.periodMayBegin')
                        : upcomingCycleDays! > 1
                          ? t('home.periodMayBeginInPlural', { days: upcomingCycleDays })
                          : t('home.periodMayBeginIn', { days: upcomingCycleDays })}
                    </>
                  )}
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  {discreetMode
                    ? t('home.discreetOpenWellness', 'Open Wellness')
                    : t('home.openRayhanah')}
                </p>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Rayhanah days banner — female users with an active cycle */}
        {cycleActive && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Link to="/cycle">
              <div
                className={
                  discreetMode
                    ? 'rounded-2xl border border-brand-border bg-white/5 px-5 py-4 hover:border-white/20 transition-all'
                    : 'rounded-2xl border border-brand-pink/25 bg-gradient-to-r from-brand-pink/15 via-brand-pink/10 to-brand-warm/10 px-5 py-4 hover:border-brand-pink/40 transition-all'
                }
              >
                <p
                  className={
                    discreetMode
                      ? 'text-white/70 font-bold text-sm'
                      : 'text-brand-pink font-bold text-sm'
                  }
                >
                  {discreetMode
                    ? `🍃 ${t('home.discreetActiveDay', 'Wellness mode — day {{day, number}}', { day: cycleActive.dayCount })}`
                    : `🌸 ${t('home.rayhanahDay', { day: cycleActive.dayCount })}`}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  {discreetMode
                    ? t('home.discreetActiveDetail', 'Some trackers are paused today.')
                    : t('home.rayhanahDetail')}
                </p>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Prayer times widget / location CTA */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {prayerWidgetData ? (
            <Link to="/prayer-times">
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="flex items-stretch gap-0 rounded-2xl bg-brand-surface/80 backdrop-blur-md border border-brand-border hover:border-brand-emerald/30 transition-all overflow-hidden"
              >
                {/* LEFT: current status (forbidden / mandatory / nafl / free) */}
                <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
                  {/* Icon */}
                  <span className="text-2xl shrink-0 leading-none">
                    {prayerWidgetData.forbiddenWindow
                      ? '🚫'
                      : prayerWidgetData.currentMandatory
                        ? (PRAYER_META.find((p) => p.id === prayerWidgetData.currentMandatory)
                            ?.icon ?? '🕌')
                        : prayerWidgetData.naflWindow
                          ? prayerWidgetData.naflWindow.icon
                          : '🕊️'}
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {prayerWidgetData.forbiddenWindow ? (
                      <>
                        <p className="text-red-400/60 text-[10px] uppercase tracking-widest leading-none mb-0.5">
                          {t('home.forbiddenTime')}
                        </p>
                        <p className="text-red-300 font-black text-sm leading-tight">
                          {prayerWidgetData.forbiddenWindow.label.replace('Forbidden — ', '')}
                        </p>
                        <p className="text-white/30 text-[10px] mt-0.5">
                          {t('common.ends')} {formatTime(prayerWidgetData.forbiddenWindow.end)} —{' '}
                          {t('home.noPrayer')}
                        </p>
                      </>
                    ) : prayerWidgetData.currentMandatory ? (
                      <>
                        <p className="text-white/30 text-[10px] uppercase tracking-widest leading-none mb-0.5">
                          {t('home.current')}
                        </p>
                        <p className="text-white font-black text-sm leading-tight">
                          {translateSalatName(
                            prayerWidgetData.currentMandatory ?? '',
                            PRAYER_META.find((p) => p.id === prayerWidgetData.currentMandatory)
                              ?.name ?? '',
                            t
                          )}
                        </p>
                        <p className="text-white/30 text-[10px] mt-0.5">
                          {t('common.ends')} {formatTime(prayerWidgetData.currentMandatoryEnd!)}
                        </p>
                        {/* Nafl alongside mandatory (Awabeen during Maghrib, Tahajjud during Isha) */}
                        {prayerWidgetData.naflWindow && (
                          <div className="mt-1 pt-1 border-t border-brand-border/40">
                            <p className="text-brand-warm/80 text-[10px] font-semibold leading-none">
                              {prayerWidgetData.naflWindow.icon}{' '}
                              {translateSalatName(
                                prayerWidgetData.naflWindow.id,
                                prayerWidgetData.naflWindow.name,
                                t
                              )}{' '}
                              {t('common.time')}
                            </p>
                            <p className="text-white/25 text-[10px] leading-none mt-0.5">
                              {t('common.until')} {formatTime(prayerWidgetData.naflWindow.end)}
                            </p>
                          </div>
                        )}
                      </>
                    ) : prayerWidgetData.naflWindow ? (
                      <>
                        <p className="text-brand-info/60 text-[10px] uppercase tracking-widest leading-none mb-0.5">
                          {t('home.naflTime')}
                        </p>
                        <p className="text-brand-info font-black text-sm leading-tight">
                          {translateSalatName(
                            prayerWidgetData.naflWindow.id,
                            prayerWidgetData.naflWindow.name,
                            t
                          )}
                        </p>
                        <p className="text-white/30 text-[10px] mt-0.5">
                          {formatTime(prayerWidgetData.naflWindow.start)} –{' '}
                          {formatTime(prayerWidgetData.naflWindow.end)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-white/25 text-[10px] uppercase tracking-widest leading-none mb-0.5">
                          {t('home.freeTime')}
                        </p>
                        <p className="text-white/50 font-semibold text-sm leading-tight">
                          {t('home.nextPrayerComing')}
                        </p>
                        <p className="text-white/25 text-[10px] mt-0.5">
                          {t('common.in')}{' '}
                          {prayerWidgetData.nextHh > 0
                            ? `${formatLocaleNumber(prayerWidgetData.nextHh)}h `
                            : ''}
                          {formatLocaleNumber(
                            Number(String(prayerWidgetData.nextMm).padStart(2, '0'))
                          )}
                          m
                        </p>
                      </>
                    )}
                  </div>

                  {/* Ends-in counter (right side of left section) */}
                  {(prayerWidgetData.endHh > 0 || prayerWidgetData.endMm > 0) && (
                    <div className="text-right shrink-0">
                      <p className="text-white/30 text-[10px] uppercase tracking-widest leading-none mb-0.5">
                        {t('home.endsIn')}
                      </p>
                      <p
                        className={`font-black text-base tabular-nums leading-tight ${
                          prayerWidgetData.forbiddenWindow ? 'text-red-400' : 'text-brand-gold'
                        }`}
                      >
                        {prayerWidgetData.endHh > 0
                          ? `${formatLocaleNumber(prayerWidgetData.endHh)}h `
                          : ''}
                        {formatLocaleNumber(
                          Number(String(prayerWidgetData.endMm).padStart(2, '0'))
                        )}
                        m
                      </p>
                    </div>
                  )}
                </div>

                {/* DIVIDER */}
                <div className="w-px bg-brand-border/60 self-stretch my-2" />

                {/* RIGHT: next mandatory prayer */}
                <div className="flex flex-col justify-center px-4 py-3 shrink-0 min-w-[110px] sm:min-w-[130px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">
                      {PRAYER_META.find((p) => p.id === prayerWidgetData.nextMandatory)?.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-white/30 text-[10px] uppercase tracking-widest leading-none mb-0.5">
                        {t('home.next')}
                      </p>
                      <p className="text-brand-emerald font-bold text-xs leading-tight">
                        {translateSalatName(
                          prayerWidgetData.nextMandatory,
                          PRAYER_META.find((p) => p.id === prayerWidgetData.nextMandatory)?.name ??
                            '',
                          t
                        )}
                      </p>
                      <p className="text-white/30 text-[10px] leading-none">
                        {formatTime(prayerWidgetData.nextMandatoryTime)}
                      </p>
                    </div>
                  </div>
                  <p className="text-white/20 text-[10px] mt-1">
                    {t('common.in')}{' '}
                    {prayerWidgetData.nextHh > 0
                      ? `${formatLocaleNumber(prayerWidgetData.nextHh)}h `
                      : ''}
                    {formatLocaleNumber(Number(String(prayerWidgetData.nextMm).padStart(2, '0')))}m
                  </p>
                </div>
              </motion.div>
            </Link>
          ) : (
            /* No location stored — send to the prayer-times page, which
             * offers "use my location" and manual city search side by side.
             * Deliberately NOT a native geolocation prompt fired straight
             * from this button: the user should see and choose between both
             * options before any permission dialog appears. */
            <Link to="/prayer-times">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 rounded-2xl bg-brand-surface/60 backdrop-blur-md border border-brand-border/60 border-dashed hover:border-brand-emerald/40 hover:bg-brand-surface/80 transition-all text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MapPinIcon className="w-5 h-5 text-brand-emerald/60 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white/70 font-semibold text-sm leading-none mb-0.5">
                      {t('home.enablePrayerTimes')}
                    </p>
                    <p className="text-white/30 text-xs">{t('home.enablePrayerTimesDetail')}</p>
                  </div>
                </div>
                <span className="text-brand-emerald/50 text-xs font-semibold shrink-0">
                  {t('home.setLocation')}
                </span>
              </motion.div>
            </Link>
          )}
        </motion.div>

        {/* Islamic special day widget */}
        {todaySpecialDays.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6 space-y-2"
          >
            {todaySpecialDays.map((day) => (
              <Link key={day.id} to={`/special-day/${day.id}`}>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border overflow-hidden transition-all"
                  style={{ background: `${day.color}12`, borderColor: `${day.color}40` }}
                >
                  <span className="text-2xl shrink-0">{day.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-bold text-sm leading-tight">
                      {t(`specialDays.${day.id}.name`, day.name)}
                    </p>
                    <p className="text-white/40 text-xs leading-snug truncate mt-0.5">
                      {t(`specialDays.${day.id}.shortDesc`, day.shortDesc)}
                    </p>
                  </div>
                  <span className="text-white/30 text-xs shrink-0 font-bold">→</span>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}

        {/* Days with extra sadaqah virtue (Friday, Ramadan, first 10 days of
            Dhul Hijjah, Arafah, Laylat al-Qadr) — persistent, unlike the old
            30s-auto-dismissing Friday-only reminder this replaces. */}
        {sadaqahVirtueDay && <SadaqahVirtueCard day={sadaqahVirtueDay} />}

        {/* Friday: hour of response (Abū Dāwūd 1048, ṣaḥīḥ) */}
        {fridayHour.active && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div
              className={`rounded-2xl border p-4 ${
                fridayHour.isFinalStretch
                  ? 'border-brand-gold/50 bg-gradient-to-br from-brand-gold/15 to-brand-gold-dim/5'
                  : 'border-brand-gold/25 bg-brand-gold/[0.06]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🤲</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-brand-gold font-black text-sm">
                      {fridayHour.isFinalStretch
                        ? t('home.fridayHourNow')
                        : t('home.fridayHourTitle')}
                    </h3>
                    <span className="text-brand-gold/70 text-xs font-bold tabular-nums">
                      {fridayHour.countdown} {t('home.toMaghrib')}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs mt-1.5 leading-relaxed">
                    {t(
                      'home.fridayHourQuote',
                      '"{{text}}" Keep asking until the sun sets — for yourself, your parents, and the ummah.',
                      {
                        text:
                          i18n.language === 'bn' ? FRIDAY_HOUR_REF.textBn : FRIDAY_HOUR_REF.text,
                      }
                    )}
                  </p>
                  <a
                    href={FRIDAY_HOUR_REF.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-white/35 hover:text-brand-gold underline underline-offset-2 mt-2 inline-block"
                  >
                    {translateReference(FRIDAY_HOUR_REF.source, i18n.language)} ·{' '}
                    {translateReference(FRIDAY_HOUR_REF.grade, i18n.language)} ↗
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Friday: Surah al-Kahf — one tap into the reader */}
        {isFridayToday && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <button
              onClick={() => navigate('/quran/read/18?mode=single')}
              className="w-full text-left rounded-2xl border border-brand-emerald/25 bg-brand-emerald/[0.07] p-4 hover:border-brand-emerald/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl shrink-0">🌟</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-brand-emerald font-black text-sm">{t('home.fridayKahf')}</h3>
                  <p className="text-white/50 text-xs mt-1 leading-relaxed">
                    "
                    {t(
                      'home.fridayKahfQuote',
                      'A light will shine for him between the two Fridays.'
                    )}
                    "
                  </p>
                  <p className="text-white/25 text-[11px] mt-1">
                    {translateReference('Ṣaḥīḥ at-Targhīb 736 · Ṣaḥīḥ', i18n.language)}
                  </p>
                </div>
                <span className="text-brand-emerald/60 text-lg shrink-0">→</span>
              </div>
            </button>
          </motion.div>
        )}

        {/* ── Activity cards (compact dashboard tiles) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {activities.map((a, i) => {
            const isZikr = a.id === 'zikr';
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link to={a.link} className="block group">
                  <div
                    className={`relative rounded-2xl ${a.border} border bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-md p-4 transition-all`}
                  >
                    {/* Top row: icon + title */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl shrink-0 leading-none">{a.icon}</span>
                      <h2 className="text-base font-black text-white flex-1 min-w-0 truncate">
                        {a.title}
                      </h2>
                      <span className="text-white/20 text-xs font-bold group-hover:text-white/40 transition-colors">
                        →
                      </span>
                    </div>

                    {/* Stat row */}
                    <div className="flex items-baseline">
                      <span className="text-2xl font-black text-white tabular-nums">
                        {a.stats.value}
                      </span>
                      <span className="text-white/30 text-xs font-semibold ml-2 uppercase">
                        {a.stats.label}
                      </span>
                    </div>

                    {/* Bottom badges row — streak, goal, ramadan */}
                    {(isZikr || a.id === 'quran' || a.tag || a.id === 'fasting') && (
                      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-1.5">
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
                            actually set — with none, "streak" would just be
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
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white border border-brand-gold/20 bg-gradient-to-r from-amber-700/80 to-purple-700/80 hover:scale-105 transition-transform"
                            title={
                              ramadan.active ? 'Open the Ramadan tracker' : 'Countdown to Ramadan'
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate('/ramadan');
                            }}
                          >
                            {ramadan.active
                              ? `🌙 ${t('home.ramadanDay', { day: formatLocaleNumber(ramadan.todayNumber ?? 0) })}`
                              : `🌙 ${t('home.ramadanIn', { days: formatLocaleNumber(ramadan.daysUntil) })}`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Natural-language quick log (Naseeh) */}
        <div className="mb-4 empty:mb-0">
          <NaturalLogEntry />
        </div>

        {/* AI weekly reflection + monthly patterns (Naseeh) */}
        <div className="mb-4 empty:mb-0">
          <NaseehInsights />
        </div>

        {/* Weekly muhāsabah — distinct from NaseehInsights above: a dedicated
            self-accounting report paired with a verified (never AI-written) āyah/hadith */}
        <div className="mb-8 empty:mb-0">
          <MuhasabahReport />
        </div>

        {/* ── Friends / Share activities ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <Link to="/friends" className="block group">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.06] hover:bg-brand-gold/10 transition-all">
              <span className="text-2xl shrink-0">🤝</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-black text-white">{t('home.friendsTitle')}</h2>
                <p className="text-white/30 text-xs truncate">{t('home.friendsSubtitle')}</p>
              </div>
              <span className="shrink-0 text-brand-gold/60 text-xs font-bold group-hover:text-brand-gold transition-colors">
                {t('home.compete')}
              </span>
            </div>
          </Link>
        </motion.div>

        {/* ── Islamic Library / one-stop utilities ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-10"
        >
          <div className="mb-3">
            <h2 className="text-sm font-black text-white">{t('home.libraryTitle')}</h2>
            <p className="text-white/30 text-xs">{t('home.librarySubtitle')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: '🤲',
                to: '/library/duas',
                title: t('home.libraryDuaTitle'),
                subtitle: t('home.libraryDuaSubtitle'),
              },
              {
                icon: '🌅',
                to: '/library/adhkar',
                title: t('home.libraryAdhkarTitle'),
                subtitle: t('home.libraryAdhkarSubtitle'),
              },
              {
                icon: '✨',
                to: '/library/asma-ul-husna',
                title: t('home.libraryAsmaTitle'),
                subtitle: t('home.libraryAsmaSubtitle'),
              },
              {
                icon: '🧮',
                to: '/zakat-calculator',
                title: t('home.libraryZakatTitle'),
                subtitle: t('home.libraryZakatSubtitle'),
              },
            ].map((u) => (
              <Link key={u.to} to={u.to} className="block group">
                <div className="rounded-2xl border border-brand-border bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-md p-4 transition-all h-full">
                  <span className="text-2xl leading-none">{u.icon}</span>
                  <h3 className="text-sm font-bold text-white mt-2 truncate">{u.title}</h3>
                  <p className="text-white/30 text-xs mt-0.5 truncate">{u.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        <div className="text-center text-xs text-white/30 pb-4">{t('home.footer')}</div>
      </div>
    </AnimatedBackground>
  );
}
