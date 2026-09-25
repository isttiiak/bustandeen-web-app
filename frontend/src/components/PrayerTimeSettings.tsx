import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LocationPicker from './LocationPicker.js';
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
} from '../utils/salatPrefs.js';

/**
 * Prayer Times settings — a right-side DRAWER, same shape as SalatSettings.
 *
 * Only things that change the TIMETABLE live here: location, calculation
 * method, and ʿAṣr madhab. Per-worshipper tracking prefs (tasbīḥ counting,
 * kaza debt reset) stay in SalatSettings — this page is about the clock,
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
  const { t } = useTranslation();
  const musafir = useMusafir();
  const [madhab, setMadhab] = useState<AsrMadhab>(() => getAsrMadhab());
  const [calcMethod, setCalcMethodState] = useState<CalculationMethodId>(() => getCalcMethod());
  const [changingLocation, setChangingLocation] = useState(false);

  const chooseMadhab = (m: AsrMadhab) => {
    setMadhab(m);
    setAsrMadhab(m);
    toast.success(t('salatSettings.timesUpdated', 'Prayer times updated'), {
      icon: '🕌',
      duration: 1800,
    });
  };

  const chooseCalcMethod = (m: CalculationMethodId) => {
    setCalcMethodState(m);
    setCalcMethod(m);
    toast.success(t('salatSettings.timesUpdated', 'Prayer times updated'), {
      icon: '🕌',
      duration: 1800,
    });
  };

  const handleLocationChange = (loc: StoredLocation) => {
    onLocationChange(loc);
    setChangingLocation(false);
    toast.success(t('prayerTimeSettings.locationUpdated', 'Location updated'), {
      icon: '📍',
      duration: 1800,
    });
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
            className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-sm bg-brand-deep border-l border-brand-border overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={t('prayerTimeSettings.title', 'Prayer time settings')}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-brand-deep/95 backdrop-blur border-b border-brand-emerald/10">
              <h2 className="text-brand-emerald font-black text-lg">
                {t('prayerTimeSettings.title', 'Prayer time settings')}
              </h2>
              <button
                onClick={onClose}
                aria-label={t('prayerTimeSettings.close', 'Close prayer time settings')}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-7">
              {/* ── Musafir mode ───────────────────────────────────────── */}
              <Link
                to="/musafir"
                onClick={onClose}
                className="flex items-center gap-3 rounded-2xl border border-brand-info/30 bg-brand-info/[0.08] p-4 hover:border-brand-info/60 transition-colors"
              >
                <span className="text-2xl">🧳</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-brand-info font-bold text-sm">
                    {t('prayerTimeSettings.musafirTitle', 'Musafir mode')}
                    <span className="ml-2 text-[10px] font-black uppercase text-white/40">
                      {musafir
                        ? t('prayerTimeSettings.musafirOn', 'on')
                        : t('prayerTimeSettings.musafirOff', 'off')}
                    </span>
                  </span>
                  <span className="block text-white/45 text-xs mt-0.5 leading-snug">
                    {t(
                      'prayerTimeSettings.musafirDesc',
                      'Travelling? Shortened and joined prayers, the travel duʿās and every concession with its hadith.'
                    )}
                  </span>
                </span>
                <span className="text-brand-info/60">→</span>
              </Link>

              {/* ── Location ───────────────────────────────────────────── */}
              <section>
                <h3 className="text-white font-bold text-sm">
                  {t('prayerTimeSettings.locationTitle', '📍 Location')}
                </h3>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">
                  {t(
                    'prayerTimeSettings.locationDesc',
                    'Prayer times are calculated from this location, on this device — it never leaves your browser.'
                  )}
                </p>

                {!changingLocation ? (
                  <div className="mt-3 flex items-center justify-between gap-2 p-3.5 rounded-2xl border border-brand-emerald/10 bg-white/5">
                    <span className="flex items-center gap-1.5 text-white/70 text-sm min-w-0">
                      <MapPinIcon className="w-4 h-4 text-brand-emerald shrink-0" />
                      <span className="truncate">
                        {location?.name || t('prayerTimeSettings.noLocation', 'Not set')}
                      </span>
                    </span>
                    <button
                      onClick={() => setChangingLocation(true)}
                      className="btn btn-xs bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/20 shrink-0"
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
                      className="text-white/30 hover:text-white/50 text-xs mt-2 underline underline-offset-2"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                  </div>
                )}
              </section>

              {/* ── Calculation method ─────────────────────────────────── */}
              <section>
                <h3 className="text-white font-bold text-sm">
                  {t('salatSettings.calcMethodTitle', '🌐 Calculation method')}
                </h3>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">
                  {t(
                    'salatSettings.calcMethodDesc',
                    'Sets the Fajr/Isha twilight angles — the main source of disagreement between prayer-time apps. Match your local mosque if times feel off.'
                  )}
                </p>
                <select
                  value={calcMethod}
                  onChange={(e) => chooseCalcMethod(e.target.value as CalculationMethodId)}
                  className="select select-bordered w-full mt-3 bg-white/5 border-brand-emerald/20 text-white text-sm"
                >
                  {CALC_METHODS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-brand-deep text-white">
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-white/40 text-xs mt-2 leading-relaxed">
                  {CALC_METHODS.find((m) => m.id === calcMethod)?.detail}
                </p>
              </section>

              {/* ── Asr madhab ─────────────────────────────────────────── */}
              <section>
                <h3 className="text-white font-bold text-sm">
                  {t('salatSettings.asrTitle', '🕌 ʿAṣr timing (madhab)')}
                </h3>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">
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
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                          active
                            ? 'border-brand-info/40 bg-brand-info/10'
                            : 'border-brand-emerald/10 bg-white/5 hover:border-brand-info/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-black text-sm ${active ? 'text-brand-info' : 'text-white/80'}`}
                          >
                            {m.label}
                          </span>
                          {active && (
                            <span className="text-brand-info text-xs font-bold shrink-0">
                              {t('salatSettings.using', '✓ Using')}
                            </span>
                          )}
                        </div>
                        <p className="text-white/50 text-xs mt-1 leading-relaxed">{m.detail}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <p className="text-white/25 text-[11px] leading-relaxed border-t border-brand-emerald/10 pt-4">
                {t(
                  'prayerTimeSettings.trackerHint',
                  "Looking for tasbīḥ counting or kaza debt? That's in"
                )}{' '}
                <a
                  href="/salat"
                  className="text-brand-emerald/70 hover:text-brand-emerald underline underline-offset-2"
                >
                  {t('salatTracker.settingsAria', 'Salat settings')}
                </a>
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
