import { describe, expect, it } from 'vitest';
import { auditDetails, AUDIT_DETAIL_MAX } from './adminAuditDetails.js';

describe('auditDetails (U8.6)', () => {
  it('is empty without metadata', () => {
    expect(auditDetails(undefined)).toBe('');
    expect(auditDetails({})).toBe('');
  });

  it('joins key: value pairs and skips empty ones', () => {
    expect(auditDetails({ amount: 500, description: 'Hosting', note: '', x: null })).toBe(
      'amount: 500 · description: Hosting'
    );
  });

  it('shows booleans and objects', () => {
    expect(auditDetails({ emailFailed: true, sent: { a: 1 } })).toBe(
      'emailFailed: true · sent: {"a":1}'
    );
  });

  it('cuts long values', () => {
    const out = auditDetails({ subject: 'x'.repeat(AUDIT_DETAIL_MAX + 50) });
    expect(out).toBe(`subject: ${'x'.repeat(AUDIT_DETAIL_MAX)}…`);
  });
});
