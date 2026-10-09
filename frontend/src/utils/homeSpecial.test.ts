import { describe, it, expect } from 'vitest';
import { orderHighlights, parseHomeSpecialLayout } from './homeSpecial.js';

const off = { active: false, isFinalStretch: false };

describe('parseHomeSpecialLayout', () => {
  it('keeps a known layout and defaults to the strip', () => {
    expect(parseHomeSpecialLayout('full')).toBe('full');
    expect(parseHomeSpecialLayout('pills')).toBe('pills');
    expect(parseHomeSpecialLayout(null)).toBe('strip');
    expect(parseHomeSpecialLayout('timeline')).toBe('strip');
  });
});

describe('orderHighlights', () => {
  it('puts major days first and the Monday/Thursday fast last', () => {
    const ids = orderHighlights(['fast_mon_thu', 'friday', 'dhul_hijjah_first10', 'arafah'], off);
    expect(ids).toEqual([
      { kind: 'day', id: 'arafah' },
      { kind: 'day', id: 'friday' },
      { kind: 'day', id: 'dhul_hijjah_first10' },
      { kind: 'day', id: 'fast_mon_thu' },
    ]);
  });

  it('leads with the Friday hour while it is on', () => {
    const list = orderHighlights(['friday'], { active: true, isFinalStretch: true });
    expect(list[0]).toEqual({ kind: 'fridayHour', finalStretch: true });
    expect(list[1]).toEqual({ kind: 'day', id: 'friday' });
  });

  it('is empty on an ordinary day', () => {
    expect(orderHighlights([], off)).toEqual([]);
  });
});
