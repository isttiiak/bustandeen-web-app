// Emulator tests for ../storage.rules (audit SEC-04).
// Run: cd firebase && npm test   (needs Java 21 for the emulator)
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

let env;
const jpeg = (bytes = 2048) => new Uint8Array(bytes);
const asJpeg = { contentType: 'image/jpeg' };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bustandeen',
    storage: {
      rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearStorage());

const storageAs = (uid) =>
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage();

test('a user uploads and replaces their own profile photo', async () => {
  const s = storageAs('alice');
  await assertSucceeds(uploadBytes(ref(s, 'profile-photos/alice.jpg'), jpeg(), asJpeg));
  await assertSucceeds(uploadBytes(ref(s, 'profile-photos/alice.jpg'), jpeg(4096), asJpeg));
});

test("nobody writes someone else's photo", async () => {
  await assertFails(
    uploadBytes(ref(storageAs('mallory'), 'profile-photos/alice.jpg'), jpeg(), asJpeg)
  );
});

test('signed-out uploads are refused', async () => {
  await assertFails(uploadBytes(ref(storageAs(null), 'profile-photos/alice.jpg'), jpeg(), asJpeg));
});

test('only JPEGs, only under 1 MB', async () => {
  const s = storageAs('alice');
  await assertFails(
    uploadBytes(ref(s, 'profile-photos/alice.jpg'), jpeg(), { contentType: 'image/png' })
  );
  await assertFails(uploadBytes(ref(s, 'profile-photos/alice.jpg'), jpeg(1024 * 1024), asJpeg));
  await assertSucceeds(
    uploadBytes(ref(s, 'profile-photos/alice.jpg'), jpeg(1024 * 1024 - 1), asJpeg)
  );
});

test('only the {uid}.jpg name is writable', async () => {
  const s = storageAs('alice');
  await assertFails(uploadBytes(ref(s, 'profile-photos/alice.png'), jpeg(), asJpeg));
  await assertFails(uploadBytes(ref(s, 'profile-photos/alice.jpg.exe'), jpeg(), asJpeg));
});

test('signed-in users can read photos; signed-out SDK reads are refused', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'profile-photos/alice.jpg'), jpeg(), asJpeg);
  });
  await assertSucceeds(getBytes(ref(storageAs('bob'), 'profile-photos/alice.jpg')));
  await assertFails(getBytes(ref(storageAs(null), 'profile-photos/alice.jpg')));
});

test('only the owner deletes their photo', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'profile-photos/alice.jpg'), jpeg(), asJpeg);
  });
  await assertFails(deleteObject(ref(storageAs('bob'), 'profile-photos/alice.jpg')));
  await assertSucceeds(deleteObject(ref(storageAs('alice'), 'profile-photos/alice.jpg')));
});

test('everything outside profile-photos is closed', async () => {
  const s = storageAs('alice');
  await assertFails(uploadBytes(ref(s, 'uploads/alice.jpg'), jpeg(), asJpeg));
  await assertFails(uploadBytes(ref(s, 'alice.jpg'), jpeg(), asJpeg));
  await assertFails(getBytes(ref(s, 'anything/else.txt')));
});
