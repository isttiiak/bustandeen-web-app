import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NoSymbolIcon } from '@heroicons/react/24/outline';
import { PrayerGlyph } from '../icons/IslamicIcons.js';
import {
  calcPrayerTimesForDay,
  formatTime,
  getCurrentAndNextPrayer,
  getPrayerEndTime,
  PRAYER_META,
  type PrayerTimesResult,
} from '../../utils/prayerTimes.js';
import {
  addDaysYmd,
  foreignPlaceZone,
  placeShortName,
  placeYmd,
  readSavedPlace,
} from '../../utils/placeClock.js';
import { type TLEntry, type ForbiddenTLEntry, type NaflTLEntry } from './timeline.js';

// ─── Live clock card ─────────────────────────────────────────────────────────
// Owns its own 1-second tick so the rest of the page (timeline, ~20 animated
// cards) doesn't re-render every second.

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${hh > 0 ? `${hh}h ` : ''}${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
}

export default function LiveClockCard({
  times,
  timeline,
  hasLocation,
  location,
  header,
}: {
  times: PrayerTimesResult | null;
  timeline: TLEntry[];
  hasLocation: boolean;
  location: { latitude: number; longitude: number } | null;
  /** Title and dates, drawn at the top of the arch. */
  header: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const info = times ? getCurrentAndNextPrayer(times, now) : null;

  // Suhoor and iftar of the next fast: today's until Maghrib, then
  // tomorrow's. The same times as the Ramadan page (sehri is its own time,
  // e.g. Fajr - 3 min in Bangladesh; iftar is Maghrib with the country's
  // calibration), never the bare Fajr.
  const afterMaghrib = !!times && now >= times.maghrib;
  const lat = location?.latitude;
  const lng = location?.longitude;
  const fast = useMemo(() => {
    if (!times) return null;
    if (!afterMaghrib || lat === undefined || lng === undefined) {
      return { tomorrow: false, sehri: times.sehri, iftar: times.maghrib };
    }
    try {
      const next = calcPrayerTimesForDay(lat, lng, addDaysYmd(placeYmd(lat, lng, times.dhuhr), 1));
      return { tomorrow: true, sehri: next.sehri, iftar: next.maghrib };
    } catch {
      return null;
    }
  }, [times, afterMaghrib, lat, lng]);
  const placeZone = foreignPlaceZone(now);
  const currentMeta = PRAYER_META.find((p) => p.id === info?.current);
  const nextMeta = PRAYER_META.find((p) => p.id === info?.next);
  // During the sun-setting forbidden window Asr is technically over but
  // Maghrib hasn't begun — show it as "After: Asr", not "Current: Asr".
  const isCurrentTrackable = !!currentMeta?.isTrackable && !info?.inForbiddenGap;

  // The current prayer's own end time. Before Fajr we are in last night's Isha
  // whose end is today's Fajr — not tonight's Islamic midnight.
  const currentEnd =
    times && info && isCurrentTrackable
      ? info.current === 'isha' && now < times.fajr
        ? times.fajr
        : info.current === 'maghrib' && now < times.fajr
          ? info.nextTime // last night's ʿIshāʾ (far north in summer)
          : getPrayerEndTime(info.current, times)
      : null;
  const endMs = currentEnd ? currentEnd.getTime() - now.getTime() : null;

  const activeForbidden =
    timeline.find(
      (e): e is ForbiddenTLEntry => e.kind === 'forbidden' && now >= e.start && now < e.end
    ) ?? null;
  const activeNafl =
    timeline.find((e): e is NaflTLEntry => e.kind === 'nafl' && now >= e.start && now < e.end) ??
    null;

  return (
    <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 sm:px-7 pt-10 pb-6 text-center">
      {header}
      <div className="font-display text-5xl sm:text-6xl font-bold text-white tabular-nums tracking-tight mt-4">
        {now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          // The saved place's clock when the phone is on another zone.
          ...(placeZone ? { timeZone: placeZone } : {}),
        })}
      </div>
      {placeZone && (
        <p className="text-brand-gold/80 text-xs font-medium mt-1">
          {t('home.placeClock', '{{place}} time', {
            place: placeShortName(readSavedPlace(), placeZone),
          })}
        </p>
      )}

      {info && currentMeta && nextMeta && (
        <div className="mt-5 rounded-control border border-brand-border bg-brand-surface/60 p-3 space-y-3">
          {/* Row 1: current prayer and its countdown on one line */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <PrayerGlyph id={currentMeta.id} className="w-6 h-6 text-brand-gold" aria-hidden />
              <div className="text-left">
                <p className="text-white/65 text-xs uppercase tracking-widest leading-none mb-1">
                  {isCurrentTrackable
                    ? t('prayerTimes.current', 'Current')
                    : t('prayerTimes.after', 'After')}
                </p>
                <p className="text-white font-bold text-base leading-none">
                  {t(`prayerTimes.${currentMeta.id}`, currentMeta.name)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/65 text-xs uppercase tracking-widest leading-none mb-1">
                {endMs !== null && endMs > 0
                  ? t('prayerTimes.endsIn', 'Ends in')
                  : t('prayerTimes.nextIn', 'Next in')}
              </p>
              <p className="text-brand-gold font-bold text-lg tabular-nums leading-none">
                {formatCountdown(
                  endMs !== null && endMs > 0 ? endMs : info.nextTime.getTime() - now.getTime()
                )}
              </p>
            </div>
          </div>

          <div className="w-full h-px bg-brand-border" />

          {/* Row 2: next prayer */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <PrayerGlyph id={nextMeta.id} className="w-6 h-6 text-brand-emerald" aria-hidden />
              <div className="text-left">
                <p className="text-white/65 text-xs uppercase tracking-widest leading-none mb-1">
                  {t('prayerTimes.next', 'Next')}
                </p>
                <p className="text-brand-emerald font-bold text-base leading-none">
                  {t(`prayerTimes.${nextMeta.id}`, nextMeta.name)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs leading-none mb-1">
                {t('prayerTimes.startsAt', 'starts at')}
              </p>
              <p className="text-white/85 font-semibold text-sm tabular-nums">
                {formatTime(info.nextTime)}
              </p>
            </div>
          </div>
        </div>
      )}

      {fast && (
        <div
          className="mt-3 rounded-control border border-brand-border bg-brand-surface/60 px-3 py-2.5"
          data-testid="prayer-fast-times"
        >
          <p className="text-white/65 text-[11px] uppercase tracking-widest font-bold">
            {fast.tomorrow
              ? t('prayerTimes.fastTomorrow', "For tomorrow's fast")
              : t('prayerTimes.fastToday', "For today's fast")}
          </p>
          <div className="mt-1.5 grid grid-cols-2 divide-x divide-brand-border">
            <div>
              <p className="text-white/65 text-xs">{t('prayerTimes.suhoorEnds', 'Suhoor ends')}</p>
              <p
                className={`font-bold tabular-nums ${
                  !fast.tomorrow && now >= fast.sehri ? 'text-white/50' : 'text-brand-emerald'
                }`}
              >
                {formatTime(fast.sehri)}
              </p>
            </div>
            <div>
              <p className="text-white/65 text-xs">{t('prayerTimes.iftar', 'Iftar (Maghrib)')}</p>
              <p className="font-bold tabular-nums text-brand-gold">{formatTime(fast.iftar)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Forbidden or nafl indicator */}
      {activeForbidden && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-control bg-red-400/10 border border-red-400/40 text-left">
          <NoSymbolIcon className="w-5 h-5 shrink-0 text-red-400" aria-hidden />
          <div>
            <p className="text-red-400 font-bold text-xs">{activeForbidden.label}</p>
            <p className="text-white/70 text-xs">
              {t('prayerTimes.endsAt', 'Ends at')} {formatTime(activeForbidden.end)}
            </p>
          </div>
        </div>
      )}
      {activeNafl && !activeForbidden && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-control bg-brand-emerald/10 border border-brand-emerald/40 text-left">
          <PrayerGlyph
            id={activeNafl.glyph}
            className="w-5 h-5 shrink-0 text-brand-emerald"
            aria-hidden
          />
          <div>
            <p className="text-brand-emerald font-bold text-xs">
              {activeNafl.label} {t('prayerTimes.time', 'time')}
            </p>
            <p className="text-white/70 text-xs">
              {t('prayerTimes.until', 'Until')} {formatTime(activeNafl.end)}
            </p>
          </div>
        </div>
      )}

      {!hasLocation && (
        <p className="text-white/70 text-sm mt-4">
          {t('prayerTimes.setLocationHint', 'Set your location above to calculate prayer times')}
        </p>
      )}
    </section>
  );
}
