import { useTranslation } from 'react-i18next';
import { useNavigate, Navigate } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground.js';
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
        <div className="min-h-[60vh] grid place-items-center px-4 text-center">
          <div className="max-w-sm space-y-4">
            <div className="text-5xl">✨</div>
            <h1 className="text-white font-black text-xl">
              {t('naseeh.disabledTitle', 'Naseeh AI is off')}
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              {t(
                'naseeh.disabledDesc',
                'Enable Naseeh in Settings to unlock personalised weekly insights, muhāsabah reports and quick logging.'
              )}
            </p>
            <button
              className="btn bg-brand-emerald/20 border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/30"
              onClick={() => navigate('/settings')}
            >
              {t('naseeh.openSettings', 'Open Settings')}
            </button>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('naseeh.pageTitle', 'Naseeh — AI Companion')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-20 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-white font-black text-2xl">
              ✨ {t('naseeh.pageHeading', 'Naseeh')}
            </h2>
            <p className="text-white/40 text-sm mt-0.5">
              {t('naseeh.pageSubheading', 'Your personal Islamic productivity companion')}
            </p>
          </div>
        </div>

        {/* Quick log — always at the top so it's one tap away */}
        <NaturalLogEntry />

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
        <p className="text-white/20 text-[10px] text-center leading-relaxed px-4">
          {t(
            'naseeh.disclaimer',
            'Naseeh uses AI to personalise encouragement — not to give rulings (fatwa). Always verify religious guidance with a qualified scholar.'
          )}
        </p>
      </div>
    </AnimatedBackground>
  );
}
