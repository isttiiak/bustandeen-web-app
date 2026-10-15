import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
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
import {
  monthDays,
  stepMonth,
  type CalendarKind,
  type DayResolver,
} from '../../utils/calendarMonth.js';
import { DEFAULT_PRINT, type PrintOptions } from '../../utils/calendarPrint.js';
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

/** The download drawer of the Islamic calendar, then a short notice before printing. */
export default function DownloadSheet({
  open,
  onClose,
  layers,
  grid,
  anchor,
  day,
  onPrint,
}: {
  open: boolean;
  onClose: () => void;
  /** The screen's calendars, in order; the grid's calendar goes first. */
  layers: readonly CalendarKind[];
  grid: CalendarKind;
  anchor: string;
  day: DayResolver;
  onPrint: (o: PrintOptions) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'bn' ? 'bn' : 'en';
  const startOrder = [grid, ...layers.filter((k) => k !== grid)];
  const [order, setOrder] = useState<CalendarKind[]>(startOrder);
  const [o, setO] = useState<Omit<PrintOptions, 'order'>>(DEFAULT_PRINT);
  const [notice, setNotice] = useState(false);
  const set = (p: Partial<Omit<PrintOptions, 'order'>>) => setO((prev) => ({ ...prev, ...p }));

  const main = order[0] ?? 'greg';
  // Month choices for a range: a year either side, in the first calendar.
  const months = useMemo(() => {
    const out = [monthDays(anchor, main, day)[0]!.ymd];
    for (let i = 0; i < 12; i++) out.unshift(stepMonth(out[0]!, main, -1, day));
    for (let i = 0; i < 12; i++) out.push(stepMonth(out[out.length - 1]!, main, 1, day));
    return out;
  }, [anchor, main, day]);
  const current = monthDays(anchor, main, day)[0]!;
  const yearLabel =
    main === 'greg'
      ? num(current.ymd.slice(0, 4), lang)
      : main === 'hijri'
        ? `${num(current.hijri.year, lang)} ${t('hijriMonths.ah')}`
        : `${bnDigits(current.bengali.year)} বঙ্গাব্দ`;
  const range =
    o.range.kind === 'range'
      ? o.range
      : { kind: 'range' as const, from: current.ymd, to: current.ymd };

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
  const select = (value: string, pick: (v: string) => void, label: string, min?: string) => (
    <label className="grid gap-1 text-xs font-bold text-white/70">
      {label}
      <select
        value={value}
        onChange={(e) => pick(e.target.value)}
        className="min-h-[44px] rounded-control border border-brand-border bg-brand-surface px-2 text-sm font-semibold text-white"
      >
        {months
          .filter((m) => !min || m >= min)
          .map((m) => (
            <option key={m} value={m}>
              {monthTitle(main, day(m), t, lang)}
            </option>
          ))}
      </select>
    </label>
  );

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
                {radio(
                  o.range.kind === 'month',
                  t('calendar.dMonth', { month: monthTitle(main, current, t, lang) }),
                  () => set({ range: { kind: 'month' } })
                )}
                {radio(o.range.kind === 'year', t('calendar.dYear', { year: yearLabel }), () =>
                  set({ range: { kind: 'year', layout: 'pages' } })
                )}
                {radio(o.range.kind === 'range', t('calendar.dRange'), () =>
                  set({
                    range: {
                      kind: 'range',
                      from: current.ymd,
                      to: months[Math.min(months.indexOf(current.ymd) + 2, months.length - 1)]!,
                    },
                  })
                )}
                {o.range.kind === 'range' && (
                  <div className="grid grid-cols-2 gap-2">
                    {select(
                      range.from,
                      (v) => set({ range: { ...range, from: v, to: v > range.to ? v : range.to } }),
                      t('calendar.dFrom')
                    )}
                    {select(
                      range.to,
                      (v) => set({ range: { ...range, to: v } }),
                      t('calendar.dTo'),
                      range.from
                    )}
                  </div>
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
                onClick={() => setNotice(true)}
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
                  <li>{t('calendar.nHolidays')}</li>
                  <li>{t('calendar.nSave')}</li>
                </ul>
                <div className="grid grid-cols-[1fr_1.4fr] gap-2 pt-1">
                  <button type="button" onClick={() => setNotice(false)} className={BTN_SECONDARY}>
                    {t('calendar.nCancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotice(false);
                      onPrint({ ...o, order });
                    }}
                    className={BTN_PRIMARY}
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
