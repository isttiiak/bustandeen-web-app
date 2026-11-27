import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import RamadanSheetCard from '../components/RamadanSheetCard.js';
import RamadanSalatCard from '../components/RamadanSalatCard.js';
import DaifExplainer from '../components/DaifExplainer.js';
import TabNav from '../components/TabNav.js';
import RamadanCountdown from '../components/ramadan/RamadanCountdown.js';
import RamadanDayArch from '../components/ramadan/RamadanDayArch.js';
import RamadanLastTen from '../components/ramadan/RamadanLastTen.js';
import RamadanMonthGrid from '../components/ramadan/RamadanMonthGrid.js';
import RamadanWorshipStrip from '../components/ramadan/RamadanWorshipStrip.js';
import { useRamadanPage } from '../components/ramadan/useRamadanPage.js';

/**
 * Dedicated Ramadan tracker (v3.1) — the month gets its own home:
 *  · countdown + preparation before the month
 *  · 30-day grid, suhoor/iftar times, tarawih nights, Laylat al-Qadr focus
 *  · fully wired with FastingLog (category 'ramadan') and Rayhanah Cycle
 *    (excused days show the Rayhanah flower and flow into qada automatically
 *    on cycle end)
 *
 * Bustan Arch (T3.2): the day (or the countdown) is the screen's one arch;
 * everything else is a theme card with the elevation shadow. SVG marks only.
 *
 * Split into parts in components/ramadan/ (audit P4-1): useRamadanPage holds the
 * state, the rest are the countdown and the live month's cards.
 */
export default function RamadanTracker() {
  const { t } = useTranslation();
  const page = useRamadanPage();
  const {
    gate,
    today,
    window_,
    excusedToday,
    nightDay,
    nightTarawih,
    toggleTarawih,
    worshipToday,
    inLastTen,
    nightNo,
    tonightOdd,
    yearLabel,
  } = page;

  const tabs = (
    <TabNav
      items={[
        { label: t('ramadan.tabTracker'), to: '/ramadan', active: true },
        { label: t('ramadan.tabAnalytics'), to: '/ramadan/analytics' },
      ]}
    />
  );

  // ────────────────────────── COUNTDOWN MODE ──────────────────────────
  if (!window_.active) {
    return <RamadanCountdown window_={window_} tabs={tabs} yearLabel={yearLabel} />;
  }

  // ────────────────────────── LIVE MODE ──────────────────────────
  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('ramadan.title', 'Ramadan Tracker')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3">{tabs}</div>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
        {/* The screen's one arch: today */}
        <RamadanDayArch page={page} />

        {/* ── Today's worship: every tracker in one strip ──────────────
            Ramadan is the month people most want to do everything, and the
            worst time to make them hunt through tabs for it. Live numbers from
            the trackers they already use; each tile is a direct link. */}
        <RamadanWorshipStrip worshipToday={worshipToday} />

        {/* Salat + nafl, inline: no trip to /salat and back */}
        <RamadanSalatCard
          date={today}
          excused={excusedToday}
          tarawih={nightTarawih}
          tarawihNight={nightDay?.dayNumber}
          onToggleTarawih={nightDay ? toggleTarawih : undefined}
          canSave={gate.canSave}
        />

        {/* Laylat al-Qadr focus */}
        {inLastTen && <RamadanLastTen nightNo={nightNo} tonightOdd={tonightOdd} />}

        {/* 30-day grid */}
        <RamadanMonthGrid page={page} />

        <RamadanSheetCard window={window_} />

        {/* Every ḍaʿīf badge on this page is accounted for here: chain,
            defect, and who graded it (Istiak's rule). */}
        <DaifExplainer topics={['ramadan-ashra', 'nafl-fard-reward']} />
      </div>
      {gate.sheet}
    </AnimatedBackground>
  );
}
