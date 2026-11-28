import { useTranslation } from 'react-i18next';
import IntentionLine from '../components/analytics/IntentionLine.js';
import AnimatedBackground from '../components/AnimatedBackground.js';
import SinceChip from '../components/SinceChip.js';
import TabNav from '../components/TabNav.js';
import ChartInfoModal from '../components/ChartInfoModal.js';
import { CARD } from '../components/bustanStyles.js';
import {
  SalatAnalyticsControls,
  SalatMonthPicker,
} from '../components/salat/SalatAnalyticsControls.js';
import {
  SalatBounceBackCard,
  SalatMosqueTrendSection,
  SalatTimingAndReasons,
  SalatWeekdayCard,
} from '../components/salat/SalatAnalyticsPatterns.js';
import { SalatAnalyticsSummary } from '../components/salat/SalatAnalyticsSummary.js';
import { SalatJourneyView } from '../components/salat/SalatJourneyView.js';
import {
  SalatKazaDebtSection,
  SalatKazaInsightsCard,
} from '../components/salat/SalatKazaAnalytics.js';
import { SalatPerPrayerCards } from '../components/salat/SalatPerPrayerCards.js';
import { SalatPrayerCalendar } from '../components/salat/SalatPrayerCalendar.js';
import { useSalatAnalyticsPage } from '../components/salat/useSalatAnalyticsPage.js';

export default function SalatAnalytics() {
  const { t } = useTranslation();
  const {
    days,
    setDays,
    selectedMonth,
    setSelectedMonth,
    showMonthPicker,
    setShowMonthPicker,
    pickerYear,
    setPickerYear,
    trackingToday,
    activeView,
    setActiveView,
    infoTopic,
    setInfoTopic,
    chartInfo,
    data,
    isLoading,
    isError,
    resets,
    debt,
    debtHistory,
    kazaInsights,
    journeyPhases,
    journeyLoading,
    bounceBack,
  } = useSalatAnalyticsPage();

  const todayStr = trackingToday;

  const DAY_LABELS = [
    t('salatAnalytics.dayFri'),
    t('salatAnalytics.daySat'),
    t('salatAnalytics.daySun'),
    t('salatAnalytics.dayMon'),
    t('salatAnalytics.dayTue'),
    t('salatAnalytics.dayWed'),
    t('salatAnalytics.dayThu'),
  ];

  return (
    <AnimatedBackground variant="dark">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Tab navigation — mirrors SalatTracker */}
          <TabNav
            items={[
              { label: t('salat.tracker'), to: '/salat' },
              { label: t('salat.analytics'), to: '/salat/analytics', active: true },
            ]}
          />
          <IntentionLine />
          <SinceChip since={resets?.salat.date} />

          {/* Title + view toggle + period selector */}
          <SalatAnalyticsControls
            activeView={activeView}
            setActiveView={setActiveView}
            days={days}
            setDays={setDays}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            showMonthPicker={showMonthPicker}
            setShowMonthPicker={setShowMonthPicker}
          />

          {/* Month picker panel */}
          {showMonthPicker && (
            <SalatMonthPicker
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              pickerYear={pickerYear}
              setPickerYear={setPickerYear}
              setShowMonthPicker={setShowMonthPicker}
            />
          )}

          {activeView === 'stats' && (
            <>
              {isLoading && (
                <div className="flex justify-center py-20">
                  <span className="loading loading-spinner loading-lg text-brand-emerald" />
                </div>
              )}
              {isError && (
                <div className={CARD}>
                  <div className="text-center p-10">
                    <p className="text-white/70">{t('salatAnalytics.loadError')}</p>
                  </div>
                </div>
              )}

              {data && !isLoading && (
                <>
                  <SalatAnalyticsSummary data={data} days={days} debt={debt} />

                  {/* Per-prayer cards */}
                  <SalatPerPrayerCards data={data} />

                  {/* By day of week — completion rate per weekday, Islamic-week order */}
                  <SalatWeekdayCard
                    data={data}
                    dayLabels={DAY_LABELS}
                    chartInfo={chartInfo}
                    setInfoTopic={setInfoTopic}
                  />

                  {/* Prayer timing + missed reasons — side by side on wider screens */}
                  <SalatTimingAndReasons
                    data={data}
                    chartInfo={chartInfo}
                    setInfoTopic={setInfoTopic}
                  />

                  {/* Kaza debt chart — weekly accumulation vs payback, grouped bars */}
                  <SalatKazaDebtSection
                    debtHistory={debtHistory}
                    chartInfo={chartInfo}
                    setInfoTopic={setInfoTopic}
                  />

                  {/* Kaza insights — derived from the itemized ledger (see KazaUnit),
                      only shown once there's at least one itemized entry to say
                      anything about. */}
                  <SalatKazaInsightsCard
                    kazaInsights={kazaInsights}
                    chartInfo={chartInfo}
                    setInfoTopic={setInfoTopic}
                  />

                  {/* How a missed prayer is followed: from the Done / Kaza / Miss marks only */}
                  <SalatBounceBackCard
                    bounceBack={bounceBack}
                    chartInfo={chartInfo}
                    setInfoTopic={setInfoTopic}
                  />

                  {/* Mosque frequency trend — weekly attendance rate, last 12 weeks max */}
                  <SalatMosqueTrendSection
                    data={data}
                    chartInfo={chartInfo}
                    setInfoTopic={setInfoTopic}
                  />

                  {/* Prayer Calendar — horizontal (weeks flow left→right, days top→bottom) */}
                  <SalatPrayerCalendar
                    data={data}
                    todayStr={todayStr}
                    dayLabels={DAY_LABELS}
                    chartInfo={chartInfo}
                    setInfoTopic={setInfoTopic}
                  />
                </>
              )}
            </>
          )}

          {/* ── Journey view ── */}
          {activeView === 'journey' && (
            <SalatJourneyView
              journeyPhases={journeyPhases}
              journeyLoading={journeyLoading}
              chartInfo={chartInfo}
              setInfoTopic={setInfoTopic}
            />
          )}
        </div>
      </div>

      <ChartInfoModal
        title={infoTopic ? (chartInfo[infoTopic]?.title ?? null) : null}
        body={infoTopic ? chartInfo[infoTopic]?.body : undefined}
        onClose={() => setInfoTopic(null)}
      />
    </AnimatedBackground>
  );
}
