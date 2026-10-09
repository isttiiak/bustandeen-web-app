import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import body from '../components/landing/LandingBody.tsx?raw';
import seo from '../components/LandingSeoSections.tsx?raw';
import staticPage from '../seo/templates/LandingPage.tsx?raw';
import appPage from './Landing.tsx?raw';

// T3.2 Landing: the prerendered `/` + `/bn` and the in-app Landing render one
// Bustan Arch body (components/landing/LandingBody.tsx) with one arch hero,
// theme cards and shared buttons, line icons instead of emoji, ink never below
// /70, no gradient text, glow or float, and landing copy (plus the footer
// platform note it shows) without emoji, arrows or em dashes in en + bn.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[→←]/u;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe.each([
  ['LandingBody', body],
  ['LandingSeoSections', seo],
  ['LandingPage', staticPage],
  ['Landing', appPage],
])('%s', (_name, code) => {
  const src = stripComments(code);
  it('has no emoji, em dash, faint ink, old radius, glow or raw colour', () => {
    expect(src).not.toMatch(DASH_OR_EMOJI);
    expect(src).not.toMatch(/text-white\/[1-6]\d\b/);
    expect(src).not.toMatch(
      /bg-white\/|rounded-(lg|xl|2xl|3xl)\b|font-black|backdrop-blur|blur-3xl/
    );
    expect(src).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}\b|shadow-\[|shadow-(lg|xl|2xl)\b/);
    expect(src).not.toMatch(/bg-clip-text|repeat: Infinity|className="btn\b/);
  });
});

it('both landings share the body, which has the one arch hero', () => {
  expect(body.match(/rounded-arch/g)).toHaveLength(1);
  expect(body).toContain('BTN_PRIMARY');
  for (const page of [staticPage, appPage]) {
    expect(page).toContain('<LandingBody');
    expect(page).not.toContain('rounded-arch');
  }
  // The e2e tests and the static page rely on the demo links.
  expect(body).toContain('href="/demo/brother"');
  expect(body).toContain('href="/demo/sister"');
});

describe.each([
  ['en', en],
  ['bn', bn],
] as const)('%s copy', (_l, dict) => {
  it('landing strings and the platform note are clean', () => {
    const values = Object.values(dict.landing).flatMap((v) =>
      typeof v === 'string'
        ? [v]
        : Object.values(v as object).flatMap((x) =>
            typeof x === 'string' ? [x] : Object.values(x as object)
          )
    ) as string[];
    expect(values.length).toBeGreaterThan(40);
    for (const v of [...values, dict.footer.platformNote]) expect(v).not.toMatch(DASH_OR_EMOJI);
    expect(dict.landing.finalQuote).toBeTruthy();
  });
});
