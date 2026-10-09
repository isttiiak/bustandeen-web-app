import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2: the guest "Sign in required" gate (routeGuards.tsx) and the app
// footer draw SVG icons only (no lock emoji), keep text readable (no ink
// below /60), use the shared buttons, and the footer heart no longer pulses
// forever (nor does the footer carry a gradient).
const files = import.meta.glob<string>(['../routeGuards.tsx', './Footer.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('Guest sign-in gate and footer', () => {
  it.each(Object.keys(files))('%s has no emoji, em dash, faint ink or gradient', (p) => {
    const code = stripComments(files[p]!);
    expect(code).not.toMatch(DASH_OR_EMOJI);
    expect(code).not.toMatch(/text-white\/(10|20|25|30|40|50)\b/);
    expect(code).not.toMatch(/bg-gradient|animate-pulse/);
  });

  it('the gate uses an SVG lock and the shared buttons', () => {
    const gate = files['../routeGuards.tsx']!;
    expect(gate).toContain('<LockClosedIcon');
    expect(gate).toContain('BTN_PRIMARY');
    expect(gate).toContain('BTN_SECONDARY');
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: gate and footer link copy has no emoji or em dash', (_l, dict) => {
    const app = (dict as { app: Record<string, string> }).app;
    const footer = (dict as { footer: Record<string, string> }).footer;
    const keys = [
      app.signInRequired,
      app.signInRequiredDesc,
      app.signIn,
      app.createFreeAccount,
      footer.madeWith,
      footer.forTheUmmah,
      footer.feedbackContact,
      footer.about,
      footer.privacy,
      footer.terms,
      footer.nonCommercial,
      footer.adFree,
      footer.secure,
    ];
    expect(keys.every((v) => typeof v === 'string' && v.length > 0)).toBe(true);
    expect(keys.filter((v) => DASH_OR_EMOJI.test(v!))).toEqual([]);
  });
});
