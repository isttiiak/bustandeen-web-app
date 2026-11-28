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
import references from './AdminReferences.tsx?raw';
import compose from './AdminComposeEmail.tsx?raw';
import zikrRequests from './AdminZikrRequests.tsx?raw';
import sadaqah from './AdminSadaqah.tsx?raw';
import sadaqahPending from '../components/admin/sadaqah/PendingCard.tsx?raw';
import sadaqahSubmissions from '../components/admin/sadaqah/SubmissionsTab.tsx?raw';
import sadaqahExpenses from '../components/admin/sadaqah/ExpensesTab.tsx?raw';
import sadaqahQuarterly from '../components/admin/sadaqah/QuarterlyPublisher.tsx?raw';
import sadaqahDonorEmail from '../components/admin/sadaqah/DonorEmailAction.tsx?raw';
import sadaqahAnalytics from '../components/admin/sadaqah/AnalyticsTab.tsx?raw';
import sadaqahUtils from '../components/admin/sadaqah/adminSadaqahUtils.ts?raw';
import opsHealth from './AdminOpsHealth.tsx?raw';
import updateEmails from '../components/AdminUpdateEmails.tsx?raw';
import reauthDialog from '../components/admin/AdminReauthDialog.tsx?raw';
import passwordDialog from '../components/admin/AdminPasswordDialog.tsx?raw';
import dailyActivity from '../components/admin/DailyActivityPanel.tsx?raw';
import mfaStep from '../components/admin/AdminMfaStep.tsx?raw';
import founderMailbox from '../components/FounderMailbox.tsx?raw';

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
  AdminReferences: references,
  AdminComposeEmail: compose,
  AdminZikrRequests: zikrRequests,
  AdminUpdateEmails: updateEmails,
  AdminSadaqah: sadaqah,
  // The Sadaqah admin tabs, cut out of the page (audit P4-1).
  AdminSadaqahPendingCard: sadaqahPending,
  AdminSadaqahSubmissionsTab: sadaqahSubmissions,
  AdminSadaqahExpensesTab: sadaqahExpenses,
  AdminSadaqahQuarterlyPublisher: sadaqahQuarterly,
  AdminSadaqahDonorEmailAction: sadaqahDonorEmail,
  AdminSadaqahAnalyticsTab: sadaqahAnalytics,
  AdminSadaqahUtils: sadaqahUtils,
  AdminOpsHealth: opsHealth,
  AdminReauthDialog: reauthDialog,
  AdminPasswordDialog: passwordDialog,
  DailyActivityPanel: dailyActivity,
  AdminMfaStep: mfaStep,
  FounderMailbox: founderMailbox,
};
const SCREENS: Record<string, string> = {
  AdminHome: home,
  AdminUsers: users,
  AdminUserDetail: userDetail,
  AdminAccounts: accounts,
  AdminAuditLog: auditLog,
  AdminFeedback: feedback,
  AdminBroadcast: broadcast,
  AdminReferences: references,
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

// Reference checks (v5.193.0): clearing a public mark asks first.
describe('reference checks', () => {
  it('Clear goes through the confirm dialog, never straight from the select', () => {
    expect(references).toMatch(/else if \(m\) setToClear\(r\)/);
    expect(references).not.toMatch(/onChange=\{[^}]*clear\.mutate/);
    expect(references).toContain('<ConfirmDialog');
  });
});

// Audit P2-8: the irreversible or public-facing admin buttons ask first, and a past banner can be
// reopened as a new, editable one.
describe('admin confirmations and reopen', () => {
  it('broadcast: Deactivate asks first, never calls the mutation straight from the click', () => {
    expect(broadcast).not.toMatch(/onClick=\{\(\) => deactivate\.mutate/);
    expect(broadcast).toMatch(/window\.confirm\(/);
    expect(broadcast).toMatch(/onClick=\{\(\) => stop\(a\)\}/);
  });

  it('broadcast: Reopen as new copies the old text into the form and publishes as a new banner', () => {
    expect(broadcast).toContain('Reopen as new');
    expect(broadcast).toMatch(/setForm\(\{ title: a\.title, body: a\.body \}\)/);
    expect(broadcast).toMatch(/onClick=\{\(\) => reopen\(a\)\}/);
  });

  it('quarterly report: publish, unpublish and delete each ask first', () => {
    // The publisher lives in components/admin/sadaqah/ (audit P4-1).
    expect(sadaqahQuarterly).not.toMatch(
      /onClick=\{\(\) => (publish|unpublish|deleteQuarterly)\.mutate/
    );
    for (const handler of ['confirmPublish', 'publishListed', 'unpublishListed', 'deleteListed']) {
      const body = sadaqahQuarterly.slice(sadaqahQuarterly.indexOf(`const ${handler} =`));
      expect(body.slice(0, 400), handler).toMatch(/ask\(/);
    }
    expect(sadaqahQuarterly).toMatch(/window\.confirm\(/);
  });
});
