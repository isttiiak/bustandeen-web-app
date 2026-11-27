import { useTranslation } from 'react-i18next';
import { BookOpenIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { LeafIcon } from '../icons/IslamicIcons.js';
import { ADHKAR_ICON } from './cycleIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { NOTE, EXCUSED_ADHKAR } from './rayhanahShared.js';
import { Ref } from './RayhanahBits.js';

export default function RayhanahAdhkar() {
  const { t } = useTranslation();

  return (
    <section className={`${CARD} p-5 space-y-3`}>
      <h2 className={SECTION_TITLE}>
        <BookOpenIcon className="w-5 h-5 text-brand-gold" />
        {t('rayhanah.adhkarGardenTitle', 'Your adhkār garden')}
      </h2>
      <p className={NOTE}>
        {t(
          'rayhanah.adhkarGardenIntro',
          "Curated authentic du'a you can recite right now. Dhikr, istighfār and ṣalawāt are fully open to you in every state"
        )}{' '}
        (<Ref href="https://sunnah.com/muslim:373" label="Muslim 373" />
        ).
      </p>
      <div className="space-y-2">
        {EXCUSED_ADHKAR.map((dua, i) => {
          const DIcon = ADHKAR_ICON[i] ?? LeafIcon;
          return (
            <details
              key={dua.label}
              className="group rounded-control border border-brand-border bg-brand-surface/50 overflow-hidden"
            >
              <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
                <span className="w-8 h-8 shrink-0 rounded-full grid place-items-center bg-brand-gold/10 text-brand-gold">
                  <DIcon className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold">
                    {t(`rayhanah.adhkar.${i}.label`, dua.label)}
                  </p>
                  <p className="text-white/70 text-[11px]">
                    {t(`rayhanah.adhkar.${i}.note`, dua.note)}
                  </p>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-white/60 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p
                  className="font-serif text-xl text-white leading-loose text-right"
                  dir="rtl"
                  lang="ar"
                >
                  {dua.arabic}
                </p>
                <p className="text-white/75 text-xs italic">{dua.transliteration}</p>
                <Ref href={dua.ref.url} label={dua.ref.text} block />
              </div>
            </details>
          );
        })}
      </div>
      <div className="rounded-control bg-brand-info/10 border border-brand-info/40 p-3 space-y-1.5">
        <p className="text-brand-info text-xs font-bold flex items-center gap-1.5">
          <BookOpenIcon className="w-4 h-4" />
          {t('rayhanah.reciteQuranQ', 'Can I recite the Quran?')}
        </p>
        <p className="text-white/75 text-[11px] leading-relaxed">
          <span className="font-bold text-white">{t('rayhanah.listening', 'Listening')}</span>{' '}
          {t('rayhanah.listeningAgreed', 'is agreed upon by all scholars.')}{' '}
          <span className="font-bold text-white">
            {t('rayhanah.recitingFromMemory', 'Reciting from memory')}
          </span>{' '}
          {t(
            'rayhanah.recitingDifference',
            'is a matter of scholarly difference: the majority (Ḥanafī, Shāfiʿī, Ḥanbalī) say it is not permitted during menses, while the Mālikī school and Ibn Taymiyyah permit it.'
          )}{' '}
          {t(
            'rayhanah.duaConsensus',
            "Du'ā using Quranic phrases is permitted by consensus. Ask a scholar you trust for your situation."
          )}
        </p>
      </div>
    </section>
  );
}
