import { useTranslation } from 'react-i18next';
import { MapIcon, MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { type MusafirPage } from './useMusafirPage.js';

export default function MusafirHistory({ page }: { page: MusafirPage }) {
  const { t } = useTranslation();
  const { history, musafir, day, fmtDate, setDeleteIdx } = page;

  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className={SECTION_TITLE}>
          <MapIcon className="w-5 h-5 text-brand-gold" aria-hidden />
          {t('musafir.historyTitle', 'Travel history')}
        </h3>
        {(history.length > 0 || musafir) && (
          <span className="text-white/65 text-[11px] font-bold">
            {t('musafir.historyTotals', '{{journeys}} journeys · {{days}} days on the road', {
              journeys: formatLocaleNumber(history.length + (musafir ? 1 : 0)),
              days: formatLocaleNumber(
                history.reduce((n, j) => n + j.days, 0) + (musafir ? day : 0)
              ),
            })}
          </span>
        )}
      </div>
      {history.length === 0 && !musafir ? (
        <p className="text-white/70 text-xs mt-2 leading-relaxed">
          {t(
            'musafir.historyEmpty',
            'Your journeys will be listed here: where you went, when you set out and came back, and how many days.'
          )}
        </p>
      ) : (
        <ol className="mt-3 relative border-l border-brand-border ml-2 space-y-3">
          {musafir && (
            <li className="pl-4 relative">
              <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-brand-emerald ring-4 ring-brand-emerald/20" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/90 text-sm font-bold min-w-0 break-words inline-flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4 shrink-0 text-brand-gold" aria-hidden />
                  {musafir.destination || t('musafir.aJourney', 'A journey')}
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-brand-emerald/15 text-brand-emerald">
                  {t('musafir.historyOngoing', 'ongoing')}
                </span>
              </div>
              <p className="text-white/65 text-xs mt-0.5">
                {fmtDate(musafir.startedAt)}
                {musafir.startAfter &&
                  ` (${t('musafir.historyAfter', 'after {{prayer}}', {
                    prayer: translateSalatName(musafir.startAfter, musafir.startAfter, t),
                  })})`}{' '}
                → {t('musafir.historyNow', 'now')} ·{' '}
                {t('musafir.daysShort', '{{count}}d', { count: day })}
              </p>
            </li>
          )}
          {history.map((j, idx) => (
            <li key={`${j.from}-${j.to}-${idx}`} className="pl-4 relative">
              <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-white/40" />
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-white/85 text-sm font-bold break-words inline-flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4 shrink-0 text-white/60" aria-hidden />
                    {j.destination || t('musafir.aJourney', 'A journey')}
                  </p>
                  <p className="text-white/65 text-xs mt-0.5">
                    {fmtDate(j.from)}
                    {j.startAfter &&
                      ` (${t('musafir.historyAfter', 'after {{prayer}}', {
                        prayer: translateSalatName(j.startAfter, j.startAfter, t),
                      })})`}{' '}
                    → {fmtDate(j.to)}
                    {j.endAfter &&
                      ` (${t('musafir.historyUntil', 'until {{prayer}}', {
                        prayer: translateSalatName(j.endAfter, j.endAfter, t),
                      })})`}{' '}
                    · {t('musafir.daysShort', '{{count}}d', { count: j.days })}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteIdx(idx)}
                  aria-label={t('musafir.historyDelete', 'Remove this journey')}
                  title={t('musafir.historyDelete', 'Remove this journey')}
                  className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-white/60 hover:text-red-400 hover:bg-red-400/10"
                >
                  <XMarkIcon className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
