import { describe, it, expect } from 'vitest';
import code from './UnsavedWarning.tsx?raw';

// The guest "Don't lose your counts" card: the old daisyUI toast/alert ran off
// the side of a phone. It is a bounded Bustan card with the shared buttons,
// and it stays off the counter (its own guest prompt; the card covered Count).
describe('UnsavedWarning', () => {
  it('is a bounded card with the shared buttons, no daisyUI toast or btn', () => {
    expect(code).toMatch(/\$\{DIALOG\}[^`]*inset-x-4[^`]*max-w-md/);
    expect(code).toMatch(/BTN_PRIMARY/);
    expect(code).toMatch(/BTN_SECONDARY/);
    expect(code).not.toMatch(
      /\btoast-center\b|\balert\b|className="btn[\s"]|\bbtn-(sm|primary|ghost)\b/
    );
  });

  it('stays off the auth pages and the counter', () => {
    expect(code).toMatch(/\['\/login', '\/signup'\]/);
    expect(code).toMatch(/pathname === '\/zikr'/);
  });
});
