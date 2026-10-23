const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { DancerSchema, DancersSchema } = createRequire(path.resolve(__dirname, '../apps/api/package.json'))('@dance/schemas');

// Invoked only against the disposable database owned by test-baseline.cjs.
module.exports = async function checkDancers({ client, baseUrl, adminToken, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const owner = await client.user.create({ data: {
    email: 'dancer-owner@example.invalid', name: 'Dancer fixture', emailVerified: true, password: template.password,
  } });
  const outsider = await client.user.create({ data: {
    email: 'dancer-outsider@example.invalid', name: 'Other fixture', emailVerified: true, password: template.password,
  } });
  const eventData = { startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'), stage: 'REGISTRATION_OPEN' };
  const event = await client.event.create({ data: { ...eventData, name: 'Dancer integration' } });
  const otherEvent = await client.event.create({ data: { ...eventData, name: 'Other dancer event' } });
  const makeStudio = (eventId, name) => client.studio.create({ data: {
    eventId, name, approvalStatus: 'APPROVED',
    representatives: { create: { userId: owner.id, name: owner.name, email: owner.email } },
    registrations: { create: { eventId, status: 'APPROVED' } },
  }, include: { representatives: true, registrations: true } });
  const studio = await makeStudio(event.id, 'Dancer studio');
  const sibling = await makeStudio(event.id, 'Sibling studio');
  const otherStudio = await makeStudio(otherEvent.id, 'Other-event studio');
  const role = await client.role.findUniqueOrThrow({ where: { key: 'representative' } });
  for (const userId of [owner.id, outsider.id]) await client.userRole.create({ data: { userId, roleId: role.id, eventId: event.id } });
  const ownerToken = await login(baseUrl, owner.email);
  const outsiderToken = await login(baseUrl, outsider.email);
  const collection = `/studios/${studio.id}/dancers`;
  const request = async (route, token = ownerToken, method = 'GET', body) => {
    const response = await fetch(`${baseUrl}/api/v1${route}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const input = { firstName: ' First ', lastName: ' Last ', birthDate: '2012-02-29' };
  const created = await request(collection, ownerToken, 'POST', input);
  assert.equal(created.status, 201, 'An event-scoped representative must be able to create a dancer');
  const dancer = DancerSchema.parse(created.body);
  assert.equal(dancer.firstName, 'First');
  assert.equal(dancer.birthDate, '2012-02-29');
  assert.equal(dancer.photoUrl, null);
  assert.deepEqual(Object.keys(dancer).sort(), ['birthDate', 'firstName', 'id', 'lastName', 'photoUrl', 'studioId']);
  const item = `${collection}/${dancer.id}`;
  const stored = await client.dancer.findUniqueOrThrow({ where: { id: dancer.id } });
  assert.equal(stored.birthDate.toISOString(), '2012-02-29T00:00:00.000Z');
  assert.equal(DancersSchema.parse((await request(collection)).body).length, 1);
  assert.equal((await request(item)).body.birthDate, '2012-02-29');
  const patched = await request(item, ownerToken, 'PATCH', { lastName: ' Changed ' });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.lastName, 'Changed');
  assert.equal(patched.body.birthDate, '2012-02-29');

  for (const method of ['GET', 'PATCH', 'DELETE']) {
    const body = method === 'PATCH' ? { firstName: 'Changed' } : undefined;
    assert.equal((await request(`/studios/${sibling.id}/dancers/${dancer.id}`, adminToken, method, body)).status, 404);
    assert.equal((await request(item, outsiderToken, method, body)).status, 403);
  }
  assert.equal((await request(`/studios/${otherStudio.id}/dancers`)).status, 403, 'Ownership in another event cannot substitute for that event permission');
  await client.userRole.create({ data: { userId: owner.id, roleId: role.id, eventId: null } });
  assert.equal((await request(`/studios/${otherStudio.id}/dancers`)).status, 200, 'Global permission still requires studio membership');

  await client.studioRepresentative.update({ where: { id: studio.representatives[0].id }, data: { active: false } });
  assert.equal((await request(collection)).status, 403);
  await client.studioRepresentative.update({ where: { id: studio.representatives[0].id }, data: { active: true } });
  const registrationId = studio.registrations[0].id;
  for (const status of ['PENDING', 'REJECTED', 'LOCKED']) {
    await client.studioEventRegistration.update({ where: { id: registrationId }, data: { status } });
    assert.equal((await request(collection)).status, 403);
  }
  await client.studioEventRegistration.update({ where: { id: registrationId }, data: { status: 'APPROVED' } });
  await client.studio.update({ where: { id: studio.id }, data: { approvalStatus: 'REJECTED' } });
  assert.equal((await request(collection)).status, 403);
  await client.studio.update({ where: { id: studio.id }, data: { approvalStatus: 'APPROVED' } });

  await client.event.update({ where: { id: event.id }, data: { stage: 'DATA_REVIEW' } });
  assert.equal((await request(collection)).status, 200);
  assert.equal((await request(item, ownerToken, 'PATCH', { firstName: 'Blocked' })).status, 403);
  await client.studioEventRegistration.update({ where: { id: registrationId }, data: { canEditDuringReview: true } });
  assert.equal((await request(item, ownerToken, 'PATCH', { firstName: 'Review edit' })).status, 200);
  for (const stage of ['PRE_REGISTRATION', 'FINALIZED', 'ENDED', 'CANCELLED']) {
    await client.event.update({ where: { id: event.id }, data: { stage } });
    assert.equal((await request(collection)).status, 200);
    assert.equal((await request(collection, ownerToken, 'POST', input)).status, 403);
    assert.equal((await request(item, ownerToken, 'DELETE')).status, 403);
  }
  assert.equal((await request(item, adminToken, 'PATCH', { firstName: 'Admin edit' })).status, 200);
  await client.event.update({ where: { id: event.id }, data: { stage: 'REGISTRATION_OPEN' } });

  for (const body of [
    { ...input, birthDate: '2011-02-29' }, { ...input, birthDate: '2012-02-30' },
    { ...input, birthDate: '2012-02-29T00:00:00Z' }, { ...input, firstName: ' ' },
    { ...input, studioId: sibling.id },
  ]) assert.equal((await request(collection, ownerToken, 'POST', body)).status, 400);
  assert.equal((await request(item, ownerToken, 'PATCH', {})).status, 400);

  // Reads project the existing UTC calendar day without rewriting legacy times.
  const legacy = await client.dancer.create({ data: {
    studioId: studio.id, firstName: 'Legacy', lastName: 'Fixture', birthDate: new Date('2012-02-29T23:30:00Z'),
    photoPath: 'private-storage-path',
  } });
  const legacyResponse = await request(`${collection}/${legacy.id}`);
  assert.equal(legacyResponse.body.birthDate, '2012-02-29');
  assert.equal('photoPath' in legacyResponse.body, false);
  assert.equal((await client.dancer.findUniqueOrThrow({ where: { id: legacy.id } })).birthDate.toISOString(), '2012-02-29T23:30:00.000Z');

  await client.studio.update({ where: { id: studio.id }, data: { deletedAt: new Date() } });
  assert.equal((await request(collection, adminToken)).status, 404);
  assert.equal((await request(item, ownerToken, 'DELETE')).status, 404);
  await client.studio.update({ where: { id: studio.id }, data: { deletedAt: null } });
  assert.equal((await request(item, ownerToken, 'DELETE')).status, 204);
  const archived = await client.dancer.findUniqueOrThrow({ where: { id: dancer.id } });
  assert.equal(archived.deletedBy, owner.id);
  assert.ok(archived.deletedAt instanceof Date);
  assert.equal((await request(item, adminToken)).status, 404);
  assert.equal((await request(item, ownerToken, 'PATCH', { firstName: 'Restore attempt' })).status, 404);
  assert.equal((await request(item, ownerToken, 'DELETE')).status, 404);
  assert.equal((await request(collection)).body.some((record) => record.id === dancer.id), false);
  assert.ok(await client.dancer.findUnique({ where: { id: dancer.id } }), 'Deletion must archive the row');
  assert.equal((await request(`/dancers/${studio.id}/dancers`, adminToken)).status, 404);
  console.log('PASS: dancer HTTP/database CRUD, calendar dates, event/global permissions, ownership/parent checks, stage/review rules, active records, and audited soft deletion.');
};
