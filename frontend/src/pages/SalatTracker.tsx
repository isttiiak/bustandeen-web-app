import { Link } from 'react-router';
import { m as motion } from 'framer-motion';
import TabNav from '../components/TabNav.js';
import { BriefcaseIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { type PrayerId, type PrayerStatus } from '../hooks/useSalatLog.js';
import { getPrayerEndTime, formatTime } from '../utils/prayerTimes.js';
import ExcusedCard from '../components/ExcusedCard.js';
import SalatSettings from '../components/SalatSettings.js';
import Seo from '../components/Seo.js';
import MusafirBanner from '../components/MusafirBanner.js';
import TravelKazaCard from '../components/TravelKazaCard.js';
import { isQasrPrayer, jamPartner } from '../utils/musafir.js';
import {
  offsetDate,
  isFuturePrayer,
  isCurrentPrayer,
  STATUS_STYLE,
} from '../components/salat/salatParts.js';
import SalatLegend from '../components/salat/SalatLegend.js';
import SalatKazaDebtCard from '../components/salat/SalatKazaDebtCard.js';
import SalatNaflCard from '../components/salat/SalatNaflCard.js';
import SignInSheet from '../components/SignInSheet.js';
import SalatMonthCalendar from '../components/salat/SalatMonthCalendar.js';
import SalatWeekStrip from '../components/salat/SalatWeekStrip.js';
import FridayHourCard from '../components/salat/FridayHourCard.js';
import SalatHero from '../components/salat/SalatHero.js';
import SalatPrayerRow from '../components/salat/SalatPrayerRow.js';
import SalatFridayTravel from '../components/salat/SalatFridayTravel.js';
import SalatPrayerDetails from '../components/salat/SalatPrayerDetails.js';
import SalatPrayerToggle from '../components/salat/SalatPrayerToggle.js';
import SalatCardTop from '../components/salat/SalatCardTop.js';
import SalatCardJoining from '../components/salat/SalatCardJoining.js';
import SalatCardGuidance from '../components/salat/SalatCardGuidance.js';
import { useSalatTrackerState } from '../components/salat/useSalatTrackerState.js';
import { useSalatNaflDebt } from '../components/salat/useSalatNaflDebt.js';
import { useSalatDhikrCredit } from '../components/salat/useSalatDhikrCredit.js';
import { useSalatPrayerHandlers } from '../components/salat/useSalatPrayerHandlers.js';

// ─── component ───────────────────────────────────────────────────────────────

export default function SalatTracker() {
  // State first, then the handlers, in the original order (see useSalatTrackerState).
  const state = useSalatTrackerState();
  const {
    t,
    cycleActive,
    user,
    selectedDate,
    setSelectedDate,
    expandedPrayer,
    setExpandedPrayer,
    showGuestDialog,
    setShowGuestDialog,
    isToday,
    musafir,
    travelDay,
    travelPrayer,
    canJoin,
    isPastDay,
    isAtStartDate,
    todayPrayerTimes,
    adhkarNow,
    calendarOpen,
    setCalendarOpen,
    calMonth,
    setCalMonth,
    isOverdueToday,
    log,
    isLoading,
    weekDays,
    calendarDataMap,
    ramadanTodayLog,
    toggleTarawih,
    isCivilFriday,
    isFridayToday,
    fridayHour,
    showSettings,
    setShowSettings,
    naflExpanded,
    setNaflExpanded,
    naflInfoExpanded,
    setNaflInfoExpanded,
    debt,
    debtExpanded,
    setDebtExpanded,
    legendExpanded,
    setLegendExpanded,
    debtDrafts,
    setDebtDrafts,
  } = state;
  const {
    commitDebtEdit,
    naflEntry,
    getTypeRakat,
    naflTotalRakat,
    handleNaflToggle,
    handleNaflTypeToggle,
    handleTypeRakat,
  } = useSalatNaflDebt(state);
  const creditDhikr = useSalatDhikrCredit(state);
  const {
    locationTagText,
    trackablePrayers,
    completedCount,
    normaliseStatus,
    handleStatus,
    handleMissedReason,
    setQasr,
    joinPair,
    toggleJoined,
    handleSubTag,
  } = useSalatPrayerHandlers(state, creditDhikr);

  return (
    // Bustan Arch (audit T3.2): one arch hero (day + leaf marks), flat cards
    // with two radii and theme elevations, SVG icons only, no glows.
    <div className="min-h-screen bg-brand-void">
      <Seo
        title={t('salatTracker.seoTitle', 'Salat Tracker: Log Your 5 Daily Prayers')}
        description={t(
          'salatTracker.seoDescription',
          "Track Fajr, Dhuhr, Asr, Maghrib and Isha with on-time/late/kaza logging, Jumu'ah tracking, streaks and automatic missed-prayer (kaza) debt accrual."
        )}
        path="/salat"
      />
      {/* ── Tab navigation ── */}
      <h1 className="sr-only">{t('salatTracker.title', 'Salat Tracker')}</h1>
      <div className="px-4 pt-3 pb-0 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <TabNav
            items={[
              {
                label: t('salatTracker.tabTracker', 'Tracker'),
                to: '/salat',
                active: true,
              },
              {
                label: t('salatTracker.tabAnalytics', 'Analytics'),
                to: '/salat/analytics',
              },
            ]}
          />
        </div>
        <Link
          to="/musafir"
          aria-label={t('salatTracker.musafirAria', 'Musafir mode')}
          title={t('salatTracker.musafirAria', 'Musafir mode')}
          className={`shrink-0 p-2 rounded-control border transition-colors ${
            musafir
              ? 'border-brand-info/60 bg-brand-info/10 text-brand-info'
              : 'border-brand-border bg-brand-deep text-white/60 hover:text-brand-info hover:border-brand-info/40'
          }`}
        >
          <BriefcaseIcon className="w-5 h-5" />
        </Link>
        <button
          onClick={() => setShowSettings(true)}
          aria-label={t('salatTracker.settingsAria', 'Salat settings')}
          title={t('salatTracker.settingsAria', 'Salat settings')}
          className="shrink-0 p-2 rounded-control border border-brand-border bg-brand-deep text-white/60 hover:text-brand-emerald hover:border-brand-emerald/40 transition-colors"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
      </div>
      <SalatSettings open={showSettings} onClose={() => setShowSettings(false)} />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl mx-auto space-y-5">
          {(() => {
            const excused = !!(cycleActive && selectedDate >= cycleActive.startDate);
            const marks = trackablePrayers.map((p) => {
              const raw = normaliseStatus(log?.prayers[p.id as PrayerId]?.status);
              return {
                id: p.id,
                name: p.name,
                status: (isPastDay && raw === 'pending' ? 'missed' : raw) as PrayerStatus,
              };
            });
            return (
              <SalatHero
                selectedDate={selectedDate}
                isToday={isToday}
                isAtStartDate={isAtStartDate}
                onPrev={() => {
                  if (!isAtStartDate) {
                    setSelectedDate((d) => offsetDate(d, -1));
                    setExpandedPrayer(null);
                  }
                }}
                onNext={() => {
                  setSelectedDate((d) => offsetDate(d, 1));
                  setExpandedPrayer(null);
                }}
                marks={marks}
                completedCount={completedCount}
                excused={excused}
              />
            );
          })()}

          {travelDay && musafir && (
            <MusafirBanner state={musafir} today={selectedDate} variant="salat" />
          )}
          {/* Friday: the hour of response (Abū Dāwūd 1048, ṣaḥīḥ). Shown only
              while it is actually running (ʿAṣr has begun, Maghrib has not).
              No notification permission, no cron: the page already ticks
              every minute for the prayer clock. */}
          <FridayHourCard fridayHour={fridayHour} />

          {/* Weekly summary — quick glance at the last 7 days, tap a day to jump */}
          <SalatWeekStrip
            calendarOpen={calendarOpen}
            selectedDate={selectedDate}
            setCalMonth={setCalMonth}
            setCalendarOpen={setCalendarOpen}
            setExpandedPrayer={setExpandedPrayer}
            setSelectedDate={setSelectedDate}
            weekDays={weekDays}
          />

          {/* Month calendar — full month view, tap any day to navigate there */}
          <SalatMonthCalendar
            calMonth={calMonth}
            calendarDataMap={calendarDataMap}
            calendarOpen={calendarOpen}
            selectedDate={selectedDate}
            setCalMonth={setCalMonth}
            setCalendarOpen={setCalendarOpen}
            setExpandedPrayer={setExpandedPrayer}
            setSelectedDate={setSelectedDate}
          />

          {/* Rayhanah days — salat fully excused (never made up) */}
          {cycleActive && selectedDate >= cycleActive.startDate ? (
            <ExcusedCard feature="salat" />
          ) : (
            <>
              {/* Prayer cards */}
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-brand-emerald" />
                </div>
              ) : (
                <div className="space-y-2">
                  {trackablePrayers.map((prayer, i) => {
                    const prayerId = prayer.id as PrayerId;
                    const entry = log?.prayers[prayerId];
                    // Normalise legacy DB values (old model used 'prayed'/'mosque') to new schema
                    const rawStatus = (entry?.status ?? 'pending') as string;
                    const status: PrayerStatus =
                      rawStatus === 'prayed' || rawStatus === 'mosque'
                        ? 'completed'
                        : rawStatus in STATUS_STYLE
                          ? (rawStatus as PrayerStatus)
                          : 'pending';
                    // Past unlogged fard shows as missed (still editable — just tap a status).
                    const displayStatus: PrayerStatus =
                      isPastDay && status === 'pending' ? 'missed' : status;
                    const style = STATUS_STYLE[displayStatus] ?? STATUS_STYLE['pending'];
                    const isCurrent =
                      isToday && isCurrentPrayer(prayerId, todayPrayerTimes?.current);
                    const isFuture = isToday && isFuturePrayer(prayerId, todayPrayerTimes?.times);
                    // Musafir: is this row a shortened (qaṣr) prayer? A logged
                    // flag wins; otherwise a travel day implies it for Ẓuhr/ʿAṣr/ʿIshāʾ.
                    const rowTravel = travelPrayer(prayerId);
                    const isQasrRow =
                      entry?.qasr === true ||
                      (rowTravel && isQasrPrayer(prayerId) && entry?.qasr !== false);
                    // Friday's Dhuhr is Jumu'ah — unless a traveller prays Ẓuhr instead.
                    const isJumuah = prayerId === 'dhuhr' && isCivilFriday && !isQasrRow;
                    // Joined early (jamʿ taqdīm): logged before its own time came.
                    const joinedEarly = isFuture && !!entry?.jam;
                    const jamWith = jamPartner(prayerId);
                    // Window auto-closed today (adhan-derived) but never logged —
                    // nudge without forcing it into 'missed' the way a past day does.
                    const isOverdue = status === 'pending' && isOverdueToday(prayerId);
                    const isExpanded = expandedPrayer === prayerId;
                    const hasSubTag = status === 'completed' || status === 'kaza';

                    // Current prayer time (if available)
                    const prayerStartTime =
                      todayPrayerTimes?.times[prayerId] instanceof Date
                        ? formatTime(todayPrayerTimes.times[prayerId])
                        : null;
                    // End times — only shown for today
                    const prayerEndTime =
                      todayPrayerTimes?.full && isToday
                        ? formatTime(getPrayerEndTime(prayerId, todayPrayerTimes.full))
                        : null;
                    // Isha has a secondary "final window" end (tomorrow's Fajr)
                    const ishaFinalEndTime =
                      prayerId === 'isha' && todayPrayerTimes?.full && isToday
                        ? formatTime(new Date(todayPrayerTimes.full.fajr.getTime() + 86_400_000))
                        : null;

                    return (
                      <motion.div
                        key={prayer.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 * i }}
                        layout
                        className={`rounded-card border overflow-hidden shadow-elev-1 hover:shadow-hover transition-[border-color,box-shadow] ${
                          isCurrent
                            ? 'bg-brand-emerald/[0.08] border-brand-emerald/60'
                            : isOverdue
                              ? 'bg-brand-gold/[0.07] border-brand-gold/40'
                              : `${style.bg} ${style.border}`
                        }`}
                      >
                        {/* Main row */}
                        <SalatPrayerRow
                          prayer={prayer}
                          prayerId={prayerId}
                          entry={entry}
                          status={status}
                          style={style}
                          isCurrent={isCurrent}
                          isOverdue={isOverdue}
                          isToday={isToday}
                          isFuture={isFuture}
                          isJumuah={isJumuah}
                          isQasrRow={isQasrRow}
                          rowTravel={rowTravel}
                          joinedEarly={joinedEarly}
                          hasSubTag={hasSubTag}
                          prayerStartTime={prayerStartTime}
                          prayerEndTime={prayerEndTime}
                          ishaFinalEndTime={ishaFinalEndTime}
                          handleStatus={handleStatus}
                        />

                        {/* Travelling on a Friday: a full-width strip rather than a
                            line in the narrow name column, which on small phones
                            wrapped to five lines beside the buttons. */}
                        <SalatFridayTravel
                          prayerId={prayerId}
                          isCivilFriday={isCivilFriday}
                          rowTravel={rowTravel}
                          isJumuah={isJumuah}
                        />

                        <SalatPrayerDetails
                          hasSubTag={hasSubTag}
                          isExpanded={isExpanded}
                          status={status}
                          isJumuah={isJumuah}
                          entry={entry}
                          prayerId={prayerId}
                          rowTravel={rowTravel}
                          isQasrRow={isQasrRow}
                          isCivilFriday={isCivilFriday}
                          isFridayToday={isFridayToday}
                          canJoin={canJoin}
                          jamWith={jamWith}
                          log={log}
                          normaliseStatus={normaliseStatus}
                          locationTagText={locationTagText}
                          handleSubTag={handleSubTag}
                          handleMissedReason={handleMissedReason}
                          setQasr={setQasr}
                          toggleJoined={toggleJoined}
                        />

                        <SalatPrayerToggle
                          hasSubTag={hasSubTag}
                          status={status}
                          isFuture={isFuture}
                          isExpanded={isExpanded}
                          entry={entry}
                          prayerId={prayerId}
                          setExpandedPrayer={setExpandedPrayer}
                        />

                        <SalatCardTop
                          prayerId={prayerId}
                          isToday={isToday}
                          adhkarNow={adhkarNow}
                          ramadanTodayLog={ramadanTodayLog}
                          toggleTarawih={toggleTarawih}
                        />

                        <SalatCardJoining
                          prayerId={prayerId}
                          isToday={isToday}
                          isCurrent={isCurrent}
                          hasSubTag={hasSubTag}
                          status={status}
                          jamWith={jamWith}
                          rowTravel={rowTravel}
                          canJoin={canJoin}
                          travelPrayer={travelPrayer}
                          normaliseStatus={normaliseStatus}
                          log={log}
                          todayPrayerTimes={todayPrayerTimes}
                          musafir={musafir}
                          joinPair={joinPair}
                        />

                        <SalatCardGuidance
                          prayerId={prayerId}
                          isToday={isToday}
                          isCurrent={isCurrent}
                          isFuture={isFuture}
                          isJumuah={isJumuah}
                          rowTravel={rowTravel}
                          cycleActive={cycleActive}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Nafl Prayer card — tile-grid redesign */}
              <SalatNaflCard
                getTypeRakat={getTypeRakat}
                handleNaflToggle={handleNaflToggle}
                handleNaflTypeToggle={handleNaflTypeToggle}
                handleTypeRakat={handleTypeRakat}
                isLoading={isLoading}
                naflEntry={naflEntry}
                naflExpanded={naflExpanded}
                naflInfoExpanded={naflInfoExpanded}
                naflTotalRakat={naflTotalRakat}
                setNaflExpanded={setNaflExpanded}
                setNaflInfoExpanded={setNaflInfoExpanded}
              />

              {/* Kaza debt — missed prayers owed, paid back one at a time */}
              <SalatKazaDebtCard
                calendarDataMap={calendarDataMap}
                commitDebtEdit={commitDebtEdit}
                debt={debt}
                debtDrafts={debtDrafts}
                debtExpanded={debtExpanded}
                isLoading={isLoading}
                setCalendarOpen={setCalendarOpen}
                setDebtDrafts={setDebtDrafts}
                setDebtExpanded={setDebtExpanded}
                setExpandedPrayer={setExpandedPrayer}
                setSelectedDate={setSelectedDate}
                setShowSettings={setShowSettings}
                trackablePrayers={trackablePrayers}
              />

              {/* Travel kaza — the owed prayers that fell on a journey, made up
                  as travel prayers (see TravelKazaCard). Renders nothing otherwise. */}
              {!isLoading && user && <TravelKazaCard />}

              {/* Legend */}
              <SalatLegend legendExpanded={legendExpanded} setLegendExpanded={setLegendExpanded} />
            </>
          )}
        </div>
      </div>

      {/* ── Guest sign-in sheet (U10): salat logs are server-side only ── */}
      <SignInSheet
        open={showGuestDialog}
        onClose={() => setShowGuestDialog(false)}
        feature="salat"
      />
    </div>
  );
}
