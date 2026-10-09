import { describe, it, expect } from 'vitest';
import layout from '../components/AdminLayout.tsx?raw';
import gate from '../components/AdminGate.tsx?raw';
import home from './AdminHome.tsx?raw';
import users from './AdminUsers.tsx?raw';
import userDetail from './AdminUserDetail.tsx?raw';
import accounts from './AdminAccounts.tsx?raw';
import auditLog from './AdminAuditLog.tsx?raw';

// T3.2 Admin pages (staff only, English only): one arch hero per screen via
// AdminHero, shared card/button classes, SVG icons, readable ink (no ink
// below /70), theme tokens and no em dashes in the visible copy. Each admin
// page group adds its files here as it is redesigned.
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
};
const SCREENS: Record<string, string> = {
  AdminHome: home,
  AdminUsers: users,
  AdminUserDetail: userDetail,
  AdminAccounts: accounts,
  AdminAuditLog: auditLog,
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
