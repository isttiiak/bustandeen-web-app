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

  it('shows no Noor pills and keeps no setting for them', () => {
    expect(navbar).not.toMatch(/useNoor|noorTodayVisible|noorAllTimeVisible/);
    expect(uiStore).not.toMatch(/showNoor/);
    expect(prefsSync).not.toMatch(/bustandeen_noor_/);
  });
});
