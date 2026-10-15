// bayan.bustandeen.com, Help & Updates: rendered to plain HTML by
// scripts/prerender.mjs (no React on the page). Same rules as the rest of
// src/seo: SSR-safe, no app state, no Firebase. The only scripts are the small
// guide filter in public/bayan/filter.js and the "Request a language" form in
// public/bayan/request.js; without them the page loses nothing but the search
// box and that form.
import type { ReactNode } from 'react';
import { BrandMark } from '../../components/BrandMark.js';
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from '../../components/bustanStyles.js';
import { GUIDES, type BayanLang, type Guide, type GuideIcon } from './guides.js';
import { RELEASES, type Release } from './releases.js';
import { APP_ORIGIN, CALC_ROWS, CHROME, CREDITS } from './pages.js';
import { STATUS_URL } from '../../utils/siteLinks.js';
import { CHROME as SEO_CHROME } from '../locales/chrome.js';

export type BayanRoute =
  | { page: 'home' }
  | { page: 'guide'; slug: string }
  | { page: 'news' }
  | { page: 'calc' }
  | { page: 'credits' };

export const BAYAN_LANGS: readonly BayanLang[] = ['en', 'bn'];

/** The page's path on bayan.bustandeen.com, without the language prefix.
 *  `/` and `/bn` redirect to the home pages (vercel.json): on that host they
 *  would otherwise serve the app's own landing pages, which exist as files. */
export function bayanBarePath(route: BayanRoute): string {
  switch (route.page) {
    case 'home':
      return '/home';
    case 'guide':
      return `/guides/${route.slug}`;
    case 'news':
      return '/whats-new';
    case 'calc':
      return '/how-we-calculate';
    case 'credits':
      return '/credits';
  }
}

export function bayanPath(lang: BayanLang, route: BayanRoute): string {
  return lang === 'en' ? bayanBarePath(route) : `/bn${bayanBarePath(route)}`;
}

export function bayanRoutes(): BayanRoute[] {
  return [
    { page: 'home' },
    ...GUIDES.map((g) => ({ page: 'guide' as const, slug: g.slug })),
    { page: 'news' },
    { page: 'calc' },
    { page: 'credits' },
  ];
}

export function bayanMeta(
  lang: BayanLang,
  route: BayanRoute
): { title: string; description: string } {
  const t = CHROME[lang];
  const site = lang === 'en' ? 'Bustandeen Help' : 'Bustandeen সাহায্য';
  switch (route.page) {
    case 'home':
      return { title: `${t.heroTitle} | Bustandeen`, description: t.homeDescription };
    case 'guide': {
      const g = guideBySlug(route.slug).text[lang];
      return { title: `${g.title} | ${site}`, description: g.summary };
    }
    case 'news':
      return { title: `${t.news} | ${site}`, description: t.newsDescription };
    case 'calc':
      return { title: `${t.calc} | ${site}`, description: t.calcDescription };
    case 'credits':
      return { title: `${t.credits} | ${site}`, description: t.creditsDescription };
  }
}

function guideBySlug(slug: string): Guide {
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) throw new Error(`Unknown bayan guide: ${slug}`);
  return g;
}

const LINK = 'text-brand-emerald underline underline-offset-2 hover:brightness-110';
const NAV_LINK =
  'inline-flex items-center min-h-[44px] px-3 rounded-control text-sm text-white/80 no-underline hover:text-white hover:bg-brand-surface';
const NAV_ON = 'bg-brand-emerald/15 text-brand-emerald hover:text-brand-emerald';

const ICON_PATHS: Record<GuideIcon | 'calc' | 'heart', ReactNode> = {
  start: <path d="M12 3v18M5 9l7-6 7 6" />,
  salat: <path d="M4 21V11a8 8 0 0 1 16 0v10M4 21h16M12 3v2" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  beads: (
    <>
      <circle cx="12" cy="6" r="2" />
      <circle cx="7" cy="11" r="2" />
      <circle cx="17" cy="11" r="2" />
      <circle cx="12" cy="17" r="2" />
    </>
  ),
  book: (
    <path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5Zm0 0v14" />
  ),
  road: <path d="M8 21 10 3M16 21 14 3M12 7v2M12 13v2" />,
  leaf: <path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.5 3-6 6-6s6 2.5 6 6M15 15c3 0 6 2 6 5" />
    </>
  ),
  calc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2" />
    </>
  ),
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />,
};

