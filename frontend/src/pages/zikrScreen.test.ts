import { describe, it, expect } from 'vitest';

// T3.2 Zikr: AnimatedBackground wraps the counter in `relative z-10`, so an
// inline full-screen overlay would open under the sticky navbar.
const files = {
  ...import.meta.glob<string>('./ZikrCounter.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob<string>('../components/zikr/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};

describe('Zikr screen', () => {
  it('finds the Zikr files', () => {
    expect(Object.keys(files).length).toBeGreaterThan(3);
  });

  it.each(Object.keys(files))('%s portals any full-screen overlay', (path) => {
    const code = files[path] ?? '';
    if (/fixed inset-0/.test(code)) expect(code).toMatch(/createPortal\(/);
  });
});
