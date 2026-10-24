const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { StudioSchema, StudiosSchema, StudioRepresentativeSchema } = createRequire(path.resolve(__dirname, '../apps/api/package.json'))('@dance/schemas');

// Only invoked against the disposable database owned by test-baseline.cjs.
module.exports = async function checkStudios({ client, baseUrl, adminToken, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const makeUser = (name) => client.user.create({ data: {
    email: `studio-profile-${name}@example.invalid`, name, emailVerified: true, password: template.password,
  } });
  const owner = await makeUser('owner'); const outsider = await makeUser('outsider');
  const makeEvent = (name) => client.event.create({ data: {
    name, startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'), stage: 'PRE_REGISTRATION',
  } });
  const event = await makeEvent('Studio profile integration'); const otherEvent = await makeEvent('Other studio profile event');
  const makeStudio = (eventId, name, user, city) => client.studio.create({ data: {
    name, eventId, country: 'EE', city, logoPath: 'private-logo-path', directorName: 'Original',
    invoiceDetails: { original: true },
    representatives: { create: { userId: user.id, name: user.name, email: user.email } },
    registrations: { create: { eventId, status: 'PENDING' } },
  }, include: { representatives: true, registrations: true } });
  const studio = await makeStudio(event.id, 'Profile studio', owner, 'Tallinn');
  const sibling = await makeStudio(event.id, 'Collision', outsider, 'Tartu');
  const otherStudio = await makeStudio(otherEvent.id, 'Other profile studio', owner, 'Tallinn');
  const ownerToken = await login(baseUrl, owner.email); const outsiderToken = await login(baseUrl, outsider.email);
  const item = `/studios/${studio.id}`;
  const repItem = `${item}/representatives/${studio.representatives[0].id}`;
  const request = async (route, token = ownerToken, method = 'GET', body) => {
    const response = await fetch(`${baseUrl}/api/v1${route}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const initial = await request(item);
  assert.equal(initial.status, 200, 'Roleless applicants can read their organization');
  const profile = StudioSchema.parse(initial.body);
  assert.equal(profile.approvalStatus, 'PENDING'); assert.equal(profile.directorPhone, null);
  assert.equal(profile.registrations[0].status, 'PENDING');
  for (const key of ['createdAt', 'updatedAt', 'logoPath', 'event', 'dancers', 'deletedBy']) assert.equal(key in profile, false);
  for (const key of ['password', 'verificationToken', 'user', 'deactivatedBy']) assert.equal(key in profile.representatives[0], false);
  const ownProfiles = StudiosSchema.parse((await request('/studios')).body);
  assert.deepEqual(new Set(ownProfiles.map((s) => s.id)), new Set([studio.id, otherStudio.id]));
  assert.equal((await request(item, outsiderToken)).status, 403);
  assert.equal((await request(item, ownerToken, 'PATCH', { name: 'Blocked' })).status, 403);
  const role = await client.role.findUniqueOrThrow({ where: { key: 'representative' } });
  await client.userRole.create({ data: { userId: owner.id, roleId: role.id, eventId: event.id } });
  await client.userRole.create({ data: { userId: outsider.id, roleId: role.id, eventId: event.id } });
  assert.equal((await request(item, outsiderToken, 'PATCH', { name: 'Blocked' })).status, 403);
  assert.equal((await request(`/studios/${otherStudio.id}`, ownerToken, 'PATCH', { name: 'Blocked' })).status, 403);
  const changed = await request(item, ownerToken, 'PATCH', {
    directorName: ' Changed ', directorPhone: ' 123 ', invoiceDetails: { nested: { rate: 1 }, lines: [null, true] },
  });
  assert.equal(changed.status, 200); assert.equal(changed.body.directorName, 'Changed');
  assert.equal(changed.body.country, 'EE'); assert.equal(changed.body.name, 'Profile studio');
  const cleared = await request(item, ownerToken, 'PATCH', { directorName: null, directorPhone: null, invoiceDetails: null });
  assert.equal(cleared.status, 200); assert.equal(cleared.body.invoiceDetails, null);
  const stored = await client.studio.findUniqueOrThrow({ where: { id: studio.id } });
  assert.equal(stored.invoiceDetails, null); assert.equal(stored.directorName, null); assert.equal(stored.directorPhone, null);
  // Clearing uses SQL NULL, while JSON null inside an object is preserved.
  const nulls = await client.$queryRaw`SELECT "invoiceDetails" IS NULL AS cleared FROM "Studio" WHERE id = ${studio.id}`;
  assert.equal(nulls[0].cleared, true);
  assert.equal((await request(item, ownerToken, 'PATCH', { name: ' Collision ' })).status, 409, 'Active names are globally unique even at a different location');
  assert.equal((await request(item, ownerToken, 'PATCH', { name: ' Renamed profile ' })).status, 200);
  assert.equal((await request(item, ownerToken, 'PATCH', { city: 'Tartu' })).status, 200);
  const afterConflict = await client.studio.findUniqueOrThrow({ where: { id: studio.id } });
  assert.equal(afterConflict.name, 'Renamed profile'); assert.equal(afterConflict.city, 'Tartu');
  assert.equal((await request(item, ownerToken, 'PATCH', { country: null, city: null })).status, 200);
  assert.equal((await request(item)).body.country, null);
  for (const body of [{}, { name: ' ' }, { name: null }, { eventId: otherEvent.id }, { approvalStatus: 'APPROVED' },
    { logoUrl: 'spoof' }, { deletedAt: null }, { invoiceDetails: [] }]) {
    const bad = await request(item, ownerToken, 'PATCH', body);
    assert.equal(bad.status, 400); assert.equal(bad.body.code, 'VALIDATION_ERROR');
  }
  await client.userRole.create({ data: { userId: owner.id, roleId: role.id, eventId: null } });
  assert.equal((await request(`/studios/${otherStudio.id}`, ownerToken, 'PATCH', { name: 'Global permission edit' })).status, 200);
  const competing = await Promise.all([sibling, otherStudio].map((s) => request(`/studios/${s.id}`, adminToken, 'PATCH', { name: 'Concurrent profile name' })));
  assert.deepEqual(competing.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await client.studio.count({ where: { name: 'Concurrent profile name', deletedAt: null } }), 1);
  const repResult = await request(repItem, ownerToken, 'PATCH', { name: ' Updated contact ', email: 'contact@example.invalid' });
  assert.equal(repResult.status, 200); assert.equal(StudioRepresentativeSchema.parse(repResult.body).name, 'Updated contact');
  const unchangedAccount = await client.user.findUniqueOrThrow({ where: { id: owner.id } });
  assert.equal(unchangedAccount.email, owner.email, 'Changing representative contact never changes login identity');
  const colleague = await client.studioRepresentative.create({ data: { studioId: studio.id, userId: outsider.id, name: outsider.name, email: outsider.email } });
  assert.equal((await request(`${item}/representatives/${colleague.id}`, ownerToken, 'PATCH', { name: 'Blocked' })).status, 403);
  assert.equal((await request(`${item}/representatives/${sibling.representatives[0].id}`, adminToken, 'PATCH', { name: 'Blocked' })).status, 404);
  await client.studioRepresentative.update({ where: { id: colleague.id }, data: { active: false } });
  assert.equal((await request(`${item}/representatives/${colleague.id}`, adminToken, 'PATCH', { name: 'Blocked' })).status, 404);
  assert.equal((await request(item)).body.representatives.some((r) => r.id === colleague.id), false);
  assert.equal((await request(item, outsiderToken)).status, 403);
  assert.equal((await request(`${item}/approval`, ownerToken, 'PATCH', { status: 'APPROVED' })).status, 403);
  assert.equal((await request(`${item}/approval`, adminToken, 'PATCH', { status: 'APPROVED' })).status, 200);
  assert.equal((await client.studioEventRegistration.findUniqueOrThrow({ where: { id: studio.registrations[0].id } })).status, 'PENDING');
  await client.studioEventRegistration.create({ data: { studioId: studio.id, eventId: otherEvent.id, status: 'LOCKED', canEditDuringReview: true } });
  assert.deepEqual((await request(item)).body.registrations.map((r) => r.eventId), [event.id], 'Contradictory legacy registrations are not exposed as current event membership');

  await client.studioEventRegistration.update({ where: { id: studio.registrations[0].id }, data: { canEditDuringReview: true } });
  for (const stage of ['DATA_REVIEW', 'FINALIZED', 'ENDED', 'CANCELLED']) {
    await client.event.update({ where: { id: event.id }, data: { stage } });
    assert.equal((await request(item)).status, 200);
    assert.equal((await request(item, ownerToken, 'PATCH', { name: 'Blocked' })).status, 403);
    assert.equal((await request(repItem, ownerToken, 'PATCH', { name: 'Blocked' })).status, 403);
    assert.equal((await request(item, ownerToken, 'DELETE')).status, 403);
    assert.equal((await request(item, adminToken, 'PATCH', { directorName: 'Admin' })).status, 200);
  }
  await client.event.update({ where: { id: event.id }, data: { stage: 'REGISTRATION_OPEN' } });
  const dancer = await client.dancer.create({ data: { studioId: studio.id, firstName: 'Kept', lastName: 'Dancer', birthDate: new Date('2012-02-29') } });
  assert.equal((await request(item, ownerToken, 'DELETE')).status, 204);
  const archived = await client.studio.findUniqueOrThrow({ where: { id: studio.id } });
  assert.equal(archived.deletedBy, owner.id); assert.ok(archived.deletedAt instanceof Date);
  assert.ok(await client.dancer.findUnique({ where: { id: dancer.id } }));
  assert.equal(await client.studioEventRegistration.count({ where: { studioId: studio.id } }), 2);
  assert.equal(await client.studioRepresentative.count({ where: { studioId: studio.id } }), 2);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    assert.equal((await request(item, adminToken, method, method === 'PATCH' ? { name: 'Restore' } : undefined)).status, 404);
  }
  assert.equal((await request(repItem, adminToken, 'PATCH', { name: 'Blocked' })).status, 404);
  assert.equal((await request(`${item}/approval`, adminToken, 'PATCH', { status: 'APPROVED' })).status, 404);
  assert.equal((await request('/studios', adminToken)).body.some((s) => s.id === studio.id), false);
  console.log('PASS: studio profile DTOs, roleless/member reads, scoped writes, nullable/JSON PATCH, identity conflicts, representative self/parent checks, approval isolation, stages and audited archive preservation.');
};
