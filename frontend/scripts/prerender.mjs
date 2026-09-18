// Statically pre-renders /prayer-times/{city}, /qibla/{city},
// /ramadan-calendar/{city}/{year}, /duas/{situation}, /adhkar/morning|evening
// and /hijri-date-converter into frontend/dist/, in en/bn/ar. Run after both
// `vite build` (client bundle, produces dist/index.html) and
// `vite build --config vite.ssr.config.ts` (produces dist-ssr/entry-server.js)
// — see the `build` script in package.json.
//
// Approach: clone the real, already-built dist/index.html per route (same
// fonts/GA snippet/theme-init script/asset tags as the live app, guaranteed
// never to drift out of sync with it) and surgically swap in page-specific
// title/description/canonical/hreflang/og/twitter tags. The rendered body
// (including each template's own BreadcrumbList/FAQPage/WebPage JSON-LD,
// see src/seo/components/JsonLd.tsx) replaces the empty `<div id="root">`.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const SITE_URL = 'https://bustandeen.com';
const BUILD_DATE = new Date().toISOString();

const baseHtmlPath = join(DIST, 'index.html');
if (!existsSync(baseHtmlPath)) {
  console.error('dist/index.html not found — run `vite build` before prerender.mjs.');
  process.exit(1);
}
const ssrEntryPath = join(ROOT, 'dist-ssr', 'entry-server.js');
if (!existsSync(ssrEntryPath)) {
  console.error('dist-ssr/entry-server.js not found — run `vite build --config vite.ssr.config.ts` first.');
  process.exit(1);
}

const baseHtml = readFileSync(baseHtmlPath, 'utf-8');
const ssr = await import('file://' + ssrEntryPath.replace(/\\/g, '/'));

const LANGS = ['en', 'bn', 'ar'];
const OG_LOCALE = { en: 'en_US', bn: 'bn_BD', ar: 'ar_SA' };
const RTL = new Set(['ar']);

function langPrefix(lang) {
  return lang === 'en' ? '' : `/${lang}`;
}

// ── Route path helpers (must match src/seo/components/Layout.tsx's langPath
// and each template's own self-referencing `url`) ───────────────────────────
function routePath(kind, params, lang) {
  const p = langPrefix(lang);
  switch (kind) {
    case 'prayer-times':
      return `${p}/prayer-times/${params.citySlug}`;
    case 'qibla':
      return `${p}/qibla/${params.citySlug}`;
    case 'ramadan-calendar':
      return `${p}/ramadan-calendar/${params.citySlug}/${params.gregorianYear}`;
    case 'ramadan-calendar-index':
      return `${p}/ramadan-calendar`;
    case 'dua':
      return `${p}/duas/${params.duaId}`;
    case 'duas-index':
      return `${p}/duas`;
    case 'adhkar':
      return `${p}/adhkar/${params.period}`;
    case 'hijri-converter':
      return `${p}/hijri-date-converter`;
    case 'asma-ul-husna':
      return `${p}/asma-ul-husna`;
    case 'zakat-calculator':
      return `${p}/zakat-calculator`;
    default:
      throw new Error(`Unknown route kind: ${kind}`);
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeAttr(s) {
  return escapeHtml(s);
}

function buildPageHtml({ lang, title, description, path, bodyHtml }) {
  const dir = RTL.has(lang) ? ' dir="rtl"' : '';
  const url = `${SITE_URL}${path}`;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeAttr(description);

  let html = baseHtml;

  html = html.replace(
    '<html lang="en" data-theme="bustandeen">',
    `<html lang="${lang}" data-theme="bustandeen"${dir}>`
  );
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${safeDesc}" />`
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${url}" />`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${safeDesc}" />`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${url}" />`
  );
  html = html.replace(
    /<meta property="og:locale" content="[^"]*" \/>/,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}" />`
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${safeDesc}" />`
  );

  // hreflang alternates — Google's recommended mechanism (over sitemap
  // annotations). x-default points at the English (unprefixed) URL.
  const hreflangLinks = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${SITE_URL}${path.replace(/^\/(bn|ar)/, '').replace(/^/, langPrefix(l))}" />`
  ).join('\n    ');
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${SITE_URL}${path.replace(/^\/(bn|ar)/, '')}" />`;
  html = html.replace('</head>', `    <meta name="robots" content="index, follow" />\n    ${hreflangLinks}\n    ${xDefault}\n  </head>`);

  html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);

  return html;
}

