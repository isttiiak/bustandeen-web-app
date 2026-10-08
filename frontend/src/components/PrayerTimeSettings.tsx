import { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  MapPinIcon,
  ClockIcon,
  GlobeAltIcon,
  SunIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import LocationPicker from './LocationPicker.js';
import { BTN_SECONDARY, ITEM, SECTION_TITLE } from './bustanStyles.js';
import { useMusafir } from '../utils/musafir.js';
import type { StoredLocation } from '../utils/geocode.js';
import {
  ASR_MADHABS,
  getAsrMadhab,
  setAsrMadhab,
  type AsrMadhab,
  CALC_METHODS,
  getCalcMethod,
  setCalcMethod,
  type CalculationMethodId,
  regionPrayerDefaults,
  dismissPrayerDefaultsSuggestion,
} from '../utils/salatPrefs.js';
import { countryName, deviceCountry } from '../utils/countryDefaults.js';

/**
 * Prayer Times settings: a right-side DRAWER, same shape as SalatSettings.
 *
 * Only things that change the TIMETABLE live here: location, calculation
 * method, and ʿAṣr madhab. Per-worshipper tracking prefs (tasbīḥ counting,
 * kaza debt reset) stay in SalatSettings; this page is about the clock,
 * not the tracker. One exception: a link to Musafir mode, because a traveller
 * checking prayer times away from home is exactly who needs it.
 */
export default function PrayerTimeSettings({
  open,
  onClose,
  location,
  onLocationChange,
}: {
  open: boolean;
  onClose: () => void;
  location: StoredLocation | null;
  onLocationChange: (loc: StoredLocation) => void;
}) {
  const { t, i18n } = useTranslation();
  const musafir = useMusafir();
  // What most mosques in this device's country use, marked in both pickers.
  const country = deviceCountry();
  const region = regionPrayerDefaults();
  const usualLabel = country
    ? t('salatSettings.usualIn', 'Usual in {{country}}', {
        country: countryName(country, i18n.language === 'bn' ? 'bn' : 'en'),
      })
    : null;
  const [madhab, setMadhab] = useState<AsrMadhab>(() => getAsrMadhab());
  const [calcMethod, setCalcMethodState] = useState<CalculationMethodId>(() => getCalcMethod());
  const [changingLocation, setChangingLocation] = useState(false);

  // The drawer stays mounted while closed, so re-read the saved choices each
  // time it opens: they can change elsewhere (the "usual times" card, a
  // cross-device sync) while it is hidden.
  useEffect(() => {
    if (!open) return;
    setMadhab(getAsrMadhab());
    setCalcMethodState(getCalcMethod());
  }, [open]);

  const chooseMadhab = (m: AsrMadhab) => {
    setMadhab(m);
    setAsrMadhab(m);
    // An explicit choice answers the one-time "your country usually…" card.
    dismissPrayerDefaultsSuggestion();
    toast.success(t('salatSettings.timesUpdated', 'Prayer times updated'), { duration: 1800 });
  };

  const chooseCalcMethod = (m: CalculationMethodId) => {
    setCalcMethodState(m);
    setCalcMethod(m);
    dismissPrayerDefaultsSuggestion();
    toast.success(t('salatSettings.timesUpdated', 'Prayer times updated'), { duration: 1800 });
  };

  const handleLocationChange = (loc: StoredLocation) => {
    onLocationChange(loc);
    setChangingLocation(false);
    toast.success(t('prayerTimeSettings.locationUpdated', 'Location updated'), { duration: 1800 });
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-sm bg-brand-deep border-l border-brand-border shadow-elev-3 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={t('prayerTimeSettings.title', 'Prayer time settings')}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3 bg-brand-deep/95 backdrop-blur border-b border-brand-border">
              <h2 className="font-display text-white font-bold text-lg flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
                {t('prayerTimeSettings.title', 'Prayer time settings')}
              </h2>
              <button
                onClick={onClose}
                aria-label={t('prayerTimeSettings.close', 'Close prayer time settings')}
                className="p-1.5 rounded-control text-white/70 hover:text-white hover:bg-brand-surface"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* ── Musafir mode ───────────────────────────────────────── */}
              <Link
                to="/musafir"
                onClick={onClose}
                className={`${ITEM} flex items-center gap-3 shadow-elev-1`}
              >
                <span className="w-9 h-9 rounded-control bg-brand-gold/15 flex items-center justify-center shrink-0">
                  <BriefcaseIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-white font-bold text-sm">
                    {t('prayerTimeSettings.musafirTitle', 'Musafir mode')}
                    <span className="ml-2 text-[10px] font-black uppercase text-white/70">
                      {musafir
                        ? t('prayerTimeSettings.musafirOn', 'on')
                        : t('prayerTimeSettings.musafirOff', 'off')}
                    </span>
                  </span>
                  <span className="block text-white/70 text-xs mt-0.5 leading-snug">
                    {t(
                      'prayerTimeSettings.musafirDesc',
                      'Travelling? Shortened and joined prayers, the travel duʿās and every concession with its hadith.'
                    )}
                  </span>
                </span>
                <ChevronRightIcon className="w-4 h-4 text-white/70 shrink-0" aria-hidden="true" />
              </Link>

              {/* ── Location ───────────────────────────────────────────── */}
              <section>
                <h3 className={SECTION_TITLE}>
                  <MapPinIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
                  {t('prayerTimeSettings.locationTitle', 'Location')}
                </h3>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">
                  {t(
                    'prayerTimeSettings.locationDesc',
                    'Prayer times are calculated from this location, on this device. It is never sent to Bustandeen.'
                  )}
                </p>

                {!changingLocation ? (
                  <div className="mt-3 flex items-center justify-between gap-2 p-3 rounded-control border border-brand-border bg-brand-surface/50">
                    <span className="flex items-center gap-1.5 text-white/80 text-sm min-w-0">
                      <MapPinIcon className="w-4 h-4 text-brand-emerald shrink-0" />
                      <span className="truncate">
                        {location?.name || t('prayerTimeSettings.noLocation', 'Not set')}
                      </span>
                    </span>
                    <button
                      onClick={() => setChangingLocation(true)}
                      className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs shrink-0`}
                    >
                      {location
                        ? t('prayerTimes.change', 'Change')
                        : t('prayerTimes.setLocation', 'Set Location')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <LocationPicker onLocationChange={handleLocationChange} />
                    <button
                      onClick={() => setChangingLocation(false)}
                      className="text-white/70 hover:text-white text-xs mt-2 underline underline-offset-2"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                  </div>
                )}
              </section>

              {/* ── Calculation method ─────────────────────────────────── */}
              <section>
                <h3 className={SECTION_TITLE}>
                  <GlobeAltIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
                  {t('salatSettings.calcMethodTitle', 'Calculation method')}
                </h3>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">
                  {t(
                    'salatSettings.calcMethodDesc',
                    'Sets the Fajr/Isha twilight angles, the main reason prayer-time apps disagree. Match your local mosque if times feel off.'
                  )}
                </p>
                <select
                  value={calcMethod}
                  onChange={(e) => chooseCalcMethod(e.target.value as CalculationMethodId)}
                  aria-label={t('salatSettings.calcMethodTitle', 'Calculation method')}
                  className="select select-bordered w-full mt-3 bg-shade/30 border-brand-border text-white text-sm rounded-control"
                >
                  {CALC_METHODS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-brand-deep text-white">
                      {m.label}
                      {usualLabel && m.id === region.method ? ` · ${usualLabel}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-white/70 text-xs mt-2 leading-relaxed">
                  {CALC_METHODS.find((m) => m.id === calcMethod)?.detail}
                </p>
              </section>

              {/* ── Asr madhab ─────────────────────────────────────────── */}
              <section>
                <h3 className={SECTION_TITLE}>
                  <SunIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
                  {t('salatSettings.asrTitle', 'ʿAṣr timing (madhab)')}
                </h3>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">
                  {t(
                    'salatSettings.asrDesc',
                    'Madhabs differ on when ʿAṣr begins. Because Ẓuhr lasts until ʿAṣr starts, this moves both. Follow your local mosque.'
                  )}
                </p>

                <div className="mt-3 space-y-2.5">
                  {ASR_MADHABS.map((m) => {
                    const active = madhab === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => chooseMadhab(m.id)}
                        aria-pressed={active}
                        className={`w-full text-left p-3.5 rounded-control border transition-colors ${
                          active
                            ? 'border-brand-emerald/50 bg-brand-emerald/10 shadow-elev-1'
                            : 'border-brand-border bg-brand-surface/50 hover:border-brand-emerald/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-black text-sm ${active ? 'text-brand-emerald' : 'text-white/80'}`}
                          >
                            {m.label}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            {usualLabel && m.id === region.asr && (
                              <span className="text-[10px] font-semibold text-brand-gold border border-brand-gold/40 rounded-full px-2 py-0.5">
                                {usualLabel}
                              </span>
                            )}
                            {active && (
                              <span className="flex items-center gap-1 text-brand-emerald text-xs font-bold">
                                <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                {t('salatSettings.using', 'Using')}
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-white/70 text-xs mt-1 leading-relaxed">{m.detail}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <p className="text-white/70 text-[11px] leading-relaxed border-t border-brand-border pt-4">
                {t(
                  'prayerTimeSettings.trackerHint',
                  "Looking for tasbīḥ counting or kaza debt? That's in"
                )}{' '}
                <Link
                  to="/salat"
                  onClick={onClose}
                  className="text-brand-emerald hover:brightness-110 underline underline-offset-2"
                >
                  {t('salatTracker.settingsAria', 'Salat settings')}
                </Link>
                .
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
