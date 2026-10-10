import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import sheet from './ShareAppSheet.tsx?raw';
import navbar from './Navbar.tsx?raw';
import { SHARE_APP_URL, shareAppMessage } from './ShareAppSheet.js';

// U2 "Share Bustandeen": an app invite, never a friend link; the name is
// opt-in; no third-party request; calm en + bn copy without em dashes.
const fill = (tpl: string, opts: Record<string, unknown> = {}) =>
  tpl.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => String(opts[k]));

describe.each([
  ['en', en.shareApp],
  ['bn', bn.shareApp],
])('shareApp copy (%s)', (_lang, copy) => {
  const t = (key: string, opts?: Record<string, unknown>) =>
    fill((copy as Record<string, string>)[key.replace('shareApp.', '')], opts);

  it('keeps the name out unless asked, and always links the public site', () => {
    const plain = shareAppMessage(t, null);
    const named = shareAppMessage(t, 'Aisha');
    expect(plain).not.toContain('Aisha');
    expect(named).toContain('Aisha');
    for (const m of [plain, named]) {
      expect(m).toContain(SHARE_APP_URL);
      expect(m).not.toContain('/connect/');
    }
  });

  it('has no em dash and no emoji', () => {
    for (const v of Object.values(copy)) {
      expect(v).not.toMatch(/—|\p{Extended_Pictographic}/u);
    }
  });
});

describe('ShareAppSheet', () => {
  it('shares the public URL with a same-origin image, name off by default', () => {
    expect(SHARE_APP_URL).toBe('https://bustandeen.com');
    expect(sheet).toContain("const OG_IMAGE = '/og-image.jpg'");
    expect(sheet).toContain('useState(false)');
    expect(sheet).not.toMatch(/inviteCode|\/connect\//);
  });

  it('sits in the profile menu right before Sign out', () => {
    const share = navbar.indexOf("t('shareApp.menu')");
    const signOut = navbar.indexOf("t('nav.signOut')");
    expect(share).toBeGreaterThan(navbar.indexOf("t('nav.sadaqah'"));
    expect(share).toBeLessThan(signOut);
  });
});
