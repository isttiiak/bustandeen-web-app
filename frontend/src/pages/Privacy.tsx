import { Fragment } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownTrayIcon,
  BookOpenIcon,
  DevicePhoneMobileIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  GlobeAsiaAustraliaIcon,
  LockClosedIcon,
  MapIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  ScaleIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { CARD } from '../components/bustanStyles.js';

type HeroIcon = typeof LockClosedIcon;

const SECTION_KEYS: { Icon: HeroIcon; key: string; bodyCount: number }[] = [
  { Icon: ArrowDownTrayIcon, key: 'whatWeStore', bodyCount: 8 },
  { Icon: EyeSlashIcon, key: 'sensitive', bodyCount: 1 },
  { Icon: DevicePhoneMobileIcon, key: 'deviceOnly', bodyCount: 4 },
  { Icon: UsersIcon, key: 'friendsSee', bodyCount: 6 },
  { Icon: GlobeAltIcon, key: 'thirdParty', bodyCount: 3 },
  { Icon: GlobeAsiaAustraliaIcon, key: 'whereData', bodyCount: 2 },
  { Icon: BookOpenIcon, key: 'sources', bodyCount: 6 },
  { Icon: NoSymbolIcon, key: 'neverDo', bodyCount: 5 },
  { Icon: TrashIcon, key: 'yourControl', bodyCount: 4 },
  { Icon: ScaleIcon, key: 'rights', bodyCount: 2 },
  { Icon: ShieldCheckIcon, key: 'protected', bodyCount: 5 },
  { Icon: UserIcon, key: 'children', bodyCount: 1 },
  { Icon: PencilSquareIcon, key: 'changes', bodyCount: 3 },
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
  'zoho',
  'quran',
  'quranFoundation',
  'sunnah',
  'ird',
  'qul',
  'flagcdn',
  'osm',
] as const;

/** Each provider's own privacy policy, opened in a new tab. Only addresses that
 * loaded and named the provider's policy on 2026-11-28 are listed. A row with
 * no entry has no policy link: sunnah.com, IRD Foundation and flagcdn publish
 * none we could find; the alquran.cloud / Islamic Network / mp3quran row names
 * three providers and only mp3quran has a policy page, so it has none rather
 * than one that covers a third of the row. Never guess an address. The QUL row
 * links to Tarteel, QUL's owner. */
const POLICY_URLS: Partial<Record<(typeof DATA_FLOW_ROWS)[number], string>> = {
  vercel: 'https://vercel.com/legal/privacy-notice',
  atlas: 'https://www.mongodb.com/legal/privacy/privacy-policy',
  firebase: 'https://firebase.google.com/support/privacy',
  ga: 'https://policies.google.com/privacy',
  zoho: 'https://www.zoho.com/privacy.html',
  quranFoundation: 'https://quran.com/privacy',
  qul: 'https://tarteel.ai/privacy',
  osm: 'https://osmfoundation.org/wiki/Privacy_Policy',
};

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
            {POLICY_URLS[row] && (
              <dd className="text-xs mt-0.5">
                <a
                  href={POLICY_URLS[row]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-emerald underline"
                >
                  {t('privacy.dataFlow.policyLink')}
                  <span className="sr-only"> {t('privacy.dataFlow.policyNewTab')}</span>
                </a>
              </dd>
            )}
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

          <div className="text-center pt-4 space-y-2">
            <p className="text-white/75 text-xs">
              {t('privacy.contactText')}{' '}
              <a href="mailto:ansar@bustandeen.com" className="text-brand-emerald underline">
                ansar@bustandeen.com
              </a>
            </p>
            <p className="text-white/75 text-xs">{t('privacy.contactAddress')}</p>
            <Link to="/about" className="text-white/70 text-xs underline hover:text-white">
              {t('privacy.aboutLink')}
            </Link>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
