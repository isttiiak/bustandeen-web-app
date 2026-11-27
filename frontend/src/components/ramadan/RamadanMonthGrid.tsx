import { useTranslation, Trans } from 'react-i18next';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import {
  CrescentIcon,
  FajrIcon,
  FlowerIcon,
  MosqueIcon,
  Star8Icon,
} from '../icons/IslamicIcons.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import ExtLink from '../ExtLink.js';
import { weekdayShort, gregorianShort, formatGregorian, type Icon } from './ramadanShared.js';
import { type RamadanPage } from './useRamadanPage.js';

export default function RamadanMonthGrid({ page }: { page: RamadanPage }) {
  const { t } = useTranslation();
  const { window_, today, ASHRA, logsByDate, isExcused } = page;

  return (
    <section className={`${CARD} p-5`}>
      <h2 className={`${SECTION_TITLE} mb-3`}>
        <CrescentIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
        {t('ramadan.yourMonth', 'Your month')}
      </h2>

      {/* Split into the three ʿashra. A ten is 10 days, which never lines
              up with a 7-day week, so instead of a weekday-aligned grid each
              group is its own block and every cell carries its own day name.
              NOTE: the popular "mercy / forgiveness / freedom from the Fire"
              naming rests on a weak narration (Ibn Khuzaymah 1887, ḍaʿīf), so
              each group carries the grade badge. */}
      {ASHRA.map((group) => {
        const groupDays = window_.days.filter(
          (d) => d.dayNumber >= group.from && d.dayNumber <= group.to
        );
        if (groupDays.length === 0) return null;
        return (
          <div
            key={group.from}
            className="border-t border-brand-border first:border-t-0 pt-3 first:pt-0 mt-3 first:mt-0"
          >
            <div className="flex items-baseline gap-2 flex-wrap mb-2">
              <span className="text-brand-gold font-bold text-sm">{group.label}</span>
              <span className="text-white/70 text-[11px]">{group.sub}</span>
              <span className="text-white/55 text-[10px] tabular-nums">
                ·{' '}
                {t('ramadan.daysRange', 'days {{from}}-{{to}}', {
                  from: formatLocaleNumber(group.from),
                  to: formatLocaleNumber(Math.min(group.to, window_.days.length)),
                })}
              </span>
              {group.weak && (
                <span
                  title={t('ramadan.ashraWeakTooltip')}
                  className="text-[9px] uppercase tracking-wide text-brand-gold border border-brand-gold/40 rounded px-1 py-px"
                >
                  {t('ramadan.daifBadge', 'ḍaʿīf')}
                </span>
              )}
            </div>
            {group.note && <p className="text-brand-info text-[11px] -mt-1 mb-2">{group.note}</p>}
            <div className="grid grid-cols-5 gap-2">
              {groupDays.map((d) => {
                const log = logsByDate.get(d.date);
                const excused = isExcused(d.date);
                const isPast = d.date < today;
                const isToday = d.date === today;
                const oddNight = d.isLastTen && d.isOdd;
                let Face: Icon | null = null;
                let cls = 'bg-brand-surface/60 border-brand-border text-white/80';
                if (excused && d.date <= today) {
                  Face = FlowerIcon;
                  cls = 'bg-brand-pink/15 border-brand-pink/40 text-brand-pink';
                } else if (log?.status === 'completed') {
                  Face = CheckIcon;
                  cls = 'bg-data-good/15 border-data-good/50 text-data-good';
                } else if (log?.status === 'intended') {
                  Face = FajrIcon;
                  cls = 'bg-brand-info/15 border-brand-info/40 text-brand-info';
                } else if (log?.status === 'broken') {
                  Face = XMarkIcon;
                  cls = 'bg-red-400/10 border-red-400/40 text-red-400';
                } else if (isPast) {
                  cls = 'bg-shade/20 border-brand-border text-white/55';
                } else if (oddNight) {
                  cls = 'bg-brand-info/10 border-brand-info/50 text-white/90';
                }
                return (
                  <div
                    key={d.date}
                    title={t('ramadan.dayCellTitle', {
                      day: d.dayNumber,
                      date: formatGregorian(d.date),
                      oddNightNote: oddNight ? t('ramadan.oddNightSuffix') : '',
                    })}
                    className={[
                      'relative aspect-square rounded-control border flex flex-col items-center justify-center gap-0.5',
                      cls,
                      isToday ? 'ring-2 ring-brand-gold ring-offset-1 ring-offset-brand-deep' : '',
                    ].join(' ')}
                  >
                    {/* Odd nights of the last ten carry a star: Laylat
                            al-Qadr is sought in them. */}
                    {oddNight && (
                      <Star8Icon
                        className="absolute top-1 left-1 w-2.5 h-2.5 text-brand-info"
                        aria-hidden="true"
                      />
                    )}
                    {log?.tarawih && (
                      <MosqueIcon
                        className="absolute top-1 right-1 w-2.5 h-2.5 text-brand-info"
                        aria-hidden="true"
                      />
                    )}
                    {Face ? (
                      <Face className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <span className="text-base sm:text-lg font-bold leading-none tabular-nums">
                        {formatLocaleNumber(d.dayNumber)}
                      </span>
                    )}
                    {/* Gregorian anchor: nobody plans their week in hijri
                            alone, so each cell carries the civil date too. */}
                    <span className="text-[9px] leading-none opacity-90 font-semibold">
                      {weekdayShort(d.date)}
                    </span>
                    <span className="text-[9px] leading-none opacity-75 tabular-nums">
                      {gregorianShort(d.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[11px] text-white/75">
        {(
          [
            [CheckIcon, 'text-data-good', t('ramadan.legendFasted', 'fasted')],
            [XMarkIcon, 'text-red-400', t('ramadan.legendBroken', 'broken')],
            [FlowerIcon, 'text-brand-pink', t('ramadan.legendExcusedQada', 'excused → qaḍā')],
            [MosqueIcon, 'text-brand-info', t('ramadan.legendTarawih', 'tarawih')],
            [Star8Icon, 'text-brand-info', t('ramadan.legendGlowing')],
          ] as const
        ).map(([L, tone, label]) => (
          <span key={label} className="inline-flex items-center gap-1">
            <L className={`w-3.5 h-3.5 ${tone}`} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
      <p className="text-white/65 text-[11px] mt-2 leading-relaxed">
        <Trans
          i18nKey="ramadan.rayhanahAutoQadaNote"
          components={{
            1: (
              <ExtLink href="https://sunnah.com/muslim:335" className="underline text-brand-gold" />
            ),
          }}
        />
      </p>
    </section>
  );
}
