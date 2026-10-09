import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BookOpenIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CrescentIcon, TasbihIcon } from '../icons/IslamicIcons.js';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import { useQuranSummary } from '../../hooks/useQuran.js';
import {
  localTodayStr,
  useClearFastingLog,
  useFastingLog,
  useFastingSummary,
  useUpsertFastingLog,
} from '../../hooks/useFasting.js';
import { useZikrStore } from '../../store/useZikrStore.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import {
  loadSurahList,
  locateGlobalAyah,
  surahDisplayName,
  type SurahMeta,
} from '../../utils/quranData.js';
import { continueHref, getLastRead } from '../../utils/quranLastRead.js';
import {
  counterHref,
  getQuickAction,
  getQuickZikr,
  type QuickZikr,
} from '../../utils/zikrQuick.js';
import { zikrDisplayName } from '../../utils/zikrLibrary.js';
import { getDayRuling, VOLUNTARY_BY_ID } from '../../utils/fastingRules.js';
import { nextSunnahFast, quickFastPlan } from '../../utils/fastingQuick.js';
import { getHijriToday } from '../../utils/islamicCalendar.js';
import { calcPrayerTimes, formatTime } from '../../utils/prayerTimes.js';
import { celebrateSmall } from '../../utils/celebrate.js';

/** Home's per-habit quick sections (T3.4 E): one compact card each, at most
 *  two rows of actions, in the user's habit order (utils/homeSections.ts). */

