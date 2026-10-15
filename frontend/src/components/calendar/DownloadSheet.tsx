import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  DIALOG,
  OPTION_OFF,
  OPTION_ON,
  SECTION_TITLE,
} from '../bustanStyles.js';
import Switch from '../Switch.js';
import {
  monthDays,
  monthInWindow,
  stepMonth,
  type CalendarKind,
  type DayResolver,
} from '../../utils/calendarMonth.js';
import { hasHolidays, hasNationalDays, holidayYears } from '../../utils/calendarEvents.js';
import {
  DEFAULT_PRINT,
  DOWNLOAD_LOG_KEY,
  MAX_PRINT_MONTHS,
  defaultInclude,
  downloadWaitMinutes,
  downloadWindow,
  recentDownloads,
  yearStart,
  type PrintInclude,
  type PrintOptions,
} from '../../utils/calendarPrint.js';
import { bnDigits } from '../../utils/bengaliCalendar.js';
import { monthTitle, num, type Lang } from './calendarText.js';

const KINDS: readonly CalendarKind[] = ['greg', 'hijri', 'bn'];
const ROLES = ['dRoleBig', 'dRoleTopRight', 'dRoleUnder'] as const;

/** The paper templates as tiles (the sheets' own colours are print tokens in calendarPrint.css). */
const TEMPLATE_TILE: Record<PrintOptions['template'], string> = {
  bustan: 'bg-brand-emerald-dim rounded-b-[50%]',
  classic: 'bg-brand-emerald-dim',
  minimal: 'bg-transparent border-b-2 border-white/80',
};

const readLog = () => {
  try {
    return localStorage.getItem(DOWNLOAD_LOG_KEY);
  } catch {
    return null;
  }
};

/**
 * The download drawer of the Islamic calendar, then a short notice before
 * printing. What it lists (Islamic days, Sunnah fasts, Fridays, government
 * holidays, national days) is chosen here, apart from the screen's settings.
 * Government holidays keep the download within last year to next year (their
 * lists are entered by hand); without them any year within OPEN_YEARS. One
 * download is at most 12 months, and a device may start DOWNLOADS_PER_HOUR.
 */
