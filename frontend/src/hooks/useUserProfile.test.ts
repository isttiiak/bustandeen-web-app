import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { vi } from 'vitest';
import { requestError } from './useUserProfile.js';

// The hook module imports the auth store and the Axios instance; neither is used here.
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: { getState: () => ({}) } }));
vi.mock('../lib/api.js', () => ({ default: {} }));

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
const reply = (status: number, data: unknown) =>
  new AxiosError('fail', 'ERR', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });

describe('requestError', () => {
  it('reads the status and server message of a reply', () => {
    expect(requestError(reply(409, { ok: false, error: 'Already linked' }))).toEqual({
      status: 409,
      message: 'Already linked',
    });
  });

  it('marks a request with no reply as offline', () => {
    expect(requestError(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config))).toEqual({
      offline: true,
    });
  });

  it('says nothing about other errors (an ok: false reply)', () => {
    expect(requestError(new Error('No user in reply'))).toEqual({});
  });
});
