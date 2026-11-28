import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { ClockIcon, MapPinIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import { PrayerGlyph } from '../icons/IslamicIcons.js';
import PrayerRow from './PrayerRow.js';
import TodayHighlights from './TodayHighlights.js';
import {
  foreignPlaceZone,
  placeShortName,
  placeToday,
  readSavedPlace,
  ymdNoon,
} from '../../utils/placeClock.js';
import { formatTime, PRAYER_META, translateSalatName } from '../../utils/prayerTimes.js';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import { formatHijriDate, getHijriToday } from '../../utils/islamicCalendar.js';
import type { HomeState } from './useHomeData.js';

/** The prayer arch links to /prayer-times as a stretched link: an overlay
 * link under the prayer row and the special-day chips (both `relative z-10`),
 * so each of those is its own link instead of a link nested in a link. */
function ArchShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative mb-4">
      {children}
      <Link to="/prayer-times" aria-label={label} className="absolute inset-0 rounded-arch" />
    </div>
  );
}

/** The time right now, after the arch's label (for example "Current · 03.45 PM"), on the
 * saved place's clock like every other time in the arch. It ticks on the
 * minute, not 60 seconds after the screen opened, so it never lags the clock. */
function ArchNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(
        () => {
          setNow(new Date());
          next();
        },
        60_000 - (Date.now() % 60_000) + 50
      );
    };
    next();
    return () => clearTimeout(id);
  }, []);
  return (
    <>
      <span aria-hidden> · </span>
      <span className="tabular-nums">{formatTime(now)}</span>
    </>
  );
}

