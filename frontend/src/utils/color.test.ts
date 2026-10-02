import { describe, expect, it } from 'vitest';
import { withAlpha } from './color.js';

describe('withAlpha', () => {
  it('appends to a hex colour', () => {
    expect(withAlpha('#c9a96e', '1c')).toBe('#c9a96e1c');
  });
  it('adds an alpha channel to a theme token', () => {
    expect(withAlpha('rgb(var(--c-gold))', '1c')).toBe('rgb(var(--c-gold) / 0.11)');
    expect(withAlpha('rgb(var(--c-info))', '70')).toBe('rgb(var(--c-info) / 0.439)');
  });
});
