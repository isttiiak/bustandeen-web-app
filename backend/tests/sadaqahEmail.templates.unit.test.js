import {
  sadaqahRef,
  RECEIVED_SUBJECT,
  REPLY_SUBJECT,
  donationReceivedEmail,
} from '../src/services/sadaqahEmail.templates.js';

const ID_A = '6aacd15372631d0b79fcccd4';
const ID_B = '6aacd15472631d0b79fcccd8';

describe('sadaqahEmail.templates: per-donation subject ref', () => {
  test('two different donation ids produce two different subjects', () => {
    expect(RECEIVED_SUBJECT(ID_A)).not.toBe(RECEIVED_SUBJECT(ID_B));
    expect(REPLY_SUBJECT(ID_A)).not.toBe(REPLY_SUBJECT(ID_B));
  });

  test('the same donation id always produces the same subject (stable, not random)', () => {
    expect(RECEIVED_SUBJECT(ID_A)).toBe(RECEIVED_SUBJECT(ID_A));
  });

  test('REPLY_SUBJECT echoes the same ref as RECEIVED_SUBJECT, prefixed with "Re: "', () => {
    expect(REPLY_SUBJECT(ID_A)).toBe(`Re: ${RECEIVED_SUBJECT(ID_A)}`);
  });

  test('the subject carries a visible ref derived from the id', () => {
    const ref = sadaqahRef(ID_A);
    expect(RECEIVED_SUBJECT(ID_A)).toContain(`[#${ref}]`);
  });

  test('donationReceivedEmail uses RECEIVED_SUBJECT(id) as its subject', () => {
    const email = donationReceivedEmail({
      id: ID_A,
      donorName: 'A Donor',
      amount: 500,
      transactionId: 'TXN123',
    });
    expect(email.subject).toBe(RECEIVED_SUBJECT(ID_A));
  });

  test('two donations from the same donor still get distinct subjects', () => {
    const first = donationReceivedEmail({
      id: ID_A,
      donorName: 'Same Donor',
      amount: 100,
      transactionId: 'TXN1',
    });
    const second = donationReceivedEmail({
      id: ID_B,
      donorName: 'Same Donor',
      amount: 200,
      transactionId: 'TXN2',
    });
    expect(first.subject).not.toBe(second.subject);
  });
});
