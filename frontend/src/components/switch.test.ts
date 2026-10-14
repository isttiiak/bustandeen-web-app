import { describe, it, expect } from 'vitest';
import switchSrc from './Switch.tsx?raw';

// T3.2 leftovers: every on/off control is the shared Bustan <Switch> (a real
// checkbox with role="switch" and a 44px tap area), and no app screen uses
// daisyUI's `toggle` or `card-body` any more.
const screens = import.meta.glob<string>(['../**/*.tsx', '!../**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('Switch', () => {
  it('is a checkbox with role="switch" and a 44px input', () => {
    expect(switchSrc).toMatch(/type="checkbox"\s+role="switch"/);
    expect(switchSrc).toMatch(/h-11 w-11/);
  });

  it('draws only with theme tokens (no hex colours)', () => {
    expect(switchSrc).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});

describe('no daisyUI toggle or card-body in app screens', () => {
  for (const [path, src] of Object.entries(screens)) {
    it(path, () => {
      expect(src).not.toMatch(/className=["{`][^"}`]*\btoggle\b(?!-)/);
      expect(src).not.toMatch(/\btoggle-(success|sm|xs|warning|info|secondary)\b/);
      expect(src).not.toMatch(/\bcard-body\b/);
    });
  }
});
