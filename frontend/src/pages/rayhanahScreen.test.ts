import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';

// T3.2 Rayhanah: the cycle tracker, its analytics and the cards they render
// draw SVG icons only, their copy has no emoji or em dashes, and none of them
// can reach an AI (Rayhanah privacy rule: cycle data never goes to any AI).
const files = import.meta.glob<string>(
  [
    './RayhanahCycle.tsx',
    './CycleAnalytics.tsx',
    '../components/CycleCalendar.tsx',
    '../components/CycleEditModal.tsx',
    '../components/CycleGuidance.tsx',
    '../components/MoodComfort.tsx',
    '../components/RayhanahSettingsDrawer.tsx',
    '../components/cycle/cycleIcons.tsx',
  ],
  { query: '?raw', import: 'default', eager: true }
);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u;
const DASH_OR_EMOJI = /—|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u;
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

type Tree = { [k: string]: string | string[] | Tree };
function strings(node: Tree, path: string, out: Array<[string, string]>) {
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string') out.push([`${path}.${k}`, v]);
    else if (!Array.isArray(v)) strings(v, `${path}.${k}`, out);
  }
  return out;
}

describe('Rayhanah screens', () => {
  it('finds the Rayhanah files', () => {
    expect(Object.keys(files).length).toBe(8);
  });

  it.each(Object.keys(files))('%s renders no emoji or em dash', (path) => {
    const code = stripComments(files[path] ?? '');
    expect(code).not.toMatch(DASH_OR_EMOJI);
  });

  it.each(Object.keys(files))('%s imports nothing that talks to an AI', (path) => {
    const imports = (files[path] ?? '').match(/^import[\s\S]*?from\s+'[^']+';/gm) ?? [];
    expect(imports.filter((i) => /useAi|useNaseeh|useCycleAiGate|groq|\/ai\//i.test(i))).toEqual(
      []
    );
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s Rayhanah copy has no emoji or em dashes', (_lang, dict) => {
    const d = dict as unknown as Tree;
    const bad = ['rayhanah', 'cycleAnalytics', 'cycleCalendar', 'cycleSupport']
      .flatMap((ns) => strings(d[ns] as Tree, ns, []))
      .filter(([, v]) => DASH_OR_EMOJI.test(v))
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });

  it('the daily excused-day phrases are translated (they were English-only)', () => {
    for (let i = 0; i < 8; i++) {
      const enText = (en.rayhanah as Record<string, unknown>)[`phrase${i}`];
      const bnText = (bn.rayhanah as Record<string, unknown>)[`phrase${i}`];
      expect(typeof enText).toBe('string');
      expect(typeof bnText).toBe('string');
      expect(bnText).not.toBe(enText);
      expect(String(enText)).not.toMatch(EMOJI);
    }
  });
});
