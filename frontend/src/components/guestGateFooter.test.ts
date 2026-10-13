import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2: the guest gate (routeGuards.tsx, now PreviewGate, U10) and the app
// footer draw SVG icons only (no lock emoji), keep text readable (no ink
// below /60), use the shared buttons, and the footer heart no longer pulses
// forever (nor does the footer carry a gradient).
const files = import.meta.glob<string>(
  ['../routeGuards.tsx', './PreviewGate.tsx', './Footer.tsx'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  }
);
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('Guest sign-in gate and footer', () => {
  it.each(Object.keys(files))('%s has no emoji, em dash, faint ink or gradient', (p) => {
    const code = stripComments(files[p]!);
    expect(code).not.toMatch(DASH_OR_EMOJI);
    expect(code).not.toMatch(/text-white\/(10|20|25|30|40|50)\b/);
    expect(code).not.toMatch(/bg-gradient|animate-pulse/);
  });

  it('a guest gets the PreviewGate (a reason, no lock) with the shared buttons', () => {
    const guards = files['../routeGuards.tsx']!;
    const gate = files['./PreviewGate.tsx']!;
    expect(guards).toContain('<PreviewGate />');
    expect(guards).not.toContain('LockClosedIcon');
    expect(gate).not.toContain('LockClosedIcon');
    expect(gate).toContain('<SignInButtons');
    expect(gate).toContain('enterDemoMode(');
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ] as const)('%s: gate and footer link copy has no emoji or em dash', (_l, dict) => {
    const gate = dict.signInGate;
    const footer = (dict as { footer: Record<string, string> }).footer;
    const keys = [
      gate.analytics.title,
      gate.analytics.desc,
      gate.page.title,
      gate.page.desc,
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
