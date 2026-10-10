import { describe, expect, it } from 'vitest';
import { qrPath } from './qr.js';

describe('qrPath', () => {
  it('draws a square code with a quiet zone and the three finder squares', () => {
    const { size, d } = qrPath(
      'https://bustandeen.com/bn/ramadan-calendar/chapainawabganj-bangladesh/2027'
    );
    // Version 5 (37 modules) at level M for this length, plus 2 + 2 quiet.
    expect(size).toBe(41);
    // Top-left finder: a run of 7 dark modules starting inside the quiet zone.
    expect(d.startsWith('M2 2h7v1h-7z')).toBe(true);
    expect(d).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/);
  });

  it('is deterministic', () => {
    expect(qrPath('https://bustandeen.com/')).toEqual(qrPath('https://bustandeen.com/'));
  });
});
