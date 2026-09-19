import {
  donationReceivedEmail,
  donationVerifiedDraft,
  donationRejectedDraft,
} from '../src/services/sadaqahEmail.templates.js';
import {
  zikrRequestReceivedEmail,
  zikrRequestApprovedDraft,
  zikrRequestRejectedDraft,
  zikrRequestDuplicateRejectedDraft,
  zikrLibraryLinkLine,
  RECEIVED_SUBJECT as ZIKR_RECEIVED_SUBJECT,
} from '../src/services/zikrRequestEmail.templates.js';
import {
  feedbackReceivedText,
  RECEIVED_SUBJECT as FEEDBACK_RECEIVED_SUBJECT,
} from '../src/services/feedbackEmail.templates.js';
import { welcomeEmail, WELCOME_SUBJECT } from '../src/services/welcomeEmail.templates.js';
import { reengagementDraft, REENGAGEMENT_SUBJECT } from '../src/services/userEmail.templates.js';
import { insertAboveSignOff, EMAIL_TAGLINE } from '../src/services/emailBrand.js';

const ID = '64b7f0c2a1b2c3d4e5f60718';
const donation = { donorName: 'Amina', amount: 500, transactionId: 'TX123' };

const bodies = {
  donationReceived: donationReceivedEmail({ ...donation, id: ID }).text,
  donationVerified: donationVerifiedDraft({
    ...donation,
    paymentMethod: 'bkash',
    transactionDate: new Date('2026-09-01T00:00:00Z'),
  }),
  donationRejected: donationRejectedDraft(donation),
  zikrReceived: zikrRequestReceivedEmail({ id: ID, name: 'Ayat al-Kursi' }).text,
  zikrApproved: zikrRequestApprovedDraft({ name: 'Ayat al-Kursi' }),
  zikrRejected: zikrRequestRejectedDraft({ name: 'Ayat al-Kursi' }),
  zikrDuplicate: zikrRequestDuplicateRejectedDraft({ name: 'X', existingLibraryItemId: 'abc' }),
  feedbackReceived: feedbackReceivedText('feedback'),
  contactReceived: feedbackReceivedText('contact'),
  welcome: welcomeEmail({ name: 'Amina' }).text,
  reengagement: reengagementDraft({ name: 'Amina', daysInactive: 14 }),
};

const subjects = [
  WELCOME_SUBJECT,
  REENGAGEMENT_SUBJECT,
  ZIKR_RECEIVED_SUBJECT(ID),
  FEEDBACK_RECEIVED_SUBJECT('feedback', ID),
  FEEDBACK_RECEIVED_SUBJECT('contact', ID),
];

describe('Predefined email copy', () => {
  test.each(Object.entries(bodies))('%s ends with the tagline', (_name, text) => {
    expect(text.trimEnd().endsWith(EMAIL_TAGLINE)).toBe(true);
  });

  test.each(Object.entries(bodies))('%s has no em or en dashes', (_name, text) => {
    expect(text).not.toMatch(/[–—]/);
  });

  test('subjects have no em or en dashes', () => {
    for (const s of subjects) expect(s).not.toMatch(/[–—]/);
  });

  test('welcome HTML also closes with the tagline and has no em dash', () => {
    const { html } = welcomeEmail({});
    expect(html).toContain(EMAIL_TAGLINE);
    expect(html).not.toMatch(/[–—]/);
  });

  test('insertAboveSignOff keeps the tagline last', () => {
    const out = insertAboveSignOff(bodies.zikrApproved, zikrLibraryLinkLine('abc'));
    expect(out.trimEnd().endsWith(EMAIL_TAGLINE)).toBe(true);
    expect(out.indexOf('zikr-lib-abc')).toBeLessThan(out.indexOf('Warm regards,'));
  });

  test('insertAboveSignOff appends when the admin removed the sign-off', () => {
    expect(insertAboveSignOff('Short note.', 'LINK')).toBe('Short note.\n\nLINK');
  });
});
