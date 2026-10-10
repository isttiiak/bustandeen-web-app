import { describe, expect, it } from 'vitest';
import { demoTarget } from './demoTarget.js';

describe('demoTarget', () => {
  it('opens a listed feature page', () => {
    expect(demoTarget('/cycle')).toBe('/cycle');
    expect(demoTarget('/quran')).toBe('/quran');
  });

  it('sends anything else Home', () => {
    for (const to of [
      null,
      '',
      '/',
      '/settings',
      '//evil.example',
      'https://evil.example',
      '/cycle/x',
      '/quran?x=1',
    ]) {
      expect(demoTarget(to)).toBe('/');
    }
  });
});
