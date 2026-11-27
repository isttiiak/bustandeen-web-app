import { useTranslation } from 'react-i18next';
import { BookOpenIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { CrescentIcon, DropIcon, FlowerIcon } from '../icons/IslamicIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { Ref } from './RayhanahBits.js';

export default function RayhanahFiqhCompanion() {
  const { t } = useTranslation();

  return (
    <section className={`${CARD} p-5 space-y-4`}>
      <h2 className={SECTION_TITLE}>
        <BookOpenIcon className="w-5 h-5 text-brand-gold" />
        {t('rayhanah.fiqhCompanionTitle', 'Your fiqh companion')}
      </h2>
      <div className="grid sm:grid-cols-2 gap-3 text-xs leading-relaxed">
        <div className="rounded-control bg-brand-pink/10 border border-brand-pink/40 p-4">
          <p className="font-bold text-brand-pink mb-1.5 flex items-center gap-1.5">
            <CrescentIcon className="w-4 h-4" />
            {t('rayhanah.pausedForNow', 'Paused for now')}
          </p>
          <ul className="space-y-1 text-white/80 list-disc pl-4 marker:text-brand-pink">
            <li>
              {t('rayhanah.salatExcusedPre', 'Ṣalāt: fully excused,')}{' '}
              <span className="font-bold text-brand-pink">
                {t('rayhanah.neverMadeUp', 'never made up')}
              </span>{' '}
              (<Ref href="https://sunnah.com/muslim:335" label="Muslim 335" />)
            </li>
            <li>
              {t('rayhanah.fastingExcusedLater', 'Fasting: excused now, made up later')} (
              <Ref href="https://sunnah.com/muslim:335" label="Muslim 335" />)
            </li>
            <li>
              {t('rayhanah.tawafExcused', 'Ṭawāf around the Kaʿbah')} (
              <Ref href="https://sunnah.com/bukhari:305" label="Bukhārī 305" />)
            </li>
            <li>
              {t('rayhanah.intimacyExcused', 'Intimacy during menses')} (
              <Ref href="https://quran.com/2/222" label="Quran 2:222" />)
            </li>
          </ul>
        </div>
        <div className="rounded-control bg-brand-emerald/10 border border-brand-emerald/40 p-4">
          <p className="font-bold text-brand-emerald mb-1.5 flex items-center gap-1.5">
            <FlowerIcon className="w-4 h-4" />
            {t('rayhanah.fullyOpenToYou', 'Fully open to you')}
          </p>
          <ul className="space-y-1 text-white/80 list-disc pl-4 marker:text-brand-emerald">
            <li>
              {t('rayhanah.dhikrDuaSalawat', 'All dhikr, duʿā & ṣalawāt')} (
              <Ref href="https://sunnah.com/muslim:373" label="Muslim 373" />)
            </li>
            <li>
              {t('rayhanah.listeningQuranTafsir', 'Listening to the Quran, tafsīr & knowledge')}
            </li>
            <li>
              {t('rayhanah.attendingGatherings', 'Attending gatherings of good & duʿā')} (
              <Ref href="https://sunnah.com/bukhari:971" label="Bukhārī 971" />)
            </li>
            <li>{t('rayhanah.charityKindness', 'Charity, kindness, and serving others')}</li>
          </ul>
        </div>
      </div>
      <p className="text-white/70 text-[11px] leading-relaxed">
        {t(
          'rayhanah.aishahHajjStory',
          'The Prophet ﷺ told ʿĀʾishah (may Allah be pleased with her) during Hajj: do everything the pilgrim does, except ṭawāf'
        )}{' '}
        (<Ref href="https://sunnah.com/bukhari:305" label="Ṣaḥīḥ al-Bukhārī 305" />
        ).{' '}
        {t(
          'rayhanah.recitingScholarlyDifference',
          'Reciting Quran from memory is a matter of scholarly difference; listening is agreed upon. Ask a scholar you trust.'
        )}
      </p>

      {/* Istihadah guide */}
      <details className="group rounded-control bg-brand-gold/10 border border-brand-gold/40 p-4">
        <summary className="list-none flex items-center justify-between cursor-pointer">
          <p className="font-bold text-brand-gold text-sm flex items-center gap-1.5">
            <DropIcon className="w-4 h-4" />
            {t('rayhanah.istihadaQ', 'What is istiḥāḍa?')}
          </p>
          <ChevronDownIcon className="w-4 h-4 text-white/60 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-white/80">
          <p>
            <span className="font-bold text-white">{t('rayhanah.istihadaTerm', 'Istiḥāḍa')}</span>{' '}
            {t(
              'rayhanah.istihadaDefinition',
              '(irregular/non-menstrual bleeding) is bleeding that goes beyond the maximum period length (Ḥanafī: 10 days, majority: 15 days), or that occurs outside the normal menstrual pattern.'
            )}
          </p>
          <p>
            {t('rayhanah.fatimahHadithIntro', 'The Prophet ﷺ told')}{' '}
            <span className="font-bold">
              {t('rayhanah.fatimahName', 'Fāṭimah bint Abī Ḥubaysh')}
            </span>
            :{' '}
            <span className="italic text-white">
              {t(
                'rayhanah.fatimahHadithQuote',
                '"That is a vein, not menstruation. When your period comes, stop praying, and when it ends, wash the blood off and pray."'
              )}
            </span>{' '}
            (<Ref href="https://sunnah.com/bukhari:306" label="Bukhārī 306" />)
          </p>
          <div className="rounded-control bg-brand-deep/60 border border-brand-border p-3 space-y-1.5">
            <p className="font-bold text-brand-gold">
              {t('rayhanah.duringIstihada', 'During istiḥāḍa:')}
            </p>
            <ul className="space-y-1 list-disc pl-4 marker:text-brand-gold">
              <li>
                <span className="font-bold text-white">
                  {t('rayhanah.salatResumes', 'Ṣalāt resumes')}
                </span>
                : {t('rayhanah.salatResumesDesc', 'perform wuḍū for each prayer time')}
              </li>
              <li>
                <span className="font-bold text-white">
                  {t('rayhanah.fastingValid', 'Fasting is valid')}
                </span>
                : {t('rayhanah.fastingValidDesc', 'no makeup needed for these days')}
              </li>
              <li>
                <span className="font-bold text-white">
                  {t('rayhanah.intimacyPermitted', 'Intimacy is permitted')}
                </span>{' '}
                {t('rayhanah.majorityView', '(majority view)')}
              </li>
              <li>
                <span className="font-bold text-white">
                  {t('rayhanah.quranRecitationPermitted', 'Quran recitation is permitted')}
                </span>
              </li>
            </ul>
          </div>
          <p className="text-white/70 text-[11px]">
            {t(
              'rayhanah.istihadaAutoFlag',
              "Rayhanah automatically flags when your cycle exceeds the maximum for your chosen madhab. If you're unsure, consult a scholar you trust."
            )}
          </p>
        </div>
      </details>
    </section>
  );
}
