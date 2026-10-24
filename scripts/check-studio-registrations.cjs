const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const path = require('node:path');
const apiRequire = createRequire(path.resolve(__dirname, '../apps/api/package.json'));
const jwt = apiRequire('jsonwebtoken');
const { StudioRegistrationSchema, StudioRegistrationsSchema } = apiRequire('@dance/schemas');

// Called only by the baseline runner against its disposable, migrated database.
module.exports = async function checkStudioRegistrations({ client, baseUrl, adminToken, login, jwtSecret }) {
  const authUser = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const applicant = await client.user.create({ data: {
    email: 'registration-applicant@example.invalid', name: 'Registration fixture',
    emailVerified: true, password: authUser.password,
  } });
  assert.equal(await client.userRole.count({ where: { userId: applicant.id } }), 0);
  const applicantToken = await login(baseUrl, applicant.email);
  const outsiderToken = await login(baseUrl, 'judge@test.com');
  const event = await client.event.create({ data: {
    name: 'Registration integration', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'),
    stage: 'REGISTRATION_OPEN',
  } });
  const otherEvent = await client.event.create({ data: {
    name: 'Other registration event', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'),
    stage: 'REGISTRATION_OPEN',
  } });
  const root = `/events/${event.id}/studio-registrations`;
  const request = async (route, token, method = 'GET', body) => {
    const response = await fetch(`${baseUrl}/api/v1${route}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const application = { name: 'Applicant studio', representativeName: 'Applicant', representativeEmail: applicant.email };
  const created = await request(root, applicantToken, 'POST', application);
  assert.equal(created.status, 201);
  const registration = StudioRegistrationSchema.parse(created.body);
  assert.equal(registration.status, 'PENDING');
  assert.equal(registration.studio.approvalStatus, 'PENDING');
  const studioId = registration.studioId;
  const item = `${root}/${studioId}`;
  const stored = await client.studio.findUniqueOrThrow({
    where: { id: studioId }, include: { representatives: true, registrations: true },
  });
  assert.equal(stored.representatives.length, 1);
  assert.equal(stored.representatives[0].userId, applicant.id);
  assert.equal(stored.registrations.length, 1);
  assert.equal(stored.registrations[0].eventId, event.id);
  assert.equal(await client.userRole.count({ where: { userId: applicant.id } }), 0);
  assert.equal(StudioRegistrationsSchema.parse((await request(root, applicantToken)).body).length, 1);
  assert.deepEqual((await request(root, outsiderToken)).body, []);
  assert.equal((await request(item, outsiderToken, 'DELETE')).status, 403);
  assert.equal((await request(item, applicantToken, 'PATCH', { status: 'APPROVED' })).status, 403);
  assert.equal((await request(item, adminToken, 'PATCH', { status: 'APPROVED' })).status, 403);

  // A roleless but cryptographically valid unknown identity causes a nested FK
  // failure under current auth behavior. Prove the entire creation rolls back.
  const before = await Promise.all([
    client.studio.count(), client.studioRepresentative.count(), client.studioEventRegistration.count(),
  ]);
  const missingUserToken = jwt.sign({ userId: randomUUID() }, jwtSecret);
  const failed = await request(root, missingUserToken, 'POST', { ...application, name: 'Rollback studio' });
  assert.equal(failed.status, 409);
  assert.equal(failed.body.reason, "relationshipConflict");
  assert.deepEqual(await Promise.all([
    client.studio.count(), client.studioRepresentative.count(), client.studioEventRegistration.count(),
  ]), before, 'A failed membership write must not leave a studio or registration');

  await client.studioRepresentative.update({ where: { id: stored.representatives[0].id }, data: { active: false } });
  assert.deepEqual((await request(root, applicantToken)).body, []);
  assert.equal((await request(item, applicantToken, 'DELETE')).status, 403);
  await client.studioRepresentative.update({ where: { id: stored.representatives[0].id }, data: { active: true } });

  // Even contradictory legacy data must not authorize a different event.
  const contradictory = await client.studioEventRegistration.create({ data: { studioId, eventId: otherEvent.id } });
  const otherItem = `/events/${otherEvent.id}/studio-registrations/${studioId}`;
  for (const token of [applicantToken, adminToken]) {
    assert.equal((await request(otherItem, token, 'DELETE')).status, 404);
  }
  assert.equal((await request(otherItem, adminToken, 'PATCH', { status: 'APPROVED' })).status, 404);
  assert.ok(await client.studioEventRegistration.findUnique({ where: { id: contradictory.id } }));

  await client.studio.update({ where: { id: studioId }, data: { approvalStatus: 'APPROVED' } });
  const role = await client.role.findUniqueOrThrow({ where: { key: 'representative' } });
  const beforeApproval = await client.studioEventRegistration.findUniqueOrThrow({ where: { id: registration.id } });
  await client.role.update({ where: { id: role.id }, data: { key: 'temporarily-unavailable-representative' } });
  try {
    assert.equal((await request(item, adminToken, 'PATCH', { status: 'APPROVED' })).status, 500);
    assert.deepEqual(await client.studioEventRegistration.findUniqueOrThrow({ where: { id: registration.id } }), beforeApproval);
    assert.equal(await client.userRole.count({ where: { userId: applicant.id } }), 0);
  } finally {
    await client.role.update({ where: { id: role.id }, data: { key: 'representative' } });
  }
  assert.equal((await request(item, adminToken, 'PATCH', { status: 'APPROVED', canEditDuringReview: true })).status, 200);
  assert.equal((await request(item, adminToken, 'PATCH', { status: 'APPROVED' })).body.canEditDuringReview, true);
  assert.equal(await client.userRole.count({ where: { userId: applicant.id, roleId: role.id, eventId: event.id } }), 1);
  assert.equal(await client.userRole.count({ where: { userId: applicant.id, eventId: otherEvent.id } }), 0);
  assert.equal((await request(item, applicantToken, 'DELETE')).status, 403);
  await client.studioEventRegistration.update({ where: { id: registration.id }, data: { status: 'LOCKED' } });
  assert.equal((await request(item, applicantToken, 'DELETE')).status, 403);
  await client.studioEventRegistration.update({ where: { id: registration.id }, data: { status: 'PENDING' } });
  await client.studio.update({ where: { id: studioId }, data: { deletedAt: new Date() } });
  assert.deepEqual((await request(root, applicantToken)).body, []);
  assert.equal((await request(item, applicantToken, 'DELETE')).status, 404);
  assert.equal((await request(item, adminToken, 'PATCH', { status: 'APPROVED' })).status, 404);
  await client.studio.update({ where: { id: studioId }, data: { deletedAt: null } });
  assert.equal((await request(item, applicantToken, 'DELETE')).status, 204);
  assert.equal(await client.studioEventRegistration.count({ where: { id: registration.id } }), 0);
  assert.ok(await client.studio.findUnique({ where: { id: studioId } }), 'Cancellation must retain the studio');
  assert.equal((await request(item, adminToken, 'PATCH', { status: 'APPROVED' })).status, 404);

  const adminCreated = await request(root, adminToken, 'POST', { name: 'Admin-created fixture' });
  assert.equal(adminCreated.status, 201);
  assert.equal(adminCreated.body.status, 'PENDING');
  assert.equal(await client.studioRepresentative.count({ where: { studioId: adminCreated.body.studioId } }), 0);
  // The SQL-only partial index is global across event/location, not an application
  // precheck. A rejected nested write must leave every existing record unchanged.
  const snapshot = async () => Promise.all([
    client.studio.findMany({ orderBy: { id: 'asc' } }),
    client.studioRepresentative.findMany({ orderBy: { id: 'asc' } }),
    client.studioEventRegistration.findMany({ orderBy: { id: 'asc' } }),
    client.userRole.findMany({ orderBy: { id: 'asc' } }),
  ]);
  const beforeConflict = await snapshot();
  for (const token of [applicantToken, adminToken]) {
    for (const route of [root, `/events/${otherEvent.id}/studio-registrations`]) {
      const duplicate = await request(route, token, 'POST', {
        ...application, name: ' Applicant studio ', country: 'FI', city: 'Helsinki',
      });
      assert.equal(duplicate.status, 409);
      assert.equal(duplicate.body.code, 'CONFLICT');
      assert.equal(duplicate.body.error, 'Studio with this name already exists');
      assert.deepEqual(await snapshot(), beforeConflict);
    }
  }
  const counts = async () => Promise.all([
    client.studio.count(), client.studioRepresentative.count(), client.studioEventRegistration.count(),
  ]);
  const beforeRace = await counts();
  const raceBody = { ...application, name: 'Concurrent registration studio' };
  const raced = await Promise.all([
    request(root, applicantToken, 'POST', raceBody),
    request(root, applicantToken, 'POST', raceBody),
  ]);
  assert.deepEqual(raced.map((r) => r.status).sort(), [201, 409]);
  const winner = StudioRegistrationSchema.parse(raced.find((r) => r.status === 201).body);
  assert.deepEqual(await counts(), beforeRace.map((n) => n + 1), 'Only one complete nested creation persists');
  const archived = await client.studio.update({
    where: { id: winner.studioId }, data: { deletedAt: new Date(), deletedBy: authUser.id },
  });
  const reused = await request(root, applicantToken, 'POST', raceBody);
  assert.equal(reused.status, 201, 'Archived studio names are reusable');
  assert.notEqual(reused.body.studioId, winner.studioId);
  assert.deepEqual(await client.studio.findUnique({ where: { id: winner.studioId } }), archived);
  assert.equal(await client.studioRepresentative.count({ where: { studioId: winner.studioId } }), 1);
  assert.equal(await client.studioEventRegistration.count({ where: { studioId: winner.studioId } }), 1);
  assert.equal((await request(root, applicantToken, 'POST', { ...application, name: 'applicant studio' })).status, 201,
    'Name uniqueness remains case-sensitive');

  await client.event.update({ where: { id: event.id }, data: { stage: 'DATA_REVIEW' } });
  assert.equal((await request(root, applicantToken, 'POST', application)).status, 403);
  assert.equal((await request(root, applicantToken, 'POST', { ...application, studioId })).status, 400);
  console.log('PASS: registration HTTP/database creation, DTOs, ownership/event scope, approval/role atomicity, rollback, active records, pending-only cancellation, duplicate-name conflicts, concurrent creation and archived-name reuse.');
};
