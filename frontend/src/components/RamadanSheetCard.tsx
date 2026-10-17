import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { TFunction } from 'i18next';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from './bustanStyles.js';
import { CrescentIcon } from './icons/IslamicIcons.js';
import RamadanSheets, { type SheetRowData } from '../seo/components/RamadanSheets.js';
import { RamadanDownloads } from '../seo/components/RamadanPageParts.js';
import {
  FITRA_BD,
  RAMADAN_SHEET,
  type SheetInk,
  type SheetVariant,
} from '../seo/locales/ramadanSheet.js';
import { markSheetPrint } from '../seo/sheetPrint.js';
import {
  buildRamadanSheet,
  formatCoordinates,
  type RamadanSheetRow,
} from '../utils/ramadanSheet.js';
import { ramadanStartBasis, type RamadanWindow } from '../utils/ramadan.js';
import { getHijriOffsetSource } from '../utils/islamicCalendar.js';
import { countryName } from '../utils/countryDefaults.js';
import { placeShortName, placeZone, readSavedPlace } from '../utils/placeClock.js';
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
const addDay = (date: string, n: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * "Print this Ramadan" for the saved location (audit R12, sheets R2-R4): the
 * three A4 sheets of the Ramadan calendars (timetable, timetable + checklist,
 * Ramadan checklist), in colour or black and white, from the times computed
 * on the device. Like the calendar download (IslamicCalendar.tsx), the sheets
 * are drawn into #rp-print-root only while the print window is open;
 * everything else on the page is hidden on paper (global.css).
 */
export default function RamadanSheetCard({ window: w }: { window: RamadanWindow }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0] === 'bn' ? 'bn' : 'en';
  const place = useMemo(() => readSavedPlace(), []);
  const shortName = place
    ? placeShortName(place, placeZone(place.latitude, place.longitude)) ||
      formatCoordinates(place.latitude, place.longitude)
    : '';
  const [printing, setPrinting] = useState<{ variant: SheetVariant; ink: SheetInk } | null>(null);
  const sheet = useMemo(
    () => (printing && place ? buildRamadanSheet(w, place) : null),
    [printing, place, w]
  );

  useEffect(() => {
    if (!sheet || !printing) return;
    document.documentElement.classList.add('rp-printing');
    const clearMarks = markSheetPrint(printing.variant, printing.ink);
    let live = true;
    const done = () => setPrinting(null);
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
      clearMarks();
      document.documentElement.classList.remove('rp-printing');
    };
  }, [sheet, printing]);

  if (w.hijriYear == null || w.days.length === 0) return null;

  const s = RAMADAN_SHEET[lang];
  const num = (n: number) => formatLocaleNumber(n, { useGrouping: false });
  const dayMonth = (date: string, year = false) =>
    formatLocaleDate(day(date), {
      day: 'numeric',
      month: 'long',
      ...(year ? { year: 'numeric' } : {}),
    });

  const printSheet = (() => {
    if (!sheet) return null;
    const year = num(Number(sheet.rows[0]!.date.slice(0, 4)));
    const last = sheet.rows[sheet.rows.length - 1]!;
    const toRow = (r: RamadanSheetRow, possible = false): SheetRowData => ({
      row: r.fast,
      date: r.date,
      fast: r.fast,
      visible: true,
      possible,
      fastLabel: num(r.fast),
      dateLabel: formatLocaleDate(day(r.date), { day: 'numeric', month: 'short' }),
      weekday: formatLocaleDate(day(r.date), { weekday: 'short' }),
      sehri: formatTime(r.sehri),
      iftar: formatTime(r.iftar),
    });
    const rows = [
      ...sheet.rows.map((r) => toRow(r)),
      ...(sheet.possible30 ? [toRow(sheet.possible30, true)] : []),
    ];
    const eid = sheet.possible30
      ? [sheet.possible30.date, addDay(sheet.possible30.date, 1)]
      : [addDay(last.date, 1)];
    const bd = sheet.country === 'BD';
    return createPortal(
      <div id="rp-print-root" data-print-page="" data-testid="ramadan-print" lang={lang}>
        <RamadanSheets
          lang={lang}
          title={s.title(year)}
          checklistTitle={s.checklistTitle(year)}
          place={`${place?.name || shortName} (${formatCoordinates(
            sheet.place.latitude,
            sheet.place.longitude
          )})`}
          sub={s.sub(
            num(sheet.hijriYear),
            dayMonth(sheet.rows[0]!.date),
            dayMonth(last.date, true),
            sheet.possible30 ? dayMonth(sheet.possible30.date) : undefined
          )}
          url="https://bustandeen.com/ramadan"
          rows={rows}
          labelRows={sheet.possible30 ? [30] : []}
          possible30Label={t('ramadan.sheetPossible30')}
          sehriBeforeFajr={(sheet.calibration?.sehri ?? 0) < 0}
          eid={eid.map((d) => dayMonth(d)).join(` ${s.or} `)}
          fitra={
            bd
              ? {
                  line: FITRA_BD.text[lang](
                    num(FITRA_BD.hijriYear),
                    dayMonth(FITRA_BD.announced, true),
                    num(FITRA_BD.minTaka),
                    formatLocaleNumber(FITRA_BD.maxTaka)
                  ),
                  pending: FITRA_BD.pending[lang](num(sheet.hijriYear)),
                  source: FITRA_BD.sourceLabel[lang],
                }
              : undefined
          }
        />
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
          <p className="text-white/75 text-sm leading-snug">
            {t('ramadan.sheetLede', { place: shortName })}
          </p>
          <RamadanDownloads lang={lang} onPrint={(variant, ink) => setPrinting({ variant, ink })} />
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