function Icon({ name }: { name: keyof typeof ICON_PATHS }) {
  return (
    <span className="w-10 h-10 rounded-control grid place-items-center bg-brand-emerald/15 text-brand-emerald mb-3">
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICON_PATHS[name]}
      </svg>
    </span>
  );
}

function Shell({
  lang,
  route,
  children,
}: {
  lang: BayanLang;
  route: BayanRoute;
  children: ReactNode;
}) {
  const t = CHROME[lang];
  const nav: Array<[BayanRoute, string]> = [
    [{ page: 'home' }, t.home],
    [{ page: 'news' }, t.news],
    [{ page: 'calc' }, t.calc],
    [{ page: 'credits' }, t.credits],
  ];
  const navLinks = nav.map(([r, label]) => {
    const on = r.page === route.page || (r.page === 'home' && route.page === 'guide');
    return (
      <a
        key={r.page}
        href={bayanPath(lang, r)}
        aria-current={on ? 'page' : undefined}
        className={`${NAV_LINK} ${on ? NAV_ON : ''}`}
      >
        {label}
      </a>
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-brand-void text-white" lang={lang}>
      <header className="border-b border-brand-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2">
          <a
            href={bayanPath(lang, { page: 'home' })}
            className="flex items-center gap-2 min-h-[44px] no-underline text-white font-display font-bold text-lg"
          >
            <BrandMark variant="small" className="w-7 h-7" />
            Bustandeen
            <span className="font-sans text-[11px] font-bold uppercase tracking-widest text-brand-gold">
              {t.siteTag}
            </span>
          </a>
          <nav aria-label={t.menu} className="hidden md:flex items-center gap-1 ml-auto">
            {navLinks}
          </nav>
          {/* Globe menu, no language name in the header (2026-10-15). "Request
              a language" opens a small form on this page (2026-10-16), sent by
              public/bayan/request.js to this host's /api/feedback/language
              (vercel.json routes only that path to the API here). */}
          <details className="relative ml-auto md:ml-1">
            <summary
              aria-label={t.language}
              title={t.language}
              className="list-none [&::-webkit-details-marker]:hidden cursor-pointer grid place-items-center w-11 h-11 rounded-control border border-brand-border"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
            </summary>
            <div className={`${CARD} absolute right-0 top-full mt-2 w-56 p-2 flex flex-col z-10`}>
              {(['en', 'bn'] as const).map((l) => (
                <a
                  key={l}
                  href={bayanPath(l, route)}
                  hrefLang={l}
                  lang={l}
                  aria-current={l === lang ? 'page' : undefined}
                  className={`${NAV_LINK} ${l === lang ? NAV_ON : ''}`}
                >
                  {l === 'en' ? 'English' : 'বাংলা'}
                </a>
              ))}
              <button
                type="button"
                hidden
                data-lang-request-open
                className={`${NAV_LINK} text-left border-t border-brand-border mt-1 pt-1 [&[hidden]]:hidden`}
              >
                {t.requestLanguage}
              </button>
            </div>
          </details>
          <LanguageRequestDialog lang={lang} />
          <details className="md:hidden relative">
            <summary
              aria-label={t.menu}
              className="list-none cursor-pointer grid place-items-center w-11 h-11 rounded-control border border-brand-border"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <nav
              aria-label={t.menu}
              className={`${CARD} absolute right-0 top-full mt-2 w-56 p-2 flex flex-col z-10`}
            >
              {navLinks}
            </nav>
          </details>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>

      <footer className="border-t border-brand-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-4 text-sm text-white/70">
          <a href={`${APP_ORIGIN}/about`} className={NAV_LINK}>
            {t.footer.about}
          </a>
          <a href={`${APP_ORIGIN}/privacy`} className={NAV_LINK}>
            {t.footer.privacy}
          </a>
          <a href={STATUS_URL} className={NAV_LINK}>
            {t.footer.status}
          </a>
          <a href={`${APP_ORIGIN}/contact`} className={NAV_LINK}>
            {t.footer.contact}
          </a>
          <a href={`${APP_ORIGIN}/`} className={`${NAV_LINK} sm:ml-auto`}>
            {t.openApp}
          </a>
        </div>
      </footer>
    </div>
  );
}

function ReleaseCard({ lang, release }: { lang: BayanLang; release: Release }) {
  const t = CHROME[lang];
  const r = release.text[lang];
  const list = (items: string[]) => (
    <ul className="list-disc pl-5 space-y-1.5 text-white/85 leading-relaxed">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
  return (
    <article className={`${CARD} p-5`} id={`v${release.version}`}>
      <header className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs font-bold text-brand-gold bg-brand-gold/10 rounded-lg px-2 py-1">
          v{release.version}
        </span>
        <h2 className="font-display text-lg font-bold">{r.title}</h2>
        <time dateTime={release.date} className="ml-auto text-xs text-white/70">
          {t.formatDate(release.date)}
        </time>
      </header>
      {r.added && (
        <>
          <p className="text-xs font-bold text-brand-emerald mb-1.5">{t.added}</p>
          {list(r.added)}
        </>
      )}
      {r.fixed && (
        <>
          <p className="text-xs font-bold text-brand-warm mt-3 mb-1.5">{t.fixed}</p>
          {list(r.fixed)}
        </>
      )}
    </article>
  );
}

function Home({ lang }: { lang: BayanLang }) {
  const t = CHROME[lang];
  return (
    <>
      <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-12 pb-7 text-center">
        <h1 className="font-display text-3xl font-bold">{t.heroTitle}</h1>
        <p className="mt-2 mx-auto max-w-xl text-white/80 leading-relaxed">{t.heroText}</p>
        {/* Shown by filter.js; without JavaScript the full list is below. */}
        <div data-bayan-filter hidden className="mt-5 mx-auto max-w-md">
          <label htmlFor="bayan-filter" className="sr-only">
            {t.filterLabel}
          </label>
          <input
            id="bayan-filter"
            type="search"
            placeholder={t.filterPlaceholder}
            autoComplete="off"
            className="w-full min-h-[48px] rounded-control border border-brand-border bg-brand-void px-4 text-white placeholder:text-white/60"
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="guides">
        <h2 id="guides" className="font-display text-xl font-bold mb-3">
          {t.guides}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDES.map((g) => {
            const x = g.text[lang];
            return (
              <li key={g.slug} data-bayan-guide={`${x.title} ${x.summary}`.toLowerCase()}>
                <a
                  href={bayanPath(lang, { page: 'guide', slug: g.slug })}
                  className={`${CARD} block h-full p-4 no-underline text-white hover:border-brand-emerald/60`}
                >
                  <Icon name={g.icon} />
                  <h3 className="font-display text-lg font-bold">{x.title}</h3>
                  <p className="text-sm text-white/75 leading-relaxed mt-1">{x.summary}</p>
                </a>
              </li>
            );
          })}
        </ul>
        <p data-bayan-nomatch hidden className="text-white/75 mt-3">
          {t.noMatch}
        </p>
      </section>

      <section className="mt-8" aria-labelledby="latest">
        <div className="flex items-center gap-3 mb-3">
          <h2 id="latest" className="font-display text-xl font-bold">
            {t.latest}
          </h2>
          <a
            href={bayanPath(lang, { page: 'news' })}
            className={`${NAV_LINK} ml-auto text-brand-emerald`}
          >
            {t.allUpdates}
          </a>
        </div>
        <ul className={`${CARD} divide-y divide-brand-border overflow-hidden`}>
          {RELEASES.slice(0, 3).map((r) => (
            <li key={r.version}>
              <a
                href={`${bayanPath(lang, { page: 'news' })}#v${r.version}`}
                className="flex items-center gap-3 min-h-[52px] px-4 py-2 no-underline text-white hover:bg-brand-surface"
              >
                <span className="text-xs font-bold text-brand-gold bg-brand-gold/10 rounded-lg px-2 py-1 shrink-0">
                  v{r.version}
                </span>
                <span className="text-sm">{r.text[lang].title}</span>
                <time dateTime={r.date} className="ml-auto text-xs text-white/70 shrink-0">
                  {t.formatDate(r.date)}
                </time>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <a
          href={bayanPath(lang, { page: 'calc' })}
          className={`${CARD} block p-4 no-underline text-white hover:border-brand-emerald/60`}
        >
          <Icon name="calc" />
          <h2 className="font-display text-lg font-bold">{t.calc}</h2>
          <p className="text-sm text-white/75 mt-1">{t.calcCardText}</p>
        </a>
        <a
          href={bayanPath(lang, { page: 'credits' })}
          className={`${CARD} block p-4 no-underline text-white hover:border-brand-emerald/60`}
        >
          <Icon name="heart" />
          <h2 className="font-display text-lg font-bold">{t.credits}</h2>
          <p className="text-sm text-white/75 mt-1">{t.creditsCardText}</p>
        </a>
      </section>
    </>
  );
}

function GuideView({ lang, slug }: { lang: BayanLang; slug: string }) {
  const t = CHROME[lang];
  const i = GUIDES.findIndex((g) => g.slug === slug);
  const guide = guideBySlug(slug);
  const next = GUIDES[(i + 1) % GUIDES.length]!;
  const x = guide.text[lang];
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-white/75 mb-4">
        <a href={bayanPath(lang, { page: 'home' })} className={LINK}>
          {t.guides}
        </a>
        <span aria-hidden="true"> / </span>
        <span>{x.title}</span>
      </nav>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <nav
          aria-label={x.title}
          className="hidden md:block self-start border-l-2 border-brand-border pl-3"
        >
          {x.sections.map((s, n) => (
            <a
              key={s.heading}
              href={`#s${n + 1}`}
              className="block py-2 text-sm text-white/75 no-underline hover:text-brand-emerald"
            >
              {s.heading}
            </a>
          ))}
        </nav>
        <article className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold">{x.title}</h1>
          <p className="text-xs text-white/70 mt-1 mb-4">
            {t.updated(t.formatDate(guide.updated))}
          </p>
          {x.sections.map((s, n) => (
            <section key={s.heading} id={`s${n + 1}`} className="scroll-mt-4">
              <h2 className="font-display text-xl font-bold mt-6 mb-2">{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="text-white/85 leading-relaxed mb-3">
                  {p}
                </p>
              ))}
              {x.note && x.note.after === n && (
                <p className="rounded-control border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm leading-relaxed my-4">
                  <b className="text-brand-gold">{x.note.bold}</b>
                  {x.note.text}
                </p>
              )}
            </section>
          ))}
          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href={`${APP_ORIGIN}${guide.appPath}`}
              className={`${BTN_PRIMARY} min-h-[44px] no-underline`}
            >
              {x.cta}
            </a>
            <a
              href={bayanPath(lang, { page: 'guide', slug: next.slug })}
              className={`${BTN_SECONDARY} min-h-[44px] no-underline`}
            >
              {t.nextGuide(next.text[lang].title)}
            </a>
          </div>
        </article>
      </div>
    </>
  );
}

function News({ lang }: { lang: BayanLang }) {
  const t = CHROME[lang];
  return (
    <>
      <h1 className="font-display text-3xl font-bold">{t.news}</h1>
      <p className="text-white/80 mt-1 mb-5">{t.newsIntro}</p>
      <div className="space-y-4">
        {RELEASES.map((r) => (
          <ReleaseCard key={r.version} lang={lang} release={r} />
        ))}
      </div>
    </>
  );
}

function Calc({ lang }: { lang: BayanLang }) {
  const t = CHROME[lang];
  return (
    <>
      <h1 className="font-display text-3xl font-bold">{t.calc}</h1>
      <p className="text-white/80 mt-1 mb-5">{t.calcIntro}</p>
      <dl className={`${CARD} divide-y divide-brand-border`}>
        {CALC_ROWS[lang].map((row) => (
          <div key={row.what} className="grid gap-1 sm:grid-cols-[180px_1fr] sm:gap-4 px-4 py-4">
            <dt className="font-bold text-white">{row.what}</dt>
            <dd className="text-white/85 leading-relaxed">{row.how}</dd>
          </div>
        ))}
      </dl>
      <p className="rounded-control border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm leading-relaxed mt-5">
        {t.calcNote}
      </p>
    </>
  );
}

function Credits({ lang }: { lang: BayanLang }) {
  const t = CHROME[lang];
  return (
    <>
      <h1 className="font-display text-3xl font-bold">{t.credits}</h1>
      <p className="text-white/80 mt-1 mb-5">{t.creditsIntro}</p>
      <dl className={`${CARD} divide-y divide-brand-border`}>
        {CREDITS[lang].map((c) => (
          <div key={c.what} className="px-4 py-3">
            <dt className="text-sm font-bold text-white/75">{c.what}</dt>
            <dd className="text-white mt-0.5">
              {c.href ? (
                <a
                  href={c.href}
                  className={`${LINK} inline-flex items-center min-h-[44px]`}
                  rel="noopener"
                >
                  {c.who}
                </a>
              ) : (
                c.who
              )}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export default function BayanPage({ lang, route }: { lang: BayanLang; route: BayanRoute }) {
  let body: ReactNode;
  switch (route.page) {
    case 'home':
      body = <Home lang={lang} />;
      break;
    case 'guide':
      body = <GuideView lang={lang} slug={route.slug} />;
      break;
    case 'news':
      body = <News lang={lang} />;
      break;
    case 'calc':
      body = <Calc lang={lang} />;
      break;
    case 'credits':
      body = <Credits lang={lang} />;
      break;
  }
  return (
    <Shell lang={lang} route={route}>
      {body}
    </Shell>
  );
}

/** The "Request a language" form; public/bayan/request.js opens and sends it. */
function LanguageRequestDialog({ lang }: { lang: BayanLang }) {
  const r = SEO_CHROME[lang].langRequest;
  const input =
    'mt-1.5 w-full min-h-[44px] rounded-control border border-brand-border bg-brand-surface px-3 text-white';
  return (
    <dialog
      data-lang-request
      aria-labelledby="lang-request-title"
      className={`${CARD} w-[min(92vw,26rem)] p-0 text-white backdrop:bg-black/60`}
    >
      <form
        data-lang-request-form
        data-sending={r.sending}
        data-sent={r.sent}
        data-failed={r.failed}
        className="p-5 space-y-4"
      >
        <h2 id="lang-request-title" className="font-display text-lg font-bold">
          {r.title}
        </h2>
        <p className="text-sm leading-relaxed text-white/75">{r.intro}</p>
        <label className="block text-sm font-semibold">
          {r.typeLabel}
          <input type="text" readOnly value={r.typeValue} className={`${input} opacity-70`} />
        </label>
        <label className="block text-sm font-semibold">
          {r.languageLabel}
          <input
            type="text"
            name="language"
            required
            minLength={2}
            maxLength={60}
            autoComplete="off"
            placeholder={r.placeholder}
            className={input}
          />
        </label>
        {/* Honeypot: hidden from people, filled by bots, dropped by the server. */}
        <input
          type="text"
          name="botcheck"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <p data-lang-request-status role="status" className="text-sm text-white/75" />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" data-lang-request-cancel className={BTN_SECONDARY}>
            {r.cancel}
          </button>
          <button type="submit" className={`${BTN_PRIMARY} disabled:opacity-60`}>
            {r.send}
          </button>
        </div>
      </form>
    </dialog>
  );
}