export default function DownloadSheet({
  open,
  onClose,
  layers,
  grid,
  anchor,
  day,
  today,
  country,
  countryLabel,
  onRequestCalendar,
  onPrint,
}: {
  open: boolean;
  onClose: () => void;
  /** The screen's calendars, in order; the grid's calendar goes first. */
  layers: readonly CalendarKind[];
  grid: CalendarKind;
  anchor: string;
  day: DayResolver;
  today: string;
  /** The calendar's country (ISO code): government holidays and national days. */
  country: string | null;
  countryLabel: string;
  /** Opens "Request your country's calendar" over the page. */
  onRequestCalendar: () => void;
  onPrint: (o: PrintOptions) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'bn' ? 'bn' : 'en';
  const startOrder = [grid, ...layers.filter((k) => k !== grid)];
  const [order, setOrder] = useState<CalendarKind[]>(startOrder);
  const [o, setO] = useState<Omit<PrintOptions, 'order' | 'at' | 'include'>>(DEFAULT_PRINT);
  const [include, setInclude] = useState<PrintInclude>(() => defaultInclude(country));
  // A day in the year the sheet shows, and the month picked for "One month".
  const [base, setBase] = useState(anchor);
  const [monthAt, setMonthAt] = useState(anchor);
  const [notice, setNotice] = useState(false);
  const [limitWait, setLimitWait] = useState(0);
  const set = (p: Partial<typeof o>) => setO((prev) => ({ ...prev, ...p }));
  const inc = (p: Partial<PrintInclude>) => setInclude((prev) => ({ ...prev, ...p }));

  const main = order[0] ?? 'greg';
  const first = (ymd: string) => monthDays(ymd, main, day)[0]!.ymd;
  const holidaysOk = hasHolidays(country);
  const nationalOk = hasNationalDays(country);
  const restricted = include.holidays && holidaysOk && o.inside === 'events';
  const win = useMemo(() => downloadWindow(today, restricted), [today, restricted]);
  const inWin = (m: string) => monthInWindow(monthDays(m, main, day), win);
  const yearOf = (b: string) => {
    const out = [yearStart(b, main, day)];
    while (out.length < 12) out.push(stepMonth(out[out.length - 1]!, main, 1, day));
    return out;
  };
  const stepYear = (from: string, by: -1 | 1) => {
    let d = from;
    for (let i = 0; i < 12; i++) d = stepMonth(d, main, by, day);
    return d;
  };
  const yearAll = yearOf(base);
  const yearMonths = yearAll.filter(inWin);
  const canYear = (by: -1 | 1) => yearOf(stepYear(base, by)).some(inWin);
  const moveYear = (by: -1 | 1) => {
    setBase(stepYear(base, by));
    setMonthAt(stepYear(monthAt, by));
  };

  const head = day(yearAll[0]!);
  const yearLabel =
    main === 'greg'
      ? num(head.ymd.slice(0, 4), lang)
      : main === 'hijri'
        ? `${num(head.hijri.year, lang)} ${t('hijriMonths.ah')}`
        : `${bnDigits(head.bengali.year)} বঙ্গাব্দ`;
  const pickedMonth = yearMonths.includes(first(monthAt)) ? first(monthAt) : yearMonths[0]!;
  // A range starts in the year shown and runs for up to a year.
  const rangeFrom =
    o.range.kind === 'range' && yearMonths.includes(first(o.range.from))
      ? first(o.range.from)
      : pickedMonth;
  const toChoices = (() => {
    const out = [rangeFrom];
    while (out.length < MAX_PRINT_MONTHS) out.push(stepMonth(out[out.length - 1]!, main, 1, day));
    return out.filter(inWin);
  })();
  const rangeTo =
    o.range.kind === 'range' && toChoices.includes(first(o.range.to))
      ? first(o.range.to)
      : toChoices[Math.min(2, toChoices.length - 1)]!;

  const toggleHolidays = (on: boolean) => {
    inc({ holidays: on });
    // Back to the screen's month when the year shown is outside the window.
    if (on && o.inside === 'events') {
      const w = downloadWindow(today, true);
      if (!yearAll.some((m) => monthInWindow(monthDays(m, main, day), w))) {
        setBase(anchor);
        setMonthAt(anchor);
      }
    }
  };

  const go = () => {
    const now = Date.now();
    const recent = recentDownloads(readLog(), now);
    const wait = downloadWaitMinutes(recent, now);
    if (wait) {
      setLimitWait(wait);
      return;
    }
    try {
      localStorage.setItem(DOWNLOAD_LOG_KEY, JSON.stringify([...recent, now]));
    } catch {
      // Private mode: this download just is not counted.
    }
    setNotice(false);
    onPrint({
      ...o,
      range: o.range.kind === 'range' ? { kind: 'range', from: rangeFrom, to: rangeTo } : o.range,
      order,
      at: o.range.kind === 'month' ? pickedMonth : yearAll[0]!,
      include: {
        ...include,
        holidays: include.holidays && holidaysOk,
        national: include.national && nationalOk,
      },
    });
  };

  const ordered = [...order, ...KINDS.filter((k) => !order.includes(k))];
  const toggle = (k: CalendarKind) => {
    if (order.includes(k)) {
      if (order.length > 1) setOrder(order.filter((x) => x !== k));
    } else setOrder([...order, k]);
  };
  const move = (k: CalendarKind, by: -1 | 1) => {
    const i = order.indexOf(k);
    const j = i + by;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setOrder(next);
  };
  const seg = <V extends string>(
    value: V,
    items: [V, string][],
    pick: (v: V) => void,
    label: string
  ) => (
    <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={label}>
      {items.map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => pick(v)}
          className={`min-h-[44px] rounded-control border px-2 text-sm font-bold transition-colors ${
            value === v ? OPTION_ON : OPTION_OFF
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
  const radio = (on: boolean, label: string, onPick: () => void, hint?: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={`w-full min-h-[48px] flex items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors ${
        on ? OPTION_ON : OPTION_OFF
      }`}
    >
      <span
        aria-hidden="true"
        className={`w-5 h-5 shrink-0 rounded-full border-2 grid place-items-center ${
          on ? 'border-brand-emerald' : 'border-brand-border'
        }`}
      >
        {on && <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-white/70">{hint}</span>}
      </span>
    </button>
  );
  const select = (
    value: string,
    pick: (v: string) => void,
    label: string,
    months: readonly string[]
  ) => (
    <label className="grid gap-1 text-xs font-bold text-white/70">
      {label}
      <select
        value={value}
        onChange={(e) => pick(e.target.value)}
        className="min-h-[44px] rounded-control border border-brand-border bg-brand-surface px-2 text-sm font-semibold text-white"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthTitle(main, day(m), t, lang)}
          </option>
        ))}
      </select>
    </label>
  );
  const switchRow = ({
    label,
    hint,
    checked,
    onChange,
    disabled,
    nested,
    testId,
    children,
  }: {
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (on: boolean) => void;
    disabled?: boolean;
    nested?: boolean;
    testId?: string;
    children?: ReactNode;
  }) => (
    <div
      className={`rounded-control border border-brand-border bg-brand-surface/40 px-3 py-2 ${
        nested ? 'ml-6' : ''
      }`}
      data-testid={testId}
    >
      <label
        className={`flex items-center gap-3 min-h-[40px] ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`flex-1 min-w-0 ${disabled ? 'opacity-60' : ''}`}>
          <span className="block text-sm font-semibold text-white">{label}</span>
          {hint && <span className="block text-xs text-white/70">{hint}</span>}
        </span>
        <Switch
          size={nested ? 'sm' : 'md'}
          checked={checked && !disabled}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
        />
      </label>
      {children}
    </div>
  );
  const requestLink = (
    <button
      type="button"
      onClick={onRequestCalendar}
      className="mt-1 inline-flex items-center min-h-[44px] text-xs font-bold text-brand-gold underline underline-offset-2"
      data-testid="calendar-request-open"
    >
      {t('calendar.rOpen')}
    </button>
  );
  const place = countryLabel || t('calendar.iYourCountry');
  const years = holidayYears(country);
  const winYears = `${num(win.from.slice(0, 4), lang)}-${num(win.to.slice(0, 4), lang)}`;

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
            aria-label={t('calendar.dTitle')}
            data-testid="calendar-download"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3 bg-brand-deep/95 backdrop-blur border-b border-brand-border">
              <h2 className="font-display text-white font-bold text-lg flex items-center gap-2">
                <ArrowDownTrayIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
                {t('calendar.dTitle')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('calendar.dClose')}
                className="w-11 h-11 grid place-items-center rounded-control text-white/70 hover:text-white hover:bg-brand-surface"
              >
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <section className="space-y-2">
                <h3 className={SECTION_TITLE}>{t('calendar.dCals')}</h3>
                <p className="text-xs text-white/70">{t('calendar.dCalsHint')}</p>
                {ordered.map((k) => {
                  const on = order.includes(k);
                  const i = order.indexOf(k);
                  const name = t(`calendar.calLong.${k}`);
                  return (
                    <div key={k} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        aria-disabled={on && order.length === 1}
                        onClick={() => toggle(k)}
                        className={`flex-1 min-h-[52px] flex items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors ${
                          on ? OPTION_ON : OPTION_OFF
                        }`}
                      >
                        <span
                          className={`w-5 h-5 shrink-0 grid place-items-center rounded-[6px] border-2 ${
                            on ? 'bg-brand-emerald border-brand-emerald' : 'border-brand-border'
                          }`}
                        >
                          {on && (
                            <CheckIcon className="w-3.5 h-3.5 text-brand-deep" aria-hidden="true" />
                          )}
                        </span>
                        <span className="flex-1 min-w-0 text-sm font-semibold">{name}</span>
                        {on && (
                          <span className="shrink-0 rounded-full bg-brand-gold/15 px-2 py-0.5 text-[11px] font-black text-brand-gold">
                            {t(`calendar.${ROLES[i]!}`)}
                          </span>
                        )}
                      </button>
                      {on && order.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => move(k, -1)}
                            disabled={i === 0}
                            aria-label={t('calendar.moveUp', { name })}
                            className="w-11 h-11 grid place-items-center rounded-control border border-brand-border text-white/80 disabled:opacity-40"
                          >
                            <ChevronUpIcon className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(k, 1)}
                            disabled={i === order.length - 1}
                            aria-label={t('calendar.moveDown', { name })}
                            className="w-11 h-11 grid place-items-center rounded-control border border-brand-border text-white/80 disabled:opacity-40"
                          >
                            <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </section>

              <div className="space-y-2" role="radiogroup" aria-label={t('calendar.dWhat')}>
                <h3 className={SECTION_TITLE}>{t('calendar.dWhat')}</h3>
                <div
                  className="flex items-center gap-2 rounded-control border border-brand-border bg-brand-surface/40 p-1"
                  data-testid="calendar-download-year"
                >
                  <button
                    type="button"
                    onClick={() => moveYear(-1)}
                    disabled={!canYear(-1)}
                    aria-label={t('calendar.dPrevYear')}
                    className="w-11 h-11 grid place-items-center rounded-control text-white disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <span
                    className="flex-1 text-center text-sm font-bold text-white"
                    aria-live="polite"
                  >
                    {yearLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveYear(1)}
                    disabled={!canYear(1)}
                    aria-label={t('calendar.dNextYear')}
                    className="w-11 h-11 grid place-items-center rounded-control text-white disabled:opacity-40"
                  >
                    <ChevronRightIcon className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
                {radio(o.range.kind === 'month', t('calendar.dOneMonth'), () =>
                  set({ range: { kind: 'month' } })
                )}
                {o.range.kind === 'month' &&
                  select(pickedMonth, setMonthAt, t('calendar.dMonthPick'), yearMonths)}
                {radio(o.range.kind === 'year', t('calendar.dYear', { year: yearLabel }), () =>
                  set({ range: { kind: 'year', layout: 'pages' } })
                )}
                {o.range.kind === 'year' && (
                  <div
                    className="space-y-2 pt-1"
                    role="radiogroup"
                    aria-label={t('calendar.dYearAs')}
                  >
                    {radio(
                      o.range.layout === 'pages',
                      t('calendar.dPages'),
                      () => set({ range: { kind: 'year', layout: 'pages' } }),
                      t('calendar.dPagesHint')
                    )}
                    {radio(
                      o.range.layout === 'glance',
                      t('calendar.dGlance'),
                      () => set({ range: { kind: 'year', layout: 'glance' } }),
                      t('calendar.dGlanceHint')
                    )}
                  </div>
                )}
                {radio(
                  o.range.kind === 'range',
                  t('calendar.dRange'),
                  () => set({ range: { kind: 'range', from: rangeFrom, to: rangeTo } }),
                  t('calendar.dRangeHint', { n: num(MAX_PRINT_MONTHS, lang) })
                )}
                {o.range.kind === 'range' && (
                  <div className="grid grid-cols-2 gap-2">
                    {select(
                      rangeFrom,
                      (v) => set({ range: { kind: 'range', from: v, to: rangeTo } }),
                      t('calendar.dFrom'),
                      yearMonths
                    )}
                    {select(
                      rangeTo,
                      (v) => set({ range: { kind: 'range', from: rangeFrom, to: v } }),
                      t('calendar.dTo'),
                      toChoices
                    )}
                  </div>
                )}
                {restricted && (
                  <p className="text-xs text-white/70" data-testid="calendar-download-window">
                    {t('calendar.dWindowHolidays', { years: winYears })}
                  </p>
                )}
              </div>

              <section className="space-y-2">
                <h3 className={SECTION_TITLE}>{t('calendar.dInside')}</h3>
                {seg(
                  o.inside,
                  [
                    ['events', t('calendar.dEvents')],
                    ['blank', t('calendar.dBlank')],
                  ],
                  (v) => set({ inside: v }),
                  t('calendar.dInside')
                )}
              </section>

              {o.inside === 'events' && (
                <section className="space-y-2" data-testid="calendar-download-include">
                  <h3 className={SECTION_TITLE}>{t('calendar.iTitle')}</h3>
                  {switchRow({
                    label: t('calendar.sIslamic'),
                    hint: t('calendar.iIslamicHint'),
                    checked: include.islamic,
                    onChange: (on) => inc({ islamic: on }),
                    testId: 'calendar-include-islamic',
                  })}
                  {switchRow({
                    label: t('calendar.iSunnahFasts'),
                    hint: t('calendar.iSunnahFastsHint'),
                    checked: include.sunnahFasts,
                    onChange: (on) => inc({ sunnahFasts: on }),
                    disabled: !include.islamic,
                    nested: true,
                    testId: 'calendar-include-fasts',
                  })}
                  {switchRow({
                    label: t('calendar.iFridays'),
                    hint: t('calendar.iFridaysHint'),
                    checked: include.fridays,
                    onChange: (on) => inc({ fridays: on }),
                    disabled: !include.islamic,
                    nested: true,
                    testId: 'calendar-include-fridays',
                  })}
                  {switchRow({
                    label: t('calendar.sHolidays'),
                    hint: holidaysOk
                      ? t('calendar.iHolidaysHint', {
                          country: place,
                          years: years.map((y) => num(y, lang)).join(', '),
                        })
                      : t('calendar.iHolidaysNone', { country: place }),
                    checked: include.holidays,
                    onChange: toggleHolidays,
                    disabled: !holidaysOk,
                    testId: 'calendar-include-holidays',
                    children: !holidaysOk && requestLink,
                  })}
                  {switchRow({
                    label: t('calendar.sNational'),
                    hint: nationalOk
                      ? t('calendar.iNationalNote')
                      : t('calendar.iNationalNone', { country: place }),
                    checked: include.national,
                    onChange: (on) => inc({ national: on }),
                    disabled: !nationalOk,
                    testId: 'calendar-include-national',
                    // One request asks for both lists: the link sits under the holidays.
                    children: !nationalOk && holidaysOk && requestLink,
                  })}
                </section>
              )}

              <section className="space-y-2">
                <h3 className={SECTION_TITLE}>{t('calendar.dPaper')}</h3>
                {seg(
                  o.paper,
                  [
                    ['A4', 'A4'],
                    ['Letter', 'Letter'],
                  ],
                  (v) => set({ paper: v }),
                  t('calendar.dPaper')
                )}
              </section>
              <section className="space-y-2">
                <h3 className={SECTION_TITLE}>{t('calendar.dOrient')}</h3>
                {seg(
                  o.orient,
                  [
                    ['landscape', t('calendar.dLandscape')],
                    ['portrait', t('calendar.dPortrait')],
                  ],
                  (v) => set({ orient: v }),
                  t('calendar.dOrient')
                )}
              </section>
              <section className="space-y-2">
                <h3 className={SECTION_TITLE}>{t('calendar.dColour')}</h3>
                {seg(
                  o.color,
                  [
                    ['color', t('calendar.dColourOn')],
                    ['mono', t('calendar.dMono')],
                  ],
                  (v) => set({ color: v }),
                  t('calendar.dColour')
                )}
                {o.color === 'color' && (
                  <div
                    className="grid grid-cols-3 gap-2 pt-1"
                    role="group"
                    aria-label={t('calendar.dTemplate')}
                  >
                    {(['bustan', 'classic', 'minimal'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={o.template === k}
                        onClick={() => set({ template: k })}
                        className={`min-h-[44px] rounded-control border p-2 grid gap-1.5 text-xs font-bold transition-colors ${
                          o.template === k ? OPTION_ON : OPTION_OFF
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="h-8 rounded-[6px] border border-brand-border bg-brand-surface overflow-hidden grid grid-rows-[10px_1fr]"
                        >
                          <span className={TEMPLATE_TILE[k]} />
                        </span>
                        {t(`calendar.tpl.${k}`)}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <button
                type="button"
                onClick={() => {
                  setLimitWait(0);
                  setNotice(true);
                }}
                disabled={!yearMonths.length}
                className={`${BTN_PRIMARY} w-full`}
                data-testid="calendar-download-go"
              >
                <ArrowDownTrayIcon className="w-5 h-5" aria-hidden="true" />
                {t('calendar.dGo')}
              </button>
            </div>
          </motion.aside>

          {notice && (
            <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4">
              <div
                className={`${DIALOG} w-full max-w-sm p-5 space-y-3`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="calendar-notice-title"
                data-testid="calendar-notice"
              >
                <h3
                  id="calendar-notice-title"
                  className="font-display text-lg font-bold text-white"
                >
                  {t('calendar.nTitle')}
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-white/80 leading-relaxed">
                  <li>{t('calendar.nMaghrib')}</li>
                  <li>{t('calendar.nExpected')}</li>
                  {o.inside === 'events' && include.holidays && holidaysOk && (
                    <li>{t('calendar.nHolidays')}</li>
                  )}
                  {o.inside === 'events' && include.national && nationalOk && (
                    <li>{t('calendar.iNationalNote')}</li>
                  )}
                  <li>{t('calendar.nSave')}</li>
                </ul>
                {limitWait > 0 && (
                  <p
                    role="alert"
                    className="rounded-control border border-brand-gold/40 bg-brand-gold/10 p-3 text-sm text-white"
                    data-testid="calendar-download-limit"
                  >
                    {t('calendar.dLimit', {
                      count: limitWait,
                      n: num(limitWait, lang),
                    })}
                  </p>
                )}
                <div className="grid grid-cols-[1fr_1.4fr] gap-2 pt-1">
                  <button type="button" onClick={() => setNotice(false)} className={BTN_SECONDARY}>
                    {t('calendar.nCancel')}
                  </button>
                  <button
                    type="button"
                    onClick={go}
                    disabled={limitWait > 0}
                    className={`${BTN_PRIMARY} disabled:opacity-60`}
                  >
                    {t('calendar.nGo')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
