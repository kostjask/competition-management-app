const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');

module.exports = function checkFoundation({ serverEnv }) {
  const result = spawnSync(process.execPath, [__filename], { encoding: 'utf8', timeout: 90000,
    env: { ...serverEnv, EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_injected_fixture_only',
      EMAIL_QUEUE_KEY: randomBytes(32).toString('hex'), WEB_ORIGIN: 'https://stage.example.invalid' } });
  if (result.status !== 0) throw new Error('Foundation database fixture failed: ' + result.stderr.trim());
  console.log('Foundation database: immutable/atomic audit, onboarding retries/cancel/preservation, role references/scope and encrypted durable email retries passed.');
};

let stage = 'target';
async function main() {
  const target = new URL(process.env.DATABASE_URL);
  assert.equal(target.hostname, 'localhost'); assert.match(target.pathname, /^\/dance_baseline_[a-f0-9]{32}$/);
  const { PrismaClient } = require('@prisma/client'); const { PrismaPg } = require('@prisma/adapter-pg');
  const { appendAudit } = require('../apps/api/dist/services/audit.js');
  const onboarding = require('../apps/api/dist/services/onboarding.js');
  const tokens = require('../apps/api/dist/services/identityTokens.js');
  const mail = require('../apps/api/dist/services/emailQueue.js');
  const { createApp } = require('../apps/api/dist/app.js');
  const jwt = require('node:module').createRequire(require('node:path').resolve(__dirname, '../apps/api/package.json'))('jsonwebtoken');
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const server = createApp(client).listen(0, '127.0.0.1'); await require('node:events').once(server, 'listening');
  const request = async (path, body, token) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1${path}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  try {
    stage = 'audit atomicity';
    const user = await client.user.create({ data: { email: 'foundation-owner@example.invalid', name: 'Foundation owner' } });
    const auditInput = { action: 'ACCOUNT_REGISTERED', actor: { kind: 'USER', userId: user.id }, targetType: 'USER', targetId: user.id };
    const before = await client.user.findUniqueOrThrow({ where: { id: user.id } });
    await assert.rejects(client.$transaction(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { name: 'Must roll back' } });
      await appendAudit(tx, auditInput); throw new Error('Synthetic domain failure');
    }));
    assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: user.id } }), before);
    assert.equal(await client.auditLog.count({ where: { targetId: user.id } }), 0);
    await assert.rejects(client.$transaction(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { name: 'Must roll back' } });
      await appendAudit(tx, { ...auditInput, actor: { kind: 'USER', userId: 'missing-actor' } });
    }));
    assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: user.id } }), before);
    await client.$transaction(tx => appendAudit(tx, auditInput));
    const audit = await client.auditLog.findFirstOrThrow({ where: { targetId: user.id } });
    await assert.rejects(client.auditLog.update({ where: { id: audit.id }, data: { targetId: 'changed' } }));
    await assert.rejects(client.auditLog.delete({ where: { id: audit.id } }));
    await assert.rejects(client.auditLog.create({ data: { action: 'ACCOUNT_REGISTERED', actorKind: 'SYSTEM', targetType: 'USER', targetId: user.id, metadata: { token: 'never-store' } } }));
    assert.deepEqual(await client.auditLog.findUniqueOrThrow({ where: { id: audit.id } }), audit);

    stage = 'onboarding';
    const event = await client.event.create({ data: { name: 'Foundation event', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
    const body = { operationId: randomUUID(), revision: 0, intendedEventId: event.id,
      details: { studioName: 'Draft studio', country: 'EE', city: 'Tallinn', directorName: 'Synthetic director', directorPhone: '' } };
    const draft = await onboarding.saveOnboardingDraft(client, user.id, body);
    assert.deepEqual(await onboarding.saveOnboardingDraft(client, user.id, body), draft);
    await assert.rejects(onboarding.saveOnboardingDraft(client, user.id, { ...body, details: { ...body.details, city: 'Different' } }));
    await assert.rejects(onboarding.saveOnboardingDraft(client, user.id, { ...body, operationId: randomUUID(), intendedEventId: 'missing' }));
    const other = await client.user.create({ data: { email: 'foundation-other@example.invalid', name: 'Other', emailVerified: true } });
    assert.equal(await onboarding.readOnboardingDraft(client, other.id), null);
    const raw = await tokens.identityTransaction(client, tx => tokens.rotateAccountToken(tx, user.id, 'VERIFY_EMAIL'));
    await tokens.verifyAccountEmail(client, raw);
    assert.deepEqual(await onboarding.readOnboardingDraft(client, user.id), draft);
    assert.equal(await client.userRole.count({ where: { userId: user.id } }), 0);
    assert.equal(await client.studioRepresentative.count({ where: { userId: user.id } }), 0);
    assert.equal(onboarding.onboardingReturnPath(event.id), '/events/' + event.id);
    const revised = await onboarding.saveOnboardingDraft(client, user.id, { ...body, operationId: randomUUID(), revision: 1 });
    const cancelled = await onboarding.cancelOnboardingDraft(client, user.id, revised.revision);
    assert.equal(cancelled.status, 'CANCELLED');
    assert.deepEqual(await onboarding.cancelOnboardingDraft(client, user.id, revised.revision), cancelled);
    await assert.rejects(onboarding.saveOnboardingDraft(client, user.id, { ...body, revision: cancelled.revision, operationId: randomUUID() }));
    assert.equal((await client.user.findUniqueOrThrow({ where: { id: user.id } })).active, true);

    stage = 'staff constraints';
    const role = await client.role.findUniqueOrThrow({ where: { key: 'moderator' } });
    const admin = await client.role.findUniqueOrThrow({ where: { key: 'admin' } });
    const secret = tokens.newIdentitySecret('INVITATION');
    const invitation = { email: 'foundation-invite@example.invalid', roleId: role.id, roleKey: role.key,
      eventId: event.id, tokenDigest: secret.digest, expiresAt: secret.expiresAt, createdBy: user.id };
    await assert.rejects(client.invitation.create({ data: { ...invitation, eventId: null } }));
    await assert.rejects(client.invitation.create({ data: { ...invitation, roleKey: 'judge' } }));
    await assert.rejects(client.invitation.create({ data: { ...invitation, roleKey: 'admin', roleId: admin.id } }));
    const studio = await client.studio.create({ data: { eventId: event.id, name: 'Foundation studio' } });
    const anotherEvent = await client.event.create({ data: { name: 'Other foundation event', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
    const representative = await client.role.findUniqueOrThrow({ where: { key: 'representative' } });
    await assert.rejects(client.invitation.create({ data: { ...invitation, roleId: representative.id, roleKey: representative.key, studioId: studio.id, eventId: anotherEvent.id } }));
    assert.equal(await client.rolePermission.count({ where: { roleId: role.id, permission: { key: 'score.submit' } } }), 0);
    assert.equal(await client.rolePermission.count({ where: { roleId: role.id, permission: { key: 'stage.manage' } } }), 1);
    const assignment = await client.userRole.create({ data: { userId: other.id, roleId: admin.id, eventId: event.id } });
    const session = jwt.sign({ userId: other.id, sessionVersion: 0 }, process.env.JWT_SECRET);
    assert.equal((await request('/events', {}, session)).status, 403, 'Scoped admin cannot become global');
    await client.userRole.update({ where: { id: assignment.id }, data: { eventId: null, removedAt: new Date() } });
    assert.equal((await request('/events', {}, session)).status, 403, 'Removed admin cannot bypass');

    stage = 'transactional email queue';
    const registered = await request('/auth/register', { email: 'foundation-mail@example.invalid', password: 'fixture-password', name: 'Mail fixture', locale: 'ru' });
    assert.equal(registered.status, 201); assert.equal(registered.body.delivery, 'unconfirmed');
    const rows = await client.emailDelivery.findMany({ where: { state: 'PENDING' } }); assert.equal(rows.length, 1);
    const queued = rows[0]; const envelope = mail.decryptEmail(queued.ciphertext, queued.id, process.env.EMAIL_QUEUE_KEY);
    const link = new URL(envelope.message.text.split('\n\n')[1]);
    const content = { to: envelope.message.to, token: link.searchParams.get('token'), locale: 'ru', kind: 'verification' };
    assert.equal(link.searchParams.get('lang'), 'ru'); assert.ok(!queued.ciphertext.includes(content.token)); assert.ok(!queued.ciphertext.includes(content.to));
    const count = await client.emailDelivery.count();
    await assert.rejects(client.$transaction(async tx => { await mail.queueEmail(tx, content); throw new Error('Rollback'); }));
    assert.equal(await client.emailDelivery.count(), count);
    const attempts = []; let fail = true;
    const provider = { send: async (message, key, from) => {
      assert.deepEqual(message, envelope.message); assert.equal(from, envelope.from);
      attempts.push(key); if (fail) throw new Error('Synthetic timeout after possible acceptance'); return 'fixture-receipt';
    } };
    await mail.dispatchEmailBatch(client, provider);
    let state = await client.emailDelivery.findUniqueOrThrow({ where: { id: queued.id } });
    assert.equal(state.state, 'PENDING'); assert.equal(state.attempts, 1); assert.equal(state.ciphertext, queued.ciphertext);
    fail = false; await client.emailDelivery.update({ where: { id: queued.id }, data: { nextAttemptAt: new Date(0) } });
    await Promise.all([mail.dispatchEmailBatch(client, provider), mail.dispatchEmailBatch(client, provider)]);
    assert.deepEqual(attempts, [queued.id, queued.id]);
    state = await client.emailDelivery.findUniqueOrThrow({ where: { id: queued.id } });
    assert.equal(state.state, 'ACCEPTED'); assert.equal(state.ciphertext, null); assert.equal(state.providerId, 'fixture-receipt');
    await client.$transaction(tx => mail.queueEmail(tx, content));
    await client.accountToken.updateMany({ where: { digest: queued.bindingDigest }, data: { revokedAt: new Date() } });
    await mail.dispatchEmailBatch(client, provider);
    assert.equal(attempts.length, 2, 'Superseded token mail must not dispatch');
    assert.equal(await client.emailDelivery.count({ where: { state: 'CANCELLED', ciphertext: null } }), 1);
    const receiptCount = await client.emailDelivery.count({ where: { state: 'ACCEPTED' } });
    await client.$transaction(tx => mail.queueEmail(tx, { to: content.to, locale: 'et', kind: 'applicationApproved' }));
    await client.emailDelivery.updateMany({ where: { state: 'PENDING' }, data: { expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 24 * 3600000) } });
    await mail.dispatchEmailBatch(client, provider);
    assert.equal(await client.emailDelivery.count({ where: { state: 'ACCEPTED' } }), receiptCount);
    assert.equal(attempts.length, 2, 'Do not retry outside provider idempotency window');
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await client.$disconnect();
  }
}
if (require.main === module) main().catch(() => { console.error('Failed stage: ' + stage); process.exitCode = 1; });
