import { useTranslation } from 'react-i18next';
import '../../../styles/calendarPrint.css';
import type { CalendarEvent } from '../../../utils/calendarEvents.js';
import {
  leadingBlanks,
  monthDays,
  weekdayOrder,
  type CalendarDay,
  type CalendarKind,
  type DayResolver,
} from '../../../utils/calendarMonth.js';
import {
  boxEvents,
  dayMarks,
  isRecurring,
  monthListEvents,
  monthRecurring,
  sheetSize,
  type DayMark,
  type PrintOptions,
} from '../../../utils/calendarPrint.js';
import { BENGALI_MONTHS, bnDigits } from '../../../utils/bengaliCalendar.js';
import {
  dayNumber,
  eventName,
  gregLabel,
  gregShort,
  hijriMonthName,
  isMonthStart,
  monthName,
  monthSpan,
  monthTitle,
  num,
  type Lang,
} from '../calendarText.js';

// The printed sheets of the Islamic calendar download: one page per month in
// the "Corners" layout, or the year at a glance. Styles: styles/calendarPrint.css.

interface SheetProps {
  anchors: string[];
  options: PrintOptions;
  day: DayResolver;
  eventsOf: (d: CalendarDay) => CalendarEvent[];
  weekStart: number;
  weekend: readonly number[];
  today: string;
  countryLabel: string;
  /** Kinds of event shown (the colour guide lists only these). */
  kinds: CalendarEvent['type'][];
  /** Years among a month's days without a published holiday list. */
  missingYears: (days: readonly CalendarDay[]) => number[];
}

const pageClass = (o: PrintOptions) =>
  `pc-page ${o.orient === 'portrait' ? 'pc-portrait' : ''} ${
    o.color === 'mono' ? 'pc-mono' : `pc-${o.template}`
  }`;

const weekdayName = (w: number) =>
  gregLabel(`2026-10-${String(11 + w).padStart(2, '0')}`, { weekday: 'short' });

const isBn = (k: CalendarKind) => (k === 'bn' ? 'pc-bn' : '');

/** A recurring day's sign: a ring for the Monday and Thursday fast, a full moon for the White Days. */
const Mark = ({ m }: { m: DayMark }) => <i className={`pc-m pc-m-${m}`} aria-hidden="true" />;

export default function PrintSheets(p: SheetProps) {
  const { width, height } = sheetSize(p.options.paper, p.options.orient);
  // A pixel short of the sheet so rounding never spills onto a blank page.
  const style = { width, height: height - 1 };
  if (p.options.range.kind === 'year' && p.options.range.layout === 'glance') {
    return <YearGlance {...p} style={style} />;
  }
  return (
    <>
      {p.anchors.map((a) => (
        <MonthSheet key={a} {...p} anchor={a} style={style} />
      ))}
    </>
  );
}

function Head({ title, subtitle, country }: { title: string; subtitle: string; country: string }) {
  return (
    <div className="pc-head">
      <div className="pc-title">
        <b>{title}</b>
        <span>{subtitle}</span>
      </div>
      <div className="pc-brand">
        <b>Bustandeen</b>
        {country && <span>{country}</span>}
      </div>
    </div>
  );
}

function Foot() {
  const { t } = useTranslation();
  return (
    <div className="pc-foot">
      <span>{t('calendar.pMade')}</span>
      <span>bustandeen.com/calendar</span>
    </div>
  );
}

