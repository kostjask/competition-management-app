const assert = require('node:assert/strict');
const bcrypt = require('node:module').createRequire(require('node:path').resolve(__dirname, '../apps/api/package.json'))('bcrypt');
const tokens = require('../apps/api/dist/services/identityTokens.js');

// Called only with the baseline runner's disposable database/API.
module.exports = async function checkIdentityTokens({ client, baseUrl }) {
  const post = async (path, body) => {
    const response = await fetch(baseUrl + '/api/v1/' + path, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.json() };
  };
  const verify = raw => post('auth/verify-email', { token: raw });
  const issue = (user, purpose = 'VERIFY_EMAIL') => tokens.identityTransaction(client, tx => tokens.rotateAccountToken(tx, user.id, purpose));
  const registration = await post('auth/register', { email: 'registered-token@example.invalid', name: 'Registered fixture', password: 'fixture-password' });
  assert.equal(registration.status, 201);
  assert.deepEqual(Object.keys(registration.body).sort(), ['delivery', 'message', 'messageId', 'userId']);
  const registeredTokens = await client.accountToken.findMany({ where: { userId: registration.body.userId } });
  assert.equal(registeredTokens.length, 1); assert.equal(registeredTokens[0].purpose, 'VERIFY_EMAIL');
  assert.match(registeredTokens[0].digest, /^[a-f0-9]{64}$/);
  assert.equal((await client.user.findUniqueOrThrow({ where: { id: registration.body.userId } })).emailVerified, false);
  const user = await client.user.create({ data: { email: 'token-account@example.invalid', name: 'Token fixture', password: 'preserve-until-recovery' } });
  const snapshot = async () => ({ user: await client.user.findUniqueOrThrow({ where: { id: user.id } }),
    tokens: await client.accountToken.findMany({ where: { userId: user.id }, orderBy: { id: 'asc' } }),
    roles: await client.userRole.findMany({ where: { userId: user.id } }) });
  let raw = await issue(user);
  let stored = await client.accountToken.findUniqueOrThrow({ where: { digest: tokens.tokenDigest('VERIFY_EMAIL', raw) } });
  assert.match(raw, /^[a-f0-9]{64}$/); assert.notEqual(stored.digest, raw);
  assert.ok(!JSON.stringify(await snapshot()).includes(raw), 'Persistence must exclude raw secrets');
  assert.notEqual(tokens.tokenDigest('INVITATION', raw), stored.digest);
  assert.notEqual(tokens.tokenDigest('PASSWORD_RECOVERY', raw), stored.digest);
  const first = raw;
  raw = await issue(user);
  assert.ok((await client.accountToken.findUniqueOrThrow({ where: { id: stored.id } })).revokedAt);
  assert.equal((await verify(first)).status, 404);
  stored = await client.accountToken.findUniqueOrThrow({ where: { digest: tokens.tokenDigest('VERIFY_EMAIL', raw) } });
  await client.accountToken.update({ where: { id: stored.id }, data: { createdAt: new Date('2019-01-01'), expiresAt: new Date('2020-01-01') } });
  let before = await snapshot();
  assert.equal((await verify(raw)).status, 404); assert.deepEqual(await snapshot(), before);
  raw = await issue(user);
  await client.user.update({ where: { id: user.id }, data: { active: false } });
  before = await snapshot();
  assert.equal((await verify(raw)).status, 403); assert.deepEqual(await snapshot(), before);
  assert.equal(await tokens.issueRecoveryToken(client, user.email), null);
  await client.user.update({ where: { id: user.id }, data: { active: true, email: 'changed-token@example.invalid' } });
  before = await snapshot();
  assert.equal((await verify(raw)).status, 403); assert.deepEqual(await snapshot(), before);
  await client.user.update({ where: { id: user.id }, data: { email: user.email } });
  const rotations = await Promise.allSettled([issue(user), issue(user)]);
  assert.ok(rotations.some(result => result.status === 'fulfilled'));
  assert.equal(await client.accountToken.count({ where: { userId: user.id, purpose: 'VERIFY_EMAIL', consumedAt: null, revokedAt: null } }), 1);
  for (const result of rotations) if (result.status === 'rejected') assert.equal(result.reason.statusCode, 409);
  raw = await issue(user);
  const verified = await Promise.all([verify(raw), verify(raw)]);
  assert.equal(verified.filter(result => result.status === 200).length, 1);
  assert.ok(verified.every(result => [200, 404, 409].includes(result.status)));
  assert.ok(verified.filter(result => result.status !== 200).every(result => result.body.token === undefined));
  assert.equal((await verify(raw)).status, 404);
  assert.equal((await client.user.findUniqueOrThrow({ where: { id: user.id } })).password, user.password);

  assert.equal(await tokens.issueRecoveryToken(client, 'missing-token@example.invalid'), null);
  const pending = await client.user.create({ data: { email: 'pending-token@example.invalid', name: 'Pending' } });
  assert.equal(await tokens.issueRecoveryToken(client, pending.email), null);
  const writes = await Promise.allSettled([1, 2].map(() => client.accountToken.create({ data: {
    userId: pending.id, email: pending.email, purpose: 'VERIFY_EMAIL',
    digest: tokens.newIdentitySecret('VERIFY_EMAIL').digest, expiresAt: new Date(Date.now() + 60000),
  } })));
  assert.equal(writes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(writes.find(result => result.status === 'rejected').reason.code, 'P2002');
  let recovery = await tokens.issueRecoveryToken(client, '  ' + user.email.toUpperCase() + '  ');
  assert.equal(typeof recovery, 'string');
  before = await snapshot();
  assert.equal((await verify(recovery)).status, 404);
  await assert.rejects(tokens.recoverAccountPassword(client, raw, 'replacement-password'));
  await assert.rejects(tokens.recoverAccountPassword(client, recovery, 'short'));
  assert.deepEqual(await snapshot(), before, 'Wrong purpose and invalid password must preserve credentials/tokens');
  const oldRecovery = recovery;
  recovery = await tokens.issueRecoveryToken(client, user.email);
  await assert.rejects(tokens.recoverAccountPassword(client, oldRecovery, 'replacement-password'));
  const recoveryRow = await client.accountToken.findUniqueOrThrow({ where: { digest: tokens.tokenDigest('PASSWORD_RECOVERY', recovery) } });
  await client.accountToken.update({ where: { id: recoveryRow.id }, data: { createdAt: new Date('2019-01-01'), expiresAt: new Date('2020-01-01') } });
  before = await snapshot();
  await assert.rejects(tokens.recoverAccountPassword(client, recovery, 'replacement-password'));
  assert.deepEqual(await snapshot(), before);
  recovery = await tokens.issueRecoveryToken(client, user.email);
  await client.user.update({ where: { id: user.id }, data: { active: false } });
  before = await snapshot();
  await assert.rejects(tokens.recoverAccountPassword(client, recovery, 'replacement-password'));
  assert.deepEqual(await snapshot(), before, 'Recovery must not reactivate or consume an inactive account token');
  await client.user.update({ where: { id: user.id }, data: { active: true } });
  const outcomes = await Promise.allSettled([
    tokens.recoverAccountPassword(client, recovery, 'replacement-password'),
    tokens.recoverAccountPassword(client, recovery, 'replacement-password'),
  ]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  const recovered = await client.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.ok(await bcrypt.compare('replacement-password', recovered.password));
  assert.deepEqual({ ...recovered, password: user.password }, { ...user, emailVerified: true, sessionVersion: 1 });
  assert.equal(await client.userRole.count({ where: { userId: user.id } }), 0);
  assert.equal(await client.accountToken.count({ where: { userId: user.id, consumedAt: null, revokedAt: null } }), 0);

  // A real database failure after claim must roll the claim and account write back.
  const rollback = await client.user.create({ data: { email: 'rollback-token@example.invalid', name: 'Rollback' } });
  const rollbackRaw = await issue(rollback);
  const beforeRollback = await client.accountToken.findMany({ where: { userId: rollback.id } });
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_token_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic token rollback'; END $$`);
  await client.$executeRawUnsafe(`CREATE TRIGGER reject_token_fixture BEFORE UPDATE OF "emailVerified", password ON "User" FOR EACH ROW WHEN (OLD.email = 'rollback-token@example.invalid') EXECUTE FUNCTION reject_token_fixture()`);
  try {
    assert.equal((await verify(rollbackRaw)).status, 500);
    assert.deepEqual(await client.accountToken.findMany({ where: { userId: rollback.id } }), beforeRollback);
    assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: rollback.id } }), rollback);
  } finally {
    await client.$executeRawUnsafe('DROP TRIGGER reject_token_fixture ON "User"');
    await client.$executeRawUnsafe('DROP FUNCTION reject_token_fixture()');
  }
  assert.equal((await verify(rollbackRaw)).status, 200);
  const rollbackRecovery = await tokens.issueRecoveryToken(client, rollback.email);
  const recoveryBefore = await client.user.findUniqueOrThrow({ where: { id: rollback.id } });
  const recoveryTokensBefore = await client.accountToken.findMany({ where: { userId: rollback.id }, orderBy: { id: 'asc' } });
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_token_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic token rollback'; END $$`);
  await client.$executeRawUnsafe(`CREATE TRIGGER reject_token_fixture BEFORE UPDATE OF password ON "User" FOR EACH ROW WHEN (OLD.email = 'rollback-token@example.invalid') EXECUTE FUNCTION reject_token_fixture()`);
  try {
    await assert.rejects(tokens.recoverAccountPassword(client, rollbackRecovery, 'replacement-password'));
    assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: rollback.id } }), recoveryBefore);
    assert.deepEqual(await client.accountToken.findMany({ where: { userId: rollback.id }, orderBy: { id: 'asc' } }), recoveryTokensBefore);
  } finally {
    await client.$executeRawUnsafe('DROP TRIGGER reject_token_fixture ON "User"');
    await client.$executeRawUnsafe('DROP FUNCTION reject_token_fixture()');
  }

  // Invitation tokens cannot be used as verification/recovery tokens or after rotation/revocation.
  const secret = tokens.newIdentitySecret('INVITATION');
    const staffEvent = await client.event.create({ data: { name: 'Token staff fixture', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
    const staffRole = await client.role.findUniqueOrThrow({ where: { key: 'moderator' } });
  const invitation = await client.invitation.create({ data: { email: 'lifecycle-invite@example.invalid', roleKey: 'moderator',
      roleId: staffRole.id, eventId: staffEvent.id, createdBy: user.id, tokenDigest: secret.digest, expiresAt: secret.expiresAt } });
  assert.equal((await verify(secret.raw)).status, 404);
  await assert.rejects(tokens.recoverAccountPassword(client, secret.raw, 'replacement-password'));
  const inspect = async raw => (await fetch(baseUrl + '/api/v1/invitations/' + raw)).status;
  assert.equal(await inspect(secret.raw), 200);
  let replacement = await tokens.rotateInvitationToken(client, invitation.id);
  assert.equal(await inspect(secret.raw), 404); assert.equal(await inspect(replacement), 200);
  const inviteRotations = await Promise.allSettled([tokens.rotateInvitationToken(client, invitation.id), tokens.rotateInvitationToken(client, invitation.id)]);
  const valid = [];
  for (const result of inviteRotations) {
    if (result.status === 'fulfilled') {
      if (await inspect(result.value) === 200) valid.push(result.value);
    } else assert.equal(result.reason.statusCode, 409);
  }
  assert.equal(valid.length, 1); replacement = valid[0];
  await tokens.revokeInvitationToken(client, invitation.id);
  assert.equal(await inspect(replacement), 400);
  await assert.rejects(tokens.rotateInvitationToken(client, invitation.id));
  assert.equal((await post('invitations/accept', { token: replacement, name: 'Fixture', password: 'fixture-password' })).status, 400);
  assert.equal(await client.user.count({ where: { email: invitation.email } }), 0);
  const expiredSecret = tokens.newIdentitySecret('INVITATION');
  const expired = await client.invitation.create({ data: { email: 'expired-lifecycle@example.invalid', roleKey: 'moderator', createdBy: user.id,
    tokenDigest: expiredSecret.digest, expiresAt: new Date('2020-01-01') } });
  assert.equal((await post('invitations/accept', { token: expiredSecret.raw, name: 'Fixture', password: 'fixture-password' })).status, 400);
  assert.deepEqual(await client.invitation.findUniqueOrThrow({ where: { id: expired.id } }), expired);
  assert.equal(await client.user.count({ where: { email: expired.email } }), 0);

  const inactive = await client.user.create({ data: { email: 'inactive-invite-token@example.invalid', name: 'Inactive', active: false } });
  const inactiveSecret = tokens.newIdentitySecret('INVITATION');
  const inactiveInvitation = await client.invitation.create({ data: { email: inactive.email, roleKey: 'moderator', createdBy: user.id,
      roleId: staffRole.id, eventId: staffEvent.id, tokenDigest: inactiveSecret.digest, expiresAt: inactiveSecret.expiresAt } });
  assert.equal((await post('invitations/accept', { token: inactiveSecret.raw, name: 'Changed', password: 'fixture-password' })).status, 403);
  assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: inactive.id } }), inactive);
  assert.deepEqual(await client.invitation.findUniqueOrThrow({ where: { id: inactiveInvitation.id } }), inactiveInvitation);
  assert.equal(await client.userRole.count({ where: { userId: inactive.id } }), 0);
  console.log('Identity tokens: purpose binding, expiry, rotation/revocation, concurrent consumption, safe recovery, inactive identity and rollback passed.');
};
