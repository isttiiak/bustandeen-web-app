import type { ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { CARD } from '../bustanStyles.js';
import type { CalendarEvent } from '../../utils/calendarEvents.js';
import {
  leadingBlanks,
  weekdayOrder,
  type CalendarDay,
  type CalendarKind,
} from '../../utils/calendarMonth.js';
import { gregLabel, dayNumber, isMonthStart, type Lang } from './calendarText.js';

// The month card of the Islamic calendar: a 7-column grid, the main number in
// the grid's calendar, the others under it (Hijri gold, Bengali in Bangla),
// the weekend shaded, government holidays in the holiday colour, and a dot
// per kind of event (Islamic sage, holiday red, national day gold).

/** Colour of each kind of event, shared with the lists and the legend. */
export const EVENT_DOT: Record<CalendarEvent['type'], string> = {
  islamic: 'bg-brand-emerald rounded-full',
  holiday: 'bg-red-400 rounded-[2px]',
  national: 'bg-brand-gold rounded-[1px] rotate-45 scale-90',
};

const SUB_CLASS: Record<CalendarKind, string> = {
  greg: 'text-white/70',
  hijri: 'text-brand-gold',
  bn: 'text-white/60',
};

export interface MonthGridProps {
  days: readonly CalendarDay[];
  /** The calendar the grid follows (main number). */
  grid: CalendarKind;
  /** The other calendars, in the user's order. */
  others: readonly CalendarKind[];
  weekStart: number;
  weekend: readonly number[];
  today: string;
  selected: string;
  eventsOf: (d: CalendarDay) => CalendarEvent[];
  dayLabel: (d: CalendarDay, events: CalendarEvent[]) => string;
  title: string;
  subtitles: { kind: CalendarKind; text: string }[];
  status?: ReactNode;
  legend: ReactNode;
  onSelect: (ymd: string) => void;
  onPrev: () => void;
  onNext: () => void;
  /** False at the ends of the calendar's years (last year to next year). */
  canPrev: boolean;
  canNext: boolean;
  /** Notes under the legend (a missing holiday list, the moon line). */
  notes?: ReactNode;
}

export default function MonthGrid(p: MonthGridProps) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'bn' ? 'bn' : 'en';
  const order = weekdayOrder(p.weekStart);
  const lead = leadingBlanks(p.days[0]?.weekday ?? 0, p.weekStart);

  return (
    <section className={`${CARD} px-1.5 pt-3 pb-2.5 space-y-2.5`} aria-label={p.title}>
      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-1">
        <button
          type="button"
          onClick={p.onPrev}
          disabled={!p.canPrev}
          aria-label={t('calendar.prev')}
          className="w-11 h-11 grid place-items-center rounded-control border border-brand-border bg-brand-surface/50 text-white hover:border-brand-emerald/40 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="text-center min-w-0">
          <h2 className="font-display text-lg font-bold text-white" data-testid="calendar-month">
            {p.title}
          </h2>
          {p.subtitles.map((s) => (
            <p
              key={s.kind}
              lang={s.kind === 'bn' ? 'bn' : undefined}
              className={`text-xs font-semibold ${SUB_CLASS[s.kind]}`}
            >
              {s.text}
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={p.onNext}
          disabled={!p.canNext}
          aria-label={t('calendar.next')}
          className="w-11 h-11 grid place-items-center rounded-control border border-brand-border bg-brand-surface/50 text-white hover:border-brand-emerald/40 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {p.status}

      <div className="grid grid-cols-7 gap-0.5" data-testid="calendar-grid">
        {order.map((w) => (
          <div
            key={`wd-${w}`}
            aria-hidden="true"
            className={`text-center text-[11px] font-bold pb-1 ${
              p.weekend.includes(w) ? 'text-brand-warm' : 'text-white/60'
            }`}
          >
            {gregLabel(`2026-10-${String(11 + w).padStart(2, '0')}`, { weekday: 'short' })}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {p.days.map((d) => {
          const events = p.eventsOf(d);
          const kinds = [...new Set(events.map((e) => e.type))];
          const weekend = p.weekend.includes(d.weekday);
          const holiday = kinds.includes('holiday');
          const isSel = d.ymd === p.selected;
          const numberColor = holiday ? 'text-red-400' : weekend ? 'text-brand-warm' : 'text-white';
          return (
            <button
              key={d.ymd}
              type="button"
              data-day={d.ymd}
              aria-pressed={isSel}
              aria-current={d.ymd === p.today ? 'date' : undefined}
              aria-label={p.dayLabel(d, events)}
              onClick={() => p.onSelect(d.ymd)}
              className={`relative min-w-0 min-h-[60px] rounded-control border pt-1.5 pb-3 grid content-start justify-items-center gap-px transition-colors ${
                isSel
                  ? 'bg-brand-emerald/20 border-brand-emerald'
                  : d.ymd === p.today
                    ? 'border-brand-gold'
                    : 'border-transparent'
              } ${weekend && !isSel ? 'bg-brand-warm/10' : ''}`}
            >
              {/* Hijri as the main calendar: numbers in the heading font, so the switch is seen. */}
              <span
                className={`text-[15px] font-bold leading-tight tabular-nums ${numberColor} ${
                  p.grid === 'hijri' ? 'font-display text-base' : ''
                }`}
                data-hijri-main={p.grid === 'hijri' || undefined}
              >
                {dayNumber(p.grid, d, lang)}
              </span>
              {p.others.map((k) => (
                <span
                  key={k}
                  lang={k === 'bn' ? 'bn' : undefined}
                  className={`text-[11px] font-bold leading-tight tabular-nums ${SUB_CLASS[k]}`}
                >
                  {isMonthStart(k, d) ? (
                    <span
                      className={`px-1 rounded-full ${k === 'hijri' ? 'bg-brand-gold/15' : 'bg-brand-surface'}`}
                    >
                      {dayNumber(k, d, lang)}
                    </span>
                  ) : (
                    dayNumber(k, d, lang)
                  )}
                </span>
              ))}
              {kinds.length > 0 && (
                <span className="absolute bottom-1 inset-x-0 flex justify-center gap-[3px]">
                  {kinds.map((k) => (
                    <span key={k} className={`w-[5px] h-[5px] ${EVENT_DOT[k]}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2 border-t border-brand-border text-[11px] text-white/70">
        {p.legend}
      </div>
      {p.notes && (
        <div className="px-2 space-y-1 text-center text-[11px] leading-snug text-white/70">
          {p.notes}
        </div>
      )}
    </section>
  );
}
