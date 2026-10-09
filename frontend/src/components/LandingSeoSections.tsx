// The lower half of the landing page that search engines need: links to the
// most-searched city prayer-time pages, the free tools, and a short FAQ.
//
// Rendered in BOTH places (audit SEO-01):
//   - the prerendered landing in dist/index.html (seo/templates/LandingPage.tsx),
//     what crawlers and first-time visitors get before any JavaScript runs;
//   - the React Landing page (pages/Landing.tsx), which replaces it once the
//     app loads. Google indexes the page AFTER running JavaScript, so content
//     only in the static HTML would vanish from its view.
// Pure: no hooks, plain <a> links, strings through the `t` it is given.
// T3.2: theme tokens and line icons (no emoji), shared with the landing body.

import type { ComponentType } from 'react';
import { CalculatorIcon, CalendarDaysIcon, SparklesIcon } from '@heroicons/react/24/outline';
import {
  CompassIcon,
  CrescentIcon,
  DuaHandsIcon,
  FajrIcon,
  MaghribIcon,
  type IconProps,
} from './icons/IslamicIcons.js';
import { CARD } from './bustanStyles.js';

export type LandingT = (key: string, fallback: string) => string;

/** Slugs are checked against the city dataset at build time (prerender.mjs). */
export const POPULAR_CITY_LINKS: { slug: string; name: string }[] = [
  { slug: 'dhaka-bangladesh', name: 'Dhaka' },
  { slug: 'chittagong-bangladesh', name: 'Chittagong' },
  { slug: 'sylhet-bangladesh', name: 'Sylhet' },
  { slug: 'khulna-bangladesh', name: 'Khulna' },
  { slug: 'rajshahi-bangladesh', name: 'Rajshahi' },
  { slug: 'karachi-pakistan', name: 'Karachi' },
  { slug: 'lahore-pakistan', name: 'Lahore' },
  { slug: 'islamabad-pakistan', name: 'Islamabad' },
  { slug: 'delhi-india', name: 'Delhi' },
  { slug: 'mumbai-india', name: 'Mumbai' },
  { slug: 'london-united-kingdom', name: 'London' },
  { slug: 'birmingham-united-kingdom', name: 'Birmingham' },
  { slug: 'new-york-city-united-states', name: 'New York' },
  { slug: 'toronto-canada', name: 'Toronto' },
  { slug: 'dubai-united-arab-emirates', name: 'Dubai' },
  { slug: 'riyadh-saudi-arabia', name: 'Riyadh' },
  { slug: 'mecca-saudi-arabia', name: 'Makkah' },
  { slug: 'jakarta-indonesia', name: 'Jakarta' },
  { slug: 'kuala-lumpur-malaysia', name: 'Kuala Lumpur' },
  { slug: 'istanbul-turkey', name: 'Istanbul' },
  { slug: 'cairo-egypt', name: 'Cairo' },
];

const TOOL_LINKS: {
  href: string;
  key: string;
  fallback: string;
  Icon: ComponentType<IconProps>;
}[] = [
  {
    href: '/duas',
    key: 'landing.tools.duas',
    fallback: 'Duʿās for every situation',
    Icon: DuaHandsIcon,
  },
  {
    href: '/adhkar/morning',
    key: 'landing.tools.morning',
    fallback: 'Morning adhkār',
    Icon: FajrIcon,
  },
  {
    href: '/adhkar/evening',
    key: 'landing.tools.evening',
    fallback: 'Evening adhkār',
    Icon: MaghribIcon,
  },
  {
    href: '/ramadan-calendar',
    key: 'landing.tools.ramadan',
    fallback: 'Ramadan calendars',
    Icon: CrescentIcon,
  },
  {
    href: '/zakat-calculator',
    key: 'landing.tools.zakat',
    fallback: 'Zakat calculator',
    Icon: CalculatorIcon,
  },
  {
    href: '/asma-ul-husna',
    key: 'landing.tools.asma',
    fallback: 'The 99 Names of Allah',
    Icon: SparklesIcon,
  },
  {
    href: '/hijri-date-converter',
    key: 'landing.tools.hijri',
    fallback: 'Hijri date converter',
    Icon: CalendarDaysIcon,
  },
  { href: '/qibla', key: 'landing.tools.qibla', fallback: 'Qibla compass', Icon: CompassIcon },
];

