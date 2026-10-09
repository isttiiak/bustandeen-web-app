import { Link } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ChevronRightIcon,
  ClockIcon,
  EnvelopeIcon,
  LockClosedIcon,
  SparklesIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { translateReference } from '../utils/localeReference.js';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { BTN_SECONDARY, CARD } from '../components/bustanStyles.js';
import {
  CrescentIcon,
  FlowerIcon,
  LeafIcon,
  MosqueIcon,
  TasbihIcon,
  type IconProps,
} from '../components/icons/IslamicIcons.js';
import { useAuthStore } from '../store/useAuthStore.js';
import ExtLink from '../components/ExtLink.js';

const FEATURE_KEYS: { Icon: (p: IconProps) => React.ReactNode; key: string }[] = [
  { Icon: TasbihIcon, key: 'zikrCounter' },
  { Icon: MosqueIcon, key: 'salatTracker' },
  { Icon: ClockIcon, key: 'prayerTimes' },
  { Icon: CrescentIcon, key: 'fastingTracker' },
  { Icon: BookOpenIcon, key: 'quranHabit' },
  { Icon: AcademicCapIcon, key: 'hifzTracker' },
  { Icon: FlowerIcon, key: 'rayhanah' },
  { Icon: SparklesIcon, key: 'naseeh' },
  { Icon: UsersIcon, key: 'friends' },
];

const LABEL = 'font-black text-xs uppercase tracking-widest flex items-center gap-2';

export default function About() {
  const { t, i18n } = useTranslation();

  // Rayhanah is never surfaced to a brother's account; the public Privacy page is the exception.
  const isMale = useAuthStore((s) => s.user?.gender === 'male');
  const features = FEATURE_KEYS.filter((f) => !(isMale && f.key === 'rayhanah')).map((f) => ({
    key: f.key,
    Icon: f.Icon,
    title: t(`about.feature.${f.key}.title`),
    desc: t(`about.feature.${f.key}.desc`),
  }));

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('about.seoTitle', 'About Bustandeen: Our Mission')}
        description={t(
          'about.seoDescription',
          'Bustandeen is a free, private Islamic productivity app for zikr, salat, fasting and Quran habits, built for the Muslim community with authentic Quran and hadith references.'
        )}
        path="/about"
      />
      <h1 className="sr-only">{t('about.srTitle')}</h1>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-4 pb-10">
          {/* Arch hero: the name and what it means */}
          <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/30">
              <LeafIcon className="w-7 h-7 text-brand-gold" aria-hidden />
            </div>
            <h2 className="font-display text-3xl font-bold text-white">{t('about.heading')}</h2>
            <p lang="ar" dir="rtl" className="font-arabic text-brand-gold text-xl">
              بستان + دين
            </p>
            <p className="text-white/75 text-sm leading-relaxed max-w-lg mx-auto">
              <Trans
                i18nKey="about.bustandeenDefinition"
                components={{ ar: <span lang="ar" dir="rtl" className="font-arabic" /> }}
              />
            </p>
            <p className="text-brand-emerald text-sm font-semibold italic">"Nourish your deen."</p>
            <p className="text-white/70 text-xs max-w-sm mx-auto leading-relaxed">
              {t('about.hadithQuote')}{' '}
              <a
                href="https://sunnah.com/bukhari:6464"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-gold underline underline-offset-2 whitespace-nowrap"
              >
                {translateReference('Ṣaḥīḥ al-Bukhārī 6464', i18n.language)}
                <ArrowTopRightOnSquareIcon
                  className="inline w-3 h-3 ml-0.5 -mt-0.5 align-middle"
                  aria-hidden="true"
                />
              </a>
            </p>
          </section>

          {/* Mission */}
          <section className={`${CARD} p-5 space-y-2`}>
            <h3 className={`${LABEL} text-brand-emerald`}>
              <LeafIcon className="w-4 h-4" aria-hidden />
              {t('about.intentionLabel')}
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">{t('about.intentionText')}</p>
          </section>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map(({ key, Icon, title, desc }) => (
              <div key={key} className={`${CARD} p-4 flex gap-3`}>
                <span className="w-9 h-9 rounded-control bg-brand-emerald/15 grid place-items-center shrink-0">
                  <Icon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm">{title}</p>
                  <p className="text-white/70 text-xs leading-relaxed mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Authenticity */}
          <section className="rounded-card border border-brand-gold/40 bg-brand-deep shadow-elev-2 p-5 space-y-2">
            <h3 className={`${LABEL} text-brand-gold`}>
              <BookOpenIcon className="w-4 h-4" aria-hidden="true" />
              {t('about.authenticityLabel')}
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              {t('about.authenticityText1')}{' '}
              <a
                href="https://quran.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-emerald underline"
              >
                quran.com
              </a>{' '}
              {t('about.authenticityOr')}{' '}
              <a
                href="https://sunnah.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-emerald underline"
              >
                sunnah.com
              </a>
              , {t('about.authenticityText2')}
            </p>
            <p className="text-white/80 text-sm leading-relaxed">
              <Trans
                i18nKey="about.quranTextSource"
                components={{
                  1: <ExtLink href="https://tanzil.net" className="text-brand-emerald underline" />,
                }}
              />
            </p>
          </section>

          {/* Privacy pointer */}
          <section className={`${CARD} p-5 flex items-center justify-between gap-3`}>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm flex items-center gap-2">
                <LockClosedIcon
                  className="w-4 h-4 text-brand-emerald shrink-0"
                  aria-hidden="true"
                />
                {t('about.dataTitle')}
              </p>
              <p className="text-white/70 text-xs mt-0.5">{t('about.dataDesc')}</p>
            </div>
            <Link to="/privacy" className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs shrink-0`}>
              {t('about.privacyLink')}
              <ChevronRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </section>

          {/* Developer credit */}
          <div className="text-center pt-4 space-y-2">
            <p className="text-white/75 text-sm">
              {t('about.developedBy')} <span className="text-brand-emerald font-bold">Istiak</span>
            </p>
            <p className="text-white/70 text-xs max-w-sm mx-auto leading-relaxed">
              {t('about.founderNote')}
            </p>
            <a href="mailto:istiak@bustandeen.com" className={`${BTN_SECONDARY} !text-xs`}>
              <EnvelopeIcon className="w-4 h-4" aria-hidden="true" />
              istiak@bustandeen.com
            </a>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
