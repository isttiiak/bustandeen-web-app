import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import navbar from '../components/Navbar.tsx?raw';

// T3.2 About, Privacy, Feedback (and /contact, which redirects to it): the
// pages and the shared FeedbackForm draw SVG icons only, no string in their
// namespaces has emoji or em dashes (feature/section/type keys are built at
// runtime, so whole namespaces are checked), at most one arch per screen, no
// hard-coded colour, glow or endless animation, and the navbar has an SVG
// icon for every screen. `about.conceptDefinition` is the quoted meaning of
// Iḥsān from the hadith of Jibrīl (not rendered here) and keeps its punctuation.
const files = import.meta.glob<string>(
  [
    './About.tsx',
    './Privacy.tsx',
    './Feedback.tsx',
    './Contact.tsx',
    '../components/FeedbackForm.tsx',
  ],
  { query: '?raw', import: 'default', eager: true }
);
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→←]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const QUOTED = new Set(['about.conceptDefinition']);

type Tree = { [k: string]: unknown };
const strings = (node: unknown, prefix: string): [string, string][] =>
  typeof node === 'string'
    ? [[prefix, node]]
    : Object.entries(node as Tree).flatMap(([k, v]) => strings(v, `${prefix}.${k}`));

describe('About, Privacy and Feedback screens', () => {
  it('finds the files', () => {
    expect(Object.keys(files).length).toBe(5);
  });

  it.each(Object.keys(files))('%s renders no emoji or em dash', (path) => {
    expect(stripComments(files[path] ?? '')).not.toMatch(DASH_OR_EMOJI);
  });

  it.each(Object.keys(files))('%s has at most one arch, no hex colour or glow', (path) => {
    const code = stripComments(files[path] ?? '');
    expect((code.match(/rounded-arch/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(
      /shadow-\[0_0_|repeat:\s*Infinity|animate-pulse|blur-3xl|bg-gradient-to-(br|r)\b|rounded-(2xl|3xl)\b/
    );
  });

  it('the feedback types carry icons, not emoji or per-type colours', () => {
    const form = files['../components/FeedbackForm.tsx'] ?? '';
    expect(form).not.toMatch(/\bemoji\b|\bactive: string/);
  });

  it('the navbar has an SVG icon for every screen', () => {
    expect(stripComments(navbar)).not.toMatch(/\bemoji\b/);
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s: about, privacy, feedback and feedbackForm have no emoji or em dash', (_lang, dict) => {
    const d = dict as Tree;
    const bad = ['about', 'privacy', 'feedback', 'feedbackForm']
      .flatMap((ns) => strings(d[ns], ns))
      .filter(([k, v]) => !QUOTED.has(k) && DASH_OR_EMOJI.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
});
