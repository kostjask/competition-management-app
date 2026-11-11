const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { PerformanceSchema, PerformanceHistorySchema } = createRequire(path.resolve(__dirname, '../apps/api/package.json'))('@dance/schemas');

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
    if (method === 'PATCH' || method === 'DELETE') {
      const id = route.split('/').at(-1);
      const stored = await client.performance.findUnique({ where: { id }, select: { revision: true } });
      if (method === 'PATCH') body = { expectedRevision: stored?.revision ?? 1, ...body };
      else route += '?expectedRevision=' + (stored?.revision ?? 1);
    }
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
  assert.equal(performance.studioId, studio.id); assert.equal(performance.registrationId, studio.registrations[0].id);
  assert.equal(performance.participants[0].dancer.birthDate, '2012-02-29');
  assert.equal('photoPath' in performance.participants[0].dancer, false);
  assert.equal('createdAt' in performance, false);
  const item = `${collection}/${performance.id}`;
  const initialHistory = PerformanceHistorySchema.parse((await request(item + '/history')).body);
  assert.equal(initialHistory.length, 1); assert.equal(initialHistory[0].origin, 'CREATE');
  assert.equal(initialHistory[0].actorKind, 'USER');
  assert.equal(initialHistory[0].snapshot.studioName, studio.name);
  assert.equal(initialHistory[0].snapshot.participants[0].birthDate, '2012-02-29');
  assert.deepEqual(Object.keys(initialHistory[0].snapshot.participants[0]).sort(), ['birthDate', 'dancerId', 'firstName', 'lastName']);
  assert.equal((await request(item + '/history', outsiderToken)).status, 403);
  assert.equal((await request(`${otherCollection}/${performance.id}/history`, adminToken)).status, 404);
  const originalDancer = studio.dancers[0];
  await client.dancer.update({ where: { id: originalDancer.id }, data: { firstName: 'Changed after capture', birthDate: new Date('2010-01-01') } });
  await client.studio.update({ where: { id: studio.id }, data: { name: 'Renamed after capture' } });
  await client.danceCategory.update({ where: { id: input.categoryId }, data: { name: 'Changed category' } });
  await client.ageGroup.update({ where: { id: input.ageGroupId }, data: { minAge: 5 } });
  await client.danceFormat.update({ where: { id: input.formatId }, data: { maxDurationSeconds: 250 } });
  await client.event.update({ where: { id: event.id }, data: { startsAt: new Date('2026-11-01T00:30:00Z'), timeZone: 'America/Los_Angeles' } });
  assert.deepEqual((await request(item + '/history')).body, initialHistory, 'All historical display must use frozen source values');
  assert.equal((await request(item, ownerToken, 'PATCH', { title: 'New revision', expectedRevision: 1 })).status, 200);
  assert.equal((await request(item, ownerToken, 'PATCH', { title: 'Stale overwrite', expectedRevision: 1 })).status, 409);
  const latest = PerformanceHistorySchema.parse((await request(item + '/history')).body);
  assert.equal(latest[0].revision, 2); assert.equal(latest[0].snapshot.ageDate, '2026-10-31');
  assert.equal(latest[0].snapshot.studioName, 'Renamed after capture');
  assert.equal(latest[0].snapshot.participants[0].firstName, 'Changed after capture');
  assert.deepEqual(latest[1], initialHistory[0]);
  const savedRevision = await client.performanceRevision.findFirstOrThrow({ where: { performanceId: performance.id } });
  await assert.rejects(client.performanceRevision.update({ where: { id: savedRevision.id }, data: { origin: 'EDIT' } }));
  await assert.rejects(client.performanceRevision.delete({ where: { id: savedRevision.id } }));
  const concurrent = await Promise.all(['One', 'Two'].map(title => request(item, ownerToken, 'PATCH', { title, expectedRevision: 2 })));
  assert.deepEqual(concurrent.map(row => row.status).sort(), [200, 409]);
  assert.equal(await client.performanceRevision.count({ where: { performanceId: performance.id } }), 3);
  // An audit failure must roll back the saved fields, participant replacement and snapshot.
  const beforeAuditFailure = await client.performance.findUniqueOrThrow({ where: { id: performance.id }, include: { participants: true } });
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_history_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'PERFORMANCE_UPDATED' THEN RAISE EXCEPTION 'Synthetic history audit failure'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe(`CREATE TRIGGER history_audit_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_history_audit()`);
  try {
    assert.equal((await request(item, ownerToken, 'PATCH', { title: 'Must roll back', dancerIds: [studio.dancers[1].id] })).status, 500);
    assert.deepEqual(await client.performance.findUniqueOrThrow({ where: { id: performance.id }, include: { participants: true } }), beforeAuditFailure);
    assert.equal(await client.performanceRevision.count({ where: { performanceId: performance.id } }), 3);
  } finally {
    await client.$executeRawUnsafe('DROP TRIGGER history_audit_failure ON "AuditLog"');
    await client.$executeRawUnsafe('DROP FUNCTION reject_history_audit()');
  }
  const historyAudits = await client.auditLog.findMany({ where: { targetId: performance.id, targetType: 'PERFORMANCE' }, orderBy: { createdAt: 'asc' } });
  assert.equal(historyAudits.length, 3);
  assert.deepEqual(historyAudits.map(row => row.metadata.revision).sort(), [1, 2, 3]);
  assert.ok(historyAudits.every(row => Object.keys(row.metadata).join() === 'revision'));
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
  await assert.rejects(client.studio.update({ where: { id: studio.id }, data: { eventId: other.id } }), { code: 'P2003' });
  // Empty participant sets retain an explicit owner. Mixed sets are impossible.
  const empty = await client.performance.create({ data: {
    eventId: event.id, studioId: studio.id, registrationId: regId,
    categoryId: input.categoryId, ageGroupId: input.ageGroupId, formatId: input.formatId,
    title: 'Empty owned fixture', durationSec: 60, orderOnStage: 21,
  } });
  const emptyDetail = await request(collection + '/' + empty.id);
  assert.equal(emptyDetail.status, 200); assert.equal(emptyDetail.body.studioId, studio.id);
  assert.equal((await request(collection)).body.some(p => p.id === empty.id), true);
  await assert.rejects(client.performanceParticipant.create({ data: {
    performanceId: empty.id, dancerId: sibling.dancers[0].id, studioId: studio.id,
  } }), { code: 'P2003' });
  await assert.rejects(client.performanceParticipant.create({ data: {
    performanceId: empty.id, dancerId: sibling.dancers[0].id, studioId: sibling.id,
  } }), { code: 'P2003' });
  for (const data of [{ studioId: sibling.id, registrationId: sibling.registrations[0].id },
    { eventId: other.id }, { registrationId: otherStudio.registrations[0].id }]) {
    await assert.rejects(client.performance.update({ where: { id: empty.id }, data }));
    assert.equal((await client.performance.findUniqueOrThrow({ where: { id: empty.id } })).studioId, studio.id);
  }
  for (const field of ['categoryId', 'ageGroupId', 'formatId']) {
    await assert.rejects(client.performance.update({ where: { id: empty.id }, data: { [field]: inputFor(other, otherStudio, 1)[field] } }), { code: 'P2003' });
  }
  await assert.rejects(client.studioEventRegistration.delete({ where: { id: regId } }), { code: 'P2003' });
  await assert.rejects(client.dancer.update({ where: { id: studio.dancers[1].id }, data: { studioId: sibling.id } }), { code: 'P2003' });
  // Direct SQL bypasses Zod/controllers and must still preserve all row bounds.
  for (const [table, id, assignment] of [
    ['Event', event.id, '"endsAt" = "startsAt" - interval \'1 second\''],
    ['Event', event.id, '"maxStudios" = 0'],
    ['Event', event.id, '"maxPerformances" = -1'],
    ['AgeGroup', input.ageGroupId, '"minAge" = -1'],
    ['AgeGroup', input.ageGroupId, '"minAge" = 10, "maxAge" = 9'],
    ['DanceFormat', input.formatId, '"minParticipants" = 0'],
    ['DanceFormat', input.formatId, '"maxParticipants" = 0'],
    ['DanceFormat', input.formatId, '"maxDurationSeconds" = -1'],
    ['Performance', empty.id, '"durationSec" = 0'],
    ['Performance', empty.id, '"orderOnStage" = -1'],
  ]) {
    // Table/assignment are constant test-owned SQL, never request data.
    const before = await client.$queryRawUnsafe(`SELECT * FROM "${table}" WHERE id = $1`, id);
    await assert.rejects(client.$executeRawUnsafe(`UPDATE "${table}" SET ${assignment} WHERE id = $1`, id));
    assert.deepEqual(await client.$queryRawUnsafe(`SELECT * FROM "${table}" WHERE id = $1`, id), before);
  }
  // Concurrent creates cannot duplicate an event's reserved order or participants.
  const races = await Promise.all([1, 2].map(() => request(collection, ownerToken, 'POST', { ...input, orderOnStage: 30 })));
  assert.deepEqual(races.map(row => row.status).sort(), [201, 409]);
  assert.equal(await client.performance.count({ where: { eventId: event.id, orderOnStage: 30 } }), 1);
  const judge = await client.judge.create({ data: { eventId: event.id, userId: template.id, name: 'Archive fixture judge' } });
  const score = await client.score.create({ data: { performanceId: performance.id, judgeId: judge.id, criterion: 'Fixture', value: 5 } });
  assert.equal((await request(item, ownerToken, 'DELETE')).status, 204);
  const archived = await client.performance.findUniqueOrThrow({ where: { id: performance.id }, include: { participants: true } });
  const archiveVersion = await client.performanceRevision.findUniqueOrThrow({ where: { performanceId_revision: { performanceId: performance.id, revision: archived.revision } } });
  assert.equal(archiveVersion.origin, 'ARCHIVE'); assert.equal(archiveVersion.snapshot.archived, true);
  assert.equal((await request(item + '/history', adminToken)).status, 404);
  assert.equal(archived.deletedBy, owner.id); assert.ok(archived.deletedAt instanceof Date);
  assert.equal(archived.participants.length, 1);
  assert.deepEqual(await client.score.findUniqueOrThrow({ where: { id: score.id } }), score);
  for (const method of ['GET', 'PATCH', 'DELETE'])
    assert.equal((await request(item, adminToken, method, method === 'PATCH' ? { title: 'Restore' } : undefined)).status, 404);
  assert.equal((await request(collection)).body.some((row) => row.id === performance.id), false);
  assert.equal((await request(collection, ownerToken, 'POST', input)).status, 409, 'Archived orders remain reserved by the existing database constraint');
  // Incomplete drafts never reserve a stage order and preserve one history/owner identity.
  const { randomUUID } = require('node:crypto');
  const draftBody = { studioId: studio.id, operationId: randomUUID() };
  const firstDraft = await request(collection, ownerToken, 'POST', draftBody);
  assert.equal(firstDraft.status, 201);
  const draft = PerformanceSchema.parse(firstDraft.body);
  for (const key of ['title', 'durationSec', 'orderOnStage', 'categoryId', 'ageGroupId', 'formatId']) assert.equal(draft[key], null);
  assert.deepEqual(draft.participants, []);
  const draftItem = `${collection}/${draft.id}`;
  const draftHistory = PerformanceHistorySchema.parse((await request(draftItem + '/history')).body);
  assert.equal(draftHistory[0].snapshot.policyVersion, 2);
  assert.deepEqual(draftHistory[0].snapshot.configuration, { category: null, ageGroup: null, format: null });
  assert.equal((await request(collection, ownerToken, 'POST', draftBody)).body.id, draft.id);
  assert.equal(await client.performanceRevision.count({ where: { performanceId: draft.id } }), 1);
  assert.equal(await client.auditLog.count({ where: { targetId: draft.id } }), 1);
  await client.event.update({ where: { id: event.id }, data: { stage: 'FINALIZED' } });
  assert.equal((await request(collection, ownerToken, 'POST', draftBody)).body.id, draft.id, 'Reconciliation remains readable after the write window closes');
  assert.equal((await request(collection, ownerToken, 'POST', { studioId: studio.id, operationId: randomUUID() })).status, 403);
  await client.event.update({ where: { id: event.id }, data: { stage: 'REGISTRATION_OPEN' } });
  await client.studioRepresentative.update({ where: { id: repId }, data: { active: false } });
  assert.equal((await request(collection, ownerToken, 'POST', draftBody)).status, 403, 'Retry cannot bypass current membership');
  await client.studioRepresentative.update({ where: { id: repId }, data: { active: true } });
  assert.equal((await request(collection, ownerToken, 'POST', { ...draftBody, title: 'Changed reuse' })).status, 409);
  assert.equal((await request(collection, adminToken, 'POST', draftBody)).status, 409, 'Operation IDs are actor bound');
  assert.equal((await request(otherCollection, ownerToken, 'POST', { ...draftBody, studioId: otherStudio.id })).status, 409);
  assert.equal((await request(draftItem, outsiderToken)).status, 403);
  const secondDraft = await request(collection, ownerToken, 'POST', { studioId: studio.id });
  assert.equal(secondDraft.status, 201); assert.equal(secondDraft.body.orderOnStage, null);
  const completed = await request(draftItem, ownerToken, 'PATCH', { ...input, studioId: undefined, orderOnStage: null });
  assert.equal(completed.status, 200); assert.equal(completed.body.id, draft.id);
  assert.equal(completed.body.revision, 2); assert.equal(completed.body.orderOnStage, null);
  const cleared = await request(draftItem, ownerToken, 'PATCH', { title: null, durationSec: null, categoryId: null, ageGroupId: null, formatId: null, dancerIds: [] });
  assert.equal(cleared.status, 200); assert.equal(cleared.body.revision, 3);
  assert.equal(cleared.body.categoryId, null); assert.deepEqual(cleared.body.participants, []);
  assert.equal((await request(draftItem, ownerToken, 'PATCH', { title: 'Stale draft', expectedRevision: 1 })).status, 409);
  assert.equal((await request(draftItem, ownerToken, 'PATCH', { categoryId: other.categories[0].id })).status, 409);
  assert.equal((await request(draftItem, ownerToken, 'PATCH', { dancerIds: [sibling.dancers[0].id] })).status, 409);
  assert.deepEqual((await request(draftItem + '/history')).body.at(-1), draftHistory[0]);
  const raceBody = { studioId: studio.id, operationId: randomUUID() };
  const draftRace = await Promise.all([1, 2].map(() => request(collection, ownerToken, 'POST', raceBody)));
  assert.ok(draftRace.every(row => [201, 409].includes(row.status)));
  assert.equal(await client.performance.count({ where: { creationOperationId: raceBody.operationId } }), 1);
  const recovered = await request(collection, ownerToken, 'POST', raceBody);
  assert.equal(recovered.status, 201);
  assert.equal(await client.performanceRevision.count({ where: { performanceId: recovered.body.id } }), 1);
  await assert.rejects(client.performance.update({ where: { id: draft.id }, data: { creationOperationId: randomUUID(), creationDigest: null } }));
  assert.equal((await request(draftItem, ownerToken, 'DELETE')).status, 204);
  assert.equal((await request(collection, ownerToken, 'POST', draftBody)).status, 409, 'Archived draft operation IDs never create replacements');
  console.log('PASS: incomplete unscheduled drafts, nullable revision capture, clearing/completion, retry digest/scope/concurrency, stale writes and archived-operation retention.');
  console.log('PASS: performance canonical CRUD/DTOs, event/global scope, ownership/approvals, configuration/participants, stage/review, nested-write rollback, explicit empty ownership, composite membership keys and retained soft deletion.');
};
