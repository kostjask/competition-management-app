const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { CategorySchema, CategoriesSchema } = createRequire(path.resolve(__dirname, '../apps/api/package.json'))('@dance/schemas');

// Uses only the disposable database owned and cleaned by test-baseline.cjs.
module.exports = async function checkCategories({ client, baseUrl, adminToken, login }) {
  const eventData = { startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') };
  const event = await client.event.create({ data: { ...eventData, name: 'Category contract' } });
  const other = await client.event.create({ data: { ...eventData, name: 'Other category event' } });
  const request = async (eventId, suffix = '', method = 'GET', body, token = adminToken) => {
    const response = await fetch(baseUrl + '/api/v1/events/' + eventId + '/categories' + suffix, {
      method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const created = await request(event.id, '', 'POST', { name: ' Ballet ' });
  assert.equal(created.status, 201);
  const category = CategorySchema.parse(created.body);
  assert.deepEqual(category, { id: category.id, eventId: event.id, name: 'Ballet' });
  assert.equal((await request(event.id, '', 'POST', { name: 'Ballet' })).status, 409);
  assert.equal((await request(other.id, '', 'POST', { name: 'Ballet' })).status, 201);
  const second = await request(event.id, '', 'POST', { name: 'Jazz' });
  assert.equal(second.status, 201);
  assert.equal((await request(event.id, '/' + second.body.id, 'PATCH', { name: ' Ballet ' })).status, 409);
  assert.equal((await client.danceCategory.findUniqueOrThrow({ where: { id: second.body.id } })).name, 'Jazz');
  assert.deepEqual(CategoriesSchema.parse((await request(event.id)).body).map(c => c.name), ['Ballet', 'Jazz']);
  assert.deepEqual((await request(event.id, '/' + category.id)).body, category);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    assert.equal((await request(other.id, '/' + category.id, method, method === 'PATCH' ? { name: 'Blocked' } : undefined)).status, 404);
  }
  for (const [method, suffix, body] of [['GET', ''], ['POST', '', { name: 'X' }], ['GET', '/' + category.id], ['PATCH', '/' + category.id, { name: 'X' }], ['DELETE', '/' + category.id]]) {
    assert.equal((await request('missing-category-event', suffix, method, body)).status, 404);
  }
  assert.equal((await request(event.id, '/' + category.id, 'PATCH', { name: ' Modern ' })).body.name, 'Modern');
  assert.equal((await client.danceCategory.findUniqueOrThrow({ where: { id: category.id } })).name, 'Modern');
  assert.equal((await request(event.id, '/' + category.id, 'PATCH', {})).status, 400);
  assert.equal((await request(event.id, '', 'POST', { name: 'X', eventId: other.id })).status, 400);
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const user = await client.user.create({ data: { email: 'category-reader@example.invalid', name: 'Category reader', password: template.password, emailVerified: true } });
  const permission = await client.permission.findUniqueOrThrow({ where: { key: 'event.manage' } });
  const readerRole = await client.role.create({ data: { key: 'category-reader', name: 'Category reader', permissions: { create: { permissionId: permission.id } } } });
  const membership = await client.userRole.create({ data: { userId: user.id, roleId: readerRole.id, eventId: event.id } });
  const token = await login(baseUrl, user.email);
  assert.equal((await request(event.id, '', 'GET', undefined, token)).status, 200);
  assert.equal((await request(event.id, '/' + category.id, 'GET', undefined, token)).status, 200);
  assert.equal((await request(other.id, '', 'GET', undefined, token)).status, 403);
  for (const [method, suffix, body] of [['POST', '', { name: 'X' }], ['PATCH', '/' + category.id, { name: 'X' }], ['DELETE', '/' + category.id]]) {
    assert.equal((await request(event.id, suffix, method, body, token)).status, 403);
  }
  await client.userRole.update({ where: { id: membership.id }, data: { eventId: null } });
  assert.equal((await request(other.id, '', 'GET', undefined, token)).status, 200);
  const age = await client.ageGroup.create({ data: { eventId: event.id, name: 'Category age', minAge: 0 } });
  const format = await client.danceFormat.create({ data: { eventId: event.id, name: 'Category format', minParticipants: 1, maxParticipants: 2, maxDurationSeconds: 300 } });
  const performance = await client.performance.create({ data: { eventId: event.id, categoryId: category.id, ageGroupId: age.id, formatId: format.id, title: 'Category usage', durationSec: 60, orderOnStage: 1 } });
  const blocked = await request(event.id, '/' + category.id, 'DELETE');
  assert.equal(blocked.status, 409); assert.equal(blocked.body.code, 'CONFLICT');
  assert.ok(await client.danceCategory.findUnique({ where: { id: category.id } }));
  assert.ok(await client.performance.findUnique({ where: { id: performance.id } }));
  await client.performance.update({ where: { id: performance.id }, data: { deletedAt: new Date(), deletedBy: template.id } });
  assert.equal((await request(event.id, '/' + category.id, 'DELETE')).status, 409, 'Archived performances still retain their category');
  const races = await Promise.all([request(event.id, '', 'POST', { name: 'Concurrent' }), request(event.id, '', 'POST', { name: 'Concurrent' })]);
  assert.deepEqual(races.map(r => r.status).sort(), [201, 409]);
  assert.equal(await client.danceCategory.count({ where: { eventId: event.id, name: 'Concurrent' } }), 1);
  assert.equal((await request(event.id, '/' + second.body.id, 'DELETE')).status, 204);
  assert.equal(await client.danceCategory.findUnique({ where: { id: second.body.id } }), null);
  assert.equal((await request(event.id, '/' + second.body.id, 'DELETE')).status, 404);
  console.log('Category CRUD, strict DTOs, scoped permissions, concurrent uniqueness and performance-preserving deletion passed.');
};
