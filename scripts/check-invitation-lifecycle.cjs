const assert = require('node:assert/strict');
const { rotateInvitationToken } = require('../apps/api/dist/services/identityTokens.js');
module.exports = async function ({ client, baseUrl, adminToken }) {
  const event = await client.event.create({ data: { name: 'Lifecycle event', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
  const request = async (path, body, token = adminToken, method = 'POST') => {
    const response = await fetch(baseUrl + '/api/v1/invitations' + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, ...(body && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.json() };
  };
  const input = { email: 'lifecycle@example.invalid', roleKey: 'moderator', eventId: event.id, locale: 'ru' };
  const created = await request('', input); assert.equal(created.status, 201);
  const id = created.body.invitationId;
  const oldSecret = await rotateInvitationToken(client, id);
  let row = await client.invitation.findUniqueOrThrow({ where: { id } });
  const command = expiresAt => ({ expiresAt: expiresAt.toISOString() });
  const snapshot = async () => ({ invitations: await client.invitation.findMany({ orderBy: { id: 'asc' } }), audits: await client.auditLog.findMany({ orderBy: { id: 'asc' } }), mail: await client.emailDelivery.findMany({ orderBy: { id: 'asc' } }) });
  let before = await snapshot();
  assert.equal((await request('/missing/resend', command(row.expiresAt))).status, 404);
  assert.equal((await request('/' + id + '/resend', command(new Date(0)))).status, 409);
  assert.deepEqual(await snapshot(), before);
  await client.$executeRawUnsafe(`CREATE FUNCTION lifecycle_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'INVITATION_ROTATED' THEN RAISE EXCEPTION 'synthetic rollback'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe('CREATE TRIGGER lifecycle_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION lifecycle_failure()');
  try { assert.equal((await request('/' + id + '/resend', command(row.expiresAt))).status, 500); assert.deepEqual(await snapshot(), before); }
  finally { await client.$executeRawUnsafe('DROP TRIGGER lifecycle_failure ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION lifecycle_failure()'); }
  const outcomes = await Promise.all(['resend', 'resend'].map(action => request('/' + id + '/' + action, command(row.expiresAt))));
  assert.equal(outcomes.filter(result => result.status === 200).length, 1); assert.ok(outcomes.every(result => [200, 409].includes(result.status)));
  assert.equal(outcomes.find(result => result.status === 200).body.delivery, 'unconfirmed');
  assert.equal((await request('/' + oldSecret, undefined, null, 'GET')).status, 404, 'Resend invalidates old link');
  row = await client.invitation.findUniqueOrThrow({ where: { id } }); assert.equal(row.locale, 'ru');
  const currentSecret = await rotateInvitationToken(client, id); row = await client.invitation.findUniqueOrThrow({ where: { id } });
  const revoked = await request('/' + id + '/revoke', command(row.expiresAt)); assert.equal(revoked.status, 200);
  before = await snapshot();
  assert.equal((await request('/' + id + '/revoke', command(row.expiresAt))).status, 200); assert.deepEqual(await snapshot(), before);
  const preview = await request('/' + currentSecret, undefined, null, 'GET'); assert.equal(preview.status, 200); assert.equal(preview.body.status, 'REVOKED'); assert.equal(preview.body.accountExists, false);
  assert.equal((await request('/accept', { token: currentSecret, name: 'Fixture', password: 'password123' }, null)).status, 400);
  assert.equal((await request('/' + id + '/resend', command(row.expiresAt))).status, 409); assert.deepEqual(await snapshot(), before);
  const replacement = await request('', input); assert.equal(replacement.status, 201); assert.notEqual(replacement.body.invitationId, id);
  const replacementId = replacement.body.invitationId;
  const secret = await rotateInvitationToken(client, replacementId);
  // Expired and accepted links are retained and commands cannot change them.
  await client.invitation.update({ where: { id: replacementId }, data: { expiresAt: new Date(Date.now() - 1000) } });
  row = await client.invitation.findUniqueOrThrow({ where: { id: replacementId } }); before = await snapshot();
  for (const action of ['resend', 'revoke']) assert.equal((await request('/' + replacementId + '/' + action, command(row.expiresAt))).status, 409);
  assert.deepEqual(await snapshot(), before); assert.equal((await request('/' + secret, undefined, null, 'GET')).body.status, 'EXPIRED');
  assert.equal((await request('', input)).status, 201);
  assert.equal((await request('/' + secret, undefined, null, 'GET')).body.status, 'SUPERSEDED');
  console.log('Invitation lifecycle CAS, global-admin commands, rotation invalidation, audit rollback, concurrency, revoke history and expired replacement passed.');
};
