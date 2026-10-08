import { useTranslation } from 'react-i18next';
import { useNavigate, Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { Cog6ToothIcon, SparklesIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { BTN_PRIMARY } from '../components/bustanStyles.js';
import MuhasabahReport from '../components/ai/MuhasabahReport.js';
import StreakCoaching from '../components/ai/StreakCoaching.js';
import NaturalLogEntry from '../components/ai/NaturalLogEntry.js';
import FastingCompanion from '../components/ai/FastingCompanion.js';
import PatternInsightsCard from '../components/ai/PatternInsightsCard.js';
import KazaPlanCard from '../components/ai/KazaPlanCard.js';
import DataChat from '../components/ai/DataChat.js';
import AiPrivacyPanel from '../components/ai/AiPrivacyPanel.js';
import RestDaysCard from '../components/ai/RestDaysCard.js';
import WeeklyPlanCard from '../components/ai/WeeklyPlanCard.js';
import { useCycleAiGate } from '../hooks/useCycleAiGate.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { useQuranSummary } from '../hooks/useQuran.js';
import { useSalatAnalytics } from '../hooks/useSalatLog.js';
import { useFastingLog, localTodayStr } from '../hooks/useFasting.js';

/** The one arch hero on /naseeh: title, a line, and the main action. */
function NaseehHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30">
        <SparklesIcon className="w-8 h-8 text-brand-emerald" aria-hidden />
      </div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-4">{title}</h1>
      <p className="text-white/70 text-sm mt-2 leading-relaxed max-w-sm mx-auto">{subtitle}</p>
      <div className="mt-5 flex flex-col items-center gap-2">{children}</div>
    </section>
  );
}

export default function NaseehPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  // On-device: are we on a Rayhanah rest day? Decides whether ANY AI card runs.
  const cycleGate = useCycleAiGate();

  const civilToday = localTodayStr();
  const { data: analyticsData } = useAnalytics(1);
  const { data: quranSummary } = useQuranSummary();
  const { data: salatAnalytics } = useSalatAnalytics(90);
  const { data: todayFast } = useFastingLog(civilToday);

  const zikrStreak = analyticsData?.streak?.currentStreak ?? null;
  const quranStreak = quranSummary?.streak ?? null;
  const salatStreak = salatAnalytics?.currentStreak ?? null;

  // Fasting companion — show when today's fast is logged as completed
  const fastActive = todayFast?.status === 'completed';
  const fastType =
    todayFast?.category === 'voluntary'
      ? (todayFast.voluntaryKind ?? 'voluntary')
      : (todayFast?.category ?? 'obligatory');
  const now = new Date();
  const isPostMaghrib = now.getHours() >= 18 || now.getHours() < 4;

  if (!user) return null;
  // Naseeh needs a real account (it reads your own logs); the demo has none.
  if (isDemoMode) return <Navigate to="/" replace />;

  if (!aiEnabled) {
    return (
      <AnimatedBackground variant="dark">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-20">
          <NaseehHero
            title={t('naseeh.disabledTitle', 'Naseeh AI is off')}
            subtitle={t(
              'naseeh.disabledDesc',
              'Enable Naseeh in Settings to unlock personalised weekly insights, muhāsabah reports and quick logging.'
            )}
          >
            <button type="button" className={BTN_PRIMARY} onClick={() => navigate('/settings')}>
              <Cog6ToothIcon className="w-4 h-4" aria-hidden />
              {t('naseeh.openSettings', 'Open Settings')}
            </button>
          </NaseehHero>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground variant="dark">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-20 space-y-4">
        {/* Quick log sits in the hero so it is one tap away */}
        <NaseehHero
          title={t('naseeh.pageHeading', 'Naseeh')}
          subtitle={t('naseeh.pageSubheading', 'Your personal Islamic productivity companion')}
        >
          <NaturalLogEntry />
        </NaseehHero>

        {/* Rest days (Rayhanah): one fixed, gentle, on-device card replaces every
            progress card below. None of them mount, so none of them can call the AI. */}
        {cycleGate === 'resting' && <RestDaysCard />}

        {/* While the cycle status is still loading, show none of the AI cards yet. */}
        {cycleGate === 'clear' && (
          <>
            {/* This week's plan: sized to the last four weeks; server-side, no AI */}
            <WeeklyPlanCard />

            {/* Streak coaching — only renders when a milestone or break is detected */}
            <StreakCoaching
              zikrStreak={zikrStreak}
              quranStreak={quranStreak}
              salatStreak={salatStreak}
            />

            {/* Fasting companion — only renders when today's fast is logged */}
            {fastActive && <FastingCompanion fastType={fastType} isPostMaghrib={isPostMaghrib} />}

            {/* What Naseeh noticed in the user's own logs (computed first, AI only re-words) */}
            <PatternInsightsCard />

            {/* Make-up prayer plan; hidden when nothing is owed */}
            <KazaPlanCard />

            {/* Weekly muhāsabah with verified reference */}
            <MuhasabahReport />
          </>
        )}

        {/* Read-only questions about the user's own numbers */}
        <DataChat />

        {/* What each feature sends, and the off switch */}
        <AiPrivacyPanel />

        {/* Footer note */}
        <p className="text-white/55 text-[11px] text-center leading-relaxed px-4">
          {t(
            'naseeh.disclaimer',
            'Naseeh uses AI to personalise encouragement, not to give rulings (fatwa). Always verify religious guidance with a qualified scholar.'
          )}
        </p>
      </div>
    </AnimatedBackground>
  );
}
