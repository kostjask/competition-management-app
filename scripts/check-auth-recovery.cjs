const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// Isolate configuration and injected delivery secrets in a child, never normal DTOs/logs.
module.exports = function checkAuthRecovery({ serverEnv }) {
  const result = spawnSync(process.execPath, [__filename], { env: { ...serverEnv, RATE_LIMIT_MAX_REQUESTS: '500' },
    encoding: 'utf8', timeout: 90000 });
  if (result.status !== 0) throw new Error('Recovery HTTP/database fixture failed: ' + result.stderr.trim());
  console.log('Recovery HTTP/database: neutral requests, proof/collision/expiry/replay, delivery rollback, concurrency and session revocation passed.');
};

let stage = 'configuration';
async function main() {
  const target = new URL(process.env.DATABASE_URL);
  assert.match(target.pathname, /^\/dance_baseline_[a-f0-9]{32}$/);
  assert.equal(target.hostname, 'localhost');
  const { PrismaClient } = require('@prisma/client'); const { PrismaPg } = require('@prisma/adapter-pg');
  const { once } = require('node:events');
  const { createRequire } = require('node:module');
  const apiRequire = createRequire(require('node:path').resolve(__dirname, '../apps/api/package.json'));
  const bcrypt = apiRequire('bcrypt'); const jwt = apiRequire('jsonwebtoken');
  const { createApp } = require('../apps/api/dist/app.js');
  const { identityTransaction, rotateAccountToken, tokenDigest } = require('../apps/api/dist/services/identityTokens.js');
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const messages = []; let failed = false; let available = true;
  const send = kind => async data => { messages.push({ kind, ...data }); if (failed) throw new Error('Synthetic delivery failure'); };
  const server = createApp(client, { available: () => available, verification: send('verification'), recovery: send('recovery') }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const request = async (path, body, token) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000),
    });
    return { status: response.status, body: await response.json() };
  };
  const accepted = result => { assert.equal(result.status, 202); assert.deepEqual(result.body, { messageId: 'authRequestAccepted', delivery: 'unconfirmed' }); };
  const latest = kind => messages.filter(message => message.kind === kind).at(-1).token;
  const snapshot = async id => ({ user: await client.user.findUniqueOrThrow({ where: { id } }),
    tokens: await client.accountToken.findMany({ where: { userId: id }, orderBy: { id: 'asc' } }),
    roles: await client.userRole.findMany({ where: { userId: id }, orderBy: { id: 'asc' } }),
    members: await client.studioRepresentative.findMany({ where: { userId: id }, orderBy: { id: 'asc' } }) });
  try {
    stage = 'neutral requests';
    const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
    const user = (email, extra = {}) => client.user.create({ data: { email, name: 'Recovery fixture', password: template.password, ...extra } });
    const pending = await user('recovery-pending@example.invalid');
    const verified = await user('recovery-verified@example.invalid', { emailVerified: true });
    const inactive = await user('recovery-inactive@example.invalid', { active: false });
    const passwordless = await user('recovery-passwordless@example.invalid', { password: null });
    const event = await client.event.create({ data: { name: 'Recovery owner fixture', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
    const studio = await client.studio.create({ data: { name: 'Recovery owner fixture', eventId: event.id,
      representatives: { create: { userId: pending.id, name: 'Contact snapshot', email: 'contact-snapshot@example.invalid' } } } });
    const role = await client.role.findUniqueOrThrow({ where: { key: 'judge' } });
    await client.userRole.create({ data: { userId: verified.id, roleId: role.id, eventId: event.id } });
    const login = async (email, password = 'password123') => request('/auth/login', { email, password });
    const originalLogin = await login(verified.email); assert.equal(originalLogin.status, 200);
    const originalSession = originalLogin.body.token;
    assert.equal((await request('/auth/profile', undefined, originalSession)).status, 200);
    for (const email of ['missing-recovery@example.invalid', inactive.email, verified.email]) {
      const count = messages.length; accepted(await request('/auth/resend-verification', { email })); assert.equal(messages.length, count);
    }
    for (const email of ['missing-recovery@example.invalid', inactive.email, pending.email]) {
      const count = messages.length; accepted(await request('/auth/request-password-reset', { email })); assert.equal(messages.length, count);
    }
    const oldVerification = await identityTransaction(client, tx => rotateAccountToken(tx, pending.id, 'VERIFY_EMAIL'));
    const beforeCorrection = await snapshot(pending.id);
    for (const [email, password, newEmail] of [
      [pending.email, 'wrong-password', 'new@example.invalid'], [inactive.email, 'password123', 'new@example.invalid'],
      [verified.email, 'password123', 'new@example.invalid'], [passwordless.email, 'password123', 'new@example.invalid'],
      [pending.email, 'password123', verified.email],
    ]) {
      const count = messages.length; accepted(await request('/auth/correct-email', { email, password, newEmail })); assert.equal(messages.length, count);
    }
    assert.deepEqual(await snapshot(pending.id), beforeCorrection);

    stage = 'delivery rollback'; failed = true;
    accepted(await request('/auth/resend-verification', { email: pending.email }));
    assert.deepEqual(await snapshot(pending.id), beforeCorrection);
    accepted(await request('/auth/correct-email', { email: pending.email, password: 'password123', newEmail: 'failed-correction@example.invalid' }));
    const failedVerification = latest('verification');
    assert.deepEqual(await snapshot(pending.id), beforeCorrection);
    assert.equal((await request('/auth/verify-email', { token: failedVerification })).status, 404);
    failed = false;

    stage = 'email correction';
    accepted(await request('/auth/correct-email', { email: pending.email.toUpperCase(), password: 'password123', newEmail: ' Corrected@Example.INVALID ' }));
    const correction = await snapshot(pending.id);
    assert.deepEqual(correction.user, { ...pending, email: 'corrected@example.invalid', sessionVersion: 1 });
    assert.deepEqual(correction.members, beforeCorrection.members); assert.deepEqual(correction.roles, []);
    assert.equal((await client.studio.findUniqueOrThrow({ where: { id: studio.id } })).eventId, event.id);
    assert.equal((await request('/auth/verify-email', { token: oldVerification })).status, 404);
    const correctedRaw = latest('verification');
    const countAfterCorrection = messages.length;
    accepted(await request('/auth/correct-email', { email: pending.email, password: 'password123', newEmail: 'corrected@example.invalid' }));
    assert.equal(messages.length, countAfterCorrection, 'Lost-response retry must not duplicate a committed old-email correction');
    const proof = await request('/auth/verify-email', { token: correctedRaw });
    assert.equal(proof.status, 200); assert.equal(jwt.verify(proof.body.token, process.env.JWT_SECRET).sessionVersion, 1);
    assert.equal((await request('/auth/profile', undefined, proof.body.token)).status, 200);
    assert.equal(await client.userRole.count({ where: { userId: pending.id } }), 0);

    stage = 'correction database rollback';
    const databasePending = await user('db-correction-source@example.invalid');
    await identityTransaction(client, tx => rotateAccountToken(tx, databasePending.id, 'VERIFY_EMAIL'));
    const beforeDatabaseCorrection = await snapshot(databasePending.id);
    await client.$executeRawUnsafe(`CREATE FUNCTION reject_correction_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic correction rollback'; END $$`);
    await client.$executeRawUnsafe(`CREATE TRIGGER reject_correction_fixture BEFORE INSERT ON "AccountToken" FOR EACH ROW WHEN (NEW.email = 'db-correction-target@example.invalid') EXECUTE FUNCTION reject_correction_fixture()`);
    try {
      const result = await request('/auth/correct-email', { email: databasePending.email, password: 'password123', newEmail: 'db-correction-target@example.invalid' });
      assert.equal(result.status, 500);
      assert.deepEqual(await snapshot(databasePending.id), beforeDatabaseCorrection);
    } finally {
      await client.$executeRawUnsafe('DROP TRIGGER reject_correction_fixture ON "AccountToken"');
      await client.$executeRawUnsafe('DROP FUNCTION reject_correction_fixture()');
    }
    stage = 'concurrent correction';
    const correctionRace = await user('correction-race-source@example.invalid');
    const correctionResponses = await Promise.all(['a', 'b'].map(suffix => request('/auth/correct-email', {
      email: correctionRace.email, password: 'password123', newEmail: 'correction-race-' + suffix + '@example.invalid',
    })));
    correctionResponses.forEach(accepted);
    const correctedRace = await client.user.findUniqueOrThrow({ where: { id: correctionRace.id } });
    assert.ok(['correction-race-a@example.invalid', 'correction-race-b@example.invalid'].includes(correctedRace.email));
    assert.deepEqual({ ...correctedRace, email: correctionRace.email, sessionVersion: 0 }, correctionRace);
    assert.equal(correctedRace.sessionVersion, 1);
    assert.equal(await client.accountToken.count({ where: { userId: correctionRace.id, consumedAt: null, revokedAt: null } }), 1);

    stage = 'reset delivery and rotation';
    accepted(await request('/auth/request-password-reset', { email: verified.email.toUpperCase() }));
    const firstReset = latest('recovery'); const beforeFailure = await snapshot(verified.id);
    failed = true; accepted(await request('/auth/request-password-reset', { email: verified.email }));
    assert.deepEqual(await snapshot(verified.id), beforeFailure);
    assert.equal((await request('/auth/reset-password', { token: latest('recovery'), password: 'replacement-password' })).status, 404);
    failed = false; accepted(await request('/auth/request-password-reset', { email: verified.email }));
    const currentReset = latest('recovery'); const beforeReset = await snapshot(verified.id);
    assert.equal((await request('/auth/reset-password', { token: firstReset, password: 'replacement-password' })).status, 404);
    assert.equal((await request('/auth/reset-password', { token: correctedRaw, password: 'replacement-password' })).status, 404);
    assert.equal((await request('/auth/verify-email', { token: currentReset })).status, 404);
    assert.equal((await request('/auth/reset-password', { token: currentReset, password: 'short' })).status, 400);
    assert.deepEqual(await snapshot(verified.id), beforeReset);
    const outcomes = await Promise.all([1, 2].map(() => request('/auth/reset-password', { token: currentReset, password: 'replacement-password' })));
    assert.equal(outcomes.filter(result => result.status === 200).length, 1);
    assert.ok(outcomes.every(result => [200, 404, 409].includes(result.status)));
    assert.deepEqual(outcomes.find(result => result.status === 200).body, { messageId: 'passwordReset' });
    const afterReset = await snapshot(verified.id);
    assert.ok(await bcrypt.compare('replacement-password', afterReset.user.password));
    assert.deepEqual({ ...afterReset.user, password: verified.password }, { ...verified, sessionVersion: 1 });
    assert.deepEqual(afterReset.roles, beforeReset.roles);
    assert.equal((await request('/auth/profile', undefined, originalSession)).status, 401);
    assert.equal((await login(verified.email)).status, 401);
    const newLogin = await login(verified.email, 'replacement-password'); assert.equal(newLogin.status, 200);
    assert.equal((await request('/auth/profile', undefined, newLogin.body.token)).status, 200);
    const legacy = jwt.sign({ userId: verified.id }, process.env.JWT_SECRET);
    assert.equal((await request('/auth/profile', undefined, legacy)).status, 401);

    stage = 'expiry and inactive reset';
    accepted(await request('/auth/request-password-reset', { email: verified.email }));
    const expiredRaw = latest('recovery');
    await client.accountToken.update({ where: { digest: tokenDigest('PASSWORD_RECOVERY', expiredRaw) }, data: { createdAt: new Date('2019-01-01'), expiresAt: new Date('2020-01-01') } });
    const beforeExpiry = await snapshot(verified.id);
    assert.equal((await request('/auth/reset-password', { token: expiredRaw, password: 'another-password' })).status, 404);
    assert.deepEqual(await snapshot(verified.id), beforeExpiry);
    accepted(await request('/auth/request-password-reset', { email: verified.email }));
    const inactiveRaw = latest('recovery'); await client.user.update({ where: { id: verified.id }, data: { active: false } });
    const beforeInactive = await snapshot(verified.id);
    assert.equal((await request('/auth/reset-password', { token: inactiveRaw, password: 'another-password' })).status, 403);
    assert.deepEqual(await snapshot(verified.id), beforeInactive);
    await client.user.update({ where: { id: verified.id }, data: { active: true } });

    stage = 'reset transaction rollback';
    const beforeRollback = await snapshot(verified.id);
    await client.$executeRawUnsafe(`CREATE FUNCTION reject_public_reset_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic reset rollback'; END $$`);
    await client.$executeRawUnsafe(`CREATE TRIGGER reject_public_reset_fixture BEFORE UPDATE OF password ON "User" FOR EACH ROW WHEN (OLD.email = 'recovery-verified@example.invalid') EXECUTE FUNCTION reject_public_reset_fixture()`);
    try {
      assert.equal((await request('/auth/reset-password', { token: inactiveRaw, password: 'another-password' })).status, 500);
      assert.deepEqual(await snapshot(verified.id), beforeRollback);
    } finally {
      await client.$executeRawUnsafe('DROP TRIGGER reject_public_reset_fixture ON "User"');
      await client.$executeRawUnsafe('DROP FUNCTION reject_public_reset_fixture()');
    }
    assert.equal((await request('/auth/reset-password', { token: inactiveRaw, password: 'another-password' })).status, 200);
    assert.equal((await request('/auth/profile', undefined, newLogin.body.token)).status, 401);
    stage = 'concurrent resend';
    const raced = await user('recovery-race@example.invalid');
    const responses = await Promise.all([1, 2, 3].map(() => request('/auth/resend-verification', { email: raced.email })));
    responses.forEach(accepted);
    assert.equal(await client.accountToken.count({ where: { userId: raced.id, consumedAt: null, revokedAt: null } }), 1);
    assert.equal((await client.user.findUniqueOrThrow({ where: { id: raced.id } })).emailVerified, false);
    available = false;
    for (const email of [verified.email, 'missing-recovery@example.invalid']) {
      const result = await request('/auth/request-password-reset', { email }); assert.equal(result.status, 503); assert.equal(result.body.reason, 'authDeliveryUnavailable');
    }
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    await client.$disconnect();
  }
}
if (require.main === module) main().catch(error => { console.error('stage=' + stage + ' type=' + error.name); process.exitCode = 1; });
