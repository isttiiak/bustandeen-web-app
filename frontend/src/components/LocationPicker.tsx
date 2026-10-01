import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  coordinatesLabel,
  getPlaceLookup,
  reverseGeocodeCity,
  searchPlaces,
  setPlaceLookup,
  type PlaceLookup,
  type PlaceResult,
  type StoredLocation,
} from '../utils/geocode.js';

/**
 * GPS + city-search location picker for prayer-time calculations. Shared
 * between the first-run prompt on the Prayer Times page and the "Change
 * location" section of Prayer Time settings — one copy of the GPS/search
 * flow instead of two.
 */
export default function LocationPicker({
  onLocationChange,
}: {
  onLocationChange: (loc: StoredLocation) => void;
}) {
  const { t } = useTranslation();
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [citySearching, setCitySearching] = useState(false);
  const [cityError, setCityError] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<PlaceResult[]>([]);
  const [lookup, setLookup] = useState<PlaceLookup>(getPlaceLookup);

  const chooseLookup = (mode: PlaceLookup) => {
    setLookup(mode);
    setPlaceLookup(mode);
    setCitySuggestions([]);
    setCityError('');
  };

  const requestLocation = useCallback(() => {
    setLocLoading(true);
    setLocError('');
    if (!('geolocation' in navigator)) {
      setLocError(
        t('prayerTimes.geoNotSupported', 'Geolocation not supported — use city search instead.')
      );
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const city = await reverseGeocodeCity(latitude, longitude);
        const name = city ?? coordinatesLabel(latitude, longitude);
        onLocationChange({ latitude, longitude, name });
        setLocLoading(false);
      },
      () => {
        // GPS denied — nudge city search
        setLocError(t('prayerTimes.gpsDenied', 'GPS denied. Type your city below.'));
        setLocLoading(false);
      },
      { timeout: 10000 }
    );
  }, [onLocationChange, t]);

  const searchByCity = useCallback(async () => {
    if (!cityInput.trim()) return;
    setCitySearching(true);
    setCityError('');
    setCitySuggestions([]);
    try {
      const results = await searchPlaces(cityInput);
      if (!results.length) {
        setCityError(
          lookup === 'device'
            ? t(
                'prayerTimes.cityNotFoundDevice',
                'Not in the on-device city list. Try a nearby larger city, or switch place names to OpenStreetMap below.'
              )
            : t('prayerTimes.cityNotFound', 'City not found. Try a different name.')
        );
        setCitySearching(false);
        return;
      }
      if (results.length === 1) onLocationChange(results[0]);
      else setCitySuggestions(results);
    } catch {
      setCityError(t('prayerTimes.searchFailed', 'Search failed. Check your internet connection.'));
    }
    setCitySearching(false);
  }, [cityInput, lookup, onLocationChange, t]);

  const pickSuggestion = useCallback(
    (s: PlaceResult) => {
      onLocationChange(s);
      setCitySuggestions([]);
    },
    [onLocationChange]
  );

  return (
    <div className="space-y-3">
      {/* Option 1: GPS */}
      <button
        onClick={requestLocation}
        disabled={locLoading}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-emerald/10 border border-brand-emerald/30 hover:border-brand-emerald/60 text-left transition-all"
      >
        {locLoading ? (
          <span className="loading loading-spinner loading-xs text-brand-emerald" />
        ) : (
          <span className="text-lg">📡</span>
        )}
        <div>
          <p className="text-brand-emerald font-semibold text-sm">
            {t('prayerTimes.useGps', 'Use GPS (recommended)')}
          </p>
          <p className="text-white/30 text-xs">
            {t('prayerTimes.gpsDesc', 'Most accurate. Requires browser location permission.')}
          </p>
        </div>
      </button>
      {locError && <p className="text-red-400 text-xs">{locError}</p>}

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-brand-border" />
        <span className="text-white/20 text-xs">{t('prayerTimes.or', 'or')}</span>
        <div className="flex-1 h-px bg-brand-border" />
      </div>

      {/* Option 2: City search */}
      <div>
        <p className="text-white/40 text-xs mb-2">
          {t(
            'prayerTimes.citySearchDesc',
            'Search by city — no GPS needed, times are still accurate'
          )}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void searchByCity();
            }}
            placeholder={t('prayerTimes.cityPlaceholder', 'e.g. Dhaka, London, Karachi...')}
            className="input input-sm flex-1 bg-brand-deep border border-brand-border text-white placeholder-white/20 focus:border-brand-emerald/40 focus:outline-none"
          />
          <button
            onClick={() => void searchByCity()}
            disabled={citySearching || !cityInput.trim()}
            className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim text-white border-none"
          >
            {citySearching ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              t('prayerTimes.search', 'Search')
            )}
          </button>
        </div>
        {cityError && <p className="text-red-400 text-xs mt-1">{cityError}</p>}
        {citySuggestions.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-white/40 text-[11px]">
              {t('prayerTimes.pickCity', 'Pick your city:')}
            </p>
            {citySuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => pickSuggestion(s)}
                className="w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-brand-border hover:border-brand-emerald/40 text-white/70 hover:text-white text-xs transition-all"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Where place NAMES come from (prayer times are on-device either way) */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
        <p className="text-white/60 text-xs font-semibold">
          {t('prayerTimes.placeLookupTitle', 'Finding place names')}
        </p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(['device', 'osm'] as const).map((mode) => {
            const active = lookup === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => chooseLookup(mode)}
                className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                  active
                    ? 'border-brand-emerald/50 bg-brand-emerald/10 text-brand-emerald'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-brand-emerald/30'
                }`}
              >
                <span className="font-bold block">
                  {mode === 'device'
                    ? t('prayerTimes.placeLookupDevice', '🔒 On this device')
                    : t('prayerTimes.placeLookupOsm', '🌍 OpenStreetMap')}
                </span>
                <span className="text-[11px] opacity-80">
                  {mode === 'device'
                    ? t('prayerTimes.placeLookupDeviceHint', 'Private, ~1,450 cities')
                    : t('prayerTimes.placeLookupOsmHint', 'Any town or village')}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-white/40 text-[11px] leading-relaxed">
          {lookup === 'device'
            ? t(
                'prayerTimes.placeLookupDeviceNote',
                'Your location never leaves this device. Place names come from a city list inside the app.'
              )
            : t(
                'prayerTimes.placeLookupOsmNote',
                "To name your place, its location rounded to about 1 km (or the city you type) is sent to OpenStreetMap's free Nominatim service. Prayer times are still calculated on this device and nothing is sent to Bustandeen."
              )}
        </p>
      </div>
    </div>
  );
}
