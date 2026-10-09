import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { DuaHandsIcon, Star8Icon } from '../icons/IslamicIcons.js';
import type { SpecialDayInfo } from '../../utils/islamicCalendar.js';
import { HIGHLIGHT_CAP, TODAY_SPECIAL_ID, type Highlight } from '../../utils/homeSpecial.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';

// Today's special days on Home, compact (Settings → Home): a "Today" strip
// under the prayer arch, or chips in the arch foot. Capped at HIGHLIGHT_CAP;
// "N more" and the Friday hour scroll to the detailed block further down.

const scrollToDetails = () =>
  document.getElementById(TODAY_SPECIAL_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

interface Props {
  variant: 'strip' | 'pills';
  highlights: Highlight[];
  days: SpecialDayInfo[];
  /** Friday hour countdown, e.g. "1h 12m" */
  fridayCountdown: string;
}

export default function TodayHighlights({ variant, highlights, days, fridayCountdown }: Props) {
  const { t } = useTranslation();
  if (highlights.length === 0) return null;
  const shown = highlights.slice(0, HIGHLIGHT_CAP);
  const more = highlights.length - shown.length;
  const day = (id: string) => days.find((d) => d.id === id);
  const name = (id: string) => t(`specialDays.${id}.name`, day(id)?.name ?? id);
  const fridayTitle = (finalStretch: boolean) =>
    finalStretch ? t('home.fridayHourNow') : t('home.fridayHourTitle');
  const moreLabel = t('home.todayMore', '{{n}} more today', { n: formatLocaleNumber(more) });

  if (variant === 'pills') {
    const PILL =
      'inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors';
    return (
      <ul
        aria-label={t('home.todayHighlights', 'Today')}
        data-testid="today-highlights"
        data-variant="pills"
        className="relative z-10 mt-3 flex flex-wrap justify-center gap-1.5"
      >
        {shown.map((h) =>
          h.kind === 'fridayHour' ? (
            <li key="fridayHour" className="max-w-full">
              <button
                type="button"
                onClick={scrollToDetails}
                className={`${PILL} border-brand-gold/60 bg-brand-gold/[0.12] text-brand-gold hover:bg-brand-gold/20`}
              >
                <DuaHandsIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{fridayTitle(h.finalStretch)}</span>
                <span className="tabular-nums shrink-0">{fridayCountdown}</span>
              </button>
            </li>
          ) : (
            <li key={h.id} className="max-w-full">
              <Link
                to={`/special-day/${h.id}`}
                className={`${PILL} border-brand-gold/40 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20`}
              >
                <Star8Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{name(h.id)}</span>
              </Link>
            </li>
          )
        )}
        {more > 0 && (
          <li>
            <button
              type="button"
              onClick={scrollToDetails}
              aria-label={moreLabel}
              className={`${PILL} border-brand-border text-white/70 hover:text-white`}
            >
              +{formatLocaleNumber(more)}
            </button>
          </li>
        )}
      </ul>
    );
  }

  const ROW =
    'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-surface/60 transition-colors';
  return (
    <section
      aria-label={t('home.todayHighlights', 'Today')}
      data-testid="today-highlights"
      data-variant="strip"
      className="mb-4 rounded-card border border-brand-gold/30 bg-brand-deep shadow-elev-1 overflow-hidden divide-y divide-brand-border/60"
    >
      {shown.map((h) =>
        h.kind === 'fridayHour' ? (
          <button key="fridayHour" type="button" onClick={scrollToDetails} className={ROW}>
            <DuaHandsIcon className="w-5 h-5 shrink-0 text-brand-gold" />
            <span className="min-w-0 flex-1">
              <span className="block text-white font-bold text-sm leading-tight truncate">
                {fridayTitle(h.finalStretch)}
              </span>
              <span className="block text-brand-gold text-xs font-semibold tabular-nums mt-0.5">
                {fridayCountdown} {t('home.toMaghrib')}
              </span>
            </span>
            <ChevronRightIcon className="w-4 h-4 shrink-0 text-white/40" />
          </button>
        ) : (
          <Link key={h.id} to={`/special-day/${h.id}`} className={ROW}>
            <Star8Icon className="w-5 h-5 shrink-0 text-brand-gold" />
            <span className="min-w-0 flex-1">
              <span className="block text-white font-bold text-sm leading-tight truncate">
                {name(h.id)}
              </span>
              <span className="block text-white/60 text-xs leading-snug truncate mt-0.5">
                {t(`specialDays.${h.id}.shortDesc`, day(h.id)?.shortDesc ?? '')}
              </span>
            </span>
            <ChevronRightIcon className="w-4 h-4 shrink-0 text-white/40" />
          </Link>
        )
      )}
      {more > 0 && (
        <button
          type="button"
          onClick={scrollToDetails}
          className="w-full px-4 py-2 text-center text-xs font-semibold text-brand-gold hover:bg-brand-surface/60 transition-colors"
        >
          {moreLabel}
        </button>
      )}
    </section>
  );
}
