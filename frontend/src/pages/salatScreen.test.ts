import { describe, it, expect } from 'vitest';

// Salat tracker: like Fasting and Zikr, a full-screen overlay is portaled so
// no page layer keeps it under the sticky navbar. T3.2: the guest dialog uses
// the shared Bustan panel and buttons, no daisyUI btn, no faint ink.
const files = {
  ...import.meta.glob<string>('./SalatTracker.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob<string>('../components/salat/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};
const guest = files['../components/salat/SalatGuestDialog.tsx'] ?? '';

describe('Salat screen', () => {
  it('finds the Salat files', () => {
    expect(Object.keys(files).length).toBeGreaterThan(3);
    expect(guest).not.toBe('');
  });

  it.each(Object.keys(files))('%s portals any full-screen overlay', (path) => {
    const code = files[path] ?? '';
    if (/fixed inset-0/.test(code)) expect(code).toMatch(/createPortal\(/);
  });

  it('the guest dialog is a labelled Bustan dialog with the shared buttons', () => {
    expect(guest).toMatch(/\$\{DIALOG\}/);
    expect(guest).toMatch(/role="dialog"[\s\S]*aria-labelledby="salat-guest-title"/);
    for (const b of ['BTN_PRIMARY', 'BTN_SECONDARY', 'BTN_QUIET']) expect(guest).toMatch(b);
    expect(guest).not.toMatch(/className="btn[\s"]|\bbtn-(sm|xs|lg|ghost)\b|text-white\/[1-6]0\b/);
  });
});
