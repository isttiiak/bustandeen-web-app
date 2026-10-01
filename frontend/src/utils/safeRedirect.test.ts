import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safeRedirect.js';

describe('safeRedirect', () => {
  it.each([
    ['/zikr', '/zikr'],
    ['/connect/AB12CD', '/connect/AB12CD'],
    ['/salat?tab=kaza#today', '/salat?tab=kaza#today'],
    ['/', '/'],
  ])('keeps internal path %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['//evil.com'],
    ['/\\evil.com'],
    ['\\\\evil.com'],
    ['\\/evil.com'],
    ['https://evil.com'],
    ['javascript:alert(1)'],
    ['evil.com'],
    ['/\t/evil.com'],
    ['/\n/evil.com'],
    ['/\r\n/evil.com'],
  ])('falls back to / for %j', (input) => {
    expect(safeRedirect(input)).toBe('/');
  });
});
