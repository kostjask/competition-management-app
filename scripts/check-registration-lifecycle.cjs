const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

// This runner receives only test-baseline.cjs's random disposable database.
module.exports = async function checkRegistrationLifecycle({ client, baseUrl, adminToken, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const owner = await client.user.create({ data: { email: 'lifecycle-owner@example.invalid', name: 'Lifecycle owner', emailVerified: true, password: template.password } });
  const token = await login(baseUrl, owner.email);
  const outsider = await login(baseUrl, 'judge@test.com');
  const request = async (path, auth = token, method = 'GET', body) => {
    if (path.endsWith("/approval") && body && !body.revision) { const studioId = path.split("/")[2]; const current = await client.studioEventRegistration.findFirstOrThrow({ where: { studioId } }); body = { ...body, eventId: current.eventId, revision: current.revision }; }
    const response = await fetch(baseUrl + '/api/v1' + path, { method, headers: { Authorization: 'Bearer ' + auth, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const eventResult = await request('/events', adminToken, 'POST', { name: 'Lifecycle fixture', startsAt: '2099-10-25T10:00:00+02:00', endsAt: '2099-10-25T12:00:00+02:00', timeZone: 'Europe/Tallinn', registrationDeadline: '2099-10-24T23:59:00+03:00' });
  assert.equal(eventResult.status, 201);
  const event = eventResult.body;
  const eventPath = '/events/' + event.id;
  assert.equal(event.registrationDeadline, '2099-10-24T20:59:00.000Z');
  const root = eventPath + '/studio-registrations';
  const application = { name: 'Lifecycle studio', representativeName: owner.name, representativeEmail: owner.email, operationId: randomUUID() };
  const initial = await request(root, token, 'POST', application);
  assert.equal(initial.status, 201);
  const id = initial.body.studioId; const item = root + '/' + id;
  const current = async () => (await request(root)).body.find(r => r.studioId === id);
  const decision = async (status, extra = {}) => request(item, adminToken, 'PATCH', { status, revision: (await current()).revision, ...extra });
  assert.equal((await request(root, token, 'POST', application)).body.id, initial.body.id);
  assert.equal((await request(root, token, 'POST', { ...application, name: 'Changed retry' })).status, 409);
  assert.equal((await request(root, outsider, 'POST', application)).status, 409);
  assert.equal('requestDigest' in initial.body, false); assert.equal('createdBy' in initial.body, false);
  assert.equal((await request(item, outsider, 'DELETE')).status, 400, 'Revision is mandatory');
  assert.equal((await request(item + '?revision=1', outsider, 'DELETE')).status, 403);
  assert.equal((await request(item, token, 'PATCH', { status: 'APPROVED', revision: 1 })).status, 403);
  assert.equal((await request('/studios/' + id, token, 'PATCH', { directorName: 'Corrected' })).status, 200, 'Roleless pending owner can correct profile');
  assert.equal((await request(item, adminToken, 'PATCH', { status: 'APPROVED', revision: initial.body.revision })).status, 409, 'Profile correction invalidates a stale review');
  const operation = { ...application, name: 'Concurrent operation studio', operationId: randomUUID() };
  const operationRace = await Promise.all([request(root, token, 'POST', operation), request(root, token, 'POST', operation)]);
  assert.ok(operationRace.some(r => r.status === 201)); assert.ok(operationRace.every(r => [201,409].includes(r.status)));
  const operationWinner = operationRace.find(r => r.status === 201).body;
  assert.equal((await request(root, token, 'POST', operation)).body.id, operationWinner.id);
  assert.equal(await client.studio.count({ where: { name: operation.name } }), 1);
  const members = await client.studioRepresentative.findMany({ where: { studioId: id } });
  const role = await client.role.findUniqueOrThrow({ where: { key: 'representative' } });
  const activeRoles = () => client.userRole.count({ where: { userId: owner.id, roleId: role.id, eventId: event.id, removedAt: null } });
  assert.equal((await decision('APPROVED')).status, 200);
  assert.equal(await activeRoles(), 0, 'Event-first approval grants no access');
  assert.equal((await request('/studios/' + id + '/approval', adminToken, 'PATCH', { status: 'APPROVED' })).status, 200);
  assert.equal(await activeRoles(), 1, 'Organization-second approval reconciles access');
  const assignment = await client.userRole.findFirstOrThrow({ where: { userId: owner.id, roleId: role.id, eventId: event.id } });
  assert.equal((await decision('REJECTED', { reason: 'CAPACITY' })).status, 200);
  assert.equal(await activeRoles(), 0);
  assert.ok((await client.userRole.findUniqueOrThrow({ where: { id: assignment.id } })).removedAt);
  assert.equal((await decision('APPROVED')).status, 200);
  assert.equal((await client.userRole.findFirstOrThrow({ where: { userId: owner.id, roleId: role.id, eventId: event.id, removedAt: null } })).id, assignment.id);
  const sibling = await client.studio.create({ data: { name: 'Other qualifying lifecycle studio', eventId: event.id, approvalStatus: 'APPROVED',
    representatives: { create: { userId: owner.id, name: owner.name, email: owner.email } },
    registrations: { create: { eventId: event.id, status: 'APPROVED' } } } });
  assert.equal((await decision('REJECTED', { reason: 'CAPACITY' })).status, 200);
  assert.equal(await activeRoles(), 1, 'Other qualifying studio retains shared event access');
  assert.equal((await request('/studios/' + sibling.id + '/approval', adminToken, 'PATCH', { status: 'REJECTED' })).status, 200);
  assert.equal(await activeRoles(), 0);
  const rejected = await current(); assert.equal(rejected.decisionReason, 'CAPACITY'); assert.equal(rejected.nextActor, 'APPLICANT');
  const reapply = { studioId: id, revision: rejected.revision };
  const applied = await request(root, token, 'POST', reapply); assert.equal(applied.status, 200);
  assert.equal(applied.body.id, initial.body.id); assert.equal(applied.body.studioId, id); assert.equal(applied.body.decisionReason, null);
  assert.equal((await request(root, token, 'POST', reapply)).body.revision, applied.body.revision, 'Lost-response reapply retry');
  const cancelPath = item + '?revision=' + applied.body.revision;
  const cancellations = await Promise.all([request(cancelPath, token, 'DELETE'), request(cancelPath, token, 'DELETE')]);
  assert.ok(cancellations.some(r => r.status === 204)); assert.ok(cancellations.every(r => [204,409].includes(r.status)));
  const cancelled = await current(); assert.equal(cancelled.status, 'CANCELLED'); assert.equal(cancelled.revision, applied.body.revision + 1);
  assert.equal((await request(cancelPath, token, 'DELETE')).status, 204, 'Lost cancellation response is safe');
  assert.equal((await request(item, adminToken, 'PATCH', { status: 'APPROVED', revision: cancelled.revision })).status, 403);
  const raced = await Promise.all([request(root, token, 'POST', { studioId: id, revision: cancelled.revision }), request(root, token, 'POST', { studioId: id, revision: cancelled.revision })]);
  assert.ok(raced.some(r => r.status === 200)); assert.ok(raced.every(r => [200,409].includes(r.status)));
  assert.equal((await current()).revision, cancelled.revision + 1);
  assert.equal((await request(cancelPath, token, 'DELETE')).status, 409, 'Old cancellation cannot cancel new application');
  assert.deepEqual(await client.studioRepresentative.findMany({ where: { studioId: id } }), members);
  assert.equal(await client.studio.count({ where: { id } }), 1);
  assert.equal((await request(eventPath, adminToken, 'PATCH', { stage: 'DATA_REVIEW', expectedStage: 'PRE_REGISTRATION' })).status, 403);
  assert.equal((await request(eventPath, adminToken, 'PATCH', { stage: 'REGISTRATION_OPEN', expectedStage: 'PRE_REGISTRATION' })).status, 200);
  assert.equal((await request(eventPath, adminToken, 'PATCH', { stage: 'DATA_REVIEW', expectedStage: 'PRE_REGISTRATION' })).status, 409);
  assert.equal((await request(eventPath, adminToken, 'PATCH', { registrationDeadline: '2099-10-26T00:00:00Z' })).status, 400);
  assert.equal((await request(eventPath, adminToken, 'PATCH', { timeZone: 'Invalid/Zone' })).status, 400);
  assert.equal((await request(eventPath, adminToken, 'PATCH', { registrationDeadline: '2000-01-01T00:00:00Z' })).status, 200);
  for (const auth of [token, adminToken]) assert.equal((await request(root, auth, 'POST', { ...application, name: 'Late studio', operationId: randomUUID() })).status, 403);
  assert.equal((await request('/studios/' + id, token, 'PATCH', { directorName: 'Late correction' })).status, 403);
  const beforeCancel = await current();
  assert.equal((await request(item + '?revision=' + beforeCancel.revision, token, 'DELETE')).status, 204);
  for (const auth of [token, adminToken]) assert.equal((await request(root, auth, 'POST', { studioId: id, revision: (await current()).revision })).status, 403);
  await client.event.update({ where: { id: event.id }, data: { registrationDeadline: null } });
  const other = await client.event.create({ data: { name: 'Other lifecycle event', startsAt: new Date('2099-01-01'), endsAt: new Date('2099-01-02') } });
  for (const auth of [token, adminToken]) assert.equal((await request('/events/' + other.id + '/studio-registrations', auth, 'POST', { studioId: id, revision: (await current()).revision })).status, 404);
  await client.studioRepresentative.update({ where: { id: members[0].id }, data: { active: false } });
  assert.equal((await request(root, token, 'POST', { studioId: id, revision: (await client.studioEventRegistration.findUniqueOrThrow({ where: { id: initial.body.id } })).revision })).status, 403);
  await client.studioRepresentative.update({ where: { id: members[0].id }, data: { active: true } });
  // Fail after the state write, proving audit and transition are atomic.
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_registration_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic audit rollback'; END $$`);
  await client.$executeRawUnsafe(`CREATE TRIGGER reject_registration_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW WHEN (NEW.action IN ('REGISTRATION_REAPPLIED','REGISTRATION_CANCELLED','REGISTRATION_CREATED','REGISTRATION_CORRECTED','REGISTRATION_APPROVAL_CHANGED','EVENT_UPDATED')) EXECUTE FUNCTION reject_registration_audit()`);
  const before = await client.studioEventRegistration.findUniqueOrThrow({ where: { id: initial.body.id } });
  try {
    assert.equal((await request(root, token, 'POST', { studioId: id, revision: before.revision })).status, 500);
    assert.deepEqual(await client.studioEventRegistration.findUniqueOrThrow({ where: { id: before.id } }), before);
    const countBefore = await client.studio.count();
    assert.equal((await request(root, token, 'POST', { ...application, name: 'Audit rollback creation', operationId: randomUUID() })).status, 500);
    assert.equal(await client.studio.count(), countBefore);
    await client.studioEventRegistration.update({ where: { id: before.id }, data: { status: 'PENDING' } });
    const pendingBefore = await client.studioEventRegistration.findUniqueOrThrow({ where: { id: before.id } });
    const studioBefore = await client.studio.findUniqueOrThrow({ where: { id } });
    const eventBefore = await client.event.findUniqueOrThrow({ where: { id: event.id } });
    const auditCount = await client.auditLog.count();
    for (const [path, method, body] of [
      [item + '?revision=' + pendingBefore.revision, 'DELETE', undefined],
      [item, 'PATCH', { status: 'APPROVED', revision: pendingBefore.revision }],
      ['/studios/' + id, 'PATCH', { directorName: 'Rollback correction' }],
      [eventPath, 'PATCH', { stage: 'DATA_REVIEW', expectedStage: 'REGISTRATION_OPEN' }],
    ]) {
      assert.equal((await request(path, adminToken, method, body)).status, 500);
      assert.deepEqual(await client.studioEventRegistration.findUniqueOrThrow({ where: { id: before.id } }), pendingBefore);
      assert.deepEqual(await client.studio.findUniqueOrThrow({ where: { id } }), studioBefore);
      assert.deepEqual(await client.event.findUniqueOrThrow({ where: { id: event.id } }), eventBefore);
      assert.equal(await client.auditLog.count(), auditCount);
      assert.equal(await activeRoles(), 0);
    }
    await client.studioEventRegistration.update({ where: { id: before.id }, data: { status: 'CANCELLED' } });
  } finally {
    await client.$executeRawUnsafe('DROP TRIGGER reject_registration_audit ON "AuditLog"');
    await client.$executeRawUnsafe('DROP FUNCTION reject_registration_audit()');
  }
  for (const data of [{ revision: 0 }, { decisionReason: 'raw private prose' }, { operationId: randomUUID(), requestDigest: null }]) {
    await assert.rejects(client.studioEventRegistration.update({ where: { id: before.id }, data }));
  }
  const actions = await client.auditLog.findMany({ where: { targetId: before.id }, orderBy: { createdAt: 'asc' } });
  for (const action of ['REGISTRATION_CREATED','REGISTRATION_APPROVAL_CHANGED','REGISTRATION_CANCELLED','REGISTRATION_REAPPLIED']) assert.ok(actions.some(row => row.action === action));
  assert.ok(actions.filter(row => row.action === 'REGISTRATION_REAPPLIED').every(row => row.metadata.revision > 1));
  console.log('PASS: M2 lifecycle, independent approvals, retained access/identity/history, revisioned cancel/reapply races and lost responses, deadline/admin/scope denials, direct SQL guards and audit rollback.');
};
