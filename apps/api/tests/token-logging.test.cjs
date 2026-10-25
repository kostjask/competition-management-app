const assert = require('node:assert/strict');
const { test } = require('node:test');
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
process.env.EMAIL_FROM = 'mail-tests@example.invalid';

test('email stub never logs secret delivery arguments', async t => {
  const email = require('../dist/utils/email.js');
  const output = [];
  for (const method of ['log', 'warn', 'error']) t.mock.method(console, method, (...args) => output.push(args));
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; });
  const data = { to: 'private@example.invalid', token: 'synthetic-secret', name: 'Private', roleKey: 'judge' };
  await email.sendVerificationEmail(data);
  await email.sendInvitationEmail(data);
  await email.sendPasswordRecoveryEmail(data);
  assert.deepEqual(output, []);
});

test('email stub rejects production delivery without logging arguments', async t => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const email = require('./dist/utils/email.js');
    (async () => {
      for (const send of [email.sendVerificationEmail, email.sendInvitationEmail, email.sendPasswordRecoveryEmail]) {
        await assert.rejects(send({ to: 'private@example.invalid', token: 'synthetic-secret', roleKey: 'judge' }),
          { message: 'Email delivery is unavailable' });
      }
    })().catch(() => { process.exitCode = 1; });
  `], { env: { ...process.env, NODE_ENV: 'production', DEV_AUTH: 'false', EMAIL_PROVIDER: 'fake' }, encoding: 'utf8' });
  assert.equal(result.status, 0, 'Production fake must refuse delivery');
  assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
});
