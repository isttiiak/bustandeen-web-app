import { describe, it, expect } from 'vitest';
import layout from '../components/AdminLayout.tsx?raw';
import gate from '../components/AdminGate.tsx?raw';
import home from './AdminHome.tsx?raw';
import users from './AdminUsers.tsx?raw';
import userDetail from './AdminUserDetail.tsx?raw';
import accounts from './AdminAccounts.tsx?raw';
import auditLog from './AdminAuditLog.tsx?raw';
import feedback from './AdminFeedback.tsx?raw';
import broadcast from './AdminBroadcast.tsx?raw';
import compose from './AdminComposeEmail.tsx?raw';
import zikrRequests from './AdminZikrRequests.tsx?raw';
import sadaqah from './AdminSadaqah.tsx?raw';
import opsHealth from './AdminOpsHealth.tsx?raw';
import updateEmails from '../components/AdminUpdateEmails.tsx?raw';
import reauthDialog from '../components/admin/AdminReauthDialog.tsx?raw';
import passwordDialog from '../components/admin/AdminPasswordDialog.tsx?raw';

// T3.2 Admin pages (staff only, English only): one arch hero per screen via
// AdminHero, shared card/button classes, SVG icons, readable ink (no ink
// below /70), theme tokens and no em dashes in the visible copy. Every
// admin page and shared admin component is listed here.
const DASH_OR_EMOJI = /—|\p{Extended_Pictographic}|[✓✔←→↗]/u;
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

const FILES: Record<string, string> = {
  AdminLayout: layout,
  AdminGate: gate,
  AdminHome: home,
  AdminUsers: users,
  AdminUserDetail: userDetail,
  AdminAccounts: accounts,
  AdminAuditLog: auditLog,
  AdminFeedback: feedback,
  AdminBroadcast: broadcast,
  AdminComposeEmail: compose,
  AdminZikrRequests: zikrRequests,
  AdminUpdateEmails: updateEmails,
  AdminSadaqah: sadaqah,
  AdminOpsHealth: opsHealth,
  AdminReauthDialog: reauthDialog,
  AdminPasswordDialog: passwordDialog,
};
const SCREENS: Record<string, string> = {
  AdminHome: home,
  AdminUsers: users,
  AdminUserDetail: userDetail,
  AdminAccounts: accounts,
  AdminAuditLog: auditLog,
  AdminFeedback: feedback,
  AdminBroadcast: broadcast,
  AdminComposeEmail: compose,
  AdminZikrRequests: zikrRequests,
  AdminSadaqah: sadaqah,
  AdminOpsHealth: opsHealth,
};

describe('admin screens', () => {
  it.each(Object.entries(FILES))('%s: no emoji, em dash, faint ink or old styles', (_n, code) => {
    const src = stripComments(code);
    expect(src).not.toMatch(DASH_OR_EMOJI);
    expect(src).not.toMatch(/text-white\/([1-9]|[1-5]\d|6\d)\b/);
    expect(src).not.toMatch(/bg-white\/|rounded-(lg|xl|2xl|3xl)\b|font-black|backdrop-blur/);
    expect(src).not.toMatch(/rgba\(|#[0-9a-fA-F]{3,8}\b|red-500|shadow-\[0_0_|base-[23]00/);
    expect(src).not.toMatch(/className="(card|btn)\b|\bbtn btn-/);
  });

  it.each(Object.entries(SCREENS))('%s: one AdminHero', (_n, code) => {
    expect(code.match(/<AdminHero\b/g)).toHaveLength(1);
  });
});

// U8 production check: the reject email box said "leave blank to send
// nothing" but came pre-filled, so a rejection email went out by default.
describe('zikr request reject email', () => {
  it('starts blank; the draft is only fetched for Approve or on purpose', () => {
    const start = zikrRequests.slice(
      zikrRequests.indexOf('const startReview'),
      zikrRequests.indexOf('const cancel')
    );
    expect(start).toMatch(/if \(type === 'approving'\) loadDraft\('approved'\)/);
    expect(start).not.toMatch(/'rejected'/);
    expect(zikrRequests).toMatch(/onClick=\{\(\) => loadDraft\('rejected'\)\}/);
    expect(zikrRequests).toContain('Reject without email');
  });
});
