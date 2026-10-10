import { describe, expect, it } from 'vitest';
import { cameBackPercent, weekLabel } from './adminActivity.js';

describe('admin activity helpers (U8.8)', () => {
  it('labels weeks newest first', () => {
    expect([0, 1, 2, 7].map(weekLabel)).toEqual([
      'Last 7 days',
      '1 week before',
      '2 weeks before',
      '7 weeks before',
    ]);
  });

  it('rounds the came-back share and has none for an empty cohort', () => {
    expect(cameBackPercent({ cohort: 3, returned: 1 })).toBe(33);
    expect(cameBackPercent({ cohort: 0, returned: 0 })).toBeNull();
  });
});