/** FAQ keys + English fallbacks; also used for the FAQPage JSON-LD. */
export const LANDING_FAQ: { q: [string, string]; a: [string, string] }[] = [
  {
    q: ['landing.faq.q1', 'Is Bustandeen free?'],
    a: [
      'landing.faq.a1',
      'Yes. Every feature is free, with no ads and no subscriptions. It is kept running by voluntary sadaqah.',
    ],
  },
  {
    q: ['landing.faq.q2', 'How are the prayer times calculated?'],
    a: [
      'landing.faq.a2',
      'On your device, from your location, with the calculation method and ʿAṣr school most mosques in your country use. You can change either in the settings, and city pages show ʿAṣr for both schools.',
    ],
  },
  {
    q: ['landing.faq.q3', 'Are the Quran and hadith references authentic?'],
    a: [
      'landing.faq.a3',
      'Every verse and hadith links to quran.com or sunnah.com with its exact number, and grades are shown where they matter. If something cannot be verified, it is not included.',
    ],
  },
  {
    q: ['landing.faq.q4', 'Is my data private?'],
    a: [
      'landing.faq.a4',
      'Your location stays on your device, Rayhanah notes are encrypted before they are stored, there are no ads, and your data is never sold or shared.',
    ],
  },
  {
    q: ['landing.faq.q5', 'Does it work offline and on my phone?'],
    a: [
      'landing.faq.a5',
      'Yes. Install it on your home screen like an app. Prayer times work offline, and zikr counts and prayer logs made offline sync when you are back online.',
    ],
  },
  {
    q: ['landing.faq.q6', 'Is it available in Bangla?'],
    a: [
      'landing.faq.a6',
      'Yes. The app is in English and Bangla, and the prayer-time, duʿā and adhkār pages are also in Arabic.',
    ],
  },
];

/** `prefix` is the language prefix of the static Bangla landing (`/bn`): its
 * city and tool links go to the Bangla pages. The bare `/qibla` is an app page
 * with no language prefix. */
export default function LandingSeoSections({
  t,
  prefix = '',
}: {
  t: LandingT;
  prefix?: '' | '/bn';
}) {
  return (
    <div className="space-y-12">
      <section aria-labelledby="landing-cities">
        <h2
          id="landing-cities"
          className="font-display text-white font-bold text-xl sm:text-2xl text-center"
        >
          {t('landing.citiesTitle', 'Prayer times in your city')}
        </h2>
        <p className="text-white/80 text-sm text-center mt-2">
          {t(
            'landing.citiesDesc',
            'Today’s Fajr, Ẓuhr, ʿAṣr, Maghrib and ʿIshāʾ for 1,400+ cities, with both ʿAṣr times.'
          )}
        </p>
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {POPULAR_CITY_LINKS.map((c) => (
            <li key={c.slug}>
              <a
                href={`${prefix}/prayer-times/${c.slug}`}
                className="inline-block px-3 py-1.5 rounded-full border border-brand-border bg-brand-deep text-white/80 text-sm hover:text-brand-emerald hover:border-brand-emerald/40 transition-colors"
              >
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="landing-tools">
        <h2
          id="landing-tools"
          className="font-display text-white font-bold text-xl sm:text-2xl text-center"
        >
          {t('landing.toolsTitle', 'Free tools, no account needed')}
        </h2>
        <ul className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TOOL_LINKS.map((tool) => (
            <li key={tool.href}>
              <a
                href={tool.href === '/qibla' ? tool.href : `${prefix}${tool.href}`}
                className="flex items-center gap-2 h-full px-3 py-3 rounded-control border border-brand-border bg-brand-deep shadow-elev-1 text-white/80 text-sm font-semibold hover:text-white hover:border-brand-emerald/40 transition-colors"
              >
                <tool.Icon className="w-5 h-5 shrink-0 text-brand-emerald" aria-hidden="true" />
                {t(tool.key, tool.fallback)}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="landing-faq" className="max-w-3xl mx-auto">
        <h2
          id="landing-faq"
          className="font-display text-white font-bold text-xl sm:text-2xl text-center"
        >
          {t('landing.faqTitle', 'Common questions')}
        </h2>
        <dl className="mt-5 space-y-3">
          {LANDING_FAQ.map(({ q, a }) => (
            <div key={q[0]} className={`${CARD} p-4`}>
              <dt className="text-white font-bold text-sm">{t(q[0], q[1])}</dt>
              <dd className="text-white/80 text-sm mt-1.5 leading-relaxed">{t(a[0], a[1])}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
