import { describe, expect, it } from 'vitest';
import { withHifzDay } from './hifzDay.js';

describe('withHifzDay', () => {
  it('adds the day to what is being sent and keeps the rest', () => {
    expect(withHifzDay({ surah: 2, ayah: 255, result: 'easy' }, '2026-11-25')).toEqual({
      surah: 2,
      ayah: 255,
      result: 'easy',
      date: '2026-11-25',
    });
  });

  it('works with nothing else to send (add next)', () => {
    expect(withHifzDay({}, '2026-11-25')).toEqual({ date: '2026-11-25' });
  });

  it("uses the app's own tracking day when none is given", () => {
    expect(withHifzDay({}).date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
