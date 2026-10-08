import { describe, it, expect } from 'vitest';
import navbar from './Navbar.tsx?raw';

// T3.2: the navbar's Home breadcrumb and the Noor pills draw SVG icons, not
// emoji, and the pill tooltips come from the (translated) Settings strings.
describe('Navbar icons', () => {
  it('has no Home or Noor emoji', () => {
    expect(navbar).not.toMatch(/🏠|🌟/u);
    expect(navbar).not.toMatch(/Noor — /);
  });

  it('labels the Noor pills from locale strings', () => {
    expect(navbar).toMatch(/t\('settings\.noorTodayDetail'\)/);
    expect(navbar).toMatch(/t\('settings\.noorAllTimeDetail'\)/);
  });
});
