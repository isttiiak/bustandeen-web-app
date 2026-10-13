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

  // T3.2 leftovers: the set-count and manage dialogs, the guest note, the auto-play
  // controls and the reset confirm use the shared Bustan classes, not the old
  // daisyUI buttons and inputs.
  const T32 = [
    './ZikrCounter.tsx',
    '../components/zikr/ZikrSetCountModal.tsx',
    '../components/zikr/ZikrManageListSheet.tsx',
    '../components/zikr/ZikrAutoPlayControls.tsx',
    '../components/zikr/ZikrGuestNote.tsx',
  ];
  it.each(T32)('%s has no old daisyUI button or input', (path) => {
    const code = files[path] ?? '';
    expect(code).not.toBe('');
    expect(code).not.toMatch(/className="btn[\s"]|\bbtn-(sm|xs|lg|ghost)\b|\binput-bordered\b/);
  });

  it.each(T32.slice(1, 3))('%s is a labelled dialog on the shared panel', (path) => {
    const code = files[path] ?? '';
    expect(code).toMatch(/\$\{DIALOG\}/);
    expect(code).toMatch(/role="dialog"[\s\S]*aria-labelledby=/);
    expect(code).not.toMatch(/text-white\/[1-6]0\b/);
  });

  // react-hot-toast draws a literally white card: the reset confirm's text
  // must be the fixed dark ink, never theme ink (white on white in dark).
  it('the reset confirm toast uses fixed ink on its white card', () => {
    const code = files['./ZikrCounter.tsx'] ?? '';
    const reset = code.slice(code.indexOf('const onReset'), code.indexOf('duration: 5000'));
    expect(reset).toMatch(/text-ink-fixed/);
    expect(reset).not.toMatch(/text-white\b/);
  });
});
