import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import {
  parseReports,
  originOnly,
  recordReports,
  resetCounts,
} from '../src/services/cspReport.service.js';

// Audit SEC-02: the SPA ships a Report-Only CSP whose reports land here. The
// endpoint must accept both browser formats, keep only origins (never page
// paths, which can be private areas like /cycle), and answer 204.

describe('CSP report endpoint', () => {
  let warn;

  beforeEach(() => {
    resetCounts();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => warn.mockRestore());

  test('legacy report-uri format → 204, logged with origins only', async () => {
    const res = await request(app)
      .post('/api/csp-report')
      .set('Content-Type', 'application/csp-report')
      .send(
        JSON.stringify({
          'csp-report': {
            'document-uri': 'https://bustandeen.com/cycle?day=2026-10-01',
            'effective-directive': 'script-src-elem',
            'blocked-uri': 'https://evil.example.com/steal.js?uid=123',
            'source-file': 'https://bustandeen.com/assets/index.js',
            'script-sample': 'secret',
            disposition: 'report',
          },
        })
      );

    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
    const line = warn.mock.calls[0][0];
    expect(JSON.parse(line)).toMatchObject({
      type: 'csp-violation',
      directive: 'script-src-elem',
      blocked: 'https://evil.example.com',
      source: 'https://bustandeen.com',
      count: 1,
    });
    expect(line).not.toContain('/cycle');
    expect(line).not.toContain('uid=123');
    expect(line).not.toContain('secret');
  });

  test('Reporting API batch format is accepted', async () => {
    const res = await request(app)
      .post('/api/csp-report')
      .set('Content-Type', 'application/reports+json')
      .send(
        JSON.stringify([
          { type: 'csp-violation', body: { effectiveDirective: 'img-src', blockedURL: 'data' } },
          { type: 'deprecation', body: {} },
        ])
      );
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(warn.mock.calls[0][0]).blocked).toBe('data');
  });

  test('repeats are aggregated: logged at 1, 10 and 100 occurrences', () => {
    const report = {
      'csp-report': { 'effective-directive': 'connect-src', 'blocked-uri': 'https://x.dev/a' },
    };
    for (let i = 0; i < 100; i += 1) recordReports(report);
    expect(warn.mock.calls.map((c) => JSON.parse(c[0]).count)).toEqual([1, 10, 100]);
    expect(parseReports(report)).toHaveLength(1);
  });

  test('garbage bodies are ignored', async () => {
    const res = await request(app).post('/api/csp-report').send({ hello: 'world' });
    expect(res.status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
    expect(originOnly('inline')).toBe('inline');
    expect(originOnly('not a url')).toBe('other');
  });

  test('the API CSP allows nothing to load (and no longer lists api.groq.com)', async () => {
    const res = await request(app).get('/api/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('groq');
    expect(csp).not.toContain('font-src');
    expect(csp).not.toContain('https:');
  });
});
