import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import signIn from './AuthSignIn.tsx?raw';
import signUp from './AuthSignUp.tsx?raw';
import action from './AuthAction.tsx?raw';
import parts from '../components/auth/authParts.tsx?raw';

// T3.2 Auth screens (sign in, sign up, /auth/action): the shared auth shell
// with one arch hero per screen, theme tokens and shared buttons, no emoji or
// em dash, ink never below /70, labelled inputs, and clean authSignIn /
// authSignUp / authAction copy in en + bn. The Google "G" keeps its brand
// colours in components/auth/GoogleGlyph.tsx, the only raw colours allowed.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔←→]/u;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe.each([
  ['AuthSignIn', signIn],
  ['AuthSignUp', signUp],
  ['AuthAction', action],
  ['authParts', parts],
])('%s', (name, code) => {
  const src = stripComments(code);

  it('has no emoji, em dash, faint ink, old radius or raw colour', () => {
    expect(src).not.toMatch(DASH_OR_EMOJI);
    expect(src).not.toMatch(/text-white\/[1-6]0\b/);
    expect(src).not.toMatch(/bg-white\/|rounded-(lg|xl|2xl|3xl)\b|font-black|backdrop-blur/);
    expect(src).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}\b|red-500|shadow-\[|shadow-(lg|xl|2xl)\b/);
    expect(src).not.toMatch(/className="btn\b/);
  });

  if (name !== 'authParts') {
    it('uses the shared shell, hero and buttons', () => {
      expect(src).toContain('<AuthShell>');
      expect(src).toContain('<AuthHero');
      expect(src).toContain('BTN_PRIMARY');
      expect(src).not.toContain('<svg');
    });
  }
});

it('the arch hero is the one rounded-arch, and inputs get labels', () => {
  expect(parts.match(/rounded-arch/g)).toHaveLength(1);
  for (const code of [signIn, signUp, action]) {
    expect(code).not.toContain('rounded-arch');
    const ids = [...code.matchAll(/\bid="([a-z-]+)"/g)].map((m) => m[1]);
    for (const id of ids.filter((i) => i !== 'signup-gender'))
      expect(code).toContain(`htmlFor="${id}"`);
  }
  expect(parts).toContain("t('authSignIn.showPassword'");
});

describe.each([
  ['en', en],
  ['bn', bn],
] as const)('%s copy', (_l, dict) => {
  const flat = (o: unknown): string[] =>
    typeof o === 'string' ? [o] : Object.values(o as object).flatMap(flat);
  it.each(['authSignIn', 'authSignUp', 'authAction'] as const)(
    '%s has no emoji, arrow or em dash',
    (ns) => {
      const values = flat(dict[ns]);
      expect(values.length).toBeGreaterThan(0);
      for (const v of values) expect(v).not.toMatch(DASH_OR_EMOJI);
    }
  );
});