/** The prayer window under the screen's one arch, or the invitation to set a place. */
export function HomePrayerHero({ home }: { home: HomeState }) {
  const { t } = useTranslation();
  const {
    prayerWidgetData,
    prayerNow,
    salatLog,
    cycleActive,
    archPills,
    highlights,
    todaySpecialDays,
    fridayHour,
  } = home;
  const ends = (h: number, m: number) =>
    `${h > 0 ? `${formatLocaleNumber(h)}h ` : ''}${formatLocaleNumber(m)}m`;
  const prayerName = (id: string) =>
    translateSalatName(id, PRAYER_META.find((p) => p.id === id)?.name ?? '', t);

  // Today's date lives in the arch (it used to sit in the navbar).
  const hijriToday = (() => {
    const h = getHijriToday();
    return h ? formatHijriDate(h) : null;
  })();
  // Prayer times are shown on the saved place's clock when the phone is on
  // another zone; the arch says so.
  const placeClockZone = foreignPlaceZone(prayerNow);
  const todayDate = (
    <p className="text-[11px] text-white/60 font-medium">
      {formatLocaleDate(ymdNoon(placeToday(prayerNow)), {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })}
      {hijriToday && (
        <>
          <span aria-hidden> · </span>
          {/* Opens the Islamic calendar; the padding makes a 44px tap target in the line. */}
          <Link
            to="/library/calendar"
            className="relative z-10 text-brand-gold/90 inline-block py-[14px] -my-[14px] hover:underline underline-offset-2"
          >
            {hijriToday}
          </Link>
        </>
      )}
    </p>
  );

  // The countdown belongs to what is on now, so it sits with it, above the
  // line that separates "now" from "next". ʿIshāʾ: the preferred time runs to
  // Islamic midnight (Sahih Muslim 612a), then it counts down to Fajr.
  const hasCountdown =
    !!prayerWidgetData && (prayerWidgetData.endHh > 0 || prayerWidgetData.endMm > 0);
  const nowEnd =
    prayerWidgetData &&
    (prayerWidgetData.forbiddenWindow?.end ??
      prayerWidgetData.currentMandatoryEnd ??
      prayerWidgetData.naflWindow?.end);
  const sameAsNowEnd =
    hasCountdown &&
    !!nowEnd &&
    Math.abs(nowEnd.getTime() - prayerWidgetData.nextMandatoryTime.getTime()) < 60_000;
  const countdown = prayerWidgetData && hasCountdown && (
    <p className="text-sm text-white/70 mt-1">
      {prayerWidgetData.ishaBest ? (
        <Trans
          i18nKey="home.bestTimeLeft"
          defaults="Best time: <1>{{left}}</1> left"
          values={{ left: ends(prayerWidgetData.endHh, prayerWidgetData.endMm) }}
          components={{ 1: <b className="tabular-nums text-brand-gold" /> }}
        />
      ) : (
        <>
          {t('home.endsIn')}{' '}
          <b
            className={`tabular-nums ${
              prayerWidgetData.forbiddenWindow ? 'text-red-400' : 'text-brand-gold'
            }`}
          >
            {ends(prayerWidgetData.endHh, prayerWidgetData.endMm)}
          </b>
        </>
      )}
    </p>
  );

  return (
    <>
      {/* Hero: the prayer window, under the screen's one arch */}
      {prayerWidgetData ? (
        <ArchShell label={t('nav.prayerTimes')}>
          <div className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-8 pb-5 text-center group-hover:border-brand-emerald/40 transition-colors">
            <div className="mb-2">
              {todayDate}
              {placeClockZone && (
                <p className="text-[11px] text-brand-gold/80 font-medium mt-0.5">
                  {t('home.placeClock', '{{place}} time', {
                    place: placeShortName(readSavedPlace(), placeClockZone),
                  })}
                </p>
              )}
            </div>
            {prayerWidgetData.forbiddenWindow ? (
              <>
                <NoSymbolIcon className="w-7 h-7 mx-auto text-red-400" />
                <p className="mt-2 text-[11px] uppercase tracking-widest font-bold text-red-400">
                  {t('home.forbiddenTime')}
                  <ArchNow />
                </p>
                <p className="font-display text-2xl font-semibold text-red-300 leading-tight mt-0.5">
                  {prayerWidgetData.forbiddenWindow.label.replace('Forbidden — ', '')}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {t('common.ends')} {formatTime(prayerWidgetData.forbiddenWindow.end)} ·{' '}
                  {t('home.noPrayer')}
                </p>
                {countdown}
              </>
            ) : prayerWidgetData.currentMandatory ? (
              <>
                <PrayerGlyph
                  id={prayerWidgetData.currentMandatory}
                  className="w-7 h-7 mx-auto text-brand-gold"
                />
                <p className="mt-2 text-[11px] uppercase tracking-widest font-bold text-white/60">
                  {t('home.current')}
                  <ArchNow />
                </p>
                <p className="font-display text-3xl font-semibold text-white leading-tight mt-0.5">
                  {prayerName(prayerWidgetData.currentMandatory)}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {prayerWidgetData.ishaBest
                    ? t('home.bestUntil', 'Best until {{time}}', {
                        time: formatTime(prayerWidgetData.currentMandatoryEnd!),
                      })
                    : prayerWidgetData.ishaBest === false
                      ? t('home.ishaLate', 'Best time has passed, still valid until {{time}}', {
                          time: formatTime(prayerWidgetData.currentMandatoryEnd!),
                        })
                      : `${t('common.ends')} ${formatTime(prayerWidgetData.currentMandatoryEnd!)}`}
                </p>
                {countdown}
                {/* Nafl alongside mandatory (Awabeen during Maghrib, Tahajjud during Isha) */}
                {prayerWidgetData.naflWindow && (
                  <p className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full border border-brand-warm/30 text-brand-warm text-xs font-semibold">
                    <PrayerGlyph id={prayerWidgetData.naflWindow.id} className="w-3.5 h-3.5" />
                    {translateSalatName(
                      prayerWidgetData.naflWindow.id,
                      prayerWidgetData.naflWindow.name,
                      t
                    )}{' '}
                    {t('common.time')} · {t('common.until')}{' '}
                    {formatTime(prayerWidgetData.naflWindow.end)}
                  </p>
                )}
              </>
            ) : prayerWidgetData.naflWindow ? (
              <>
                <PrayerGlyph
                  id={prayerWidgetData.naflWindow.id}
                  className="w-7 h-7 mx-auto text-brand-info"
                />
                <p className="mt-2 text-[11px] uppercase tracking-widest font-bold text-brand-info">
                  {t('home.naflTime')}
                  <ArchNow />
                </p>
                <p className="font-display text-3xl font-semibold text-white leading-tight mt-0.5">
                  {translateSalatName(
                    prayerWidgetData.naflWindow.id,
                    prayerWidgetData.naflWindow.name,
                    t
                  )}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {formatTime(prayerWidgetData.naflWindow.start)} -{' '}
                  {formatTime(prayerWidgetData.naflWindow.end)}
                </p>
                {countdown}
              </>
            ) : (
              <>
                <ClockIcon className="w-7 h-7 mx-auto text-white/60" />
                <p className="mt-2 text-[11px] uppercase tracking-widest font-bold text-white/60">
                  {t('home.freeTime')}
                  <ArchNow />
                </p>
                <p className="font-display text-2xl font-semibold text-white leading-tight mt-0.5">
                  {t('home.nextPrayerComing')}
                </p>
              </>
            )}

            {/* The line separates what is on now from the next prayer */}
            <div className="mt-4 pt-3 border-t border-brand-border/70 flex flex-col items-center gap-1 text-sm">
              <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 text-white/60">
                <PrayerGlyph
                  id={prayerWidgetData.nextMandatory}
                  className="w-4 h-4 text-brand-emerald"
                />
                {t('home.next')}{' '}
                <b className="text-brand-emerald">{prayerName(prayerWidgetData.nextMandatory)}</b>{' '}
                {formatTime(prayerWidgetData.nextMandatoryTime)}
                {/* The countdown above already says this when "now" ends as "next" begins */}
                {!sameAsNowEnd && (
                  <span className="text-white/50">
                    ({t('common.in')} {ends(prayerWidgetData.nextHh, prayerWidgetData.nextMm)})
                  </span>
                )}
              </span>
            </div>
            {salatLog && (
              <PrayerRow
                log={salatLog}
                current={prayerWidgetData.currentMandatory}
                excused={!!cycleActive}
                name={prayerName}
              />
            )}
            {archPills && (
              <TodayHighlights
                variant="pills"
                highlights={highlights}
                days={todaySpecialDays}
                fridayCountdown={fridayHour.countdown}
              />
            )}
          </div>
        </ArchShell>
      ) : (
        /* No location stored: send to the prayer-times page, which
         * offers "use my location" and manual city search side by side.
         * Deliberately NOT a native geolocation prompt fired straight
         * from this button: the user should see and choose between both
         * options before any permission dialog appears. */
        <>
          {/* Outside the link: the Hijri date opens the calendar. */}
          <div className="mb-2 text-center">{todayDate}</div>
          <Link to="/prayer-times" className="block mb-4">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-card border border-dashed border-brand-border bg-brand-deep hover:border-brand-emerald/40 hover:shadow-hover transition-[border-color,box-shadow]">
              <div className="flex items-center gap-3 min-w-0">
                <MapPinIcon className="w-6 h-6 text-brand-emerald shrink-0" />
                <div className="min-w-0">
                  <p className="text-white/80 font-semibold text-sm leading-none mb-1">
                    {t('home.enablePrayerTimes')}
                  </p>
                  <p className="text-white/50 text-xs">{t('home.enablePrayerTimesDetail')}</p>
                </div>
              </div>
              <span className="text-brand-emerald text-xs font-semibold shrink-0">
                {t('home.setLocation')}
              </span>
            </div>
          </Link>
        </>
      )}
    </>
  );
}
