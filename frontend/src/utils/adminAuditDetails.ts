/** Longest value shown in the audit log's Details column before it is cut. */
export const AUDIT_DETAIL_MAX = 120;

const show = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
};

/**
 * An audit entry's metadata as one short line ("reason: spam · amount: 500"),
 * so the reason, subject or amount an admin recorded is visible without
 * opening the database. Empty values are left out; long ones are cut.
 */
export function auditDetails(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return '';
  return Object.entries(metadata)
    .map(([k, v]) => [k, show(v)] as const)
    .filter(([, v]) => v !== '')
    .map(
      ([k, v]) => `${k}: ${v.length > AUDIT_DETAIL_MAX ? `${v.slice(0, AUDIT_DETAIL_MAX)}…` : v}`
    )
    .join(' · ');
}
