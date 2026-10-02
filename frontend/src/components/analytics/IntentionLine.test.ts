import { describe, it, expect } from 'vitest';

// FIQH-05: every worship analytics page renders the intention line in its
// signed-in view (after the demo sign-in gate), and Rayhanah's does not.
const sources = import.meta.glob<string>('../../pages/*Analytics.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const page = (name: string) => sources[`../../pages/${name}.tsx`] ?? '';

describe('IntentionLine placement', () => {
  it.each([
    'ZikrAnalytics',
    'SalatAnalytics',
    'FastingAnalytics',
    'QuranAnalytics',
    'RamadanAnalytics',
  ])('%s renders it in the signed-in view', (name) => {
    const src = page(name);
    expect(src.match(/<IntentionLine \/>/g)).toHaveLength(1);
    const gate = src.indexOf('<DemoSignInGate');
    if (gate !== -1) expect(src.indexOf('<IntentionLine />')).toBeGreaterThan(gate);
  });

  it('Rayhanah analytics does not', () => {
    expect(page('CycleAnalytics')).not.toContain('IntentionLine');
  });
});
