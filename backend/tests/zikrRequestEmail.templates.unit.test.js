import {
  zikrRequestRef,
  RECEIVED_SUBJECT,
  APPROVED_SUBJECT,
  REJECTED_SUBJECT,
  zikrRequestReceivedEmail,
  zikrRequestNotifyAdminEmail,
} from '../src/services/zikrRequestEmail.templates.js';

const ID_A = '6aacd15372631d0b79fcccd4';
const ID_B = '6aacd15472631d0b79fcccd8';

describe('zikrRequestEmail.templates: per-request subject ref', () => {
  test('two different request ids produce two different subjects', () => {
    expect(RECEIVED_SUBJECT(ID_A)).not.toBe(RECEIVED_SUBJECT(ID_B));
    expect(APPROVED_SUBJECT(ID_A)).not.toBe(APPROVED_SUBJECT(ID_B));
    expect(REJECTED_SUBJECT(ID_A)).not.toBe(REJECTED_SUBJECT(ID_B));
  });

  test('APPROVED_SUBJECT and REJECTED_SUBJECT both echo RECEIVED_SUBJECT for the same id', () => {
    expect(APPROVED_SUBJECT(ID_A)).toBe(`Re: ${RECEIVED_SUBJECT(ID_A)}`);
    expect(REJECTED_SUBJECT(ID_A)).toBe(`Re: ${RECEIVED_SUBJECT(ID_A)}`);
  });

  test('the subject carries a visible ref derived from the id', () => {
    const ref = zikrRequestRef(ID_A);
    expect(RECEIVED_SUBJECT(ID_A)).toContain(`[#${ref}]`);
  });

  test('zikrRequestReceivedEmail uses RECEIVED_SUBJECT(id) as its subject', () => {
    const email = zikrRequestReceivedEmail({ id: ID_A, name: 'Suggested Dua' });
    expect(email.subject).toBe(RECEIVED_SUBJECT(ID_A));
  });

  test('two requests with the identical name still get distinct subjects', () => {
    const first = zikrRequestReceivedEmail({ id: ID_A, name: 'Same Name' });
    const second = zikrRequestReceivedEmail({ id: ID_B, name: 'Same Name' });
    expect(first.subject).not.toBe(second.subject);
  });

  test('the admin-notify subject also carries the ref, so two same-name/category requests do not merge', () => {
    const data = { name: 'Same Name', meaning: undefined };
    const first = zikrRequestNotifyAdminEmail(data, ID_A);
    const second = zikrRequestNotifyAdminEmail(data, ID_B);
    expect(first.subject).not.toBe(second.subject);
    expect(first.subject).toContain(`[#${zikrRequestRef(ID_A)}]`);
  });
});
