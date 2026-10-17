// The first-fast notice of a Ramadan calendar (v5.178.0): it names what the
// date rests on (plan.basis): this Ramadan's announcement, the country's
// latest moon sighting carried forward, or Umm al-Qura alone.
import { MONTHLY, type MonthlyLang } from '../locales/monthly.js';
import { RAMADAN_BD } from '../locales/ramadanBd.js';
import { RAMADAN_WORLD } from '../locales/ramadanWorld.js';
import { dateFormat } from '../utils/intl.js';
import type { RamadanPlan } from '../utils/ramadanBd.js';

interface Props {
  lang: MonthlyLang;
  plan: RamadanPlan;
  /** Bangladesh: the committee's wording, en + bn. Elsewhere: English only. */
  bd: boolean;
  /** The country's name in the page language (for the worldwide wording). */
  country: string;
  className?: string;
  linkClassName?: string;
}

export default function RamadanNotice({
  lang,
  plan,
  bd,
  country,
  className,
  linkClassName,
}: Props) {
  const m = MONTHLY[lang];
  const date = (d: Date, weekday: boolean) =>
    dateFormat(m.locale, {
      ...(weekday ? { weekday: 'long' } : {}),
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  const start = date(plan.days[0].noon, true);
  const s = bd ? RAMADAN_BD[lang] : RAMADAN_WORLD;
  const record = plan.startRecord;
  const since = plan.forecastRecord;

  let text: string;
  if (record) {
    text = bd
      ? RAMADAN_BD[lang].announcedNotice(start)
      : RAMADAN_WORLD.announcedNotice(start, country);
  } else if (since) {
    const month = m.hijriMonths[since.hijriMonth - 1];
    const began = date(new Date(`${since.startDate}T12:00:00Z`), false);
    text = bd
      ? RAMADAN_BD[lang].forecastNotice(start, month, began)
      : RAMADAN_WORLD.forecastNotice(start, country, month, began);
  } else {
    text = s.estimateNotice(start);
  }

  return (
    <div role="note" data-ramadan-basis={plan.basis} className={className}>
      <p>
        {text}
        {record?.sourceUrl && (
          <>
            {' '}
            <a
              href={record.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              {s.sourceLink}
            </a>
          </>
        )}
      </p>
      {!plan.endSettled && <p className="mt-1.5 text-white/80">{s.eidNote}</p>}
    </div>
  );
}
