import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { CARD } from '../components/bustanStyles.js';
import { MaghribIcon, SunriseIcon } from '../components/icons/IslamicIcons.js';
import {
  ARABIC_STYLE,
  LibraryHero,
  OPTION_OFF,
  OPTION_ON,
} from '../components/library/libraryParts.js';
import { MORNING_ADHKAR, EVENING_ADHKAR, type AdhkarItem } from '../seo/content/adhkar.js';
import { translateReference } from '../utils/localeReference.js';

export default function AdhkarLibrary() {
  const { t, i18n } = useTranslation();
  const lang: 'en' | 'bn' = i18n.language === 'bn' ? 'bn' : 'en';
  // Home's timeline links straight to the open window (?period=evening).
  const [params] = useSearchParams();
  const [period, setPeriod] = useState<'morning' | 'evening'>(
    params.get('period') === 'evening' ? 'evening' : 'morning'
  );
  const [counts, setCounts] = useState<Record<string, number>>({});

  const items: AdhkarItem[] = period === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR;

  const bump = (item: AdhkarItem) => {
    setCounts((c) => {
      const current = c[item.id] ?? 0;
      const next = current >= item.repeat ? 0 : current + 1;
      return { ...c, [item.id]: next };
    });
  };

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('library.adhkarSeoTitle', 'Adhkar')}
        description={t(
          'library.adhkarSeoDescription',
          "Morning and evening adhkar: the Prophet's ﷺ remembrances for the start and end of the day."
        )}
        path="/library/adhkar"
        index={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-5 pb-10">
          <LibraryHero
            Icon={period === 'morning' ? SunriseIcon : MaghribIcon}
            title={t('library.adhkarTitle')}
            subtitle={t('library.adhkarSubtitle')}
          />

          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-label={t('library.adhkarTitle')}
          >
            {(
              [
                ['morning', SunriseIcon, t('library.adhkarMorning')],
                ['evening', MaghribIcon, t('library.adhkarEvening')],
              ] as const
            ).map(([id, PeriodIcon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                aria-pressed={period === id}
                className={`flex items-center justify-center gap-2 rounded-control border px-3 py-2.5 text-sm font-bold transition-colors ${
                  period === id ? OPTION_ON : OPTION_OFF
                }`}
              >
                <PeriodIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const done = counts[item.id] ?? 0;
              const complete = done >= item.repeat;
              return (
                <div key={item.id} className={`${CARD} p-4 space-y-3`}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display font-bold text-white text-base">
                      {item.title[lang]}
                    </h2>
                    <button
                      type="button"
                      onClick={() => bump(item)}
                      title={t('library.tapToCount')}
                      aria-label={`${t('library.tapToCount')}: ${done}/${item.repeat}`}
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-black tabular-nums transition-colors ${
                        complete
                          ? 'btn-solid border-transparent bg-brand-emerald-dim text-on-color'
                          : 'border-brand-border bg-brand-surface/50 text-white/80 hover:border-brand-emerald/40'
                      }`}
                    >
                      {complete && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                      {done}/{item.repeat}
                    </button>
                  </div>
                  <p
                    dir="rtl"
                    lang="ar"
                    className="text-xl leading-loose text-white"
                    style={ARABIC_STYLE}
                  >
                    {item.arabic}
                  </p>
                  <p className="italic text-white/60 text-xs">{item.transliteration}</p>
                  <p className="text-white/80 text-sm leading-relaxed">{item.translation[lang]}</p>
                  <div className="pt-2 border-t border-brand-border flex items-center justify-between gap-3 text-xs">
                    <span className="text-white/60">{t('library.sourceLabel')}</span>
                    <a
                      href={item.reference.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-gold underline underline-offset-2 text-right"
                    >
                      {translateReference(
                        `${item.reference.text} · ${item.reference.grade}`,
                        i18n.language
                      )}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