function writePage(path, html) {
  const outDir = join(DIST, path.replace(/^\//, ''));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
}

// ── Build the route list ────────────────────────────────────────────────────
const routes = []; // { kind, params }
for (const city of ssr.CITIES) {
  routes.push({ kind: 'prayer-times', params: { citySlug: city.slug } });
  routes.push({ kind: 'qibla', params: { citySlug: city.slug } });
}
const hijriYear = ssr.currentRamadanHijriYear();
const gregorianYear = ssr.ramadanGregorianYear(hijriYear);
for (const city of ssr.CITIES) {
  routes.push({ kind: 'ramadan-calendar', params: { citySlug: city.slug, hijriYear, gregorianYear } });
}
routes.push({ kind: 'ramadan-calendar-index', params: {} });
for (const duaId of ssr.DUA_IDS) {
  routes.push({ kind: 'dua', params: { duaId } });
}
routes.push({ kind: 'duas-index', params: {} });
routes.push({ kind: 'adhkar', params: { period: 'morning' } });
routes.push({ kind: 'adhkar', params: { period: 'evening' } });
routes.push({ kind: 'hijri-converter', params: {} });
routes.push({ kind: 'asma-ul-husna', params: {} });
routes.push({ kind: 'zakat-calculator', params: {} });

console.error(`Prerendering ${routes.length} routes × ${LANGS.length} languages = ${routes.length * LANGS.length} pages...`);

const sitemapEntries = {
  pages: [],
  'prayer-times': [],
  qibla: [],
  ramadan: [],
  duas: [],
  adhkar: [],
  utilities: [],
};
const sitemapBucket = (kind) => {
  if (kind === 'prayer-times') return 'prayer-times';
  if (kind === 'qibla') return 'qibla';
  if (kind === 'ramadan-calendar' || kind === 'ramadan-calendar-index') return 'ramadan';
  if (kind === 'dua' || kind === 'duas-index') return 'duas';
  if (kind === 'asma-ul-husna' || kind === 'zakat-calculator') return 'utilities';
  return 'adhkar';
};

let count = 0;
const start = Date.now();
for (const { kind, params } of routes) {
  for (const lang of LANGS) {
    const ssrRoute =
      kind === 'ramadan-calendar'
        ? { kind, citySlug: params.citySlug, hijriYear: params.hijriYear }
        : kind === 'adhkar'
          ? { kind, period: params.period }
          : kind === 'dua'
            ? { kind, duaId: params.duaId }
            : kind === 'duas-index' ||
                kind === 'hijri-converter' ||
                kind === 'asma-ul-husna' ||
                kind === 'zakat-calculator' ||
                kind === 'ramadan-calendar-index'
              ? { kind }
              : { kind, citySlug: params.citySlug };

    const { html: bodyHtml, title, description } = ssr.renderRoute({ route: ssrRoute, lang, buildDate: BUILD_DATE });
    const path = routePath(kind, params, lang);
    const pageHtml = buildPageHtml({ lang, title, description, path, bodyHtml });
    writePage(path, pageHtml);

    if (lang === 'en') {
      sitemapEntries[sitemapBucket(kind)].push({
        path,
        priority:
          kind === 'duas-index' || kind === 'ramadan-calendar-index'
            ? '0.5'
            : kind === 'zakat-calculator' || kind === 'asma-ul-husna'
              ? '0.7'
              : '0.6',
      });
    }
    count++;
  }
  if (count % 2000 < LANGS.length) {
    process.stdout.write(`  ...${count}/${routes.length * LANGS.length} (${Math.round((Date.now() - start) / 1000)}s)\n`);
  }
}
console.error(`Wrote ${count} pages in ${Math.round((Date.now() - start) / 1000)}s.`);

// ── Sitemaps ─────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
function sitemapXml(entries) {
  const urls = entries
    .map((e) => `  <url>\n    <loc>${SITE_URL}${e.path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${e.priority}</priority>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const staticPages = [
  { path: '/', priority: '1.0' },
  { path: '/zikr', priority: '0.9' },
  { path: '/salat', priority: '0.9' },
  { path: '/prayer-times', priority: '0.9' },
  { path: '/fasting', priority: '0.9' },
  { path: '/qibla', priority: '0.7' },
  { path: '/about', priority: '0.6' },
  { path: '/privacy', priority: '0.3' },
  { path: '/feedback', priority: '0.4' },
  { path: '/sadaqah', priority: '0.5' },
  { path: '/login', priority: '0.3' },
  { path: '/signup', priority: '0.3' },
];

const sitemapFiles = {
  'sitemap-pages.xml': staticPages,
  'sitemap-prayer-times.xml': sitemapEntries['prayer-times'],
  'sitemap-qibla.xml': sitemapEntries.qibla,
  'sitemap-ramadan.xml': sitemapEntries.ramadan,
  'sitemap-duas.xml': sitemapEntries.duas,
  'sitemap-adhkar.xml': sitemapEntries.adhkar,
  'sitemap-utilities.xml': sitemapEntries.utilities,
};

for (const [filename, entries] of Object.entries(sitemapFiles)) {
  writeFileSync(join(DIST, filename), sitemapXml(entries));
}

const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(
  sitemapFiles
)
  .map((f) => `  <sitemap>\n    <loc>${SITE_URL}/${f}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`)
  .join('\n')}\n</sitemapindex>\n`;
writeFileSync(join(DIST, 'sitemap-index.xml'), sitemapIndex);
// Keep the old /sitemap.xml URL alive as an alias to the new index, in case
// anything (or anyone) still has it bookmarked/cached.
writeFileSync(join(DIST, 'sitemap.xml'), sitemapIndex);

console.error(`Wrote sitemap-index.xml + ${Object.keys(sitemapFiles).length} category sitemaps.`);
