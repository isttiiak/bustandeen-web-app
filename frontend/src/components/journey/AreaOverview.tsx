import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { CrescentIcon, MosqueIcon, TasbihIcon } from '../icons/IslamicIcons.js';
import { useSalatDebt, useSalatJourney } from '../../hooks/useSalatLog.js';
import { useAnalytics } from '../../hooks/useAnalytics.js';
import { useQuranSummary } from '../../hooks/useQuran.js';
import { useFastingSummary } from '../../hooks/useFasting.js';
import type { StatsArea } from '../../hooks/useStatsResets.js';
import { formatDayLabel, formatLocaleNumber } from '../../utils/localeDate.js';

// One overview card per area (Journey page, and the top of each analytics
// Journey tab): the current phase since the last fresh start, like the
// Salat Journey's current-phase card.

const n = (v: number | undefined) => formatLocaleNumber(v ?? 0);

function Shell({
  area,
  Icon,
  since,
  big,
  bigLabel,
  stats,
  link,
}: {
  area: StatsArea;
  Icon: (p: { className?: string }) => ReactNode;
  since: string | null | undefined;
  big: string;
  bigLabel: string;
  stats: { label: string; value: string; tone?: string }[];
  /** Where the full analytics live (left out on that page's own tab). */
  link?: string;
}) {
  const { t } = useTranslation();
  const body = (
    <div className="rounded-card border border-brand-emerald/30 bg-brand-emerald/10 shadow-elev-2 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="w-6 h-6 shrink-0 text-brand-emerald" />
          <div className="min-w-0">
            <p className="font-display text-white font-bold text-base leading-tight">
              {t(`freshStart.area.${area}`)}
            </p>
            <p className="text-white/70 text-xs">
              {since
                ? t('freshStart.since', { date: formatDayLabel(since) })
                : t('freshStart.never')}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-brand-emerald tabular-nums leading-none">{big}</p>
          <p className="text-white/70 text-[10px] mt-1">{bigLabel}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {stats.map((s) => (
          <span key={s.label} className={`font-bold tabular-nums ${s.tone ?? 'text-white'}`}>
            {s.value} <span className="font-normal text-white/70">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
  if (!link) return <section data-testid={`overview-${area}`}>{body}</section>;
  return (
    <Link
      to={link}
      className="relative block group"
      data-testid={`overview-${area}`}
      aria-label={t('journey.openAnalytics', { area: t(`freshStart.area.${area}`) })}
    >
      {body}
      <ChevronRightIcon
        className="absolute right-3 bottom-3 w-4 h-4 text-white/50 group-hover:text-white"
        aria-hidden="true"
      />
    </Link>
  );
}

function SalatOverview({ link }: { link?: string }) {
  const { t } = useTranslation();
  const { data: phases } = useSalatJourney();
  const { data: debt } = useSalatDebt();
  const now = phases?.find((p) => p.to === null) ?? phases?.[0];
  return (
    <Shell
      area="salat"
      Icon={MosqueIcon}
      since={now && now.index > 0 ? now.from : null}
      big={`${n(now?.completionRate)}%`}
      bigLabel={t('journey.days', { count: now?.days ?? 0, n: n(now?.days) })}
      stats={[
        {
          label: t('salatAnalytics.onTime'),
          value: n((now?.done ?? 0) - (now?.kaza ?? 0)),
          tone: 'text-brand-emerald',
        },
        { label: t('salatAnalytics.kaza'), value: n(now?.kaza), tone: 'text-brand-gold' },
        { label: t('salatAnalytics.missed'), value: n(now?.missed), tone: 'text-data-none' },
        { label: t('journey.kazaOwed'), value: n(debt?.totalOwed), tone: 'text-brand-gold' },
      ]}
      link={link}
    />
  );
}

function ZikrOverview({ link }: { link?: string }) {
  const { t } = useTranslation();
  const { data } = useAnalytics(7);
  return (
    <Shell
      area="zikr"
      Icon={TasbihIcon}
      since={data?.allTime.since}
      big={n(data?.allTime.totalCount)}
      bigLabel={t('journey.zikrTotal')}
      stats={[
        { label: t('journey.streak'), value: n(data?.streak.currentStreak) },
        { label: t('journey.bestStreak'), value: n(data?.streak.longestStreak) },
        { label: t('journey.bestDay'), value: n(data?.allTime.bestDay.count) },
      ]}
      link={link}
    />
  );
}

function QuranOverview({ link }: { link?: string }) {
  const { t } = useTranslation();
  const { data } = useQuranSummary();
  return (
    <Shell
      area="quran"
      Icon={BookOpenIcon}
      since={data?.since}
      big={n(data?.stats.allTimeUnits)}
      bigLabel={t('journey.ayat')}
      stats={[
        { label: t('journey.streak'), value: n(data?.streak) },
        { label: t('journey.bestStreak'), value: n(data?.bestStreak) },
        { label: t('journey.khatm'), value: n(data?.profile.khatmCount) },
      ]}
      link={link}
    />
  );
}

function FastingOverview({ link }: { link?: string }) {
  const { t } = useTranslation();
  const { data } = useFastingSummary();
  return (
    <Shell
      area="fasting"
      Icon={CrescentIcon}
      since={data?.stats.since}
      big={n(data?.stats.total)}
      bigLabel={t('journey.fasts')}
      stats={[
        { label: t('journey.voluntary'), value: n(data?.stats.voluntaryTotal) },
        { label: t('journey.monThuStreak'), value: n(data?.stats.monThuStreak) },
        { label: t('journey.qadaOwed'), value: n(data?.profile.qadaOwed), tone: 'text-brand-gold' },
      ]}
      link={link}
    />
  );
}

const CARDS: Record<StatsArea, (p: { link?: string }) => ReactNode> = {
  salat: SalatOverview,
  zikr: ZikrOverview,
  quran: QuranOverview,
  fasting: FastingOverview,
};

export const ANALYTICS_PATH: Record<StatsArea, string> = {
  salat: '/salat/analytics',
  zikr: '/zikr/analytics',
  quran: '/quran/analytics',
  fasting: '/fasting/analytics',
};

/** The overview card of one area; `linked` adds a link to its analytics. */
export default function AreaOverview({
  area,
  linked = false,
}: {
  area: StatsArea;
  linked?: boolean;
}) {
  const Card = CARDS[area];
  return <Card link={linked ? ANALYTICS_PATH[area] : undefined} />;
}
