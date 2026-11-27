import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import RayhanahSettingsDrawer from '../components/RayhanahSettingsDrawer.js';
import CycleCalendar from '../components/CycleCalendar.js';
import TabNav from '../components/TabNav.js';
import { FlowerIcon } from '../components/icons/IslamicIcons.js';
import RayhanahGarden from '../components/cycle/RayhanahGarden.js';
import RayhanahAdhkar from '../components/cycle/RayhanahAdhkar.js';
import RayhanahFastingMakeup from '../components/cycle/RayhanahFastingMakeup.js';
import RayhanahFiqhCompanion from '../components/cycle/RayhanahFiqhCompanion.js';
import { useRayhanahPage } from '../components/cycle/useRayhanahPage.js';
import RayhanahArch from '../components/cycle/RayhanahArch.js';
import RayhanahTodayNote from '../components/cycle/RayhanahTodayNote.js';
import RayhanahLastEnded from '../components/cycle/RayhanahLastEnded.js';
import RayhanahSharing from '../components/cycle/RayhanahSharing.js';
import RayhanahDialogs from '../components/cycle/RayhanahDialogs.js';

// Rayhanah privacy rule: no cycle data (days, flow, symptoms, moods, dates)
// is ever sent to an AI or shown to friends. Everything on this screen is
// fixed text chosen on the device; the only network calls are the user's own
// cycle/fasting endpoints and the opt-in partner status.

export default function RayhanahCycle() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const page = useRayhanahPage();
  const {
    user,
    isFemale,
    today,
    summary,
    active,
    garden,
    gardenDone,
    toggleGarden,
    lastEnded,
    qadaOwed,
    qadaCompleted,
    qadaRemaining,
    ramadanWindow,
    showRamadanQadaWarning,
    settingsOpen,
    setSettingsOpen,
  } = page;

  if (!user) return null;
  if (!isFemale) {
    // Gentle gate: the page is reachable only from the female-only menu entry
    return (
      <div className="min-h-[60vh] grid place-items-center px-4 text-center">
        <div>
          <span className="mx-auto mb-4 w-14 h-14 rounded-full grid place-items-center bg-brand-pink/10 border border-brand-pink/40 text-brand-pink">
            <FlowerIcon className="w-7 h-7" />
          </span>
          <p className="text-white/70 text-sm max-w-sm">
            {t(
              'rayhanah.genderGate',
              'Rayhanah Cycle is a private space for our sisters. Set your gender to female in'
            )}{' '}
            <button className="text-brand-emerald underline" onClick={() => navigate('/profile')}>
              {t('rayhanah.genderGateLink', 'your profile')}
            </button>{' '}
            {t('rayhanah.genderGateSuffix', 'to open it.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('rayhanah.title', 'Rayhanah Cycle')}</h1>
      <div className="px-4 pt-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <TabNav
              items={[
                { label: t('rayhanah.tabCycle', 'Cycle'), to: '/cycle', active: true },
                { label: t('rayhanah.tabAnalytics', 'Analytics'), to: '/cycle/analytics' },
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
      <div className="relative max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
        {/* ── The screen's one arch ─────────────────────────────────────────── */}
        <RayhanahArch page={page} user={user} />

        {/* ── Garden of Light (only during excused days) ────────────────────── */}
        {active && (
          <RayhanahGarden garden={garden} gardenDone={gardenDone} toggleGarden={toggleGarden} />
        )}

        {/* ── How are you today? (private wellness note) ────────────────────── */}
        {active && <RayhanahTodayNote page={page} active={active} />}

        {/* ── Du'a & adhkar for excused days ────────────────────────────── */}
        {active && <RayhanahAdhkar />}

        {/* ── Fasting makeup summary ─────────────────────────────────────────
            Gated on qadaRemaining (not qadaOwed, which is the lifetime total)
            so the card disappears once every owed fast is made up, instead of
            leaving a stale "0 remaining" reminder around forever. */}
        {qadaRemaining > 0 && (
          <RayhanahFastingMakeup
            qadaOwed={qadaOwed}
            qadaCompleted={qadaCompleted}
            qadaRemaining={qadaRemaining}
            showRamadanQadaWarning={showRamadanQadaWarning}
            ramadanWindow={ramadanWindow}
          />
        )}

        {/* ── "I'm not done yet": ABOVE the calendar so it's the first thing
               she sees after ending too early (Istiak's spec) ── */}
        {lastEnded && <RayhanahLastEnded page={page} lastEnded={lastEnded} />}

        {/* ── Cycle calendar + stats ────────────────────────────────────────── */}
        {summary && <CycleCalendar summary={summary} today={today} />}

        {/* ── Sharing + pregnancy + privacy ──────────────────────────────────── */}
        <RayhanahSharing page={page} />

        {/* ── What changes / what stays (education) ─────────────────────────── */}
        <RayhanahFiqhCompanion />
      </div>

      <RayhanahSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Dialogs are portaled: AnimatedBackground wraps pages in `relative z-10`,
          which kept them under the sticky navbar. */}
      <RayhanahDialogs page={page} />
    </AnimatedBackground>
  );
}
