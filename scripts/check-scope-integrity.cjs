const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

module.exports = async function checkScopeIntegrity({ client, baseUrl, adminToken }) {
  const user = await client.user.create({ data: { email: 'scope-integrity@example.invalid', name: 'Scope fixture' } });
  const role = await client.role.findUniqueOrThrow({ where: { key: 'judge' } });
  const events = await Promise.all(['Role scope', 'Invitation scope', 'Other scope'].map(name => client.event.create({ data: {
    name, startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'),
  } })));
  const race = async operation => {
    const results = await Promise.allSettled([operation(), operation()]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const failure = results.find(result => result.status === 'rejected');
    assert.equal(failure.reason.code, 'P2002', 'Database unique index must reject the competing writer');
  };
  for (const eventId of [null, events[0].id, events[2].id]) {
    await race(() => client.userRole.create({ data: { userId: user.id, roleId: role.id, eventId } }));
  }
  const roles = await client.userRole.findMany({ where: { userId: user.id }, orderBy: { id: 'asc' } });
  assert.equal(roles.length, 3, 'Global and different-event assignments must coexist');
  const invite = (eventId, extra = {}) => ({ email: 'scope-invitation@example.invalid', roleKey: 'moderator', eventId,
    createdBy: user.id, token: randomUUID(), expiresAt: new Date(Date.now() + 60000), ...extra });
  for (const eventId of [null, events[1].id, events[2].id]) {
    await race(() => client.invitation.create({ data: invite(eventId) }));
    await client.invitation.create({ data: invite(eventId, { usedAt: new Date() }) });
    await client.invitation.create({ data: invite(eventId, { supersededAt: new Date() }) });
  }
  const invitations = await client.invitation.findMany({ where: { createdBy: user.id }, orderBy: { id: 'asc' } });
  for (const event of events.slice(0, 2)) {
    await assert.rejects(client.event.delete({ where: { id: event.id } }), { code: 'P2003' });
    assert.ok(await client.event.findUnique({ where: { id: event.id } }));
  }
  assert.deepEqual(await client.userRole.findMany({ where: { userId: user.id }, orderBy: { id: 'asc' } }), roles);
  assert.deepEqual(await client.invitation.findMany({ where: { createdBy: user.id }, orderBy: { id: 'asc' } }), invitations);
  // History alone also restricts event removal.
  await client.invitation.deleteMany({ where: { eventId: events[1].id, usedAt: null, supersededAt: null } });
  await assert.rejects(client.event.delete({ where: { id: events[1].id } }), { code: 'P2003' });

  const request = async body => {
    const response = await fetch(baseUrl + '/api/v1/invitations', { method: 'POST',
      headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.json() };
  };
  for (const eventId of [null, events[1].id]) {
    const expired = await client.invitation.create({ data: invite(eventId, {
      email: 'replace-expired@example.invalid', expiresAt: new Date('2020-01-01'),
    }) });
    const body = { email: expired.email, roleKey: expired.roleKey, ...(eventId && { eventId }) };
    const results = await Promise.all([request(body), request(body)]);
    assert.equal(results.filter(result => result.status === 201).length, 1);
    assert.ok(results.every(result => [201, 409].includes(result.status)));
    const preserved = await client.invitation.findUniqueOrThrow({ where: { id: expired.id } });
    assert.ok(preserved.supersededAt);
    assert.deepEqual({ ...preserved, supersededAt: null }, expired, 'Replacement must preserve the full expired row');
    assert.equal(await client.invitation.count({ where: { email: body.email, roleKey: body.roleKey, eventId, usedAt: null, supersededAt: null } }), 1);
    const response = await fetch(baseUrl + '/api/v1/invitations/' + expired.token);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).reason, 'invitationExpired');
  }
  console.log('Scope integrity: concurrent global/event uniqueness, restrictive deletion, preserved history and expired-invitation replacement passed.');
};
