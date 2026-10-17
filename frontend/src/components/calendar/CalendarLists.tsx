import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { CARD } from '../bustanStyles.js';
import type { CalendarEvent } from '../../utils/calendarEvents.js';
import type { CalendarDay, CalendarKind } from '../../utils/calendarMonth.js';
import { addDaysYmd } from '../../utils/placeClock.js';
import { EVENT_DOT } from './MonthGrid.js';
import {
  bengaliLabel,
  eventName,
  gregLabel,
  gregLong,
  gregShort,
  hijriLabel,
  hijriMonthName,
  num,
  type Lang,
} from './calendarText.js';

// The selected day's card and the two lists under the grid (This month,
// Next 3 months) of the calendar.

function Mark({ type }: { type: CalendarEvent['type'] }) {
  return <span aria-hidden="true" className={`inline-block w-2 h-2 shrink-0 ${EVENT_DOT[type]}`} />;
}

const eveOf = (ymd: string) =>
  gregLabel(addDaysYmd(ymd, -1), { weekday: 'long', day: 'numeric', month: 'short' });

/** One event under a day: name, kind, and for Islamic days a link to its page. */
function EventLine({ e, ymd }: { e: CalendarEvent; ymd: string }) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'bn' ? 'bn' : 'en';
  const detail = [t(`calendar.kind.${e.type}`)];
  if (e.type === 'holiday') {
    detail.push(t(`calendar.holidayKind.${e.holiday.kind}`));
    if (e.holiday.moon) detail.push(t('calendar.moonDependent'));
  }
  const body = (
    <>
      <Mark type={e.type} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-white">{eventName(e, t, lang)}</span>
        <span className="block text-xs text-white/70">{detail.join(' · ')}</span>
        {e.type === 'islamic' && e.night && (
          <span className="block text-xs text-white/70">
            {t('calendar.nightNote', { eve: eveOf(ymd) })}
          </span>
        )}
      </span>
    </>
  );
  if (e.type !== 'islamic') {
    return <li className="flex items-center gap-3 min-h-[44px] py-1.5">{body}</li>;
  }
  return (
    <li>
      <Link
        to={`/special-day/${e.id}`}
        className="flex items-center gap-3 min-h-[44px] py-1.5 rounded-control hover:bg-brand-surface/60"
      >
        {body}
        <ChevronRightIcon
          className="w-4 h-4 text-white/60 shrink-0"
          aria-label={t('calendar.readMore')}
        />
      </Link>
    </li>
  );
}

/** The selected day: its dates, events, and where its Hijri date comes from. */
export function DayDetails({
  day,
  isToday,
  layers,
  events,
  country,
}: {
  day: CalendarDay;
  isToday: boolean;
  layers: readonly CalendarKind[];
  events: CalendarEvent[];
  country: string;
}) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'bn' ? 'bn' : 'en';
  const month = `${hijriMonthName(t, day.hijri.month)} ${num(day.hijri.year, lang)}`;
  const source =
    day.hijriSource === 'manual'
      ? t('calendar.srcManual')
      : day.hijriSource === 'none'
        ? t('calendar.srcNone')
        : day.record &&
            day.record.hijriYear === day.hijri.year &&
            day.record.hijriMonth === day.hijri.month
          ? t('calendar.srcRecord', { month, date: gregShort(day.record.startDate), country })
          : t('calendar.srcForecast', { month, country });

  return (
    <section className={`${CARD} p-4 space-y-3`} aria-live="polite" data-testid="calendar-day">
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
        {isToday ? t('calendar.today') : t('calendar.selected')}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {layers.map((k) => (
          <div key={k} className="contents">
            <dt className="text-xs text-white/60 pt-0.5">{t(`calendar.calLong.${k}`)}</dt>
            <dd
              lang={k === 'bn' ? 'bn' : undefined}
              className={`font-semibold ${k === 'hijri' ? 'text-brand-gold' : 'text-white'}`}
            >
              {k === 'greg'
                ? gregLong(day.ymd)
                : k === 'hijri'
                  ? hijriLabel(t, day.hijri, lang)
                  : bengaliLabel(day)}
            </dd>
          </div>
        ))}
      </dl>
      {events.length > 0 && (
        <ul className="divide-y divide-brand-border">
          {events.map((e, i) => (
            <EventLine key={i} e={e} ymd={day.ymd} />
          ))}
        </ul>
      )}
      {layers.includes('hijri') && (
        <p className="text-xs text-white/70 leading-relaxed">
          {t('calendar.maghribNote', {
            date: `${num(day.hijri.day, lang)} ${hijriMonthName(t, day.hijri.month)}`,
            eve: eveOf(day.ymd),
          })}{' '}
          {source}
        </p>
      )}
      {events.some((e) => e.type === 'holiday') && (
        <p className="text-xs text-white/70">{t('calendar.holidaySource')}</p>
      )}
    </section>
  );
}

type EventRow = { day: CalendarDay; event: CalendarEvent };

/** A list of days with their events (This month), or of months (Next 3 months). */
export function EventList({
  title,
  subtitle,
  rows,
  groups,
  empty,
  showWhen,
  today,
  onPick,
  testId,
}: {
  title: string;
  subtitle: string;
  rows?: EventRow[];
  /** Rows under a heading each (a month); empty groups are left out. */
  groups?: { key: string; title: string; rows: EventRow[] }[];
  empty: string;
  showWhen?: boolean;
  today: string;
  onPick: (ymd: string) => void;
  testId: string;
}) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'bn' ? 'bn' : 'en';
  const daysUntil = (ymd: string) =>
    Math.round((Date.parse(`${ymd}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  return (
    <section className={`${CARD} p-4 space-y-2`} data-testid={testId}>
      <div>
        <h2 className="font-display text-base font-bold text-white">{title}</h2>
        <p className="text-xs text-white/60">{subtitle}</p>
      </div>
      {(() => {
        const list = groups
          ? groups.filter((g) => g.rows.length > 0)
          : [{ key: 'all', title: '', rows: rows ?? [] }].filter((g) => g.rows.length > 0);
        if (list.length === 0) return <p className="text-sm text-white/70">{empty}</p>;
        return list.map((g) => (
          <div key={g.key}>
            {g.title && (
              <h3 className="pt-2 text-[11px] font-bold uppercase tracking-wider text-brand-gold">
                {g.title}
              </h3>
            )}
            <ul className="divide-y divide-brand-border">
              {g.rows.map(({ day, event }, i) => (
                <li key={`${day.ymd}-${i}`}>
                  <button
                    type="button"
                    onClick={() => onPick(day.ymd)}
                    className="w-full grid grid-cols-[44px_1fr_auto] items-center gap-3 min-h-[52px] py-1.5 text-left"
                  >
                    <span className="grid justify-items-center rounded-control bg-brand-surface/60 py-1 leading-none">
                      <span className="text-base font-bold text-white tabular-nums">
                        {num(Number(day.ymd.slice(8)), lang)}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-white/60">
                        {gregLabel(day.ymd, { weekday: 'short' })}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">
                        {eventName(event, t, lang)}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-white/70">
                        <Mark type={event.type} />
                        {t(`calendar.kind.${event.type}`)}
                        {' · '}
                        {num(day.hijri.day, lang)} {hijriMonthName(t, day.hijri.month)}
                      </span>
                    </span>
                    {showWhen && daysUntil(day.ymd) > 0 && (
                      <span className="text-xs font-bold text-white/70 whitespace-nowrap">
                        {t('calendar.inDays', {
                          count: daysUntil(day.ymd),
                          n: num(daysUntil(day.ymd), lang),
                        })}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ));
      })()}
    </section>
  );
}
