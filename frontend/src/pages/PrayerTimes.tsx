import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import PrayerTimeSettings from '../components/PrayerTimeSettings.js';
import PrayerDefaultsSuggestion from '../components/PrayerDefaultsSuggestion.js';
import LocationPicker from '../components/LocationPicker.js';
import { Cog6ToothIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { BTN_SECONDARY, CARD } from '../components/bustanStyles.js';
import { CompassIcon, MosqueIcon } from '../components/icons/IslamicIcons.js';
import {
  calcPrayerTimes,
  getCurrentAndNextPrayer,
  type PrayerTimesResult,
} from '../utils/prayerTimes.js';
import { getHijriToday, formatHijriDate } from '../utils/islamicCalendar.js';
import { loadZoneLookup, placeToday, placeYmd, ymdNoon } from '../utils/placeClock.js';
import { formatLocaleDate } from '../utils/localeDate.js';
import {
  reverseGeocodeCity,
  looksLikeRawCoordinates,
  type StoredLocation,
} from '../utils/geocode.js';
import { buildTimeline } from '../components/prayerTimes/timeline.js';
import LiveClockCard from '../components/prayerTimes/LiveClockCard.js';
import PrayerTimeline from '../components/prayerTimes/PrayerTimeline.js';
import PrayerSources from '../components/prayerTimes/PrayerSources.js';

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrayerTimes() {
  const { t } = useTranslation();
  const [now, setNow] = useState(new Date());
  const [location, setLocation] = useState<StoredLocation | null>(() => {
    const s = localStorage.getItem('bustandeen_location');
    return s ? (JSON.parse(s) as StoredLocation) : null;
  });
  const [times, setTimes] = useState<PrayerTimesResult | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  // ?settings=1 (the Home time-zone card's "Update location") opens the drawer.
  const [searchParams] = useSearchParams();
  const [showSettings, setShowSettings] = useState(() => searchParams.get('settings') === '1');
  // Bumped when the calc method / ʿAṣr school may have changed (settings
  // drawer closed, suggestion accepted) so the timetable recomputes at once.
  const [settingsRev, setSettingsRev] = useState(0);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  // 60-second tick for timeline active/past states — the live clock has its
  // own 1-second tick inside LiveClockCard so the whole page isn't re-rendered
  // (20+ animated cards) every second.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // The saved place's calendar day: the times change when IT changes, not when
  // the phone's date does (a phone on London time with Dhaka saved kept
  // yesterday's Dhaka times until London's midnight: far-zone report).
  const placeDay = location ? placeYmd(location.latitude, location.longitude, now) : '';
  useEffect(() => {
    if (!location) return;
    setTimes(calcPrayerTimes(location.latitude, location.longitude, now));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed once per place day; `now` itself ticks every minute
  }, [location, placeDay, settingsRev]);

  const saveLocation = useCallback((loc: StoredLocation) => {
    setLocation(loc);
    localStorage.setItem('bustandeen_location', JSON.stringify(loc));
    void loadZoneLookup();
  }, []);

  // Self-heal: a location saved while reverse geocoding failed (network
  // blip, rate limit) is stuck showing raw coordinates forever, since
  // nothing else re-triggers the lookup. Quietly retry once per visit.
  useEffect(() => {
    if (!location || !looksLikeRawCoordinates(location.name)) return;
    let cancelled = false;
    void reverseGeocodeCity(location.latitude, location.longitude).then((city) => {
      if (city && !cancelled) saveLocation({ ...location, name: city });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the coordinates themselves change, not on every saveLocation identity
  }, [location?.latitude, location?.longitude]);

  const info = times ? getCurrentAndNextPrayer(times, now) : null;

  const timeline = useMemo(
    () => (times ? buildTimeline(times, t, now, location) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the place's day is the correct granularity; finer ticks would unnecessarily rebuild the ~20-entry list
    [times, t, placeDay, now < (times?.fajr ?? new Date(0)), location]
  );

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('prayerTimes.seoTitle', 'Prayer Times: Accurate Salat Times for Your Location')}
        description={t(
          'prayerTimes.seoDescription',
          'On-device prayer time calculator for Fajr, Dhuhr, Asr, Maghrib and Isha, with multiple calculation methods, Hanafi/standard Asr settings and a live countdown.'
        )}
        path="/prayer-times"
      />
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-16 space-y-4">
        {/* Toolbar: Qibla, the saved place, settings */}
        <div className="flex items-center justify-between gap-3">
          <Link to="/qibla" className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs shrink-0`}>
            <CompassIcon className="w-4 h-4 text-brand-gold" aria-hidden />
            {t('qibla.title', 'Qibla Compass')}
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            {location && (
              <div className="flex items-center gap-1.5 text-white/75 text-xs min-w-0">
                <MapPinIcon className="w-3.5 h-3.5 text-brand-emerald shrink-0" aria-hidden />
                <span className="truncate max-w-[100px] sm:max-w-[160px]">{location.name}</span>
              </div>
            )}
            <button
              onClick={() => setShowSettings(true)}
              aria-label={t('prayerTimeSettings.title', 'Prayer time settings')}
              title={t('prayerTimeSettings.title', 'Prayer time settings')}
              className={`${BTN_SECONDARY} !p-2 shrink-0`}
            >
              <Cog6ToothIcon className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>

        <PrayerTimeSettings
          open={showSettings}
          onClose={() => {
            setShowSettings(false);
            setSettingsRev((r) => r + 1);
          }}
          location={location}
          onLocationChange={saveLocation}
        />

        {location && <PrayerDefaultsSuggestion onChange={() => setSettingsRev((r) => r + 1)} />}

        {/* First-run prompt: no location saved yet. Once set, changing it
            lives in Prayer time settings (the cog above), not inline here. */}
        {!location && (
          <div className={`${CARD} p-4 space-y-3`}>
            <p className="text-white/85 text-sm font-semibold">
              {t('prayerTimes.setLocationPrompt', 'Set your location to see prayer times')}
            </p>
            <LocationPicker onLocationChange={saveLocation} />
          </div>
        )}

        {/* Arch hero: title, dates and the live clock (self-ticking, isolated
            from the timeline below) */}
        <LiveClockCard
          times={times}
          timeline={timeline}
          hasLocation={!!location}
          location={location}
          header={
            <>
              <div className="w-14 h-14 mx-auto rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/30">
                <MosqueIcon className="w-7 h-7 text-brand-gold" aria-hidden />
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-3">
                {t('prayerTimes.title', 'Prayer Times')}
              </h1>
              <p className="text-white/75 text-sm mt-1">
                {formatLocaleDate(ymdNoon(placeToday(now)), {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {(() => {
                const h = getHijriToday();
                return h ? (
                  <p className="text-brand-gold text-xs mt-0.5">{formatHijriDate(h)}</p>
                ) : null;
              })()}
            </>
          }
        />

        {/* Interleaved timeline */}
        {location && times ? (
          <>
            <PrayerTimeline
              timeline={timeline}
              now={now}
              info={info}
              expandedEntry={expandedEntry}
              setExpandedEntry={setExpandedEntry}
            />

            {/* Sources, collapsed by default */}
            <PrayerSources
              sourcesExpanded={sourcesExpanded}
              setSourcesExpanded={setSourcesExpanded}
            />
          </>
        ) : null}
      </div>
    </AnimatedBackground>
  );
}