function MonthSheet(p: SheetProps & { anchor: string; style: { width: number; height: number } }) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'bn' ? 'bn' : 'en';
  const [c1 = 'greg', c2, c3] = p.options.order;
  const days = monthDays(p.anchor, c1, p.day);
  const order = weekdayOrder(p.weekStart);
  const lead = leadingBlanks(days[0]!.weekday, p.weekStart);
  const trail = (7 - ((lead + days.length) % 7)) % 7;
  const rows = (lead + days.length + trail) / 7;

  const corner = (k: CalendarKind, d: CalendarDay) =>
    isMonthStart(k, d) && k !== 'greg' ? (
      <span className={`pc-mk ${isBn(k)}`}>
        {dayNumber(k, d, lang)}{' '}
        {k === 'hijri' ? hijriMonthName(t, d.hijri.month) : BENGALI_MONTHS[d.bengali.month - 1]}
      </span>
    ) : (
      <span className={isBn(k)}>{dayNumber(k, d, lang)}</span>
    );

  const list = monthListEvents(days, p.eventsOf);
  const repeats = monthRecurring(days, p.eventsOf);
  const blank = p.options.inside === 'blank';
  // Every Friday is Jumu'ah: the column header says it once.
  const jumuah = repeats.some((r) => r.id === 'friday');
  const dateOf = (d: CalendarDay) => (c1 === 'greg' ? gregShort(d.ymd) : dayNumber(c1, d, lang));
  const missing = p.missingYears(days);
  const subtitle = [c2, c3]
    .filter((k): k is CalendarKind => !!k)
    .map((k) => monthSpan(k, days, t, lang))
    .join('  ·  ');

  return (
    <section className={pageClass(p.options)} style={p.style} data-print-sheet>
      <Head
        title={monthTitle(c1, days[0]!, t, lang)}
        subtitle={subtitle}
        country={p.countryLabel}
      />
      <div className="pc-body">
        <div
          className="pc-grid"
          style={{ gridTemplateRows: `${jumuah ? 38 : 28}px repeat(${rows}, 1fr)` }}
        >
          {order.map((w) => (
            <div key={`w${w}`} className={`pc-wd ${p.weekend.includes(w) ? 'pc-we' : ''}`}>
              <span>
                {weekdayName(w)}
                {jumuah && w === 5 && <small data-print-jumuah>{t('calendar.pJumuah')}</small>}
              </span>
            </div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={`l${i}`} className="pc-c pc-blank" />
          ))}
          {days.map((d) => {
            const events = p.eventsOf(d);
            const { shown, more } = boxEvents(events);
            const holiday = events.some((e) => e.type === 'holiday');
            const marks = dayMarks(events);
            // Blank for writing: no names, so each kind of named day gets its colour mark.
            const kinds = blank
              ? [...new Set(events.filter((e) => !isRecurring(e)).map((e) => e.type))]
              : [];
            const signs =
              marks.length + kinds.length > 0 ? (
                <span className="pc-marks" data-print-marks>
                  {kinds.map((k) => (
                    <i key={k} className={`pc-sw pc-${k}`} />
                  ))}
                  {marks.map((m) => (
                    <Mark key={m} m={m} />
                  ))}
                </span>
              ) : null;
            return (
              <div
                key={d.ymd}
                className={`pc-c ${p.weekend.includes(d.weekday) ? 'pc-we' : ''} ${holiday ? 'pc-hol' : ''}`}
                data-print-day={d.ymd}
              >
                <span className={`pc-n1 ${isBn(c1)}`}>{dayNumber(c1, d, lang)}</span>
                {/* The second calendar top right, the day's signs under it. */}
                {(c2 || signs) && (
                  <span className="pc-n2">
                    {c2 && corner(c2, d)}
                    {signs}
                  </span>
                )}
                {c3 && <span className="pc-n3">{corner(c3, d)}</span>}
                {/* Blank for writing: no names in the box (the side column lists them). */}
                {!blank && shown.length > 0 && (
                  <div className="pc-evs">
                    {shown.map((e, i) => (
                      <div key={i} className={`pc-ev pc-${e.type}`}>
                        {eventName(e, t, lang, true)}
                      </div>
                    ))}
                    {more > 0 && (
                      <div className="pc-ev pc-more">
                        {t('calendar.pMore', { n: num(more, lang) })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {Array.from({ length: trail }, (_, i) => (
            <div key={`t${i}`} className="pc-c pc-blank" />
          ))}
        </div>
        <div className="pc-side">
          {(list.length > 0 || repeats.length === 0) && (
            <div>
              <h4>{t('calendar.pThisMonth')}</h4>
              <ul>
                {list.length === 0 && (
                  <li>
                    <i />
                    <b />
                    <span>{t('calendar.noneThisMonth')}</span>
                  </li>
                )}
                {list.map(({ day, event, span }, i) => (
                  <li key={i} className={`pc-${event.type}`}>
                    <i className={`pc-sw pc-${event.type}`} />
                    <b>{dateOf(day)}</b>
                    <span>
                      {eventName(event, t, lang)}
                      {span && ` (${num(span[0], lang)}-${num(span[1], lang)})`}
                    </span>
                  </li>
                ))}
              </ul>
              {missing.length > 0 && (
                <p className="pc-fine" data-print-missing>
                  {t('calendar.holidaysMissing', {
                    years: missing.map((y) => num(y, lang)).join(', '),
                  })}
                </p>
              )}
            </div>
          )}
          {repeats.length > 0 && (
            <div data-print-repeats>
              <h4>{t('calendar.pRepeats')}</h4>
              <ul>
                {repeats.map((r, i) => (
                  <li key={i} className="pc-islamic">
                    {r.id === 'friday' ? (
                      <i />
                    ) : (
                      <Mark m={r.id === 'fast_mon_thu' ? 'fast' : 'white'} />
                    )}
                    <b>
                      {r.id !== 'ayyam_al_bid'
                        ? r.weekdays.map(weekdayName).join(', ')
                        : r.from === r.to
                          ? dateOf(r.from)
                          : `${dateOf(r.from)}-${dayNumber(c1, r.to, lang)}`}
                    </b>
                    <span>
                      {r.id === 'friday' ? t('calendar.pJumuah') : t(`specialDays.${r.id}.name`)}
                      {r.id === 'ayyam_al_bid' &&
                        ` (${num(r.from.hijri.day, lang)}${
                          r.to === r.from ? '' : `-${num(r.to.hijri.day, lang)}`
                        })`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h4>{t('calendar.pGuide')}</h4>
            {/* Which number is which calendar, at the sizes of the day box. */}
            <ul className="pc-cals">
              {p.options.order.map((k, i) => (
                <li key={k}>
                  <i className={['pc-a', 'pc-b', 'pc-cc'][i]}>{num(i + 1, lang)}</i>
                  <span>{t(`calendar.cal.${k}`)}</span>
                </li>
              ))}
            </ul>
            <div className="pc-key">
              {p.kinds.map((k) => (
                <span key={k}>
                  <i className={`pc-sw pc-${k}`} />
                  {t(`calendar.kind.${k}`)}
                </span>
              ))}
              <span>
                <i className="pc-sw pc-weekend" />
                {t('calendar.kind.weekend')}
              </span>
            </div>
            <p className="pc-fine" data-print-moon>
              {t('calendar.moonNote')}
            </p>
          </div>
          {/* Blank for writing: faint lines fill the rest of the column. */}
          {blank && <div className="pc-notes" data-print-notes />}
        </div>
      </div>
      <Foot />
    </section>
  );
}

function YearGlance(p: SheetProps & { style: { width: number; height: number } }) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language === 'bn' ? 'bn' : 'en';
  const [main = 'greg', sub] = p.options.order;
  const order = weekdayOrder(p.weekStart);
  const first = p.day(p.anchors[0]!);
  const title =
    main === 'greg'
      ? num(first.ymd.slice(0, 4), lang)
      : main === 'hijri'
        ? `${num(first.hijri.year, lang)} ${t('hijriMonths.ah')}`
        : `${bnDigits(first.bengali.year)} বঙ্গাব্দ`;
  return (
    <section className={pageClass(p.options)} style={p.style} data-print-sheet>
      <Head title={title} subtitle={t('calendar.pYear')} country={p.countryLabel} />
      <div className="pc-yr">
        {p.anchors.map((a) => {
          const days = monthDays(a, main, p.day);
          const lead = leadingBlanks(days[0]!.weekday, p.weekStart);
          return (
            <div key={a} className="pc-ym">
              <h5>
                <span className={isBn(main)}>{monthName(main, days[0]!, t)}</span>
                {sub && <small className={isBn(sub)}>{monthSpan(sub, days, t, lang)}</small>}
              </h5>
              <div className="pc-g7">
                {order.map((w) => (
                  <span key={`w${w}`} className="pc-w">
                    {weekdayName(w)}
                  </span>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                  <span key={`l${i}`} />
                ))}
                {days.map((d) => (
                  <span
                    key={d.ymd}
                    className={`${p.weekend.includes(d.weekday) ? 'pc-we' : ''} ${
                      p.eventsOf(d).some((e) => e.type === 'holiday') ? 'pc-h' : ''
                    } ${isBn(main)}`}
                  >
                    {dayNumber(main, d, lang)}
                    {sub && <small className={isBn(sub)}>{dayNumber(sub, d, lang)}</small>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="pc-fine pc-glance-fine" data-print-moon>
        {t('calendar.moonNote')}
      </p>
      <Foot />
    </section>
  );
}
