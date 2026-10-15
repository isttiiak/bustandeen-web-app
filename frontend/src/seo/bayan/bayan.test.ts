import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import vercel from '../../../../vercel.json';
import rootPkg from '../../../../package.json';
import robots from '../../../public/robots.txt?raw';
import filterJs from '../../../public/bayan/filter.js?raw';
import { GUIDES } from './guides.js';
import { RELEASES } from './releases.js';
import { CALC_ROWS, CHROME, CREDITS } from './pages.js';
import BayanPage, { bayanPath, bayanRoutes, type BayanRoute } from './BayanPage.js';

// bayan.bustandeen.com, Help & Updates (v5.164.0): static pages in English and
// Bangla, served on their own host, no app and no third-party script.

const DASH = /—/;
type Rule = {
  source: string;
  destination: string;
  has?: { type: string; value: string }[];
  missing?: { type: string; value: string }[];
};
type Block = {
  source: string;
  has?: Rule['has'];
  missing?: Rule['missing'];
  headers: { key: string; value: string }[];
};
const v = vercel as unknown as { redirects: Rule[]; rewrites: Rule[]; headers: Block[] };
const on = (r: { has?: Rule['has'] }, host: string) =>
  (r.has ?? []).some((c) => c.type === 'host' && c.value === host);

const strings = (o: unknown): string[] =>
  typeof o === 'string'
    ? [o]
    : typeof o === 'function'
      ? [String((o as (x: string) => string)('X'))]
      : o && typeof o === 'object'
        ? Object.values(o as Record<string, unknown>).flatMap(strings)
        : [];

describe('Bayan content', () => {
  it('every guide, release and table row exists in both languages', () => {
    for (const g of GUIDES) {
      for (const lang of ['en', 'bn'] as const) {
        const x = g.text[lang];
        expect(x.title, g.slug).toBeTruthy();
        expect(x.sections.length).toBe(g.text.en.sections.length);
        if (x.note) expect(x.note.after).toBeLessThan(x.sections.length);
      }
      expect(g.appPath).toMatch(/^\//);
    }
    for (const r of RELEASES) {
      expect(Boolean(r.text.en.added) === Boolean(r.text.bn.added)).toBe(true);
      expect(Boolean(r.text.en.fixed) === Boolean(r.text.bn.fixed)).toBe(true);
    }
    expect(CALC_ROWS.bn).toHaveLength(CALC_ROWS.en.length);
    expect(CREDITS.bn).toHaveLength(CREDITS.en.length);
  });

  it('no em dash anywhere; Bangla copy is in Bangla script', () => {
    const all = [GUIDES, RELEASES, CALC_ROWS, CREDITS, CHROME].flatMap(strings);
    expect(all.filter((s) => DASH.test(s))).toEqual([]);
    const bn = [
      ...GUIDES.flatMap((g) => strings(g.text.bn)),
      ...RELEASES.flatMap((r) => strings(r.text.bn)),
      ...strings(CALC_ROWS.bn),
    ];
    for (const s of bn) expect(s, s).toMatch(/[ঀ-৿]/);
  });

  it('releases are newest first, with unique versions', () => {
    const dates = RELEASES.map((r) => r.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(new Set(RELEASES.map((r) => r.version)).size).toBe(RELEASES.length);
    const num = (v: string) => v.split('.').reduce((n, part) => n * 1000 + Number(part), 0);
    for (const r of RELEASES) expect(r.version).toMatch(/^\d+\.\d+\.\d+$/);
    const order = RELEASES.map((r) => num(r.version));
    expect([...order].sort((a, b) => b - a)).toEqual(order);
  });

  it("What's new has an entry for the app's current version (every bump adds one)", () => {
    // The footer shows this version; the newest entry must be it, in both languages.
    expect(RELEASES[0]!.version).toBe(rootPkg.version);
  });

  it('pages render: links stay on the bayan site or go to the app, all targets 44px', () => {
    const routes = bayanRoutes();
    expect(routes).toHaveLength(GUIDES.length + 4);
    for (const lang of ['en', 'bn'] as const) {
      for (const route of routes) {
        const html = renderToStaticMarkup(createElement(BayanPage, { lang, route }));
        expect(html).toContain(`lang="${lang}"`);
        expect(html.match(/<h1/g)).toHaveLength(1);
        for (const [, href] of html.matchAll(/href="([^"]+)"/g))
          expect(href, href).toMatch(/^(\/|#|https:\/\/)/);
        expect(html).not.toMatch(/<script/);
      }
    }
    expect(bayanPath('bn', { page: 'guide', slug: 'fasting' } as BayanRoute)).toBe(
      '/bn/guides/fasting'
    );
  });
});

describe('Bayan hosting', () => {
  it('bayan.bustandeen.com serves dist/bayan; help. and /bayan redirect there', () => {
    const B = 'bayan.bustandeen.com';
    const redirects = v.redirects.filter((r) => on(r, B));
    // `/` and `/bn` exist as the app's own landing files, which Vercel serves
    // before any rewrite: so the bayan home pages live at /home and /bn/home.
    expect(redirects.map((r) => [r.source, r.destination])).toEqual([
      ['/', '/home'],
      ['/bn', '/bn/home'],
    ]);
    const help = v.redirects.find((r) => on(r, 'help.bustandeen.com'))!;
    expect(help.destination).toBe('https://bayan.bustandeen.com/:path*');
    const old = v.redirects.find((r) => r.source === '/bayan/:path*')!;
    expect(on(old, 'bustandeen.com')).toBe(true);
    const i = v.rewrites.findIndex((r) => on(r, B));
    expect(v.rewrites[i]).toMatchObject({ source: '/:path*', destination: '/bayan/:path*' });
    // Before the app-shell catch-all. The API, the admin page and the catch-all
    // itself skip this host: Vercel goes on to later rewrites when a bayan page
    // does not exist, so without that a typo served the app shell (v5.164.1).
    expect(i).toBeLessThan(v.rewrites.findIndex((r) => r.destination === '/app-shell.html'));
    for (const r of v.rewrites.filter(
      (x) =>
        x.destination === '/admin.html' ||
        x.source === '/api/(.*)' ||
        x.source.includes('prayer-times') ||
        x.destination === '/app-shell.html'
    ))
      expect(r.missing).toEqual([{ type: 'host', value: B }]);
  });

  it('its own headers: scripts only from itself, no frames, no connections', () => {
    const block = v.headers.find((h) => on(h, 'bayan.bustandeen.com'))!;
    const csp = block.headers.find((h) => h.key === 'Content-Security-Policy')!.value;
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/google|alquran|nominatim/);
    expect(v.headers[0]!.missing).toContainEqual({ type: 'host', value: 'bayan.bustandeen.com' });
  });

  it('robots.txt (served on every host) lists the bayan sitemap', () => {
    expect(robots).toContain('Sitemap: https://bayan.bustandeen.com/sitemap-bayan.xml');
  });

  it('the filter script only filters (no network, no storage)', () => {
    expect(filterJs).not.toMatch(/fetch|XMLHttpRequest|localStorage|document\.cookie|innerHTML/);
  });
});
