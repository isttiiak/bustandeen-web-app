import { Fragment } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownTrayIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  LockClosedIcon,
  MapIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrashIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { CARD } from '../components/bustanStyles.js';

type HeroIcon = typeof LockClosedIcon;

const SECTION_KEYS: { Icon: HeroIcon; key: string; bodyCount: number }[] = [
  { Icon: ArrowDownTrayIcon, key: 'whatWeStore', bodyCount: 8 },
  { Icon: DevicePhoneMobileIcon, key: 'deviceOnly', bodyCount: 3 },
  { Icon: UsersIcon, key: 'friendsSee', bodyCount: 5 },
  { Icon: SparklesIcon, key: 'naseeh', bodyCount: 4 },
  { Icon: GlobeAltIcon, key: 'thirdParty', bodyCount: 3 },
  { Icon: NoSymbolIcon, key: 'neverDo', bodyCount: 3 },
  { Icon: TrashIcon, key: 'yourControl', bodyCount: 4 },
  { Icon: ShieldCheckIcon, key: 'protected', bodyCount: 4 },
  { Icon: PencilSquareIcon, key: 'changes', bodyCount: 1 },
];

/** Section heading inside a privacy card, with its icon. */
const HEADING = 'text-white font-bold text-sm mb-2 flex items-center gap-2';
const ICON = 'w-4 h-4 text-brand-emerald shrink-0';

/** Every processor that receives anything, in the order a request meets them
 * (audit T2.11 / PRIV-02). Keys under privacy.dataFlow.rows in both locales. */
const DATA_FLOW_ROWS = [
  'vercel',
  'atlas',
  'firebase',
  'ga',
  'groq',
  'zoho',
  'quran',
  'flagcdn',
  'osm',
] as const;

function DataFlowTable() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="data-flow-title" className={`${CARD} p-5`}>
      <h3 id="data-flow-title" className={HEADING}>
        <MapIcon className={ICON} aria-hidden="true" />
        {t('privacy.dataFlow.title')}
      </h3>
      <p className="text-white/70 text-xs leading-relaxed mb-3">{t('privacy.dataFlow.intro')}</p>
      {/* A list of rows rather than a <table>: three long text columns do not
          fit a phone screen, stacked rows do. */}
      <dl className="divide-y divide-brand-border">
        {DATA_FLOW_ROWS.map((row) => (
          <div key={row} className="py-2.5 first:pt-0 last:pb-0">
            <dt className="text-white text-xs font-bold">
              {t(`privacy.dataFlow.rows.${row}.name`)}
            </dt>
            <dd className="text-white/80 text-xs leading-relaxed mt-0.5">
              <span className="text-white/70 font-semibold">{t('privacy.dataFlow.colWhy')}: </span>
              {t(`privacy.dataFlow.rows.${row}.why`)}
            </dd>
            <dd className="text-white/80 text-xs leading-relaxed mt-0.5">
              <span className="text-white/70 font-semibold">
                {t('privacy.dataFlow.colReceives')}:{' '}
              </span>
              {t(`privacy.dataFlow.rows.${row}.receives`)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function Privacy() {
  const { t } = useTranslation();

  const sections = SECTION_KEYS.map((s) => ({
    key: s.key,
    Icon: s.Icon,
    title: t(`privacy.${s.key}.title`),
    body: Array.from({ length: s.bodyCount }, (_, i) => t(`privacy.${s.key}.body${i}`)),
  }));

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('privacy.seoTitle', 'Privacy Policy')}
        description={t(
          'privacy.seoDescription',
          'How Bustandeen stores and protects your data: what we collect, what stays on your device, what friends can see, and your control over deletion.'
        )}
        path="/privacy"
      />
      <h1 className="sr-only">{t('privacy.srTitle')}</h1>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-4 pb-10">
          <header className="text-center py-6 space-y-2">
            <span className="mx-auto w-14 h-14 rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/40 text-brand-gold">
              <LockClosedIcon className="w-7 h-7" aria-hidden="true" />
            </span>
            <h2 className="font-display text-3xl font-bold text-white">{t('privacy.heading')}</h2>
            <p className="text-white/75 text-sm max-w-md mx-auto leading-relaxed">
              {t('privacy.subtitle')}
            </p>
            <p className="text-white/70 text-xs">{t('privacy.lastUpdated')}</p>
          </header>

          {sections.map((s) => (
            <Fragment key={s.key}>
              <section className={`${CARD} p-5`} aria-labelledby={`privacy-${s.key}`}>
                <h3 id={`privacy-${s.key}`} className={HEADING}>
                  <s.Icon className={ICON} aria-hidden="true" />
                  {s.title}
                </h3>
                <ul className="space-y-1.5">
                  {s.body.map((line, j) => (
                    <li
                      key={j}
                      className="text-white/80 text-xs leading-relaxed pl-3 border-l-2 border-brand-border"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
              {s.key === 'thirdParty' && <DataFlowTable />}
            </Fragment>
          ))}

          <footer className="text-center pt-4 space-y-2">
            <p className="text-white/75 text-xs">
              {t('privacy.contactText')}{' '}
              <a href="mailto:ansar@bustandeen.com" className="text-brand-emerald underline">
                ansar@bustandeen.com
              </a>
            </p>
            <Link to="/about" className="text-white/70 text-xs underline hover:text-white">
              {t('privacy.aboutLink')}
            </Link>
          </footer>
        </div>
      </div>
    </AnimatedBackground>
  );
}
