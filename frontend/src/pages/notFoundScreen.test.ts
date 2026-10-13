import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import page from './NotFound.tsx?raw';

// T3.2 NotFound: one arch hero with the shared primary button (no old daisyUI
// card, btn-lg or glass shadow), SVG icons only, no hard-coded colour or glow,
// readable text (no ink below /70) and its strings free of emoji and em dashes
// in en + bn.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔→]/u;
const code = page.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('NotFound screen', () => {
  it('is one arch hero with the shared button', () => {
    expect((code.match(/rounded-arch/g) ?? []).length).toBe(1);
    expect(code).toMatch(/BTN_PRIMARY/);
    expect(code).not.toMatch(/\bcard(-body)?\b|\bbtn\b|btn-lg|shadow-glass/);
  });

  it('has no emoji, hex colour, glow or faint text', () => {
    expect(code).not.toMatch(DASH_OR_EMOJI);
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code).not.toMatch(/shadow-\[0_0_|repeat:\s*Infinity|animate-pulse|blur-3xl/);
    expect(code).not.toMatch(/text-white\/[1-6]0\b/);
  });

  it('has one h1', () => {
    expect((code.match(/<h1\b/g) ?? []).length).toBe(1);
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s: notFound strings have no emoji or em dash', (_lang, dict) => {
    const ns = (dict as { notFound: Record<string, string> }).notFound;
    expect(Object.values(ns).filter((v) => DASH_OR_EMOJI.test(v))).toEqual([]);
  });
});
