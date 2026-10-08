import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { MapPinIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { BTN_PRIMARY, CARD } from '../components/bustanStyles.js';
import { CompassIcon, KaabaIcon } from '../components/icons/IslamicIcons.js';
import { calcQiblaBearing } from '../utils/qibla.js';

interface StoredLocation {
  latitude: number;
  longitude: number;
  name?: string;
}

// iOS Safari exposes an extra, already-North-relative field on the event that
// standard browsers don't type.
interface OrientationEventWithCompass extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

function readLocation(): StoredLocation | null {
  try {
    const s = localStorage.getItem('bustandeen_location');
    return s ? (JSON.parse(s) as StoredLocation) : null;
  } catch {
    return null;
  }
}

type SensorState = 'idle' | 'needs-permission' | 'active' | 'unavailable';

export default function QiblaCompass() {
  const { t } = useTranslation();
  const [location, setLocation] = useState<StoredLocation | null>(readLocation);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [sensorState, setSensorState] = useState<SensorState>('idle');
  const [heading, setHeading] = useState(0); // unwrapped, can exceed 0-360

  const rawPrev = useRef<number | null>(null);
  const unwrapped = useRef(0);
  const gotEventRef = useRef(false);

  const bearing = location ? calcQiblaBearing(location.latitude, location.longitude) : null;

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    const evt = e as OrientationEventWithCompass;
    let raw: number | null = null;
    if (typeof evt.webkitCompassHeading === 'number') {
      raw = evt.webkitCompassHeading; // already 0=N, clockwise
    } else if (evt.alpha != null) {
      raw = (360 - evt.alpha) % 360; // approximation for a roughly flat device
    }
    if (raw == null || Number.isNaN(raw)) return;
    gotEventRef.current = true;
    setSensorState('active');
    const prev = rawPrev.current;
    if (prev != null) {
      let delta = raw - prev;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      unwrapped.current += delta;
    } else {
      unwrapped.current = raw;
    }
    rawPrev.current = raw;
    setHeading(unwrapped.current);
  }, []);

  const startCompass = useCallback(() => {
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    const attach = () => {
      const evtName =
        'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
      window.addEventListener(evtName, handleOrientation as EventListener);
      // If no reading arrives shortly, this device/browser has no usable sensor.
      setTimeout(() => {
        if (!gotEventRef.current) setSensorState('unavailable');
      }, 2500);
    };
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission()
        .then((res) => {
          if (res === 'granted') attach();
          else setSensorState('unavailable');
        })
        .catch(() => setSensorState('unavailable'));
    } else if ('DeviceOrientationEvent' in window) {
      attach();
    } else {
      setSensorState('unavailable');
    }
  }, [handleOrientation]);

  useEffect(() => {
    if (!location) return;
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DOE?.requestPermission === 'function') {
      setSensorState('needs-permission');
    } else {
      startCompass();
    }
    const evtName =
      'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    return () => window.removeEventListener(evtName, handleOrientation as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per location; startCompass/handleOrientation are stable
  }, [location]);

  const requestLocation = useCallback(() => {
    setLocLoading(true);
    setLocError('');
    if (!navigator.geolocation) {
      setLocError(t('qibla.geoUnsupported', 'Geolocation is not supported on this device'));
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: StoredLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        localStorage.setItem('bustandeen_location', JSON.stringify(loc));
        setLocation(loc);
        setLocLoading(false);
      },
      () => {
        setLocError(
          t('qibla.geoFailed', 'Could not get your location. Allow location access and try again')
        );
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [t]);

  const dialRotation = -heading;
  const needleAngle = bearing != null ? bearing : 0;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('qibla.seoTitle', 'Qibla Compass: Find the Direction to Makkah')}
        description={t(
          'qibla.seoDescription',
          'Free on-device Qibla compass. Point your phone to find the exact direction to the Kaaba in Makkah for prayer, wherever you are.'
        )}
        path="/qibla"
      />
      <div className="max-w-md mx-auto px-4 pt-5 pb-16 space-y-4 text-center">
        {/* Arch hero: the title and, once there is a location, the dial */}
        <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-6">
          <div className="w-14 h-14 mx-auto rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/30">
            <CompassIcon className="w-7 h-7 text-brand-gold" aria-hidden />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-3">
            {t('qibla.title', 'Qibla Compass')}
          </h1>
          <p className="text-white/75 text-sm mt-1 leading-relaxed max-w-xs mx-auto">
            {t(
              'qibla.subtitle',
              'Point your phone flat and turn until the Kaaba marker points straight up.'
            )}
          </p>

          {location && (
            <>
              {sensorState === 'needs-permission' && (
                <button onClick={startCompass} className={`${BTN_PRIMARY} mt-4`}>
                  <CompassIcon className="w-4 h-4" aria-hidden />
                  {t('qibla.enableCompass', 'Enable compass')}
                </button>
              )}

              <div className="relative mx-auto mt-5" style={{ width: 260, height: 280 }}>
                {/* Fixed pointer: the top of the phone */}
                <svg
                  className="absolute left-1/2 top-0 -translate-x-1/2 w-5 h-4 text-brand-gold"
                  viewBox="0 0 20 16"
                  aria-hidden
                >
                  <path d="M10 15 2 1h16z" fill="currentColor" />
                </svg>
                <motion.div
                  className="absolute left-0 right-0 bottom-0 rounded-full border-2 border-brand-border bg-brand-surface/60 shadow-elev-1"
                  style={{ top: 20 }}
                  animate={{ rotate: sensorState === 'active' ? dialRotation : 0 }}
                  transition={{ type: 'tween', duration: 0.15, ease: 'linear' }}
                >
                  <span className="absolute inset-3 rounded-full border border-dashed border-brand-border" />
                  {(['N', 'E', 'S', 'W'] as const).map((label, i) => (
                    <span
                      key={label}
                      className={`absolute text-xs font-bold ${label === 'N' ? 'text-brand-gold' : 'text-white/70'}`}
                      style={{
                        top: i === 0 ? 14 : i === 2 ? undefined : '50%',
                        bottom: i === 2 ? 4 : undefined,
                        left: i === 3 ? 14 : i === 1 ? undefined : '50%',
                        right: i === 1 ? 4 : undefined,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {label}
                    </span>
                  ))}

                  {bearing != null && (
                    <div
                      className="absolute inset-0"
                      style={{ transform: `rotate(${needleAngle}deg)` }}
                    >
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 w-0.5 h-[26%] -translate-y-full bg-brand-gold/60 rounded-full" />
                      <span className="absolute left-1/2 top-9 -translate-x-1/2 w-11 h-11 rounded-full grid place-items-center bg-brand-deep border border-brand-gold/50 shadow-elev-1">
                        <KaabaIcon className="w-7 h-7 text-brand-gold" aria-hidden />
                      </span>
                    </div>
                  )}
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-brand-gold" />
                </motion.div>
              </div>
            </>
          )}
        </section>

        {!location && (
          <div className={`${CARD} p-6 space-y-3`}>
            <p className="text-white/85 text-sm">
              {t('qibla.needLocation', 'Set your location to find the Qibla direction.')}
            </p>
            <button onClick={requestLocation} disabled={locLoading} className={BTN_PRIMARY}>
              <MapPinIcon className="w-4 h-4" aria-hidden />
              {locLoading
                ? t('qibla.locating', 'Locating…')
                : t('qibla.useLocation', 'Use my location')}
            </button>
            {locError && <p className="text-red-400 text-xs">{locError}</p>}
          </div>
        )}

        {location && (
          <div className={`${CARD} p-4 space-y-3`}>
            {bearing != null && (
              <p className="text-white/85 text-sm">
                {t('qibla.bearingLabel', 'Qibla is {{deg}}° from true North', {
                  deg: Math.round(bearing),
                })}
              </p>
            )}

            {sensorState === 'unavailable' && (
              <p className="text-white/75 text-xs max-w-xs mx-auto leading-relaxed rounded-control border border-brand-gold/30 bg-brand-gold/10 p-3">
                {t(
                  'qibla.noSensor',
                  'No compass sensor detected. This works best on a mobile phone; use the angle above with a physical compass instead.'
                )}
              </p>
            )}

            <button
              onClick={requestLocation}
              className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-brand-emerald underline underline-offset-2"
            >
              <MapPinIcon className="w-3.5 h-3.5" aria-hidden />
              {t('qibla.refreshLocation', 'Refresh my location')}
            </button>
            {locError && <p className="text-red-400 text-xs">{locError}</p>}
          </div>
        )}
      </div>
    </AnimatedBackground>
  );
}
