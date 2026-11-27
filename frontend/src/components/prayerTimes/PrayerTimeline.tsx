import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ChevronDownIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { PrayerGlyph } from '../icons/IslamicIcons.js';
import { formatTime, getCurrentAndNextPrayer } from '../../utils/prayerTimes.js';
import { type TLEntry } from './timeline.js';

export default function PrayerTimeline({
  timeline,
  now,
  info,
  expandedEntry,
  setExpandedEntry,
}: {
  timeline: TLEntry[];
  now: Date;
  info: ReturnType<typeof getCurrentAndNextPrayer> | null;
  expandedEntry: string | null;
  setExpandedEntry: Dispatch<SetStateAction<string | null>>;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {timeline.map((entry, i) => {
        const key = `${entry.kind}-${i}`;
        const isExpanded = expandedEntry === key;
        const isPast =
          now.getTime() >
          (entry.kind === 'prayer' || entry.kind === 'event'
            ? entry.time.getTime()
            : entry.end.getTime());
        const isActiveNow =
          entry.kind === 'forbidden' || entry.kind === 'nafl'
            ? now >= entry.start && now < entry.end
            : entry.kind === 'prayer' && info?.current === entry.id && !info?.inForbiddenGap;

        // Prayer entry
        if (entry.kind === 'prayer') {
          const isNext = info?.next === entry.id;
          return (
            <div
              key={key}
              className={`rounded-card border p-4 flex items-center justify-between gap-3 transition-colors ${
                isActiveNow
                  ? 'bg-brand-emerald/10 border-brand-emerald shadow-elev-2'
                  : isNext
                    ? 'bg-brand-deep border-brand-emerald/40 shadow-elev-2'
                    : isPast
                      ? 'bg-brand-deep/60 border-brand-border shadow-elev-1 opacity-70'
                      : 'bg-brand-deep border-brand-border shadow-elev-2'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-10 h-10 shrink-0 rounded-full grid place-items-center border ${
                    isActiveNow || isNext
                      ? 'bg-brand-emerald/10 border-brand-emerald/40 text-brand-emerald'
                      : 'bg-brand-gold/10 border-brand-gold/25 text-brand-gold'
                  }`}
                >
                  <PrayerGlyph id={entry.id} className="w-5 h-5" aria-hidden />
                </span>
                <div>
                  <p
                    className={`font-bold text-base ${
                      isActiveNow || isNext ? 'text-brand-emerald' : 'text-white'
                    }`}
                  >
                    {entry.name}
                  </p>
                  {isActiveNow && (
                    <span className="inline-flex items-center gap-1 text-xs text-brand-emerald font-semibold uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                      {t('prayerTimes.currentBadge', 'Current')}
                    </span>
                  )}
                  {isNext && (
                    <span className="text-xs text-white/65 font-semibold uppercase tracking-wide">
                      {t('prayerTimes.next', 'Next')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-white/60 text-xs leading-none mb-0.5">
                  {t('prayerTimes.startsAt', 'starts at')}
                </p>
                <p
                  className={`font-display text-xl font-bold tabular-nums ${
                    isActiveNow || isNext ? 'text-brand-emerald' : 'text-white/90'
                  }`}
                >
                  {formatTime(entry.time)}
                </p>
                {entry.endTime && entry.isTrackable && (
                  <div className="mt-0.5 space-y-0.5">
                    <p className="text-white/60 text-xs leading-none">
                      → {formatTime(entry.endTime)}
                      {entry.finalEndTime && (
                        <span className="text-white/60 text-[10px]">
                          {' '}
                          ({t('prayerTimes.best', 'best')})
                        </span>
                      )}
                    </p>
                    {entry.finalEndTime && (
                      <p className="text-white/60 text-[10px] leading-none">
                        {t('prayerTimes.ishaWindowUntil', 'window → ')}
                        {formatTime(entry.finalEndTime)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Event entry (sunset)
        if (entry.kind === 'event') {
          return (
            <div
              key={key}
              className={`rounded-control border border-brand-border bg-shade/20 px-4 py-2.5 flex items-center justify-between gap-3 ${
                isPast ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <PrayerGlyph
                  id={entry.glyph}
                  className="w-5 h-5 shrink-0 text-brand-gold"
                  aria-hidden
                />
                <div>
                  <p className="text-white/85 font-semibold text-sm">{entry.label}</p>
                  <p className="text-white/65 text-xs">{entry.note}</p>
                </div>
              </div>
              <p className="text-white/80 text-base font-bold tabular-nums shrink-0">
                {formatTime(entry.time)}
              </p>
            </div>
          );
        }

        // Forbidden and nafl windows: a tappable row with the evidence
        const forbidden = entry.kind === 'forbidden';
        return (
          <div
            key={key}
            className={`rounded-card border overflow-hidden shadow-elev-1 transition-colors ${
              forbidden
                ? isActiveNow
                  ? 'border-red-400 bg-red-400/10'
                  : 'border-red-400/40 bg-brand-deep'
                : isActiveNow
                  ? 'border-brand-emerald bg-brand-emerald/10'
                  : 'border-brand-border bg-brand-deep'
            } ${isPast ? 'opacity-70' : ''}`}
          >
            <button
              className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
              onClick={() => setExpandedEntry(isExpanded ? null : key)}
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {entry.kind === 'forbidden' ? (
                  <NoSymbolIcon className="w-5 h-5 shrink-0 text-red-400" aria-hidden />
                ) : (
                  <PrayerGlyph
                    id={entry.glyph}
                    className="w-5 h-5 shrink-0 text-brand-emerald"
                    aria-hidden
                  />
                )}
                <div className="min-w-0">
                  <p
                    className={`font-bold text-sm ${forbidden ? 'text-red-400' : 'text-brand-emerald'}`}
                  >
                    {entry.label}
                    {isActiveNow && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${forbidden ? 'bg-red-400' : 'bg-brand-emerald'}`}
                        />
                        {t('prayerTimes.nowBadge', 'now')}
                      </span>
                    )}
                  </p>
                  <p className="text-white/65 text-xs truncate">
                    {entry.kind === 'forbidden' ? entry.note : entry.arabicName}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <div>
                  <p className="text-white/80 text-xs tabular-nums">{formatTime(entry.start)}</p>
                  <p className="text-white/60 text-xs">→ {formatTime(entry.end)}</p>
                </div>
                <ChevronDownIcon
                  className={`w-4 h-4 text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </div>
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="border-t border-brand-border px-4 py-3 space-y-2"
                >
                  <p className="text-white/85 text-sm leading-relaxed">{entry.note}</p>
                  <p className="text-white/70 text-xs italic leading-relaxed">{entry.hadith}</p>
                  <a
                    href={entry.hadithUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-gold underline underline-offset-2"
                  >
                    <BookOpenIcon className="w-3.5 h-3.5" aria-hidden />
                    {t('prayerTimes.viewOnSunnah', 'View on sunnah.com')}
                    <ArrowTopRightOnSquareIcon className="w-3 h-3" aria-hidden />
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
