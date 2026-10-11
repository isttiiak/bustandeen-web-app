// Ensure DEV_AUTH_BYPASS for tests and reduce noisy logs
process.env.DEV_AUTH_BYPASS = process.env.DEV_AUTH_BYPASS || '1';

// Rayhanah field encryption (utils/fieldCrypto.ts) needs a real 32-byte key
// to encrypt/decrypt CycleDay content — any valid key works in tests since
// nothing here depends on data surviving across runs.
process.env.FIELD_ENCRYPTION_KEY =
  process.env.FIELD_ENCRYPTION_KEY || (await import('crypto')).randomBytes(32).toString('base64');

// Use fast MongoDB Memory Server settings to avoid large downloads repeatedly
// Prefer SYSTEM binaries if available to skip download
process.env.MONGOMS_DOWNLOAD_MIRROR =
  process.env.MONGOMS_DOWNLOAD_MIRROR || 'https://fastdl.mongodb.org/';
process.env.MONGOMS_USE_SYSTEM_BINARY = process.env.MONGOMS_USE_SYSTEM_BINARY || '0';

// Silence Mongoose strictQuery deprecation warnings in tests
try {
  const mongoose = (await import('mongoose')).default;
  mongoose.set('strictQuery', true);
} catch {}

// Extend Jasmine/Jest timeout if Jasmine is present
if (typeof jasmine !== 'undefined') {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = Math.max(jasmine.DEFAULT_TIMEOUT_INTERVAL || 5000, 120000);
}

// Admin second factor (T1.4). Every admin route needs an enrolled account and
// a valid X-Admin-MFA proof. So the existing admin suites keep testing what
// they test, admin accounts seeded with AdminAccount.create count as enrolled
// unless they pass totpSecretEnc themselves, and a request that sets a
// dev-bypass X-Admin-Token gets a matching proof (mfaVersion 0) unless it sets
// X-Admin-MFA itself afterwards (tests/adminMfa.e2e.test.js does, incl. '').
{
  const { default: AdminAccount } = await import('../src/models/AdminAccount.js');
  const { issueMfaProof } = await import('../src/utils/adminMfaProof.js');
  const { Test } = await import('supertest');

  const enrolled = (doc) =>
    doc && typeof doc === 'object' && !('totpSecretEnc' in doc)
      ? { ...doc, totpSecretEnc: 'test-enrolled' }
      : doc;
  const originalCreate = AdminAccount.create.bind(AdminAccount);
  AdminAccount.create = (docs, ...rest) =>
    originalCreate(Array.isArray(docs) ? docs.map(enrolled) : enrolled(docs), ...rest);

  const originalSet = Test.prototype.set;
  Test.prototype.set = function (field, value) {
    const result = originalSet.call(this, field, value);
    if (typeof field === 'string' && field.toLowerCase() === 'x-admin-token') {
      try {
        const body = JSON.parse(Buffer.from(String(value).split('.')[1], 'base64url').toString());
        if (typeof body.uid === 'string')
          originalSet.call(this, 'X-Admin-MFA', issueMfaProof(body.uid, 0));
      } catch {
        /* not a decodable token: no proof, the request fails as it would */
      }
    }
    return result;
  };
}
