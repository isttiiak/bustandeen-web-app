import {
  submitZikrRequestSchema,
  approveZikrRequestSchema,
  updateLibraryItemSchema,
} from '../src/validation/zikrRequest.schemas.js';

// Audit 2026-11-16 P2-7: z.string().url() accepts any scheme, so a suggestion (or an admin
// edit, which had no URL check at all) could carry javascript:, data: or http: links that
// the app then rendered as a clickable source link.

const submit = (sourceUrl) =>
  submitZikrRequestSchema.safeParse({ body: { name: 'Dhikr', sourceUrl } });
const approve = (sourceUrl) =>
  approveZikrRequestSchema.safeParse({
    body: {
      name: 'Dhikr',
      arabic: 'ذكر',
      meaning: 'Remembrance',
      source: 'Muslim',
      sourceUrl,
      emailBody: 'Thank you',
    },
  });
const edit = (sourceUrl) =>
  updateLibraryItemSchema.safeParse({ params: { id: 'abc' }, body: { sourceUrl } });

const BAD = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'http://sunnah.com/muslim:2698',
  'ftp://sunnah.com/x',
  '//sunnah.com/x',
  'sunnah.com/muslim:2698',
  'https://user:pass@sunnah.com/x',
  'https://sunnah.com/a b',
  'https://sunnah.com/\nx',
];
const GOOD = ['https://sunnah.com/muslim:2698', 'https://quran.com/2/255?translations=20'];

describe('source links must be https', () => {
  test.each(BAD)('a suggestion refuses %j', (u) => {
    expect(submit(u).success).toBe(false);
  });
  test.each(BAD)('approval refuses %j', (u) => {
    expect(approve(u).success).toBe(false);
  });
  test.each(BAD)('a library edit refuses %j', (u) => {
    expect(edit(u).success).toBe(false);
  });

  test.each(GOOD)('https links are accepted: %s', (u) => {
    expect(submit(u).success).toBe(true);
    expect(approve(u).success).toBe(true);
    expect(edit(u).success).toBe(true);
  });

  test('a suggestion may leave the link out or empty', () => {
    expect(submit(undefined).success).toBe(true);
    expect(submit('').success).toBe(true);
  });

  test('a library edit may leave the link unchanged but not blank it', () => {
    expect(
      updateLibraryItemSchema.safeParse({ params: { id: 'a' }, body: { name: 'x' } }).success
    ).toBe(true);
    expect(edit('').success).toBe(false);
  });
});
