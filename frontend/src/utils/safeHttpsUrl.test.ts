import { describe, expect, it } from 'vitest';
import { safeHttpsUrl } from './safeHttpsUrl.js';

describe('safeHttpsUrl', () => {
  it('keeps a plain https address', () => {
    expect(safeHttpsUrl('https://sunnah.com/muslim:2698')).toBe('https://sunnah.com/muslim:2698');
    expect(safeHttpsUrl('  https://quran.com/2/255  ')).toBe('https://quran.com/2/255');
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://sunnah.com/x',
    'ftp://sunnah.com/x',
    '//sunnah.com/x',
    'sunnah.com/x',
    'https://user:pass@sunnah.com/x',
    'https://sunnah.com/a b',
    'https://sunnah.com/\nx',
    '',
    '   ',
  ])('refuses %j', (value) => {
    expect(safeHttpsUrl(value)).toBeNull();
  });

  it('refuses nothing-at-all', () => {
    expect(safeHttpsUrl(undefined)).toBeNull();
    expect(safeHttpsUrl(null)).toBeNull();
  });
});
