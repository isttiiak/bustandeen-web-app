import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import TabNav from '../components/TabNav.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import CycleEditModal from '../components/CycleEditModal.js';
import RayhanahSettingsDrawer from '../components/RayhanahSettingsDrawer.js';
import { FlowerIcon } from '../components/icons/IslamicIcons.js';
import { CARD } from '../components/bustanStyles.js';
import {
  CycleInsightTiles,
  CycleIrregularityAlert,
  CycleStatTiles,
} from '../components/cycle/CycleAnalyticsOverview.js';
import {
  CycleBodyPatterns,
  CycleFastingMakeup,
  CycleLengthHistory,
} from '../components/cycle/CycleAnalyticsPatterns.js';
import {
  CyclePmsPattern,
  CyclePredictions,
} from '../components/cycle/CycleAnalyticsPredictions.js';
import { CycleBmiCard } from '../components/cycle/CycleBmiCard.js';
import { CycleHistoryCard } from '../components/cycle/CycleHistoryCard.js';
import { CyclePastPeriodDialog } from '../components/cycle/CyclePastPeriodDialog.js';
import { useCycleAnalyticsPage } from '../components/cycle/useCycleAnalyticsPage.js';

export default function CycleAnalytics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    user,
    isFemale,
    today,
    summary,
    isLoading,
    fastingSummary,
    bodyStats,
    hideBmi,
    addPast,
    deleteLog,
    settingsOpen,
    setSettingsOpen,
    pastOpen,
    setPastOpen,
    pastStart,
    setPastStart,
    pastEnd,
    setPastEnd,
    pastType,
    setPastType,
    editTarget,
    setEditTarget,
    pendingDelete,
    setPendingDelete,
    stats,
  } = useCycleAnalyticsPage();

  if (!user || !isFemale) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4 text-center">
        <div>
          <span className="mx-auto mb-4 w-14 h-14 rounded-full grid place-items-center bg-brand-pink/10 border border-brand-pink/40 text-brand-pink">
            <FlowerIcon className="w-7 h-7" />
          </span>
          <p className="text-white/70 text-sm max-w-sm">
            {t(
              'cycleAnalytics.accessRestricted',
              'Rayhanah Analytics is a private space for our sisters. Set your gender to female in'
            )}{' '}
            <button className="text-brand-emerald underline" onClick={() => navigate('/profile')}>
              {t('cycleAnalytics.yourProfile', 'your profile')}
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('cycleAnalytics.srTitle', 'Rayhanah Analytics')}</h1>
      <div className="px-4 pt-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <TabNav
              items={[
                { label: t('cycleAnalytics.tabCycle', 'Cycle'), to: '/cycle' },
                {
                  label: t('cycleAnalytics.tabAnalytics', 'Analytics'),
                  to: '/cycle/analytics',
                  active: true,
                },
              ]}
            />
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label={t('rayhanah.settings', 'Settings')}
            title={t('rayhanah.settings', 'Settings')}
            className="shrink-0 p-2 rounded-control border border-brand-border bg-brand-deep shadow-elev-1 text-white/70 hover:text-brand-pink hover:border-brand-pink/40 transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
        {isLoading ? (
          <div className={`${CARD} p-10 grid place-items-center`}>
            <span className="loading loading-spinner loading-lg text-brand-pink" />
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <CycleStatTiles stats={stats} />

            {/* BMI card — shown when height + weight are saved */}
            <CycleBmiCard bodyStats={bodyStats} hideBmi={hideBmi} summary={summary} />

            {/* Cycle insights — extended stats */}
            <CycleInsightTiles stats={stats} />

            {/* Irregularity alert */}
            <CycleIrregularityAlert stats={stats} />

            {/* Predicted windows, then the fertile window & ovulation */}
            <CyclePredictions stats={stats} />

            {/* PMS pattern */}
            <CyclePmsPattern stats={stats} />

            {/* Cycle & period length history */}
            <CycleLengthHistory stats={stats} />

            {/* Wellness insights */}
            <CycleBodyPatterns stats={stats} />

            {/* Fasting makeup summary */}
            <CycleFastingMakeup stats={stats} fastingSummary={fastingSummary} />

            {/* History + past-period backfill + export */}
            <CycleHistoryCard
              summary={summary}
              today={today}
              setPastStart={setPastStart}
              setPastEnd={setPastEnd}
              setPastType={setPastType}
              setPastOpen={setPastOpen}
              setEditTarget={setEditTarget}
              setPendingDelete={setPendingDelete}
            />
          </>
        )}
      </div>

      {/* Past period modal */}
      <CyclePastPeriodDialog
        pastOpen={pastOpen}
        setPastOpen={setPastOpen}
        pastStart={pastStart}
        setPastStart={setPastStart}
        pastEnd={pastEnd}
        setPastEnd={setPastEnd}
        pastType={pastType}
        setPastType={setPastType}
        addPast={addPast}
        today={today}
      />

      <CycleEditModal target={editTarget} today={today} onClose={() => setEditTarget(null)} />
      <RayhanahSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('cycleAnalytics.removeCycleTitle', 'Remove this cycle?')}
        message={
          pendingDelete
            ? t(
                'cycleAnalytics.removeCycleMessage',
                '{{label}} will be removed from your history and predictions.',
                { label: pendingDelete.label }
              )
            : ''
        }
        onConfirm={() => {
          if (pendingDelete) deleteLog.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </AnimatedBackground>
  );
}
