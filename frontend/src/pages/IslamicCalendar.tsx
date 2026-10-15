import { useEffect, useReducer, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { CARD, OPTION_OFF, OPTION_ON } from '../components/bustanStyles.js';
import { ARABIC_STYLE, LibraryHero } from '../components/library/libraryParts.js';
import MonthGrid, { EVENT_DOT } from '../components/calendar/MonthGrid.js';
import { DayDetails, EventList } from '../components/calendar/CalendarLists.js';
import CalendarSettingsSheet from '../components/calendar/CalendarSettingsSheet.js';
import DownloadSheet from '../components/calendar/DownloadSheet.js';
import PrintSheets from '../components/calendar/print/PrintSheets.js';
import { pageRule, printMonths, type PrintOptions } from '../utils/calendarPrint.js';
import {
  HIJRI_MONTHS_AR,
  bengaliLabel,
  eventName,
  gregLong,
  gregShort,
  hijriLabel,
  hijriMonthName,
  monthSpan,
  monthTitle,
  num,
  type Lang,
} from '../components/calendar/calendarText.js';
import { useHijriInputsVersion } from '../components/MoonSightingSync.js';
import { useMoonSightingRecords } from '../hooks/useMoonSighting.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import {
  calendarDays,
  calendarWindow,
  monthDays,
  monthInWindow,
  stepMonth,
  type CalendarDay,
  type CalendarKind,
} from '../utils/calendarMonth.js';
import {
  dayEvents,
  holidaySources,
  holidayYears,
  missingHolidayYears,
  upcomingEvents,
  type CalendarEvent,
  type EventFilters,
} from '../utils/calendarEvents.js';
import {
  readCalendarPrefs,
  writeCalendarPrefs,
  type CalendarPrefs,
} from '../utils/calendarPrefs.js';
import { countryName } from '../utils/countryDefaults.js';
import type { StoredLocation } from '../utils/geocode.js';
import { autoHijriCountry } from '../utils/hijriCountry.js';
import { addDays } from '../utils/hijriOffset.js';
import {
  HIJRI_COUNTRY_KEY,
  getIslamicDay,
  readHijriInputs,
  writeHijriInput,
} from '../utils/islamicCalendar.js';
import { loadZoneLookup, placeToday, readSavedPlace } from '../utils/placeClock.js';
import { calcPrayerTimesForDay, formatTime } from '../utils/prayerTimes.js';

// The Islamic calendar (Library): today's Hijri date with what is coming,
// a month grid with the user's calendars (English, Hijri, Bengali), Islamic
// days, government holidays and national days, the selected day, and lists
// of this month and the next 30 days. All on the device; the Hijri dates
// follow the country's moon-sighting records like the rest of the app.
// Prototype: docs/design/hijri-calendar.html (approved v3).

