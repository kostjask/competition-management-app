const assert = require('node:assert/strict');
const { newIdentitySecret, rotateInvitationToken } = require('../apps/api/dist/services/identityTokens.js');
module.exports = async function checkInvitations({ client, baseUrl, adminToken, jwtSecret }) {
  const creator = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const event = await client.event.create({ data: { name: 'Invitation contract', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
  const request = async (path, method = 'GET', body, token = adminToken) => {
    const res = await fetch(baseUrl + '/api/v1/invitations' + path, { method, headers: { ...(token && { Authorization: 'Bearer ' + token }), 'Content-Type': 'application/json' }, ...(body && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: res.status, body: await res.json() };
  };
  const body = { email: 'invited-contract@example.invalid', roleKey: 'judge', eventId: event.id };
  const created = await request('', 'POST', { ...body, email: '  ' + body.email.toUpperCase() + '  ' }); assert.equal(created.status, 201); assert.equal(created.body.token, undefined);
  const invitation = await client.invitation.findUniqueOrThrow({ where: { id: created.body.invitationId } });
  assert.equal(invitation.email, body.email);
  // The silent fake never exposes raw mail. Exercise real rotation to obtain a
  // synthetic delivery secret for this isolated fixture only.
  const raw = await rotateInvitationToken(client, invitation.id);
  assert.equal((await request('', 'POST', body)).status, 409);
  const listed = await request(''); assert.equal(listed.status, 200); assert.ok(listed.body.every(row => !('token' in row) && !('createdBy' in row)));
  const preview = await request('/' + raw, 'GET', undefined, null); assert.equal(preview.status, 200); assert.equal(preview.body.event.id, event.id); assert.equal(preview.body.token, undefined);
  const accepts = await Promise.all([request('/accept', 'POST', { token: raw, name: 'Invited', password: 'fixture-password' }, null), request('/accept', 'POST', { token: raw, name: 'Invited', password: 'fixture-password' }, null)]);
  assert.equal(accepts.filter(result => result.status === 201).length, 1); assert.ok(accepts.every(result => [201, 400, 409].includes(result.status)));
  const user = await client.user.findUniqueOrThrow({ where: { email: body.email } });
  const acceptedSession = accepts.find(result => result.status === 201).body.token;
  const acceptedProfile = await fetch(baseUrl + '/api/v1/auth/profile', { headers: { Authorization: 'Bearer ' + acceptedSession } });
  assert.equal(acceptedProfile.status, 200, 'Invitation-issued JWT must carry the current session revision');
  assert.equal((await acceptedProfile.json()).id, user.id);
  assert.notEqual(user.password, 'fixture-password');
  const role = await client.role.findUniqueOrThrow({ where: { key: 'judge' } });
  assert.equal(await client.userRole.count({ where: { userId: user.id, roleId: role.id, eventId: event.id } }), 1);
  assert.ok((await client.invitation.findUniqueOrThrow({ where: { id: invitation.id } })).usedAt);
  assert.equal(await client.judge.count({ where: { userId: user.id, eventId: event.id } }), 1, 'Atomic Judge onboarding creates matching Judge');
  for (const scope of [event.id, null]) {
    const secret = newIdentitySecret('INVITATION');
    const row = await client.invitation.create({ data: { email: scope ? 'rollback-invite@example.invalid' : 'global-invite@example.invalid', roleKey: scope ? 'missing_role' : 'moderator', eventId: scope, tokenDigest: secret.digest, expiresAt: secret.expiresAt, createdBy: creator.id } });
    const result = await request('/accept', 'POST', { token: secret.raw, name: 'Invited', password: 'fixture-password' }, null);
    if (scope) {
      assert.equal(result.status, 400); assert.equal(await client.user.count({ where: { email: row.email } }), 0); assert.equal((await client.invitation.findUniqueOrThrow({ where: { id: row.id } })).usedAt, null);
    } else {
      assert.equal(result.status, 400);
      assert.equal(await client.user.count({ where: { email: row.email } }), 0);
      assert.equal((await client.invitation.findUniqueOrThrow({ where: { id: row.id } })).usedAt, null);
    }
  }
  // Existing-account proof is independent of possession of the emailed link.
  const jwt = require('../apps/api/node_modules/jsonwebtoken');
  const session = user => jwt.sign({ userId: user.id, sessionVersion: user.sessionVersion }, jwtSecret);
  const recipient = await client.user.create({ data: { email: 'existing-invite@example.invalid', name: 'Existing', password: creator.password, emailVerified: true } });
  const otherEvent = await client.event.create({ data: { name: 'Other invitation event', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
  const moderator = await client.role.findUniqueOrThrow({ where: { key: 'moderator' } });
  await client.userRole.create({ data: { userId: recipient.id, roleId: moderator.id, eventId: otherEvent.id } });
  const secret = newIdentitySecret('INVITATION');
  const pending = await client.invitation.create({ data: { email: recipient.email, roleKey: role.key, roleId: role.id, eventId: event.id, tokenDigest: secret.digest, expiresAt: secret.expiresAt, createdBy: creator.id } });
  const arbitrarySetup = { token: secret.raw, name: 'Untrusted replacement', password: 'arbitrary-password' };
  const snapshot = async () => ({
    user: await client.user.findUniqueOrThrow({ where: { id: recipient.id } }),
    invite: await client.invitation.findUniqueOrThrow({ where: { id: pending.id } }),
    roles: await client.userRole.findMany({ where: { userId: recipient.id }, orderBy: { id: 'asc' } }),
    audits: await client.auditLog.count(),
  });
  const denied = async (token, status, body = arbitrarySetup) => {
    const before = await snapshot();
    const result = await request('/accept', 'POST', body, token);
    assert.equal(result.status, status); assert.equal(result.body.token, undefined);
    assert.deepEqual(await snapshot(), before, 'Denied acceptance must preserve all account/access/invitation/audit fields');
  };
  await denied(null, 401);
  await denied(null, 401, { token: secret.raw });
  await denied(adminToken, 403, { token: secret.raw });
  await denied(acceptedSession, 403);
  await denied('invalid', 401);
  const staleSession = session(recipient);
  await client.user.update({ where: { id: recipient.id }, data: { sessionVersion: { increment: 1 } } });
  await denied(staleSession, 401);
  let current = await client.user.findUniqueOrThrow({ where: { id: recipient.id } });
  const intendedSession = session(current);
  for (const field of ['active', 'emailVerified']) {
    await client.user.update({ where: { id: recipient.id }, data: { [field]: false } });
    await denied(intendedSession, 401);
    await denied(null, field === 'active' ? 403 : 401);
    await client.user.update({ where: { id: recipient.id }, data: { [field]: true } });
  }
  // Both directions of rollback: failed consumption after access/audit writes,
  // and failed success-audit after consumption. Only this isolated database is touched.
  for (const [table, operation] of [['Invitation', 'UPDATE'], ['AuditLog', 'INSERT']]) {
    const condition = table === 'AuditLog' ? `IF NEW.action = 'INVITATION_ACCEPTED' THEN RAISE EXCEPTION 'synthetic rollback'; END IF; RETURN NEW;` : `RAISE EXCEPTION 'synthetic rollback';`;
    await client.$executeRawUnsafe(`CREATE FUNCTION invite_identity_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${condition} END $$`);
    await client.$executeRawUnsafe(`CREATE TRIGGER invite_identity_failure BEFORE ${operation} ON "${table}" FOR EACH ROW EXECUTE FUNCTION invite_identity_failure()`);
    try { await denied(intendedSession, 500, { token: secret.raw }); }
    finally {
      await client.$executeRawUnsafe(`DROP TRIGGER invite_identity_failure ON "${table}"`);
      await client.$executeRawUnsafe('DROP FUNCTION invite_identity_failure()');
    }
  }
  current = await client.user.findUniqueOrThrow({ where: { id: recipient.id } });
  const beforeAccess = await client.userRole.findMany({ where: { userId: recipient.id } });
  const outcomes = await Promise.all([request('/accept', 'POST', { token: secret.raw }, intendedSession), request('/accept', 'POST', arbitrarySetup, intendedSession)]);
  assert.equal(outcomes.filter(result => result.status === 201).length, 1);
  assert.ok(outcomes.every(result => [201, 400, 409].includes(result.status)));
  const success = outcomes.find(result => result.status === 201).body;
  assert.equal(success.accountCreated, false); assert.equal(success.token, undefined); assert.equal(success.tokenType, undefined);
  assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: recipient.id } }), current, 'Existing credentials and identity must remain unchanged');
  for (const assignment of beforeAccess) assert.deepEqual(await client.userRole.findUniqueOrThrow({ where: { id: assignment.id } }), assignment);
  const granted = await client.userRole.findMany({ where: { userId: recipient.id, roleId: role.id, eventId: event.id } });
  assert.equal(granted.length, 1);
  for (const [action, targetId] of [['INVITATION_ACCEPTED', pending.id], ['ACCESS_GRANTED', granted[0].id]]) {
    const audits = await client.auditLog.findMany({ where: { action, targetId } });
    assert.equal(audits.length, 1); assert.equal(audits[0].actorKind, 'USER'); assert.equal(audits[0].actorId, recipient.id); assert.equal(audits[0].eventId, event.id);
  }
  await denied(intendedSession, 400, { token: secret.raw });
  console.log('Invitation intended-account identity, credential/access preservation, scoped atomic acceptance, audit rollback, replay and concurrency passed.');
};
