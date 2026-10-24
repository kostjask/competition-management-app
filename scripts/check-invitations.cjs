const assert = require('node:assert/strict');
module.exports = async function checkInvitations({ client, baseUrl, adminToken }) {
  const creator = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const event = await client.event.create({ data: { name: 'Invitation contract', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
  const request = async (path, method = 'GET', body, token = adminToken) => {
    const res = await fetch(baseUrl + '/api/v1/invitations' + path, { method, headers: { ...(token && { Authorization: 'Bearer ' + token }), 'Content-Type': 'application/json' }, ...(body && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: res.status, body: await res.json() };
  };
  const body = { email: 'invited-contract@example.invalid', roleKey: 'judge', eventId: event.id };
  const created = await request('', 'POST', body); assert.equal(created.status, 201); assert.equal(created.body.token, undefined);
  const invitation = await client.invitation.findUniqueOrThrow({ where: { id: created.body.invitationId } });
  assert.equal((await request('', 'POST', body)).status, 409);
  const listed = await request(''); assert.equal(listed.status, 200); assert.ok(listed.body.every(row => !('token' in row) && !('createdBy' in row)));
  const preview = await request('/' + invitation.token, 'GET', undefined, null); assert.equal(preview.status, 200); assert.equal(preview.body.event.id, event.id); assert.equal(preview.body.token, undefined);
  const accepts = await Promise.all([request('/accept', 'POST', { token: invitation.token, name: 'Invited', password: 'fixture-password' }, null), request('/accept', 'POST', { token: invitation.token, name: 'Invited', password: 'fixture-password' }, null)]);
  assert.equal(accepts.filter(result => result.status === 201).length, 1); assert.ok(accepts.every(result => [201, 400, 409].includes(result.status)));
  const user = await client.user.findUniqueOrThrow({ where: { email: body.email } });
  assert.notEqual(user.password, 'fixture-password');
  const role = await client.role.findUniqueOrThrow({ where: { key: 'judge' } });
  assert.equal(await client.userRole.count({ where: { userId: user.id, roleId: role.id, eventId: event.id } }), 1);
  assert.ok((await client.invitation.findUniqueOrThrow({ where: { id: invitation.id } })).usedAt);
  assert.equal(await client.judge.count({ where: { userId: user.id, eventId: event.id } }), 0, 'Atomic Judge onboarding remains P2-JUDGE-ACCEPT');
  for (const scope of [event.id, null]) {
    const row = await client.invitation.create({ data: { email: scope ? 'rollback-invite@example.invalid' : 'global-invite@example.invalid', roleKey: scope ? 'missing_role' : 'moderator', eventId: scope, token: require('node:crypto').randomUUID(), expiresAt: new Date(Date.now() + 60000), createdBy: creator.id } });
    const result = await request('/accept', 'POST', { token: row.token, name: 'Invited', password: 'fixture-password' }, null);
    if (scope) {
      assert.equal(result.status, 404); assert.equal(await client.user.count({ where: { email: row.email } }), 0); assert.equal((await client.invitation.findUniqueOrThrow({ where: { id: row.id } })).usedAt, null);
    } else {
      assert.equal(result.status, 201); const globalUser = await client.user.findUniqueOrThrow({ where: { email: row.email } });
      assert.equal(await client.userRole.count({ where: { userId: globalUser.id, eventId: null } }), 1);
    }
  }
  console.log('Invitation DTOs, real scoped/global acceptance, replay/concurrency and missing-role rollback passed.');
};
