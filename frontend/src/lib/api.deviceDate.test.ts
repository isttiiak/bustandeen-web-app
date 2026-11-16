import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

// Audit 2026-11-16 P0-3: a 400 for a wrong device date must tell the person so.

vi.hoisted(() => {
  const m = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
    },
  });
});

const toastError = vi.hoisted(() => vi.fn());
vi.mock('react-hot-toast', () => ({ default: { error: toastError, success: vi.fn() } }));

const { default: api } = await import('./api.js');

function answer(status: number, data: unknown) {
  api.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    const response = { data, status, statusText: '', headers: new AxiosHeaders(), config };
    if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, null, response);
    return response;
  });
}

const wrongDate = {
  ok: false,
  error: 'Validation failed',
  code: 'client_day_mismatch',
  details: [{ path: 'query.today', message: "This date does not match today's date." }],
};

describe('wrong device date in the API client', () => {
  beforeEach(() => toastError.mockClear());

  it('shows one message with a fixed id and still rejects the request', async () => {
    answer(400, wrongDate);
    await expect(api.get('/api/salat?today=2099-01-01')).rejects.toBeInstanceOf(AxiosError);
    await expect(api.get('/api/zikr/summary?today=2099-01-01')).rejects.toBeInstanceOf(AxiosError);
    expect(toastError).toHaveBeenCalledTimes(2);
    expect(toastError.mock.calls[0]![1]).toMatchObject({ id: 'device-date' });
    expect(String(toastError.mock.calls[0]![0])).toMatch(/date on your device/i);
  });

  it('is silent for any other 400', async () => {
    answer(400, { ok: false, error: 'Validation failed', details: [] });
    await expect(api.get('/api/anything')).rejects.toBeInstanceOf(AxiosError);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('is silent when the code appears on a non-400', async () => {
    answer(500, wrongDate);
    await expect(api.get('/api/anything')).rejects.toBeInstanceOf(AxiosError);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('the message exists in English and in Bangla script', () => {
    const load = (lang: string) =>
      JSON.parse(
        readFileSync(new URL(`../locales/${lang}/common.json`, import.meta.url), 'utf8').replace(
          /^\uFEFF/,
          ''
        )
      ) as { common: { deviceDateWrong?: string } };
    expect(load('en').common.deviceDateWrong).toMatch(/date on your device/i);
    expect(load('bn').common.deviceDateWrong).toMatch(/[\u0980-\u09FF]/);
    expect(load('bn').common.deviceDateWrong).not.toMatch(/[A-Za-z]/); // no romanised Bangla
  });
});
