import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import QuranTabNav from '../components/QuranTabNav.js';
import DemoSignInGate from '../components/DemoSignInGate.js';
import TimeOfDayChart from '../components/analytics/TimeOfDayChart.js';
import ChartInfoModal, { InfoButton } from '../components/ChartInfoModal.js';
import { useAuthStore } from '../store/useAuthStore.js';
import {
  useQuranSummary,
  useQuranHistory,
  useQuranSessions,
  useQuranTimeOfDay,
  QURAN_TOTAL_AYAT,
} from '../hooks/useQuran.js';
import { loadSurahList, surahDisplayName, type SurahMeta } from '../utils/quranData.js';
import { formatLocaleDate, formatLocaleNumber, formatLocaleTime } from '../utils/localeDate.js';
import { getTrackingDay } from '../utils/trackingDay.js';

type RangePeriod = 'month' | 'last30' | 'alltime';
interface MonthSel {
  year: number;
  month: number;
}

/** The whole Quran journey in numbers — reading, listening, khatam, favourites. */
export default function QuranAnalytics() {
  const { t, i18n } = useTranslation();
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { data: summary } = useQuranSummary();

  // Range selector — current month by default (mirrors SalatAnalytics pattern)
  const [rangePeriod, setRangePeriod] = useState<RangePeriod>('month');
  const [selectedMonth, setSelectedMonth] = useState<MonthSel>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  const civilToday = getTrackingDay();

  const historyDays = useMemo(() => {
    if (rangePeriod === 'alltime') return 3650;
    if (rangePeriod === 'last30') return 30;
    // current month
    const { year, month } = selectedMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const isCurrentMonth = civilToday.startsWith(`${year}-${String(month).padStart(2, '0')}`);
    return isCurrentMonth ? parseInt(civilToday.slice(8), 10) : daysInMonth;
  }, [rangePeriod, selectedMonth, civilToday]);

  const { data: history } = useQuranHistory(historyDays, true);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [sessionsDate, setSessionsDate] = useState(() => getTrackingDay());
  const { data: sessions, isLoading: sessionsLoading } = useQuranSessions(sessionsDate);
  const { data: timeOfDay } = useQuranTimeOfDay(30);
  const [infoTopic, setInfoTopic] = useState<string | null>(null);

  const CHART_INFO: Record<string, { title: string; body: string }> = {
    chart: {
      title: t('quranAnalytics.info.chartTitle', 'Daily Quran Chart'),
      body: t(
        'quranAnalytics.info.chartBody',
        'How many āyāt you read or listened to each day over the selected period. Each bar is one day — taller means more āyāt. Days you skipped show as empty. Hover a bar to see the date and count.'
      ),
    },
    timeOfDay: {
      title: t('quranAnalytics.info.timeOfDayTitle', 'Time of Day'),
      body: t(
        'quranAnalytics.info.timeOfDayBody',
        'When during the day you spend time with the Quran, averaged over the last 30 days — reading and listening combined. Helps you find your best time and build a consistent habit.'
      ),
    },
    sessions: {
      title: t('quranAnalytics.info.sessionsTitle', 'Quran Sessions'),
      body: t(
        'quranAnalytics.info.sessionsBody',
        'Sessions logged for the selected day — 📖 for reading, 🎧 for listening. The time shown is the wall-clock start and end. The duration is active time only — if you fell asleep or left audio playing, the active count will be much less than the time gap shown.'
      ),
    },
  };

  useEffect(() => {
    let alive = true;
    loadSurahList()
      .then((l) => {
        if (alive) setSurahs(l);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const nameOf = (n: number) => {
    const s = surahs.find((s) => s.number === n);
    return s ? surahDisplayName(s, i18n.language) : `Surah ${n}`;
  };

  const chart = useMemo(() => {
    const byDate = new Map((history ?? []).map((h) => [h.date, h.units]));
    const days: Array<{ date: string; units: number }> = [];
    const today = new Date();
    for (let i = Math.min(historyDays - 1, 89); i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: k, units: byDate.get(k) ?? 0 });
    }
    const max = Math.max(1, ...days.map((d) => d.units));
    const activeDays = days.filter((d) => d.units > 0).length;
    return { days, max, activeDays };
  }, [history, historyDays]);

  const khatmPct = summary ? (summary.profile.currentAyah / QURAN_TOTAL_AYAT) * 100 : 0;
  const maxTop = Math.max(1, ...(summary?.topSurahs ?? []).map((t) => t.completions));

  const rangeLabel = useMemo(() => {
    if (rangePeriod === 'alltime') return t('quranAnalytics.periodAllTime', 'All time');
    if (rangePeriod === 'last30') return t('quranAnalytics.periodLast30', 'Last 30d');
    return formatLocaleDate(new Date(selectedMonth.year, selectedMonth.month - 1, 15), {
      month: 'short',
      year: 'numeric',
    });
  }, [rangePeriod, selectedMonth, t]);

  if (isDemoMode) {
    return (
      <DemoSignInGate
        emoji="📖"
        title={t('demoGate.analyticsTitle', 'Your personal analytics await')}
        desc={t(
          'demoGate.quranDesc',
          'Your Quran journey — pages read, khatam progress, and recitation log — lives in your account.'
        )}
        backTo="/quran"
        backLabel={t('demoGate.backToQuran', 'Back to Quran')}
        tabs={<QuranTabNav active="analytics" />}
      />
    );
  }

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('quranAnalytics.title')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
        <QuranTabNav active="analytics" />

        {/* tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 text-center">
            <p className="text-2xl font-black text-brand-emerald">
              {summary ? formatLocaleNumber(summary.stats.allTimeUnits) : '—'}
            </p>
            <p className="text-white/30 text-[10px] font-bold uppercase mt-1">
              {t('quranAnalytics.ayatAllTime')}
            </p>
          </div>
          <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 text-center">
            <p className="text-2xl font-black text-brand-gold">
              🔥 {formatLocaleNumber(summary?.streak ?? 0)}
            </p>
            <p className="text-white/30 text-[10px] font-bold uppercase mt-1">
              {t('quranAnalytics.dayStreak', {
                best: formatLocaleNumber(summary?.bestStreak ?? 0),
              })}
            </p>
          </div>
          <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 text-center">
            <p className="text-2xl font-black text-brand-info">
              {formatLocaleNumber(summary?.stats.last30Units ?? 0)}
            </p>
            <p className="text-white/30 text-[10px] font-bold uppercase mt-1">
              {t('quranAnalytics.ayatLast30')}
            </p>
          </div>
          <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 text-center">
            <p className="text-2xl font-black text-brand-info">
              ⭐ {formatLocaleNumber(summary?.profile.khatmCount ?? 0)}
            </p>
            <p className="text-white/30 text-[10px] font-bold uppercase mt-1">
              {t('quranAnalytics.khatmNow', {
                pct: formatLocaleNumber(Number(khatmPct.toFixed(0))),
              })}
            </p>
          </div>
        </div>

        {/* range selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="tabs tabs-boxed tabs-sm bg-brand-deep border border-brand-border">
            {(['month', 'last30', 'alltime'] as RangePeriod[]).map((p) => (
              <button
                key={p}
                className={`tab text-xs ${rangePeriod === p && p !== 'month' ? 'tab-active bg-brand-emerald text-white font-bold' : 'text-white/60'} ${rangePeriod === 'month' && p === 'month' ? 'tab-active bg-brand-emerald text-white font-bold' : ''}`}
                onClick={() => {
                  setRangePeriod(p);
                  if (p !== 'month') setShowMonthPicker(false);
                }}
              >
                {p === 'month'
                  ? t('quranAnalytics.periodCurrentMonth', 'This month')
                  : p === 'last30'
                    ? t('quranAnalytics.periodLast30', 'Last 30d')
                    : t('quranAnalytics.periodAllTime', 'All time')}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setShowMonthPicker((v) => !v);
              setRangePeriod('month');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showMonthPicker
                ? 'bg-brand-emerald/20 border-brand-emerald/40 text-brand-emerald'
                : 'bg-brand-deep border-brand-border text-white/60 hover:text-white'
            }`}
          >
            <CalendarDaysIcon className="w-3.5 h-3.5" />
            {t('quranAnalytics.periodMonth', 'Month')}
          </button>
        </div>

        {/* month picker panel */}
        {showMonthPicker &&
          (() => {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            return (
              <div className="rounded-2xl border border-brand-emerald/20 bg-brand-deep/90 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setPickerYear((y) => y - 1)}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <span className="text-white font-bold text-sm">{pickerYear}</span>
                  <button
                    onClick={() => setPickerYear((y) => y + 1)}
                    disabled={pickerYear >= currentYear}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-20"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const isFuture =
                      pickerYear > currentYear || (pickerYear === currentYear && m > currentMonth);
                    const isSel = selectedMonth.year === pickerYear && selectedMonth.month === m;
                    return (
                      <button
                        key={m}
                        disabled={isFuture}
                        onClick={() => {
                          setSelectedMonth({ year: pickerYear, month: m });
                          setShowMonthPicker(false);
                          setRangePeriod('month');
                        }}
                        className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                          isSel
                            ? 'bg-brand-emerald text-white'
                            : isFuture
                              ? 'text-white/15 cursor-not-allowed'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {formatLocaleDate(new Date(pickerYear, m - 1, 15), { month: 'short' })}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        {/* chart header */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-white font-black flex items-center gap-2">
              {t('quranAnalytics.last30Title')}
              <span className="text-white/30 text-xs font-normal">· {rangeLabel}</span>
              <InfoButton onClick={() => setInfoTopic('chart')} label={CHART_INFO.chart!.title} />
            </h2>
            <span className="text-white/30 text-xs">
              {t('quranAnalytics.daysWithQuran', { active: formatLocaleNumber(chart.activeDays) })}
            </span>
          </div>
          <div className="flex items-end gap-[3px] h-28">
            {chart.days.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.units} āyāt`}
                className={`flex-1 rounded-t ${d.units > 0 ? 'bg-gradient-to-t from-brand-emerald-dim/70 to-brand-info/70' : 'bg-white/5'}`}
                style={{ height: `${Math.max(4, (d.units / chart.max) * 100)}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-white/25 mt-1">
            <span>{chart.days[0]?.date.slice(5)}</span>
            <span>{t('common.today')}</span>
          </div>
        </div>

        {/* top surahs */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <h2 className="text-white font-black mb-3">{t('quranAnalytics.topSurahsTitle')}</h2>
          {(summary?.topSurahs ?? []).length === 0 ? (
            <p className="text-white/30 text-xs">{t('quranAnalytics.topSurahsEmpty')}</p>
          ) : (
            <div className="space-y-1.5">
              {(summary?.topSurahs ?? []).map((t, i) => (
                <div key={t.surah} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-white/30 font-black">{i + 1}</span>
                  <span className="text-white/70 font-bold w-32 truncate">{nameOf(t.surah)}</span>
                  <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-emerald/60 to-brand-info/60"
                      style={{ width: `${(t.completions / maxTop) * 100}%` }}
                    />
                  </div>
                  <span className="text-brand-emerald font-bold w-16 text-right">
                    ×{formatLocaleNumber(t.completions)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* khatam projection */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <h2 className="text-white font-black mb-2">
            {t('quranAnalytics.khatamProjectionTitle')}
          </h2>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-emerald to-brand-info"
              style={{ width: `${khatmPct}%` }}
            />
          </div>
          <p className="text-white/40 text-xs mt-2">
            {summary?.estDaysToKhatm
              ? t('quranAnalytics.paceEstimate', {
                  pace: formatLocaleNumber(summary.pace ?? 0),
                  days: formatLocaleNumber(summary.estDaysToKhatm),
                })
              : t('quranAnalytics.paceEmpty')}
          </p>
        </div>

        {/* time of day */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5 space-y-3">
          <h2 className="text-white font-black flex items-center gap-2">
            {t('quranAnalytics.sessions.title', 'Quran sessions')}
            <InfoButton
              onClick={() => setInfoTopic('timeOfDay')}
              label={CHART_INFO.timeOfDay!.title}
            />
          </h2>
          <TimeOfDayChart data={timeOfDay} />
        </div>

        {/* reading session history */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-white font-black text-sm flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-brand-info" />
              {t('quranAnalytics.sessions.title', 'Quran sessions')}
              <InfoButton
                onClick={() => setInfoTopic('sessions')}
                label={CHART_INFO.sessions!.title}
              />
            </h2>
            <input
              type="date"
              value={sessionsDate}
              max={getTrackingDay()}
              onChange={(e) => setSessionsDate(e.target.value)}
              className="input input-xs input-bordered bg-brand-surface border-brand-border text-white/80 text-xs"
            />
          </div>
          {sessionsLoading ? (
            <p className="text-white/30 text-xs text-center py-4">{t('common.loading')}</p>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((s, i) => {
                const wallClockMs = new Date(s.end).getTime() - new Date(s.start).getTime();
                const activeMin = Math.max(1, Math.round(s.activeDurationSec / 60));
                const wallClockMin = Math.round(wallClockMs / 60_000);
                // Flag sessions where the user was mostly idle (fell asleep, audio kept playing)
                const isLongIdle =
                  wallClockMin > 0 && wallClockMin > activeMin * 2 && wallClockMin > 30;
                const h = Math.floor(activeMin / 60);
                const m = activeMin % 60;
                const duration =
                  h > 0
                    ? t('quranAnalytics.sessions.durationHm', { h, m })
                    : t('quranAnalytics.sessions.durationM', { m });
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-brand-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-white/80 text-sm font-semibold tabular-nums">
                        <span
                          className="mr-1"
                          title={
                            s.source === 'listen'
                              ? t('quranAnalytics.sessions.sourceListen', 'Listening')
                              : t('quranAnalytics.sessions.sourceRead', 'Reading')
                          }
                        >
                          {s.source === 'listen' ? '🎧' : '📖'}
                        </span>
                        {formatLocaleTime(new Date(s.start), {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {' – '}
                        {formatLocaleTime(new Date(s.end), { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.surahs.map((surahNo) => (
                          <span
                            key={surahNo}
                            className="px-1.5 py-0.5 rounded-md bg-black/30 border border-brand-border text-[10px] text-white/50"
                          >
                            {nameOf(surahNo)}
                          </span>
                        ))}
                        {s.ayahCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-black/30 border border-brand-border text-[10px] text-white/50">
                            {t('quranAnalytics.sessions.ayahCount', {
                              n: formatLocaleNumber(s.ayahCount),
                            })}
                          </span>
                        )}
                        {isLongIdle && (
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-brand-gold/10 border border-brand-gold/20 text-[10px] text-brand-gold/70"
                            title={t(
                              'quranAnalytics.sessions.idleHint',
                              'Audio kept playing while idle'
                            )}
                          >
                            {t('quranAnalytics.sessions.idleNote', 'Active: {{duration}}', {
                              duration,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-brand-emerald font-black text-lg shrink-0 whitespace-nowrap">
                      {duration}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/30 text-xs text-center py-4">
              {t('quranAnalytics.sessions.empty', 'No sessions logged for this day')}
            </p>
          )}
        </div>
      </div>

      <ChartInfoModal
        title={infoTopic ? (CHART_INFO[infoTopic]?.title ?? null) : null}
        body={infoTopic ? CHART_INFO[infoTopic]?.body : undefined}
        onClose={() => setInfoTopic(null)}
      />
    </AnimatedBackground>
  );
}
