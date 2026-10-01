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

const TOOL_LINKS: { href: string; key: string; fallback: string; emoji: string }[] = [
  { href: '/duas', key: 'landing.tools.duas', fallback: 'Duʿās for every situation', emoji: '🤲' },
  {
    href: '/adhkar/morning',
    key: 'landing.tools.morning',
    fallback: 'Morning adhkār',
    emoji: '🌅',
  },
  {
    href: '/adhkar/evening',
    key: 'landing.tools.evening',
    fallback: 'Evening adhkār',
    emoji: '🌆',
  },
  {
    href: '/ramadan-calendar',
    key: 'landing.tools.ramadan',
    fallback: 'Ramadan calendars',
    emoji: '🌙',
  },
  {
    href: '/zakat-calculator',
    key: 'landing.tools.zakat',
    fallback: 'Zakat calculator',
    emoji: '💰',
  },
  {
    href: '/asma-ul-husna',
    key: 'landing.tools.asma',
    fallback: 'The 99 Names of Allah',
    emoji: '✨',
  },
  {
    href: '/hijri-date-converter',
    key: 'landing.tools.hijri',
    fallback: 'Hijri date converter',
    emoji: '📅',
  },
  { href: '/qibla', key: 'landing.tools.qibla', fallback: 'Qibla compass', emoji: '🧭' },
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

export default function LandingSeoSections({ t }: { t: LandingT }) {
  return (
    <div className="space-y-12">
      <section aria-labelledby="landing-cities">
        <h2 id="landing-cities" className="text-white font-black text-xl sm:text-2xl text-center">
          {t('landing.citiesTitle', 'Prayer times in your city')}
        </h2>
        <p className="text-white/45 text-sm text-center mt-2">
          {t(
            'landing.citiesDesc',
            'Today’s Fajr, Ẓuhr, ʿAṣr, Maghrib and ʿIshāʾ for 1,400+ cities, with both ʿAṣr times.'
          )}
        </p>
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {POPULAR_CITY_LINKS.map((c) => (
            <li key={c.slug}>
              <a
                href={`/prayer-times/${c.slug}`}
                className="inline-block px-3 py-1.5 rounded-full border border-brand-border bg-white/5 text-white/70 text-sm hover:text-brand-emerald hover:border-brand-emerald/40 transition-colors"
              >
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="landing-tools">
        <h2 id="landing-tools" className="text-white font-black text-xl sm:text-2xl text-center">
          {t('landing.toolsTitle', 'Free tools, no account needed')}
        </h2>
        <ul className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TOOL_LINKS.map((tool) => (
            <li key={tool.href}>
              <a
                href={tool.href}
                className="flex items-center gap-2 h-full px-3 py-3 rounded-2xl border border-brand-border bg-white/[0.04] text-white/75 text-sm font-semibold hover:text-white hover:border-brand-emerald/40 transition-colors"
              >
                <span aria-hidden>{tool.emoji}</span>
                {t(tool.key, tool.fallback)}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="landing-faq" className="max-w-3xl mx-auto">
        <h2 id="landing-faq" className="text-white font-black text-xl sm:text-2xl text-center">
          {t('landing.faqTitle', 'Common questions')}
        </h2>
        <dl className="mt-5 space-y-3">
          {LANDING_FAQ.map(({ q, a }) => (
            <div key={q[0]} className="rounded-2xl border border-brand-border bg-white/[0.04] p-4">
              <dt className="text-white font-bold text-sm">{t(q[0], q[1])}</dt>
              <dd className="text-white/55 text-sm mt-1.5 leading-relaxed">{t(a[0], a[1])}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