function Shell({
  icon,
  tone,
  title,
  sub,
  aside,
  testId,
  children,
}: {
  icon: ReactNode;
  tone: 'emerald' | 'gold' | 'info';
  title: string;
  sub: ReactNode;
  aside?: ReactNode;
  testId: string;
  children: ReactNode;
}) {
  const bg = { emerald: 'bg-brand-emerald/15', gold: 'bg-brand-gold/15', info: 'bg-brand-info/15' }[
    tone
  ];
  return (
    <section
      data-testid={testId}
      aria-label={title}
      className="mb-3 rounded-card border border-brand-border/70 bg-brand-deep shadow-elev-1 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <span className={`w-9 h-9 rounded-control ${bg} flex items-center justify-center shrink-0`}>
          {icon}
        </span>
        <span className="flex-1 min-w-0">
          <h2 className="font-display text-white font-semibold text-base leading-tight">{title}</h2>
          <span className="block text-white/70 text-xs mt-0.5 truncate">{sub}</span>
        </span>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Progress({ pct, tone }: { pct: number; tone: 'emerald' | 'gold' }) {
  return (
    <div className="mt-2.5 h-1.5 rounded-full bg-brand-border overflow-hidden" aria-hidden="true">
      <div
        className={`h-full rounded-full ${tone === 'gold' ? 'bg-brand-gold' : 'bg-brand-emerald'}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function Count({ done, goal, unit }: { done: number; goal: number | null; unit?: string }) {
  return (
    <span className="shrink-0 font-display font-bold text-lg text-white tabular-nums">
      {formatLocaleNumber(done)}
      {goal !== null && (
        <span className="text-white/60 text-xs font-body font-semibold">
          /{formatLocaleNumber(goal)}
          {unit ? ` ${unit}` : ''}
        </span>
      )}
    </span>
  );
}

// ── Quran ────────────────────────────────────────────────────────────────────

export function QuranQuickCard() {
  const { t, i18n } = useTranslation();
  const { data: summary } = useQuranSummary();
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  useEffect(() => {
    let alive = true;
    loadSurahList()
      .then((l) => alive && setSurahs(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Same opt-in test as the Khatam page.
  const khatamOn = !!summary?.profile.khatamStartedAt || (summary?.profile.currentAyah ?? 0) > 0;
  const khatamPos = useMemo(
    () => (summary && surahs.length ? locateGlobalAyah(summary.profile.currentAyah, surahs) : null),
    [summary, surahs]
  );
  const last = getLastRead();
  const href = continueHref({ khatamOn, khatamPos, last });
  const at = khatamOn ? khatamPos : last;
  const name = (n: number) =>
    surahDisplayName(
      { number: n, englishName: surahs.find((s) => s.number === n)?.englishName ?? '' },
      i18n.language
    );

  const goal = summary?.profile.dailyGoalAyat ?? null;
  const done = summary?.todayAyat ?? 0;
  const where = at
    ? `${name(at.surah)} ${formatLocaleNumber(at.surah)}:${formatLocaleNumber(at.ayah)}`
    : '';
  return (
    <Shell
      testId="quick-quran"
      tone="emerald"
      icon={<BookOpenIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />}
      title={t('home.quick.quran', 'Quran')}
      sub={
        khatamOn
          ? t('home.quick.quranKhatam', 'Khatam: {{where}}', { where })
          : at
            ? t('home.quick.quranLast', 'Last read: {{where}}', { where })
            : t('home.quick.quranNone', 'Begin with any surah')
      }
      aside={<Count done={done} goal={goal} unit={t('home.quick.ayat', 'āyāt')} />}
    >
      {goal ? <Progress pct={(done / goal) * 100} tone="emerald" /> : null}
      <div className="flex gap-2 mt-3">
        <Link to={href ?? '/quran/browse'} className={`${BTN_PRIMARY} flex-1 min-h-[44px] py-2`}>
          {href
            ? khatamOn
              ? t('home.quick.continueKhatam', 'Continue khatam')
              : t('home.quick.continue', 'Continue')
            : t('home.quick.startReading', 'Start reading')}
        </Link>
      </div>
      <div className="flex gap-2 mt-2">
        <Link to="/quran/listen" className={`${BTN_SECONDARY} flex-1 min-h-[44px] py-2`}>
          {t('home.quick.listen', 'Listen')}
        </Link>
        <Link to="/quran/browse" className={`${BTN_SECONDARY} flex-1 min-h-[44px] py-2`}>
          {t('home.quick.pickSurah', 'Pick a surah')}
        </Link>
      </div>
    </Shell>
  );
}

// ── Zikr ─────────────────────────────────────────────────────────────────────

export function ZikrQuickCard({ today, goal }: { today: number; goal: number | null }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const addCounts = useZikrStore((s) => s.addCounts);
  const chips = useMemo(() => getQuickZikr(), []);
  const action = useMemo(() => getQuickAction(), []);

  const tap = (z: QuickZikr) => {
    if (action === 'add') {
      // Self-reported, so it is counted as untimed (no session), like Set count.
      addCounts({ [z.name]: z.count });
      celebrateSmall();
    } else {
      navigate(counterHref(z));
    }
  };

  return (
    <Shell
      testId="quick-zikr"
      tone="gold"
      icon={<TasbihIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />}
      title={t('home.quick.zikr', 'Zikr')}
      sub={
        goal
          ? t('home.quick.zikrGoal', 'Goal {{n}} a day', { n: formatLocaleNumber(goal) })
          : t('home.quick.zikrNoGoal', 'Your chosen dhikr, one tap away')
      }
      aside={<Count done={today} goal={goal} />}
    >
      {goal ? <Progress pct={(today / goal) * 100} tone="gold" /> : null}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {chips.map((z) => (
          <button
            key={z.name}
            type="button"
            onClick={() => tap(z)}
            aria-label={
              action === 'add'
                ? t('home.quick.zikrAdd', 'Add {{n}} {{name}}', {
                    n: formatLocaleNumber(z.count),
                    name: zikrDisplayName(z.name, i18n.language),
                  })
                : t('home.quick.zikrOpen', 'Count {{name}}, target {{n}}', {
                    n: formatLocaleNumber(z.count),
                    name: zikrDisplayName(z.name, i18n.language),
                  })
            }
            className="min-h-[52px] rounded-control border border-brand-border bg-brand-surface/60 hover:border-brand-gold/50 px-1.5 py-1.5 text-center leading-tight transition-colors"
          >
            <span className="block text-white text-[11px] font-bold line-clamp-2">
              {zikrDisplayName(z.name, i18n.language)}
            </span>
            <span className="block text-brand-gold text-xs font-black tabular-nums mt-0.5">
              {action === 'add' ? '+' : ''}
              {formatLocaleNumber(z.count)}
            </span>
          </button>
        ))}
      </div>
      <Link
        to="/zikr"
        className="mt-2 flex items-center justify-center gap-1 min-h-[44px] text-white/70 hover:text-white text-sm font-semibold"
      >
        {t('home.quick.openCounter', 'Open counter')}
        <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
      </Link>
    </Shell>
  );
}

// ── Fasting ──────────────────────────────────────────────────────────────────

export function FastingQuickCard({ excused }: { excused: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // A fast is a fixed calendar date, not the prayer tracking day (CLAUDE.md).
  const date = localTodayStr();
  const { data: log } = useFastingLog(date);
  const { data: summary } = useFastingSummary();
  const upsert = useUpsertFastingLog();
  const clear = useClearFastingLog();
  const ruling = useMemo(() => getDayRuling(new Date(date + 'T12:00:00'), getHijriToday()), [date]);
  const plan = quickFastPlan(ruling);
  const fasting = log?.status === 'intended' || log?.status === 'completed';
  const broke = log?.status === 'broken';

  const next = useMemo(() => {
    const n = nextSunnahFast(new Date());
    if (!n) return null;
    let times: { fajr: Date; maghrib: Date } | null = null;
    try {
      const raw = localStorage.getItem('bustandeen_location');
      if (raw) {
        const loc = JSON.parse(raw) as { latitude: number; longitude: number };
        const pt = calcPrayerTimes(loc.latitude, loc.longitude, n.date);
        times = { fajr: pt.fajr, maghrib: pt.maghrib };
      }
    } catch {
      times = null;
    }
    return { ...n, times };
  }, []);

  const yes = () => {
    if (fasting || broke) {
      // A second tap undoes it (Istiak: no separate "No").
      clear.mutate(date);
      return;
    }
    if (plan.kind !== 'log') {
      navigate('/fasting');
      return;
    }
    upsert.mutate({
      date,
      category: 'voluntary',
      voluntaryKind: plan.voluntaryKind,
      status: 'intended',
      hijri: ruling.hijriLabel ?? undefined,
    });
    celebrateSmall();
  };

  const breakFast = () => {
    if (!log) return;
    upsert.mutate({
      date,
      category: log.category,
      voluntaryKind: log.voluntaryKind,
      vowId: log.vowId,
      status: 'broken',
      hijri: log.hijri,
    });
  };

  const kindLabel = (id: string) =>
    t(`fastingRules.voluntary.${id}`, VOLUNTARY_BY_ID[id]?.label ?? id);
  const thisMonth = summary?.stats.thisMonth ?? 0;

  return (
    <Shell
      testId="quick-fasting"
      tone="info"
      icon={<CrescentIcon className="w-5 h-5 text-brand-info" aria-hidden="true" />}
      title={t('home.quick.fasting', 'Fasting')}
      sub={
        excused
          ? t('home.excused')
          : t('home.quick.fastsThisMonth', '{{n}} fasts this month', {
              n: formatLocaleNumber(thisMonth),
            })
      }
    >
      {excused ? null : plan.kind === 'haram' ? (
        <p className="mt-2.5 text-xs text-red-300 leading-snug">{plan.title}</p>
      ) : plan.kind === 'ramadan' ? (
        <Link
          to="/ramadan"
          className={`${BTN_SECONDARY} mt-3 w-full min-h-[44px] py-2 flex items-center justify-center`}
        >
          {t('home.quick.openRamadan', 'Open the Ramadan tracker')}
        </Link>
      ) : (
        <div className="flex items-center gap-2 mt-3">
          <span className="flex-1 min-w-0 text-sm text-white font-semibold leading-tight">
            {t('home.quick.fastingToday', 'Fasting today?')}
            {plan.kind === 'log' && (
              <span className="block text-white/60 text-[11px] font-medium truncate">
                {fasting || broke
                  ? kindLabel(log?.voluntaryKind ?? plan.voluntaryKind)
                  : kindLabel(plan.voluntaryKind)}
                {' · '}
                <Link to="/fasting" className="underline underline-offset-2">
                  {t('home.quick.change', 'Change')}
                </Link>
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={yes}
            aria-pressed={fasting}
            className={`min-h-[44px] px-4 rounded-control border text-sm font-bold transition-colors ${
              fasting
                ? 'bg-brand-emerald-dim border-brand-emerald-dim text-on-color'
                : 'border-brand-border bg-brand-surface/60 text-white hover:border-brand-emerald/50'
            }`}
          >
            {broke ? t('home.quick.broken', 'Broken') : t('home.quick.yes', 'Yes')}
          </button>
          {fasting && log?.status === 'intended' && (
            <button
              type="button"
              onClick={breakFast}
              className="min-h-[44px] px-4 rounded-control border border-brand-warm/50 text-brand-warm text-sm font-bold hover:bg-brand-warm/10"
            >
              {t('home.quick.broke', 'Broke')}
            </button>
          )}
        </div>
      )}
      {!excused && next && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-white/70 leading-snug">
          <span
            className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0"
            aria-hidden="true"
          />
          <span>
            {next.kind === 'mon_thu'
              ? t('home.quick.nextSunnahDay', 'Next sunnah fast: {{day}}', {
                  day: formatLocaleDate(next.date, { weekday: 'long' }),
                })
              : t('home.quick.nextSunnah', 'Next sunnah fast: {{day}}, {{kind}}', {
                  day: formatLocaleDate(next.date, { weekday: 'long' }),
                  kind: kindLabel(next.kind),
                })}
            {next.times &&
              ` · ${t('home.quick.suhoorIftar', 'suḥūr until {{fajr}}, ifṭār {{maghrib}}', {
                fajr: formatTime(next.times.fajr),
                maghrib: formatTime(next.times.maghrib),
              })}`}
          </span>
        </p>
      )}
    </Shell>
  );
}
