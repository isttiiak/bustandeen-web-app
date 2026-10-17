import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { TFunction } from 'i18next';
import { ArrowDownTrayIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY, CARD, SECTION_TITLE } from './bustanStyles.js';
import { CrescentIcon } from './icons/IslamicIcons.js';
import { PrintSheetHead } from '../seo/components/PrintSheet.js';
import RamadanSheetTable, {
  type RamadanSheetTableRow,
} from '../seo/components/RamadanSheetTable.js';
import {
  buildRamadanSheet,
  formatCoordinates,
  type RamadanSheetRow,
} from '../utils/ramadanSheet.js';
import { ramadanStartBasis, type RamadanWindow } from '../utils/ramadan.js';
import { getHijriOffsetSource } from '../utils/islamicCalendar.js';
import { countryName } from '../utils/countryDefaults.js';
import { placeShortName, placeZone, readSavedPlace } from '../utils/placeClock.js';
import { CALC_METHODS } from '../utils/salatPrefs.js';
import { formatTime } from '../utils/prayerTimes.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';

/** What Ramadan's first day rests on, in the words of the Ramadan calendars. */
export function ramadanBasisText(t: TFunction, lang: string, w: RamadanWindow): string | null {
  const start = w.days[0]?.date;
  if (!start || w.hijriYear == null) return null;
  const basis = ramadanStartBasis(getHijriOffsetSource(new Date(`${start}T12:00:00`)), w.hijriYear);
  if (basis.kind === 'announced' || basis.kind === 'forecast') {
    return t(
      basis.kind === 'announced'
        ? 'ramadan.expectedBasisAnnounced'
        : 'ramadan.expectedBasisForecast',
      { country: countryName(basis.country, lang) }
    );
  }
  return t(
    basis.kind === 'manual' ? 'ramadan.expectedBasisManual' : 'ramadan.expectedBasisUmmAlQura'
  );
}

const day = (date: string) => new Date(`${date}T12:00:00`);

/**
 * "Download this Ramadan's timetable" (audit R12): the one-page A4 sheet of
 * the prerendered Ramadan calendars, for the saved location, from the times
 * computed on the device. Like the calendar download (IslamicCalendar.tsx),
 * the sheet is drawn into #rp-print-root only while the print window is
 * open; everything else on the page is hidden on paper (global.css).
 */
export default function RamadanSheetCard({ window: w }: { window: RamadanWindow }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0] === 'bn' ? 'bn' : 'en';
  const place = useMemo(() => readSavedPlace(), []);
  const shortName = place
    ? placeShortName(place, placeZone(place.latitude, place.longitude)) ||
      formatCoordinates(place.latitude, place.longitude)
    : '';
  const [printing, setPrinting] = useState(false);
  const sheet = useMemo(
    () => (printing && place ? buildRamadanSheet(w, place) : null),
    [printing, place, w]
  );

  useEffect(() => {
    if (!sheet) return;
    document.documentElement.classList.add('rp-printing');
    let live = true;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    // Fonts first, then two frames so the sheet is laid out.
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
      document.documentElement.classList.remove('rp-printing');
    };
  }, [sheet]);

  if (w.hijriYear == null || w.days.length === 0) return null;

  const tableRow = (r: RamadanSheetRow): RamadanSheetTableRow => ({
    date: r.date,
    fast: formatLocaleNumber(r.fast),
    dateLabel: formatLocaleDate(day(r.date), { day: 'numeric', month: 'short' }),
    weekday: formatLocaleDate(day(r.date), { weekday: 'short' }),
    sehri: formatTime(r.sehri),
    iftar: formatTime(r.iftar),
  });

  const longDate = (date: string) =>
    formatLocaleDate(day(date), { day: 'numeric', month: 'long', year: 'numeric' });

  const printSheet = (() => {
    if (!sheet) return null;
    const year = formatLocaleNumber(sheet.hijriYear, { useGrouping: false });
    const title = t('ramadan.sheetHeading', { year, place: shortName });
    const last = sheet.possible30 ?? sheet.rows[sheet.rows.length - 1]!;
    const sub = t('ramadan.sheetSub', {
      from: longDate(sheet.rows[0]!.date),
      to: longDate(last.date),
    });
    const method =
      sheet.calibration?.methodName ??
      CALC_METHODS.find((m) => m.id === sheet.method)?.label ??
      sheet.method;
    const basisText = ramadanBasisText(t, i18n.language, w);
    return createPortal(
      <div id="rp-print-root" data-print-page="" data-testid="ramadan-print" lang={lang}>
        <PrintSheetHead lang={lang} title={title} sub={sub} />
        {basisText && <p className="mb-2 text-[8pt]">{basisText}</p>}
        <RamadanSheetTable
          caption={title}
          columns={{
            fast: t('ramadan.sheetFast'),
            date: t('ramadan.sheetDate'),
            sehri: t('ramadan.suhoorEndsFajr'),
            iftar: t('ramadan.iftarMaghrib'),
          }}
          rows={sheet.rows.map(tableRow)}
          possible30={sheet.possible30 && tableRow(sheet.possible30)}
          possible30Label={t('ramadan.sheetPossible30')}
          timezone={sheet.zone ?? undefined}
        />
        <div className="mt-2 space-y-0.5 text-[7.5pt]" data-sheet-footer="">
          <p>
            {t('ramadan.sheetPlace', {
              place: place?.name || shortName,
              coords: formatCoordinates(sheet.place.latitude, sheet.place.longitude),
              method,
            })}
            {sheet.calibration && sheet.country && (
              <>
                {' '}
                {t(
                  sheet.calibration.iftarOnly
                    ? 'ramadan.sheetCalibratedIftar'
                    : 'ramadan.sheetCalibrated',
                  {
                    // The timetables' names are English (countryDefaults.ts);
                    // Bangla says "the timetable used in {country}".
                    source:
                      lang === 'en'
                        ? sheet.calibration.checkedAgainst
                        : t('ramadan.sheetCountryTimetable', {
                            country: countryName(sheet.country, i18n.language),
                          }),
                  }
                )}
              </>
            )}
            {/* The country's extra line is English, as on the website. */}
            {lang === 'en' && sheet.calibration?.pageNote && <> {sheet.calibration.pageNote}</>}
          </p>
          <p>{t('ramadan.sheetMasjid')}</p>
          <p>{t('ramadan.sheetFooter')}</p>
        </div>
      </div>,
      document.body
    );
  })();

  return (
    <section className={`${CARD} p-5 space-y-3`} data-testid="ramadan-sheet-card">
      <h2 className={SECTION_TITLE}>
        <CrescentIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
        {t('ramadan.sheetTitle')}
      </h2>
      {place ? (
        <>
          <p className="text-white/75 text-sm leading-snug">{t('ramadan.sheetLede')}</p>
          <button
            type="button"
            className={`${BTN_PRIMARY} w-full sm:w-auto`}
            onClick={() => setPrinting(true)}
          >
            <ArrowDownTrayIcon className="w-5 h-5" aria-hidden="true" />
            {t('ramadan.sheetCta', { place: shortName })}
          </button>
          <p className="text-white/65 text-xs">{t('ramadan.sheetHint')}</p>
        </>
      ) : (
        <Link
          to="/prayer-times"
          className="inline-flex items-center gap-1 text-sm text-brand-gold font-semibold underline underline-offset-2"
        >
          {t('ramadan.sheetNoPlace')}
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </Link>
      )}
      {printSheet}
    </section>
  );
}
