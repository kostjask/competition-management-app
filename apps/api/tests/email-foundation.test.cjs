const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomBytes, randomUUID } = require('node:crypto');
process.env.NODE_ENV = 'test'; process.env.EMAIL_PROVIDER = 'fake';
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.EMAIL_FROM = 'mail-tests@example.invalid';
const { renderEmail } = require('../dist/services/emailTemplates.js');
const { encryptEmail, decryptEmail } = require('../dist/services/emailQueue.js');
const { ResendProvider, FakeEmailProvider } = require('../dist/services/emailProvider.js');
const { assertStaffScope, recipientLocale, invitationState } = require('../dist/services/staffPolicy.js');

test('all transactional templates have recipient language, escaped links and truthful decision copy', () => {
  for (const locale of ['et', 'en', 'ru']) for (const kind of ['verification', 'invitation', 'recovery', 'applicationApproved', 'applicationRejected']) {
    const message = renderEmail({ to: 'recipient@example.invalid', locale, kind, token: 'secret<&"' }, 'https://stage.example.invalid');
    assert.match(message.html, new RegExp('lang="' + locale + '"'));
    assert.ok(message.subject); assert.ok(message.text); assert.ok(!message.html.includes('secret<&"'));
    assert.ok(message.text.includes('https://stage.example.invalid/'));
    assert.ok(message.text.includes('lang=' + locale));
  }
  assert.equal(recipientLocale(undefined, 'ru'), 'ru'); assert.equal(recipientLocale('en', 'ru'), 'en');
  assert.equal(recipientLocale(), 'et');
});

test('queued payload encryption authenticates the delivery identity and rejects tampering', () => {
  const key = randomBytes(32).toString('hex'); const id = randomUUID();
  const content = { from: 'sender@example.invalid', message: { to: 'private@example.invalid', subject: 'Recovery', text: 'private-secret', html: '<p>private-secret</p>' } };
  const encrypted = encryptEmail(content, id, key);
  assert.ok(!encrypted.includes(content.message.to)); assert.ok(!encrypted.includes(content.message.text));
  assert.deepEqual(decryptEmail(encrypted, id, key), content);
  assert.throws(() => decryptEmail(encrypted, randomUUID(), key));
  assert.throws(() => decryptEmail(encrypted, id, randomBytes(32).toString('hex')));
  assert.notEqual(encryptEmail(content, id, key), encrypted);
});

test('Resend uses fixed HTTPS, timeout and idempotency and conceals provider errors', async () => {
  const message = { to: 'private@example.invalid', subject: 'Subject', text: 'Body', html: '<p>Body</p>' };
  const calls = [];
  const provider = new ResendProvider('re_private', 'sender@example.invalid', async (url, init) => {
    calls.push({ url, init }); return Response.json({ id: 'provider-receipt' });
  });
  assert.equal(await provider.send(message, 'delivery-id'), 'provider-receipt');
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers['Idempotency-Key'], 'delivery-id');
  assert.deepEqual(JSON.parse(calls[0].init.body).to, [message.to]);
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  for (const transport of [async () => Response.json({ private: message.to }, { status: 429 }), async () => { throw new Error(message.to); }, async () => Response.json({})]) {
    await assert.rejects(new ResendProvider('re_private', 'sender@example.invalid', transport).send(message, 'same-id'), { message: 'Email provider acceptance unconfirmed' });
  }
  assert.equal(await new FakeEmailProvider().send(message, 'id'), 'fake-id');
  const { spawnSync } = require('node:child_process');
  const configuration = { ...process.env, EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_fixture_configuration',
    EMAIL_QUEUE_KEY: randomBytes(32).toString('hex'), WEB_ORIGIN: 'https://stage.example.invalid' };
  const check = changes => spawnSync(process.execPath, ['-e', "require('./dist/config/env.js')"], {
    env: { ...configuration, ...changes }, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(check({}).status, 0);
  for (const changes of [{ EMAIL_PROVIDER: 'smtp' }, { RESEND_API_KEY: '' }, { EMAIL_QUEUE_KEY: '' },
    { WEB_ORIGIN: 'http://stage.example.invalid' }, { WEB_ORIGIN: 'https://stage.example.invalid/path' }, { WEB_ORIGIN: 'invalid' }]) {
    const result = check(changes); assert.notEqual(result.status, 0);
    assert.ok(!result.stderr.includes(configuration.RESEND_API_KEY));
    assert.ok(!result.stderr.includes(configuration.EMAIL_QUEUE_KEY));
  }
});

test('staff scope rejects arbitrary/global/studio roles and lifecycle distinguishes accepted access', () => {
  for (const row of [
    { roleId: null, roleKey: 'judge', eventId: 'event', studioId: null },
    { roleId: 'role', roleKey: 'judge', eventId: null, studioId: null },
    { roleId: 'role', roleKey: 'admin', eventId: 'event', studioId: null },
    { roleId: 'role', roleKey: 'representative', eventId: 'event', studioId: 'studio' },
  ]) assert.throws(() => assertStaffScope(row));
  assert.doesNotThrow(() => assertStaffScope({ roleId: 'role', roleKey: 'moderator', eventId: 'event', studioId: null }));
  const row = { usedAt: null, revokedAt: null, supersededAt: null, expiresAt: new Date(Date.now() + 10000) };
  assert.equal(invitationState(row), 'PENDING');
  assert.equal(invitationState({ ...row, revokedAt: new Date() }), 'REVOKED');
  assert.equal(invitationState({ ...row, expiresAt: new Date(0) }), 'EXPIRED');
  assert.equal(invitationState({ ...row, usedAt: new Date(), revokedAt: new Date() }), 'ACCEPTED');
});
