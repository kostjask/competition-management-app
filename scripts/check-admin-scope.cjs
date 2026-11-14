const assert = require('node:assert/strict');
const { isDeepStrictEqual } = require('node:util');
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const jwt = createRequire(path.resolve(__dirname, '../apps/api/package.json'))('jsonwebtoken');
const { newIdentitySecret, rotateInvitationToken } = require('../apps/api/dist/services/identityTokens.js');

// Called only by the baseline runner, with its isolated database and synthetic JWT key.
module.exports = async function checkAdminScope({ client, baseUrl, adminToken, jwtSecret }) {
  const event = await client.event.create({ data: { name: 'Admin scope matrix', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
  const other = await client.event.create({ data: { name: 'Other admin scope', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
  const actor = await client.user.create({ data: { email: 'admin-scope@example.invalid', name: 'Scope actor', emailVerified: true } });
  const roles = Object.fromEntries((await client.role.findMany()).map(role => [role.key, role]));
  const token = jwt.sign({ userId: actor.id, sessionVersion: actor.sessionVersion }, jwtSecret);
  const request = async (url, method = 'GET', body, session = token) => {
    const response = await fetch(baseUrl + '/api/v1' + url, { method,
      headers: { Authorization: 'Bearer ' + session, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const snapshot = async () => Object.fromEntries(await Promise.all([
    'user', 'userRole', 'invitation', 'event', 'studio', 'studioRepresentative',
    'studioEventRegistration', 'judge', 'danceCategory', 'danceFormat', 'ageGroup', 'auditLog', 'reviewNotice', 'emailDelivery',
  ].map(async model => [model, await client[model].findMany({ orderBy: { id: 'asc' } })])));
  const operations = require('../docs/api-coverage.json').operations.filter(row => row.tests.globalAdmin);
  assert.equal(operations.length, 25);

  const matrices = [
    [], [{ roleId: roles.admin.id, eventId: event.id }],
    [{ roleId: roles.admin.id, eventId: null, removedAt: new Date() }],
    [{ roleId: roles.judge.id, eventId: null }],
    [{ roleId: roles.moderator.id, eventId: null }],
    [{ roleId: roles.admin.id, eventId: event.id }, { roleId: roles.moderator.id, eventId: other.id }],
  ];
  // Synthetic historical records deliberately exercise invalid/removed scopes.
  // They are retained rather than repaired or reclassified by an HTTP request.
  for (const assignments of matrices) {
    for (const assignment of assignments) await client.userRole.create({ data: { userId: actor.id, ...assignment } });
    const before = await snapshot();
    assert.equal((await request('/auth/profile')).body.isAdmin, false);
    for (const operation of operations) for (const eventId of [event.id, other.id]) {
      const url = (operation.mount + (operation.path === '/' ? '' : operation.path))
        .replace(':eventId', eventId).replace(/:[A-Za-z]+/g, 'scope-fixture');
      const result = await request(url, operation.method, operation.method === 'GET' ? undefined : {});
      assert.equal(result.status, 403, `${operation.method} ${url}`);
      assert.equal(result.body.token, undefined);
    }
    assert.ok(isDeepStrictEqual(await snapshot(), before), 'Denied scope matrix must preserve all domain and audit records');
    // Only synthetic assignments from this case are removed between cases.
    await client.userRole.deleteMany({ where: { userId: actor.id } });
  }

  // The same issued session loses the bypass as soon as its global assignment is removed.
  const assignment = await client.userRole.create({ data: { userId: actor.id, roleId: roles.admin.id, eventId: null } });
  assert.equal((await request('/auth/profile')).body.isAdmin, true);
  const created = await request('/events', 'POST', { name: 'Global admin control', startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-02T00:00:00Z' });
  assert.equal(created.status, 201);
  assert.equal((await request('/events/' + other.id, 'PATCH', { name: 'Global admin updated another event', expectedRevision: other.revision })).status, 200);
  await client.userRole.update({ where: { id: assignment.id }, data: { removedAt: new Date() } });
  const beforeRemovalDenial = await snapshot();
  assert.equal((await request('/events/' + other.id, 'PATCH', { name: 'Must stay unchanged' })).status, 403);
  assert.equal((await request('/auth/profile')).body.isAdmin, false);
  assert.ok(isDeepStrictEqual(await snapshot(), beforeRemovalDenial));

  // Unsupported invitations are refused before creating users, access, queue or audit.
  const beforeInvites = await snapshot();
  const mailCount = await client.emailDelivery.count();
  for (const body of [
    { roleKey: 'admin', eventId: event.id }, { roleKey: 'admin' },
    { roleKey: 'judge' }, { roleKey: 'judge', eventId: null },
    { roleKey: 'moderator', eventId: null }, { roleKey: 'representative', eventId: event.id },
    { roleKey: 'organizer', eventId: event.id },
  ]) assert.equal((await request('/invitations', 'POST', { email: 'unsupported-scope@example.invalid', ...body }, adminToken)).status, 400);
  assert.ok(isDeepStrictEqual(await snapshot(), beforeInvites));
  assert.equal(await client.emailDelivery.count(), mailCount);
  for (const [roleKey, eventId] of [['admin', null], ['admin', event.id], ['judge', null], ['moderator', null]]) {
    const secret = newIdentitySecret('INVITATION');
    const row = await client.invitation.create({ data: { email: `historical-${roleKey}-${eventId ? 'event' : 'global'}@example.invalid`,
      roleKey, eventId, createdBy: actor.id, tokenDigest: secret.digest, expiresAt: secret.expiresAt } });
    const before = await snapshot();
    assert.equal((await request('/invitations/' + secret.raw, 'GET', undefined, adminToken)).status, 400);
    assert.equal((await request('/invitations/accept', 'POST', { token: secret.raw, name: 'Fixture', password: 'fixture-password' }, adminToken)).status, 400);
    await assert.rejects(rotateInvitationToken(client, row.id));
    assert.ok(isDeepStrictEqual(await snapshot(), before));
  }

  // Exercise the exact read-only deployment preflight with synthetic bad scopes.
  await client.userRole.createMany({ data: [
    { userId: actor.id, roleId: roles.admin.id, eventId: event.id },
    { userId: actor.id, roleId: roles.judge.id, eventId: null },
  ] });
  const sql = readFileSync(path.join(__dirname, 'audit-scope-integrity.sql'), 'utf8');
  const query = sql.slice(sql.indexOf('SELECT'), sql.lastIndexOf('COMMIT;')).trim().replace(/;$/, '');
  const beforePreflight = await snapshot();
  const findings = await client.$queryRawUnsafe(query);
  const counts = Object.fromEntries(findings.map(row => [row.finding, Number(row.count)]));
  assert.ok(counts.active_scoped_admin_assignments >= 1);
  assert.ok(counts.active_global_staff_assignments >= 1);
  assert.ok(counts.removed_admin_assignments >= 1);
  assert.ok(isDeepStrictEqual(await snapshot(), beforePreflight));
  console.log('Admin scope: all 25 privileged operations deny scoped/removed/global-staff identities, preserve records, and honor only active global admin; invitation denial and aggregate preflight passed.');
};
