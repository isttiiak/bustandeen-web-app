import { useTranslation } from 'react-i18next';
import { LinkIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { MosqueIcon, PrayerGlyph } from '../icons/IslamicIcons.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { FARD_RAKAT, travelRakat, isQasrPrayer } from '../../utils/musafir.js';
import { PRAYERS } from './musafirShared.js';
import { type MusafirPage } from './useMusafirPage.js';

export default function MusafirPrayers({ page }: { page: MusafirPage }) {
  const { t } = useTranslation();
  const { savedRakat, canJoin, meta, bn } = page;

  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className={SECTION_TITLE}>
          <MosqueIcon className="w-5 h-5 text-brand-gold" aria-hidden />
          {t('musafir.prayersTitle', 'Your prayers on the road')}
        </h3>
        <span className="text-brand-emerald text-[11px] font-bold">
          {t('musafir.savedRakat', '{{count}} rak’ahs lighter a day', {
            count: savedRakat,
          })}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-3">
        {PRAYERS.map((p) => {
          const shortened = isQasrPrayer(p.id);
          return (
            <div
              key={p.id}
              className={`min-w-0 rounded-control border text-center py-2.5 sm:py-3 px-0.5 sm:px-1 ${
                shortened
                  ? 'border-brand-emerald/50 bg-brand-emerald/10'
                  : 'border-brand-border bg-brand-surface/50'
              }`}
            >
              <PrayerGlyph
                id={p.id}
                className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto ${shortened ? 'text-brand-emerald' : 'text-white/70'}`}
                aria-hidden
              />
              <p className="text-white/80 text-[9px] min-[360px]:text-[10px] sm:text-[11px] font-bold mt-1 leading-tight tracking-tight sm:tracking-normal whitespace-nowrap">
                {translateSalatName(p.id, p.name, t)}
              </p>
              <p className="mt-1 leading-none">
                {shortened && (
                  <span className="text-white/50 text-[10px] sm:text-xs line-through mr-0.5 sm:mr-1">
                    {formatLocaleNumber(FARD_RAKAT[p.id])}
                  </span>
                )}
                <span
                  className={`font-display text-xl sm:text-2xl font-bold ${shortened ? 'text-brand-emerald' : 'text-white/85'}`}
                >
                  {formatLocaleNumber(travelRakat(p.id))}
                </span>
              </p>
              <p className="text-white/60 text-[8px] sm:text-[9px] mt-1 uppercase sm:tracking-wide">
                {shortened ? t('musafir.qasrTag', 'qaṣr') : t('musafir.unchanged', 'same')}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-control border border-brand-border bg-shade/20 p-3">
        {canJoin ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/75 font-bold inline-flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-brand-gold" aria-hidden />
              {t('musafir.canJoin', 'May be joined:')}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-brand-gold/15 text-brand-gold font-bold">
              {translateSalatName('dhuhr', 'Dhuhr', t)} + {translateSalatName('asr', 'Asr', t)}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-brand-gold/15 text-brand-gold font-bold">
              {translateSalatName('maghrib', 'Maghrib', t)} +{' '}
              {translateSalatName('isha', 'Isha', t)}
            </span>
          </div>
        ) : (
          <p className="text-white/75 text-xs leading-relaxed flex gap-1.5">
            <LinkIcon className="w-4 h-4 shrink-0 text-brand-gold" aria-hidden />
            <span>{bn ? meta.jamBn : meta.jam}</span>
          </p>
        )}
      </div>
    </section>
  );
}
