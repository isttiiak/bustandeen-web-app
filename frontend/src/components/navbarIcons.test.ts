import { describe, it, expect } from 'vitest';
import navbar from './Navbar.tsx?raw';
import uiStore from '../store/useUiStore.ts?raw';
import prefsSync from '../utils/prefsSync.ts?raw';

// T3.2: the navbar's Home breadcrumb draws an SVG icon, not emoji.
// U3: the Noor pills are gone from the navbar (own Noor lives on your card
// in the Friends circle), and so are their Settings toggles and synced keys.
describe('Navbar icons', () => {
  it('has no Home or Noor emoji', () => {
    expect(navbar).not.toMatch(/🏠|🌟/u);
    expect(navbar).not.toMatch(/Noor — /);
  });

  // T3.2: the sign-out confirm is a Bustan card with the shared buttons, a
  // labelled dialog, not the old daisyUI card and red btn-sm.
  it('draws the sign-out confirm with the shared card and buttons', () => {
    const block = navbar.slice(navbar.indexOf('{confirmLogout && ('));
    expect(block).toMatch(/\$\{CARD\}/);
    expect(block).toMatch(/\$\{BTN_PRIMARY\}/);
    expect(block).toMatch(/\$\{BTN_SECONDARY\}/);
    expect(block).toMatch(/role="dialog"[\s\S]*aria-labelledby="sign-out-title"/);
    expect(block).not.toMatch(/\bcard-body\b|\bbtn\b|btn-sm|bg-red-500|text-white\/60/);
  });

  it('shows no Noor pills and keeps no setting for them', () => {
    expect(navbar).not.toMatch(/useNoor|noorTodayVisible|noorAllTimeVisible/);
    expect(uiStore).not.toMatch(/showNoor/);
    expect(prefsSync).not.toMatch(/bustandeen_noor_/);
  });
});
