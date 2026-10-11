import { describe, it, expect, vi, beforeEach } from 'vitest';

// T1.3b: the site CSP allows workers only from 'self'. canvas-confetti's
// default instance draws in a worker built from a blob: URL, which the
// enforced policy blocks, so celebrations must use a main-thread instance.
const fire = vi.fn();
const create = vi.fn(() => fire);
const defaultConfetti = vi.fn();
vi.mock('canvas-confetti', () => ({
  default: Object.assign(defaultConfetti, { create }),
}));

const attrs = new Set<string>();
vi.stubGlobal('document', {
  documentElement: { hasAttribute: (name: string) => attrs.has(name) },
});

const { celebrateSmall, celebrateGoal, celebrateAllPrayers } = await import('./celebrate.js');

describe('celebrate', () => {
  beforeEach(() => {
    fire.mockClear();
    attrs.clear();
  });

  it('draws on the main thread, never through the blob: worker', () => {
    celebrateSmall();
    celebrateGoal();
    celebrateAllPrayers();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(undefined, { resize: true, useWorker: false });
    expect(fire).toHaveBeenCalledTimes(4);
    expect(defaultConfetti).not.toHaveBeenCalled();
  });

  it('does nothing under reduced motion', () => {
    attrs.add('data-reduce-motion');
    celebrateGoal();
    expect(fire).not.toHaveBeenCalled();
  });
});
