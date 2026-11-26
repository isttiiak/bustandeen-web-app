import { useTranslation } from 'react-i18next';
import ComebackNudge from '../components/ComebackNudge.js';
import ZoneMismatchCard from '../components/home/ZoneMismatchCard.js';
import TodayHighlights from '../components/home/TodayHighlights.js';
import TodayTimeline from '../components/home/TodayTimeline.js';
import {
  FastingQuickCard,
  QuranQuickCard,
  ZikrQuickCard,
} from '../components/home/QuickSections.js';
import { HomeCycleBanners } from '../components/home/HomeCycleBanners.js';
import { HomeGoals } from '../components/home/HomeGoals.js';
import { HomeLinks } from '../components/home/HomeLinks.js';
import { HomeMusafirGlance } from '../components/home/HomeMusafirGlance.js';
import { HomePrayerHero } from '../components/home/HomePrayerHero.js';
import { HomeSetupCard } from '../components/home/HomeSetupCard.js';
import { HomeSpecialBlock } from '../components/home/HomeSpecialBlock.js';
import { useHomeData } from '../components/home/useHomeData.js';

export default function Home() {
  const { t } = useTranslation();
  const home = useHomeData();
  const {
    isDemoMode,
    musafir,
    travelHint,
    setHintDismissed,
    setupMode,
    dismissSetup,
    sections,
    salatLog,
    analyticsGoal,
    effectiveToday,
    prayerNow,
    todaySpecialDays,
    sadaqahVirtueDay,
    prayerWidgetData,
    cycleActive,
    discreetMode,
    isFridayToday,
    fridayHour,
    homeAdhkar,
    homeLayout,
    highlights,
    blockDays,
    hasSpecialBlock,
    upcomingCycleDays,
  } = home;

  return (
    <div className="min-h-screen bg-brand-void">
      <h1 className="sr-only">{t('home.srTitle', 'Bustandeen, Islamic Productivity')}</h1>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome back after a quiet stretch, the gentlest possible restart */}
        <div className="mb-5 empty:mb-0">
          <ComebackNudge />
        </div>

        <HomeSetupCard setupMode={setupMode} dismissSetup={dismissSetup} />

        <HomeCycleBanners
          upcomingCycleDays={upcomingCycleDays}
          discreetMode={discreetMode}
          cycleActive={cycleActive}
        />

        <HomePrayerHero home={home} />

        {/* The phone's clock is on another zone than the saved place */}
        {prayerWidgetData && !isDemoMode && <ZoneMismatchCard now={prayerNow} />}

        {/* Today's special days sit directly under the arch, above everything else */}
        {homeLayout === 'strip' && (
          <TodayHighlights
            variant="strip"
            highlights={highlights}
            days={todaySpecialDays}
            fridayCountdown={fridayHour.countdown}
          />
        )}
        {/* Every special-day card sits under the arch in every layout (the
            strip and the arch chips only shorten the days already named). */}
        <HomeSpecialBlock
          blockDays={blockDays}
          sadaqahVirtueDay={sadaqahVirtueDay}
          fridayHour={fridayHour}
          isFridayToday={isFridayToday}
          hasSpecialBlock={hasSpecialBlock}
        />

        {/* Musafir mode: the journey at a glance */}
        <HomeMusafirGlance
          musafir={musafir}
          travelHint={travelHint}
          setHintDismissed={setHintDismissed}
        />

        {sections.map((s) =>
          s === 'salat' ? (
            prayerWidgetData && (
              <TodayTimeline
                key={s}
                times={prayerWidgetData.times}
                now={prayerNow}
                log={salatLog}
                excused={!!cycleActive}
                travelling={!!musafir}
                showAdhkar={homeAdhkar}
              />
            )
          ) : s === 'quran' ? (
            <QuranQuickCard key={s} />
          ) : s === 'zikr' ? (
            <ZikrQuickCard key={s} today={effectiveToday} goal={analyticsGoal} />
          ) : (
            <FastingQuickCard key={s} excused={!!cycleActive} />
          )
        )}

        {/* Today's goals: rows in their own order (Settings → Home) */}
        <HomeGoals home={home} />

        <HomeLinks />
      </div>
    </div>
  );
}
