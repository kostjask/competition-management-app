const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { JudgeSchema, JudgesSchema } = createRequire(path.resolve(__dirname, '../apps/api/package.json'))('@dance/schemas');

// Runs only in the disposable database owned and cleaned by test-baseline.cjs.
module.exports = async function checkJudges({ client, baseUrl, adminToken, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const user = await client.user.create({ data: {
    email: 'judge-contract@example.invalid', name: 'Judge fixture', password: template.password, emailVerified: true,
  } });
  const event = await client.event.create({ data: {
    name: 'Judge contract event', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'),
  } });
  const other = await client.event.create({ data: {
    name: 'Other judge event', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'),
  } });
  const request = async (eventId, suffix = '', method = 'GET', body, token = adminToken) => {
    const response = await fetch(`${baseUrl}/api/v1/events/${eventId}/judges${suffix}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const body = { userId: user.id, name: ' Judge ', country: ' EE ' };
  const created = await request(event.id, '', 'POST', body);
  assert.equal(created.status, 201);
  const judge = JudgeSchema.parse(created.body);
  assert.equal(judge.name, 'Judge'); assert.equal(judge.country, 'EE'); assert.equal(judge.description, null);
  assert.equal(await client.userRole.count({ where: { userId: user.id } }), 0, 'CRUD never grants access roles');
  assert.equal((await request(event.id, '', 'POST', body)).status, 409);
  assert.equal(await client.judge.count({ where: { eventId: event.id } }), 1);
  assert.equal((await request(other.id, '', 'POST', body)).status, 201, 'Same user may judge another event');
  assert.equal(JudgesSchema.parse((await request(event.id)).body).length, 1);
  assert.equal((await request(event.id, `/${judge.id}`)).status, 200);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    assert.equal((await request(other.id, `/${judge.id}`, method, method === 'PATCH' ? { name: 'Blocked' } : undefined)).status, 404);
  }
  assert.equal((await request(event.id, `/${judge.id}`, 'PATCH', { country: null, city: ' Tallinn ' })).status, 200);
  const stored = await client.judge.findUniqueOrThrow({ where: { id: judge.id } });
  assert.equal(stored.country, null); assert.equal(stored.city, 'Tallinn'); assert.equal(stored.name, 'Judge');
  assert.equal((await request(event.id, `/${judge.id}`, 'PATCH', { eventId: other.id })).status, 400);
  assert.equal((await request(event.id, '', 'POST', { ...body, userId: 'missing' })).status, 404);
  await client.user.update({ where: { id: user.id }, data: { active: false } });
  assert.equal((await request(event.id, '', 'POST', body)).status, 409);
  await client.user.update({ where: { id: user.id }, data: { active: true } });
  const token = await login(baseUrl, user.email);
  const role = await client.role.findUniqueOrThrow({ where: { key: 'admin' } });
  const permission = await client.permission.findUniqueOrThrow({ where: { key: 'event.manage' } });
  const readerRole = await client.role.create({ data: {
    key: 'judge-contract-reader', name: 'Judge contract reader',
    permissions: { create: { permissionId: permission.id } },
  } });
  await client.userRole.create({ data: { userId: user.id, roleId: readerRole.id, eventId: event.id } });
  assert.equal((await request(event.id, '', 'GET', undefined, token)).status, 200);
  assert.equal((await request(other.id, '', 'GET', undefined, token)).status, 403);
  for (const [method, suffix, payload] of [['POST', '', body], ['PATCH', `/${judge.id}`, { name: 'Blocked' }], ['DELETE', `/${judge.id}`]]) {
    assert.equal((await request(event.id, suffix, method, payload, token)).status, 403);
  }
  const category = await client.danceCategory.create({ data: { eventId: event.id, name: 'Judge category' } });
  const age = await client.ageGroup.create({ data: { eventId: event.id, name: 'Judge age', minAge: 0 } });
  const format = await client.danceFormat.create({ data: {
    eventId: event.id, name: 'Judge format', minParticipants: 1, maxParticipants: 2, maxDurationSeconds: 300,
  } });
  const performance = await client.performance.create({ data: {
    eventId: event.id, categoryId: category.id, ageGroupId: age.id, formatId: format.id,
    title: 'Scored judge fixture', durationSec: 60, orderOnStage: 1,
  } });
  const score = await client.score.create({ data: { judgeId: judge.id, performanceId: performance.id, criterion: 'fixture', value: 1 } });
  const blocked = await request(event.id, `/${judge.id}`, 'DELETE');
  assert.equal(blocked.status, 409); assert.equal(blocked.body.code, 'CONFLICT');
  assert.ok(await client.judge.findUnique({ where: { id: judge.id } }));
  assert.ok(await client.score.findUnique({ where: { id: score.id } }));
  await client.score.delete({ where: { id: score.id } });
  // Existing access roles are never removed by record CRUD.
  await client.userRole.create({ data: { userId: user.id, roleId: role.id, eventId: other.id } });
  const beforeRoles = await client.userRole.count({ where: { userId: user.id } });
  assert.equal((await request(event.id, `/${judge.id}`, 'DELETE')).status, 204);
  assert.equal(await client.userRole.count({ where: { userId: user.id } }), beforeRoles);
  assert.equal((await request(event.id, `/${judge.id}`, 'DELETE')).status, 404);
  assert.deepEqual((await request(event.id)).body, []);
  console.log('Judge contracts, event permissions, unique assignments and score-preserving deletion passed.');
};
