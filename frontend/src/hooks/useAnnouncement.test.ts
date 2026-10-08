import { describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('../lib/api.js', () => ({ default: { get } }));

const { fetchActiveAnnouncement } = await import('./useAnnouncement.js');
const { getDemoResponse } = await import('../utils/demoData.js');

describe('fetchActiveAnnouncement', () => {
  it('returns null (never undefined) when the reply has no announcement field', async () => {
    get.mockResolvedValueOnce({ data: { ok: true } });
    await expect(fetchActiveAnnouncement()).resolves.toBeNull();
  });

  it('returns the announcement when there is one', async () => {
    const a = { id: 'a1', title: 'T', body: 'B' };
    get.mockResolvedValueOnce({ data: { ok: true, announcement: a } });
    await expect(fetchActiveAnnouncement()).resolves.toEqual(a);
  });

  it('demo mode answers the endpoint with an explicit null', () => {
    expect(getDemoResponse('/api/announcements/active', 'get')).toEqual({
      ok: true,
      announcement: null,
    });
  });
});
