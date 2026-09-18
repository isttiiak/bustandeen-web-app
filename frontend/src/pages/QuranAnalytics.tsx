import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClockIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import QuranTabNav from '../components/QuranTabNav.js';
import DemoSignInGate from '../components/DemoSignInGate.js';
import { useAuthStore } from '../store/useAuthStore.js';
import {
  useQuranSummary,
  useQuranHistory,
  useQuranSessions,
  QURAN_TOTAL_AYAT,
} from '../hooks/useQuran.js';
import { loadSurahList, surahDisplayName, type SurahMeta } from '../utils/quranData.js';
import { formatLocaleNumber, formatLocaleTime } from '../utils/localeDate.js';
import { getTrackingDay } from '../utils/trackingDay.js';

/** The whole Quran journey in numbers — reading, listening, khatam, favourites. */
export default function QuranAnalytics() {
  const { t, i18n } = useTranslation();
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { data: summary } = useQuranSummary();
  const { data: history } = useQuranHistory(30, true);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [sessionsDate, setSessionsDate] = useState(() => getTrackingDay());
  const { data: sessions, isLoading: sessionsLoading } = useQuranSessions(sessionsDate);

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
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: k, units: byDate.get(k) ?? 0 });
    }
    const max = Math.max(1, ...days.map((d) => d.units));
    const activeDays = days.filter((d) => d.units > 0).length;
    return { days, max, activeDays };
  }, [history]);

  const khatmPct = summary ? (summary.profile.currentAyah / QURAN_TOTAL_AYAT) * 100 : 0;
  const maxTop = Math.max(1, ...(summary?.topSurahs ?? []).map((t) => t.completions));

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

        {/* 30-day chart */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-black">{t('quranAnalytics.last30Title')}</h2>
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

        {/* reading session history */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-white font-black text-sm flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-brand-info" />
              {t('quranAnalytics.sessions.title', 'Reading sessions')}
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
                const totalMin = Math.max(1, Math.round(s.activeDurationSec / 60));
                const h = Math.floor(totalMin / 60);
                const m = totalMin % 60;
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
              {t('quranAnalytics.sessions.empty', 'No reading sessions logged for this day')}
            </p>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
}
