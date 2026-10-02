import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { MapPinIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
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
          t('qibla.geoFailed', 'Could not get your location — allow location access and try again')
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
        title={t('qibla.seoTitle', 'Qibla Compass — Find the Direction to Makkah')}
        description={t(
          'qibla.seoDescription',
          'Free on-device Qibla compass. Point your phone to find the exact direction to the Kaaba in Makkah for prayer, wherever you are.'
        )}
        path="/qibla"
      />
      <div className="max-w-md mx-auto px-4 pb-10 pt-4 space-y-6 text-center">
        <h1 className="text-2xl font-black text-white">{t('qibla.title', 'Qibla Compass')}</h1>
        <p className="text-white/50 text-sm">
          {t(
            'qibla.subtitle',
            'Point your phone flat and turn until the Kaaba marker points straight up.'
          )}
        </p>

        {!location && (
          <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-3">
            <p className="text-white/60 text-sm">
              {t('qibla.needLocation', 'Set your location to find the Qibla direction.')}
            </p>
            <button
              onClick={requestLocation}
              disabled={locLoading}
              className="btn bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 border-0 text-white gap-2"
            >
              <MapPinIcon className="w-4 h-4" />
              {locLoading
                ? t('qibla.locating', 'Locating…')
                : t('qibla.useLocation', 'Use my location')}
            </button>
            {locError && <p className="text-red-400 text-xs">{locError}</p>}
          </div>
        )}

        {location && (
          <>
            {sensorState === 'needs-permission' && (
              <button
                onClick={startCompass}
                className="btn bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 border-0 text-white"
              >
                {t('qibla.enableCompass', 'Enable compass')}
              </button>
            )}

            <div className="relative mx-auto" style={{ width: 280, height: 300 }}>
              <div className="absolute left-1/2 top-0 -translate-x-1/2 text-brand-gold text-xl leading-none">
                ▲
              </div>
              <motion.div
                className="absolute left-0 right-0 bottom-0 rounded-full border-2 border-brand-emerald/30 bg-white/5"
                style={{ top: 20 }}
                animate={{ rotate: sensorState === 'active' ? dialRotation : 0 }}
                transition={{ type: 'tween', duration: 0.15, ease: 'linear' }}
              >
                {(['N', 'E', 'S', 'W'] as const).map((label, i) => (
                  <span
                    key={label}
                    className="absolute text-white/40 text-xs font-bold"
                    style={{
                      top: i === 0 ? 10 : i === 2 ? undefined : '50%',
                      bottom: i === 2 ? 10 : undefined,
                      left: i === 3 ? 10 : i === 1 ? undefined : '50%',
                      right: i === 1 ? 10 : undefined,
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
                    <span className="absolute left-1/2 top-3 -translate-x-1/2 text-3xl">🕋</span>
                  </div>
                )}
              </motion.div>
            </div>

            {bearing != null && (
              <p className="text-white/60 text-sm">
                {t('qibla.bearingLabel', 'Qibla is {{deg}}° from true North', {
                  deg: Math.round(bearing),
                })}
              </p>
            )}

            {sensorState === 'unavailable' && (
              <p className="text-brand-gold/70 text-xs max-w-xs mx-auto leading-relaxed">
                {t(
                  'qibla.noSensor',
                  'No compass sensor detected — this works best on a mobile phone. Use the angle above with a physical compass instead.'
                )}
              </p>
            )}

            <button
              onClick={requestLocation}
              className="text-xs text-white/30 hover:text-brand-emerald underline underline-offset-2"
            >
              {t('qibla.refreshLocation', 'Refresh my location')}
            </button>
          </>
        )}
      </div>
    </AnimatedBackground>
  );
}
