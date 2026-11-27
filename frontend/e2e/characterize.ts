import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

// Audit P4-1 (splitting the big pages): a characterization harness. It dumps a
// normalized, pretty-printed copy of the rendered DOM so a refactor that is
// meant to change nothing can be proved to change nothing: the dump must stay
// byte-identical. Baselines live in e2e/__baselines__ (see playwright.config.ts).
//
// They are recorded against a build made the way CI makes it: no .env files.
// A local .env that sets VITE_GA_MEASUREMENT_ID adds the "Visit counting"
// banner to every page, which CI never shows. Build with the .env and
// .env.local moved aside and the placeholder VITE_FIREBASE_* values from
// .github/workflows/ci.yml, then run `npx playwright test characterize`.
//
// Normalized on purpose, so only real differences show:
//  - ids and the attributes that point at them are renumbered (React derives
//    `useId` values from the tree position, which an extraction moves);
//  - toast offsets (translateY in px, measured from the font);
//  - SVG path data and data: URLs are replaced by their length and a hash;
//  - the app version (the footer shows it) is replaced by a placeholder.

const VERSION = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const toBn = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]!);

export const AT = {
  /** A plain Thursday afternoon in Dhaka. */
  day: '2026-10-15T14:00:00+06:00',
  /** Thursday evening, after Isha. */
  night: '2026-10-15T21:00:00+06:00',
  /** A Friday, for the Friday cards. */
  friday: '2026-10-16T12:30:00+06:00',
  /** Inside Ramadan 1448 (the nights are odd or even from here). */
  ramadan: '2027-02-20T16:00:00+06:00',
} as const;

export interface DemoOptions {
  as: 'brother' | 'sister';
  at?: string;
  lang?: 'en' | 'bn';
  /** Extra localStorage entries, set before the app starts. */
  storage?: Record<string, string>;
  /** Start without a saved place (the prayer window then asks for one). */
  noLocation?: boolean;
}

/** Enters the demo with a frozen clock, a saved place and reduced motion. */
export async function enterDemo(page: Page, o: DemoOptions) {
  await page.clock.setFixedTime(new Date(o.at ?? AT.day));
  await page.context().addInitScript(
    ([lang, extra, noLocation]) => {
      localStorage.setItem(
        'bustandeen_location',
        JSON.stringify({ latitude: 23.8103, longitude: 90.4125, name: 'Dhaka' })
      );
      localStorage.setItem('bustandeen_reduce_motion', 'on');
      localStorage.setItem('bustandeen_lang', lang);
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
      if (noLocation) localStorage.removeItem('bustandeen_location');
    },
    [o.lang ?? 'en', o.storage ?? {}, !!o.noLocation] as const
  );
  await page.goto(`/demo/${o.as}`);
  // The demo banner names itself in the active language; wait for the app.
  await page.waitForFunction(() => document.querySelector('main, nav') !== null);
  await page.waitForTimeout(800);
}

/** In-app navigation: a full page load would end demo mode. */
export async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForTimeout(500);
}

/** The normalized dump of the page, in the browser. */
async function dumpOnce(page: Page): Promise<string> {
  return page.evaluate(() => {
    const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'TEMPLATE', 'TITLE']);
    const ID_ATTRS = new Set([
      'id',
      'for',
      'aria-labelledby',
      'aria-describedby',
      'aria-controls',
      'aria-owns',
      'aria-activedescendant',
      'list',
      'form',
    ]);
    const hash = (s: string) => {
      let h = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return (h >>> 0).toString(16).padStart(8, '0');
    };
    // Ids, numbered in document order.
    const ids = new Map<string, string>();
    for (const el of document.body.querySelectorAll('[id]')) {
      const id = el.getAttribute('id')!;
      if (!ids.has(id)) ids.set(id, `id${ids.size + 1}`);
    }
    const mapIds = (v: string) =>
      v
        .split(/\s+/)
        .filter(Boolean)
        .map((x) => ids.get(x) ?? x)
        .join(' ');

    const lines: string[] = [];
    const walk = (node: Node, depth: number) => {
      const pad = ' '.repeat(depth);
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text) lines.push(`${pad}"${text}"`);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (SKIP.has(el.tagName)) return;
      const attrs: string[] = [];
      for (const a of [...el.attributes].sort((x, y) => x.name.localeCompare(y.name))) {
        let v = a.value;
        if (ID_ATTRS.has(a.name)) v = mapIds(v);
        else if (a.name === 'd' || a.name === 'points') v = `<${v.length}:${hash(v)}>`;
        else if (/^(data|blob):/.test(v)) v = `<${v.length}:${hash(v)}>`;
        else if (a.name === 'style')
          v = v
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s && !s.startsWith('will-change'))
            .join('; ')
            // The toast library positions each toast by its measured height,
            // which depends on the font (a Mac and CI's Linux differ).
            .replace(/translateY\(-?[\d.]+px\)/g, 'translateY(<px>)');
        attrs.push(`${a.name}="${v}"`);
      }
      // Live form state lives in properties, not attributes.
      if (el instanceof HTMLInputElement) {
        if (el.type === 'checkbox' || el.type === 'radio') attrs.push(`checked=${el.checked}`);
        else attrs.push(`value="${el.value}"`);
      } else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        attrs.push(`value="${el.value}"`);
      }
      lines.push(`${pad}<${el.tagName.toLowerCase()}${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
      for (const child of el.childNodes) walk(child, depth + 1);
    };
    walk(document.body, 0);
    return lines.join('\n');
  });
}

/** Waits until the page stops changing, then returns its dump. */
async function settledDump(page: Page): Promise<string> {
  let last = await dumpOnce(page);
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(300);
    const next = await dumpOnce(page);
    if (next === last) return next;
    last = next;
  }
  throw new Error('The page never settled (something keeps re-rendering).');
}

/** Replaces the app version, in Latin and Bangla digits, so a bump moves nothing. */
function withoutVersion(s: string): string {
  return s.split(VERSION).join('<version>').split(toBn(VERSION)).join('<version>');
}

/** The baseline name is the file in e2e/__baselines__. */
export async function expectBaseline(page: Page, name: string) {
  const dump = withoutVersion(await settledDump(page));
  expect(dump).toMatchSnapshot(`${name}.txt`);
}

/**
 * Pending offline writes (the sync outbox and the salat outbox): the exact
 * method, url and body a handler produced. Random ids and queue times are
 * dropped; everything else must stay the same.
 */
export const outbox = (page: Page) =>
  page.evaluate(() => {
    const read = (key: string): Array<Record<string, unknown>> => {
      const ops = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<Record<string, unknown>>;
      return ops.map(({ id: _id, queuedAt: _queuedAt, ...rest }) => rest);
    };
    return JSON.stringify(
      { sync: read('bustandeen_sync_outbox'), salat: read('bustandeen_salat_outbox') },
      null,
      1
    );
  });

/** A saved text (an outbox dump) as a baseline of its own. */
export function expectText(text: string, name: string) {
  expect(text).toMatchSnapshot(`${name}.txt`);
}
