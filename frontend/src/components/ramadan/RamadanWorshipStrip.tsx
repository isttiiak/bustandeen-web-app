import { useTranslation, Trans } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ChevronRightIcon, ClockIcon } from '@heroicons/react/24/outline';
import { CARD, ITEM, SECTION_TITLE } from '../bustanStyles.js';
import ExtLink from '../ExtLink.js';
import { WORSHIP_TILES } from './ramadanShared.js';
import { type RamadanPage } from './useRamadanPage.js';

export default function RamadanWorshipStrip({
  worshipToday,
}: {
  worshipToday: RamadanPage['worshipToday'];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className={`${CARD} p-5`}>
      <h2 className={`${SECTION_TITLE} mb-3`}>
        <ClockIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
        {t('ramadan.todaysWorship', "Today's worship")}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {WORSHIP_TILES.map((tile) => {
          const stat = worshipToday[tile.id];
          return (
            <button key={tile.id} onClick={() => navigate(tile.to)} className={ITEM}>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
                <tile.Icon className={`w-3.5 h-3.5 shrink-0 ${tile.tone}`} aria-hidden="true" />
                <span className="truncate">{t(tile.labelKey)}</span>
              </p>
              <p className={`font-bold text-2xl leading-tight mt-1 tabular-nums ${tile.tone}`}>
                {stat.value}
                {stat.suffix && (
                  <span className="text-white/60 text-sm font-bold">{stat.suffix}</span>
                )}
              </p>
              <p className="text-white/65 text-[11px] mt-0.5 flex items-center gap-1">
                <span className="truncate">{stat.hint}</span>
                <ChevronRightIcon className="w-3 h-3 ml-auto shrink-0" aria-hidden="true" />
              </p>
            </button>
          );
        })}
      </div>
      <p className="text-white/65 text-[11px] mt-3 leading-relaxed">
        <Trans
          i18nKey="ramadan.naflFardNote"
          components={{
            1: (
              <ExtLink
                href="https://islamqa.info/en/answers/21364"
                className="underline text-brand-gold"
              />
            ),
            3: (
              <ExtLink
                href="https://sunnah.com/bukhari:1899"
                className="underline text-brand-gold"
              />
            ),
          }}
        />
      </p>
    </section>
  );
}
