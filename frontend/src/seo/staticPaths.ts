// Which paths are served as prerendered static pages (scripts/prerender.mjs)
// rather than the app shell (audit PERF-01). Shared by the app (no Navbar or
// Footer on these pages), the static entry (src/static-entry.ts: the app is
// never loaded for them) and the service worker (fetch them from the network
// instead of answering with the app shell). Deliberately excludes the bare
// `/prayer-times` and `/qibla` paths: those are the live, on-device tracker
// pages of the app.

const SEO_PAGE =
  /^\/(bn\/|ar\/)?(prayer-times\/|qibla\/|ramadan-calendar(\/|$)|duas(\/|$)|adhkar\/|hijri-date-converter|asma-ul-husna|zakat-calculator)/;

/** A programmatic SEO page (src/seo/templates/*), in any language. */
export function isSeoPagePath(pathname: string): boolean {
  return SEO_PAGE.test(pathname);
}

/** The prerendered landing: `/` (English) or `/bn` (Bangla). */
export function isLandingPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/bn' || pathname === '/bn/';
}
