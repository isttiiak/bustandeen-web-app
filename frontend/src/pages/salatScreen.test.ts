import { describe, it, expect } from 'vitest';

// Salat tracker: like Fasting and Zikr, a full-screen overlay is portaled so
// no page layer keeps it under the sticky navbar. The guest sign-in sheet (U10,
// shared with Fasting and Zikr) uses the Bustan panel and shared buttons.
const files = {
  ...import.meta.glob<string>('./SalatTracker.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob<string>(['../components/salat/*.tsx', '../components/SignInSheet.tsx'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};
const guest = files['../components/SignInSheet.tsx'] ?? '';

describe('Salat screen', () => {
  it('finds the Salat files', () => {
    expect(Object.keys(files).length).toBeGreaterThan(3);
    expect(guest).not.toBe('');
  });

  it.each(Object.keys(files))('%s portals any full-screen overlay', (path) => {
    const code = files[path] ?? '';
    if (/fixed inset-0/.test(code)) expect(code).toMatch(/createPortal\(/);
  });

  it('the guest sign-in sheet is a labelled Bustan dialog with the shared buttons', () => {
    expect(guest).toMatch(/\$\{DIALOG\}/);
    expect(guest).toMatch(/role="dialog"[\s\S]*aria-labelledby="sign-in-sheet-title"/);
    for (const b of ['BTN_PRIMARY', 'BTN_SECONDARY', 'BTN_QUIET']) expect(guest).toMatch(b);
    expect(guest).not.toMatch(/className="btn[\s"]|\bbtn-(sm|xs|lg|ghost)\b|text-white\/[1-6]0\b/);
  });
});