export default function IslamicCalendar() {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'bn' ? 'bn' : 'en';
  useMoonSightingRecords();
  useHijriInputsVersion();
  const { data: profile } = useUserProfile();
  // Redraws after the Hijri date setting or the location changes here.
  const [, redraw] = useReducer((x: number) => x + 1, 0);

  const country = localStorage.getItem(HIJRI_COUNTRY_KEY);
  const countryLabel = country ? countryName(country, lang) : '';
  const [prefs, setPrefs] = useState<CalendarPrefs>(() => readCalendarPrefs(country));
  const updatePrefs = (p: Partial<CalendarPrefs>) => {
    writeCalendarPrefs(p);
    setPrefs((prev) => ({ ...prev, ...p }));
  };

  const day = calendarDays(readHijriInputs());
  const today = placeToday();
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  // A download in progress: the sheets are drawn, then the print window opens.
  const [printJob, setPrintJob] = useState<PrintOptions | null>(null);

  useEffect(() => {
    if (!printJob) return;
    const rule = document.createElement('style');
    rule.textContent = pageRule(printJob);
    document.head.appendChild(rule);
    document.documentElement.classList.add('pc-printing');
    let live = true;
    const done = () => setPrintJob(null);
    window.addEventListener('afterprint', done);
    // Fonts first, then two frames so the sheets are laid out.
    void document.fonts.ready.then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (live) window.print();
        })
      )
    );
    return () => {
      live = false;
      window.removeEventListener('afterprint', done);
      rule.remove();
      document.documentElement.classList.remove('pc-printing');
    };
  }, [printJob]);

  const gridKinds = prefs.layers.filter((k): k is 'greg' | 'hijri' => k !== 'bn');
  const grid: CalendarKind = gridKinds.includes(prefs.grid as 'greg' | 'hijri')
    ? prefs.grid
    : (gridKinds[0] ?? 'greg');
  const others = prefs.layers.filter((k) => k !== grid);
  const filters: EventFilters = {
    country,
    islamic: prefs.show.islamic,
    holidays: prefs.show.holidays,
    national: prefs.show.national,
  };
  const eventsOf = (d: CalendarDay) => dayEvents(d, filters);

  const todayDay = day(today);
  const todayEvents = eventsOf(todayDay);
  const next30 = upcomingEvents(
    Array.from({ length: 30 }, (_, i) => day(addDays(today, i + 1))),
    filters
  );
  const days = monthDays(anchor, grid, day);
  // Browsing and downloads stay within last year, this year and next year.
  const bounds = calendarWindow(today);
  const canStep = (step: -1 | 1) =>
    monthInWindow(monthDays(stepMonth(anchor, grid, step, day), grid, day), bounds);
  const missingYears = prefs.show.holidays ? missingHolidayYears(country, days) : [];
  const monthRows = days.flatMap((d) => eventsOf(d).map((event) => ({ day: d, event })));
  const pick = (ymd: string) => {
    setSelected(ymd);
    setAnchor(ymd);
  };

  // Maghrib at the saved place: when the Hijri date changes tonight.
  const place = readSavedPlace();
  const maghrib = (() => {
    if (!place) return null;
    try {
      const at = calcPrayerTimesForDay(place.latitude, place.longitude, today).maghrib;
      return Number.isNaN(at.getTime()) ? null : formatTime(at);
    } catch {
      return null;
    }
  })();

  const hijriOn = prefs.layers.includes('hijri');
  // The arch's Hijri date is the Islamic day (it changes at Maghrib), as on
  // Home and in Settings; the grid shows each day's daytime date.
  const islamicDay = getIslamicDay();
  const nowDay = day(islamicDay);
  const afterMaghrib = islamicDay > today;
  const tomorrow = day(addDays(today, 1));
  const coming = next30[0];
  const heroSource =
    nowDay.hijriSource === 'manual'
      ? t('calendar.heroManual')
      : nowDay.hijriSource === 'none'
        ? t('calendar.heroUq')
        : t('calendar.heroAnnounced', { country: countryLabel });

  // Status of each Hijri month on screen: announced, expected or Umm al-Qura.
  const records = readHijriInputs().records;
  const hijriMonths = [
    ...new Map(days.map((d) => [`${d.hijri.year}-${d.hijri.month}`, d])).values(),
  ];
  const status = hijriOn && (
    <div className="flex flex-wrap justify-center gap-1.5" data-testid="calendar-status">
      {hijriMonths.map((d) => {
        const name = hijriMonthName(t, d.hijri.month);
        const rec = records.find(
          (r) =>
            r.country === country && r.hijriYear === d.hijri.year && r.hijriMonth === d.hijri.month
        );
        const first = monthDays(d.ymd, 'hijri', day)[0]!;
        const [text, dot] =
          d.hijriSource === 'manual'
            ? [t('calendar.manual', { month: name }), 'bg-white/40']
            : rec
              ? [
                  t('calendar.announced', { month: name, date: gregShort(rec.startDate) }),
                  'bg-brand-emerald',
                ]
              : first.hijriSource === 'none'
                ? [t('calendar.uq', { month: name }), 'bg-white/40']
                : [
                    t('calendar.expected', { month: name, date: gregShort(first.ymd) }),
                    'border border-dashed border-brand-gold',
                  ];
        return (
          <span
            key={`${d.hijri.year}-${d.hijri.month}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface/50 px-2.5 py-1 text-[11px] font-bold text-white/80"
          >
            <span aria-hidden="true" className={`w-2 h-2 rounded-full ${dot}`} />
            {text}
          </span>
        );
      })}
    </div>
  );

  const legend = (
    <>
      {prefs.show.islamic && <LegendItem type="islamic" label={t('calendar.kind.islamic')} />}
      {prefs.show.holidays && holidayYears(country).length > 0 && (
        <LegendItem type="holiday" label={t('calendar.kind.holiday')} />
      )}
      {prefs.show.national && holidayYears(country).length > 0 && (
        <LegendItem type="national" label={t('calendar.kind.national')} />
      )}
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="w-2.5 h-2.5 rounded-[3px] bg-brand-warm/30 border border-brand-warm"
        />
        {t('calendar.kind.weekend')}
      </span>
    </>
  );

  const dayLabel = (d: CalendarDay, events: CalendarEvent[]) =>
    [
      gregLong(d.ymd),
      prefs.layers.includes('hijri') ? hijriLabel(t, d.hijri, lang) : '',
      prefs.layers.includes('bn') ? bengaliLabel(d) : '',
      prefs.weekend.includes(d.weekday) ? t('calendar.kind.weekend') : '',
      ...events.map((e) => eventName(e, t, lang)),
    ]
      .filter(Boolean)
      .join(', ');

  const years = holidayYears(country);
  const holidaysHint = years.length
    ? t('calendar.sHolidaysHint', {
        country: countryLabel,
        years: years.map((y) => num(y, lang)).join(', '),
      })
    : t('calendar.sHolidaysNone');

  const onLocation = (loc: StoredLocation) => {
    localStorage.setItem('bustandeen_location', JSON.stringify(loc));
    // The country (moon sighting, holidays) follows the saved place.
    void loadZoneLookup().then(() => {
      writeHijriInput(HIJRI_COUNTRY_KEY, autoHijriCountry(profile?.country));
      redraw();
    });
    redraw();
  };

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('calendar.title')}
        description={t('calendar.seoDescription')}
        path="/library/calendar"
        index={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-4 pb-10">
          <LibraryHero
            Icon={CalendarDaysIcon}
            title={hijriOn ? hijriLabel(t, nowDay.hijri, lang) : gregLong(today)}
            subtitle={hijriOn ? gregLong(today) : ''}
          >
            {hijriOn && (
              <p lang="ar" dir="rtl" className="text-white/75 text-lg" style={ARABIC_STYLE}>
                {HIJRI_MONTHS_AR[nowDay.hijri.month - 1]}
              </p>
            )}
            {prefs.layers.includes('bn') && (
              <p lang="bn" className="text-white/75 text-sm font-semibold">
                {bengaliLabel(todayDay)}
              </p>
            )}
            {hijriOn && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-deep/60 px-3 py-1 text-xs font-bold text-white/80"
                data-testid="calendar-source"
              >
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${nowDay.hijriSource === 'country' ? 'bg-brand-emerald' : 'bg-white/40'}`}
                />
                {heroSource}
              </span>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2 text-left">
              {hijriOn && (
                <>
                  <Fact label={t('calendar.dayOfMonthLabel')}>
                    {t('calendar.dayOfMonth', { n: num(nowDay.hijri.day, lang) })}
                    <span className="block h-1.5 mt-1.5 rounded-full bg-brand-border overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-brand-gold"
                        style={{ width: `${Math.round((nowDay.hijri.day / 30) * 100)}%` }}
                      />
                    </span>
                  </Fact>
                  {afterMaghrib ? (
                    <Fact label={t('calendar.changedLabel')} testId="calendar-change">
                      {num(nowDay.hijri.day, lang)} {hijriMonthName(t, nowDay.hijri.month)}
                      <span className="block text-xs font-medium text-white/70">
                        {maghrib
                          ? t('calendar.changedAt', { time: maghrib })
                          : t('calendar.changedNoPlace')}
                      </span>
                    </Fact>
                  ) : (
                    <Fact label={t('calendar.changesLabel')} testId="calendar-change">
                      {num(tomorrow.hijri.day, lang)} {hijriMonthName(t, tomorrow.hijri.month)}
                      <span className="block text-xs font-medium text-white/70">
                        {maghrib
                          ? t('calendar.changesAt', { time: maghrib })
                          : t('calendar.changesNoPlace')}
                      </span>
                    </Fact>
                  )}
                </>
              )}
              <Fact label={t('calendar.comingUp')} wide testId="calendar-coming">
                {coming ? (
                  <>
                    <span
                      className={`block text-[11px] font-black ${KIND_TEXT[coming.event.type]}`}
                    >
                      {t(`calendar.kind.${coming.event.type}`)}
                    </span>
                    {eventName(coming.event, t, lang)}
                    <span className="block text-xs font-medium text-white/70">
                      {gregShort(coming.day.ymd)} ·{' '}
                      {t('calendar.inDays', {
                        count: dayDiff(today, coming.day.ymd),
                        n: num(dayDiff(today, coming.day.ymd), lang),
                      })}
                    </span>
                  </>
                ) : (
                  t('calendar.nothingSoon')
                )}
              </Fact>
            </div>
          </LibraryHero>

          {todayEvents.length > 0 && (
            <button
              type="button"
              onClick={() => pick(today)}
              data-testid="calendar-today-events"
              className={`${CARD} w-full flex items-center gap-3 px-4 py-3 text-left`}
            >
              <span
                aria-hidden="true"
                className={`w-2.5 h-2.5 shrink-0 ${EVENT_DOT[todayEvents[0]!.type]}`}
              />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold text-white">
                {t('calendar.todayPrefix')}:{' '}
                {todayEvents
                  .map((e) =>
                    e.type === 'islamic'
                      ? eventName(e, t, lang)
                      : `${t(`calendar.kind.${e.type}`)}: ${eventName(e, t, lang)}`
                  )
                  .join(' · ')}
              </span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {gridKinds.length > 1 ? (
              <div
                className="flex-1 grid grid-cols-2 gap-1.5 rounded-control border border-brand-border bg-brand-surface/50 p-1"
                role="group"
                aria-label={t('calendar.title')}
              >
                {gridKinds.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={grid === k}
                    onClick={() => updatePrefs({ grid: k })}
                    className={`min-h-[40px] rounded-control border text-sm font-bold transition-colors ${
                      grid === k ? OPTION_ON : `${OPTION_OFF} border-transparent bg-transparent`
                    }`}
                  >
                    {t(`calendar.cal.${k}`)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <button
              type="button"
              onClick={() => pick(today)}
              className="min-h-[44px] px-3 rounded-control border border-brand-border bg-brand-surface/50 text-sm font-bold text-white"
            >
              {t('calendar.today')}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={t('calendar.settings')}
              className="w-11 h-11 grid place-items-center rounded-control border border-brand-border bg-brand-surface/50 text-white"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setDownloadOpen(true)}
              aria-label={t('calendar.download')}
              className="btn-solid w-11 h-11 grid place-items-center rounded-control bg-brand-emerald-dim text-on-color shadow-elev-1"
            >
              <ArrowDownTrayIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <MonthGrid
            days={days}
            grid={grid}
            others={others}
            weekStart={prefs.weekStart}
            weekend={prefs.weekend}
            today={today}
            selected={selected}
            eventsOf={eventsOf}
            dayLabel={dayLabel}
            title={monthTitle(grid, days[0]!, t, lang)}
            subtitles={others.map((k) => ({ kind: k, text: monthSpan(k, days, t, lang) }))}
            status={status}
            legend={legend}
            onSelect={setSelected}
            onPrev={() => setAnchor(stepMonth(anchor, grid, -1, day))}
            onNext={() => setAnchor(stepMonth(anchor, grid, 1, day))}
            canPrev={canStep(-1)}
            canNext={canStep(1)}
            notes={
              <>
                {missingYears.length > 0 && (
                  <p data-testid="calendar-holidays-missing">
                    {t('calendar.holidaysMissing', {
                      years: missingYears.map((y) => num(y, lang)).join(', '),
                    })}
                  </p>
                )}
                <p data-testid="calendar-moon-note">{t('calendar.moonNote')}</p>
              </>
            }
          />

          <DayDetails
            day={day(selected)}
            isToday={selected === today}
            layers={prefs.layers}
            events={eventsOf(day(selected))}
            country={countryLabel}
          />

          <EventList
            title={t('calendar.thisMonth')}
            subtitle={t('calendar.thisMonthSub', { month: monthTitle(grid, days[0]!, t, lang) })}
            rows={monthRows}
            empty={t('calendar.noneThisMonth')}
            today={today}
            onPick={pick}
            testId="calendar-this-month"
          />
          <EventList
            title={t('calendar.next30')}
            subtitle={t('calendar.next30Sub')}
            rows={next30}
            empty={t('calendar.nothingSoon')}
            showWhen
            today={today}
            onPick={pick}
            testId="calendar-next-30"
          />
        </div>
      </div>

      <CalendarSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        onPrefs={updatePrefs}
        holidaysHint={holidaysHint}
        holidaySourceLinks={prefs.show.holidays ? holidaySources(country) : []}
        placeName={place?.name ?? null}
        onLocation={onLocation}
        onHijriChange={redraw}
      />
      <DownloadSheet
        key={String(downloadOpen)}
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        layers={prefs.layers}
        grid={grid}
        anchor={anchor}
        day={day}
        bounds={bounds}
        onPrint={(o) => {
          setDownloadOpen(false);
          setPrintJob(o);
        }}
      />
      {printJob &&
        createPortal(
          <div id="pc-print-root" data-testid="calendar-print">
            <PrintSheets
              anchors={printMonths(anchor, printJob, day, bounds)}
              options={printJob}
              day={day}
              eventsOf={eventsOf}
              weekStart={prefs.weekStart}
              weekend={prefs.weekend}
              today={today}
              countryLabel={countryLabel}
              missingYears={(ds) => (prefs.show.holidays ? missingHolidayYears(country, ds) : [])}
              kinds={(
                [
                  ['islamic', prefs.show.islamic],
                  ['holiday', prefs.show.holidays && years.length > 0],
                  ['national', prefs.show.national && years.length > 0],
                ] as const
              )
                .filter(([, on]) => on)
                .map(([k]) => k)}
            />
          </div>,
          document.body
        )}
    </AnimatedBackground>
  );
}

/** The colour of each kind of event, as text. */
const KIND_TEXT: Record<CalendarEvent['type'], string> = {
  islamic: 'text-brand-emerald',
  holiday: 'text-red-400',
  national: 'text-brand-gold',
};

const dayDiff = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

function Fact({
  label,
  children,
  wide,
  testId,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  testId?: string;
}) {
  return (
    <div
      className={`rounded-control border border-brand-border bg-brand-deep/70 px-3 py-2 ${wide ? 'col-span-2' : ''}`}
      data-testid={testId}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">{label}</p>
      <div className="text-sm font-bold text-white leading-snug mt-0.5">{children}</div>
    </div>
  );
}

function LegendItem({ type, label }: { type: CalendarEvent['type']; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={`w-2 h-2 ${EVENT_DOT[type]}`} />
      {label}
    </span>
  );
}
