const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { PerformanceSchema } = createRequire(path.resolve(__dirname, '../apps/api/package.json'))('@dance/schemas');

// Runs only in the disposable PostgreSQL database owned by test-baseline.cjs.
module.exports = async function checkPerformances({ client, baseUrl, adminToken, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const makeUser = (name) => client.user.create({ data: {
    email: `performance-${name}@example.invalid`, name, emailVerified: true, password: template.password,
  } });
  const owner = await makeUser('owner');
  const outsider = await makeUser('outsider');
  const makeEvent = (name) => client.event.create({ data: {
    name, startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'), stage: 'REGISTRATION_OPEN',
    categories: { create: { name: 'Category' } }, ageGroups: { create: { name: 'All', minAge: 0 } },
    formats: { create: { name: 'Group', minParticipants: 1, maxParticipants: 10, maxDurationSeconds: 300 } },
  }, include: { categories: true, ageGroups: true, formats: true } });
  const event = await makeEvent('Performance integration');
  const other = await makeEvent('Other performance event');
  const makeStudio = (e, name, user) => client.studio.create({ data: {
    name, eventId: e.id, approvalStatus: 'APPROVED',
    representatives: { create: { userId: user.id, name: user.name, email: user.email } },
    registrations: { create: { eventId: e.id, status: 'APPROVED' } },
    dancers: { create: [1, 2].map((n) => ({ firstName: `Dancer ${n}`, lastName: 'Fixture', birthDate: new Date('2012-02-29'), photoPath: 'private-path' })) },
  }, include: { dancers: true, representatives: true, registrations: true } });
  const studio = await makeStudio(event, 'Owned performance studio', owner);
  const sibling = await makeStudio(event, 'Other performance studio', outsider);
  const otherStudio = await makeStudio(other, 'Other-event performance studio', owner);
  const role = await client.role.findUniqueOrThrow({ where: { key: 'representative' } });
  for (const userId of [owner.id, outsider.id]) await client.userRole.create({ data: { userId, roleId: role.id, eventId: event.id } });
  const ownerToken = await login(baseUrl, owner.email);
  const outsiderToken = await login(baseUrl, outsider.email);
  const collection = `/events/${event.id}/performances`;
  const otherCollection = `/events/${other.id}/performances`;
  const request = async (route, token = ownerToken, method = 'GET', body) => {
    const response = await fetch(`${baseUrl}/api/v1${route}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const inputFor = (e, s, orderOnStage) => ({ studioId: s.id, title: ' Title ', durationSec: 60, orderOnStage,
    categoryId: e.categories[0].id, ageGroupId: e.ageGroups[0].id, formatId: e.formats[0].id,
    dancerIds: [s.dancers[0].id] });
  const input = inputFor(event, studio, 1);
  const created = await request(collection, ownerToken, 'POST', input);
  assert.equal(created.status, 201);
  const performance = PerformanceSchema.parse(created.body);
  assert.equal(performance.title, 'Title');
  assert.equal(performance.participants[0].dancer.birthDate, '2012-02-29');
  assert.equal('photoPath' in performance.participants[0].dancer, false);
  assert.equal('createdAt' in performance, false);
  const item = `${collection}/${performance.id}`;
  const siblingCreated = await request(collection, outsiderToken, 'POST', inputFor(event, sibling, 2));
  assert.equal(siblingCreated.status, 201);
  assert.deepEqual((await request(collection)).body.map((p) => p.id), [performance.id]);
  assert.equal((await request(collection, adminToken)).body.length, 2);
  assert.equal((await request(`${collection}?studioId=${sibling.id}`)).status, 403);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    const body = method === 'PATCH' ? { title: 'Blocked' } : undefined;
    assert.equal((await request(item, outsiderToken, method, body)).status, 403);
    assert.equal((await request(`${otherCollection}/${performance.id}`, adminToken, method, body)).status, 404);
  }
  assert.equal((await request(otherCollection)).status, 403);
  await client.userRole.create({ data: { userId: owner.id, roleId: role.id, eventId: null } });
  assert.equal((await request(otherCollection, ownerToken, 'POST', inputFor(other, otherStudio, 1))).status, 201);
  assert.equal((await request(otherCollection)).body.length, 1);
  assert.equal((await request(otherCollection, adminToken, 'POST', input)).status, 404, 'Admins must also respect studio/event relationships');
  for (const field of ['categoryId', 'ageGroupId', 'formatId']) {
    const foreign = inputFor(other, otherStudio, 1)[field];
    assert.equal((await request(item, adminToken, 'PATCH', { [field]: foreign })).status, 409);
    assert.equal((await request(collection, adminToken, 'POST', { ...input, orderOnStage: 10, [field]: foreign })).status, 409);
  }
  assert.equal((await request(item, ownerToken, 'PATCH', { dancerIds: [sibling.dancers[0].id] })).status, 409);
  await client.dancer.update({ where: { id: studio.dancers[1].id }, data: { deletedAt: new Date() } });
  assert.equal((await request(item, adminToken, 'PATCH', { dancerIds: [studio.dancers[1].id] })).status, 409);
  await client.dancer.update({ where: { id: studio.dancers[1].id }, data: { deletedAt: null } });
  assert.equal((await request(item, ownerToken, 'PATCH', { dancerIds: [studio.dancers[1].id] })).status, 200);
  assert.deepEqual((await client.performanceParticipant.findMany({ where: { performanceId: performance.id } })).map((p) => p.dancerId), [studio.dancers[1].id]);

  // An order conflict must roll back the nested participant deletion/replacement too.
  const before = await client.performance.findUniqueOrThrow({ where: { id: performance.id }, include: { participants: true } });
  const conflict = await request(item, ownerToken, 'PATCH', { orderOnStage: 2, dancerIds: [studio.dancers[0].id] });
  assert.equal(conflict.status, 409); assert.equal(conflict.body.code, 'CONFLICT');
  assert.deepEqual(await client.performance.findUniqueOrThrow({ where: { id: performance.id }, include: { participants: true } }), before);
  assert.equal((await request(collection, ownerToken, 'POST', input)).status, 409);
  assert.equal(await client.performance.count({ where: { eventId: event.id } }), 2);

  const repId = studio.representatives[0].id;
  const regId = studio.registrations[0].id;
  await client.studioRepresentative.update({ where: { id: repId }, data: { active: false } });
  assert.equal((await request(item)).status, 403); assert.deepEqual((await request(collection)).body, []);
  await client.studioRepresentative.update({ where: { id: repId }, data: { active: true } });
  for (const status of ['PENDING', 'REJECTED', 'LOCKED']) {
    await client.studioEventRegistration.update({ where: { id: regId }, data: { status } });
    assert.equal((await request(item)).status, 403); assert.deepEqual((await request(collection)).body, []);
  }
  await client.studioEventRegistration.update({ where: { id: regId }, data: { status: 'APPROVED' } });
  await client.studio.update({ where: { id: studio.id }, data: { approvalStatus: 'PENDING' } });
  assert.equal((await request(item)).status, 403);
  assert.equal((await request(item, adminToken)).status, 200);
  await client.studio.update({ where: { id: studio.id }, data: { approvalStatus: 'APPROVED' } });
  await client.event.update({ where: { id: event.id }, data: { stage: 'DATA_REVIEW' } });
  assert.equal((await request(item)).status, 200);
  assert.equal((await request(item, ownerToken, 'PATCH', { title: 'Blocked' })).status, 403);
  await client.studioEventRegistration.update({ where: { id: regId }, data: { canEditDuringReview: true } });
  assert.equal((await request(item, ownerToken, 'PATCH', { title: 'Review' })).status, 200);
  for (const stage of ['PRE_REGISTRATION', 'FINALIZED', 'ENDED', 'CANCELLED']) {
    await client.event.update({ where: { id: event.id }, data: { stage } });
    assert.equal((await request(item)).status, 200);
    assert.equal((await request(item, ownerToken, 'DELETE')).status, 403);
  }
  assert.equal((await request(item, adminToken, 'PATCH', { title: 'Admin' })).status, 200);
  await client.event.update({ where: { id: event.id }, data: { stage: 'REGISTRATION_OPEN' } });
  await client.studio.update({ where: { id: studio.id }, data: { deletedAt: new Date() } });
  assert.equal((await request(item, adminToken)).status, 404);
  assert.equal((await request(collection, adminToken)).body.length, 1);
  await client.studio.update({ where: { id: studio.id }, data: { deletedAt: null } });
  await client.studio.update({ where: { id: studio.id }, data: { eventId: other.id } });
  assert.equal((await request(item, adminToken)).status, 404, 'A contradictory legacy registration cannot replace Studio.eventId');
  assert.deepEqual((await request(collection)).body, []);
  await client.studio.update({ where: { id: studio.id }, data: { eventId: event.id } });

  // Legacy mixed/empty participants never grant access through any one owner.
  const mixed = await client.performance.create({ data: {
    eventId: event.id, categoryId: input.categoryId, ageGroupId: input.ageGroupId, formatId: input.formatId,
    title: 'Legacy mixed', durationSec: 60, orderOnStage: 20,
    participants: { create: [studio.dancers[0], sibling.dancers[0]].map((d) => ({ dancerId: d.id })) },
  } });
  const empty = await client.performance.create({ data: {
    eventId: event.id, categoryId: input.categoryId, ageGroupId: input.ageGroupId, formatId: input.formatId,
    title: 'Legacy empty', durationSec: 60, orderOnStage: 21,
  } });
  for (const p of [mixed, empty]) {
    assert.equal((await request(`${collection}/${p.id}`, adminToken)).status, 409);
    assert.equal((await request(`${collection}/${p.id}`)).status, 409);
    assert.equal((await request(collection, adminToken)).body.some((row) => row.id === p.id), false);
  }
  const judge = await client.judge.create({ data: { eventId: event.id, userId: template.id, name: 'Archive fixture judge' } });
  const score = await client.score.create({ data: { performanceId: performance.id, judgeId: judge.id, criterion: 'Fixture', value: 5 } });
  assert.equal((await request(item, ownerToken, 'DELETE')).status, 204);
  const archived = await client.performance.findUniqueOrThrow({ where: { id: performance.id }, include: { participants: true } });
  assert.equal(archived.deletedBy, owner.id); assert.ok(archived.deletedAt instanceof Date);
  assert.equal(archived.participants.length, 1);
  assert.deepEqual(await client.score.findUniqueOrThrow({ where: { id: score.id } }), score);
  for (const method of ['GET', 'PATCH', 'DELETE'])
    assert.equal((await request(item, adminToken, method, method === 'PATCH' ? { title: 'Restore' } : undefined)).status, 404);
  assert.equal((await request(collection)).body.some((row) => row.id === performance.id), false);
  assert.equal((await request(collection, ownerToken, 'POST', input)).status, 409, 'Archived orders remain reserved by the existing database constraint');
  console.log('PASS: performance canonical CRUD/DTOs, event/global scope, ownership/approvals, configuration/participants, stage/review, nested-write rollback, legacy guards and audited soft deletion.');
};
