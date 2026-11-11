const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

// Only the baseline's verified random disposable database is accepted.
module.exports = async function checkApplicationReview({ client, baseUrl, adminToken, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const owner = await client.user.create({ data: { email: 'review-owner@example.invalid', name: 'Review owner', emailVerified: true, password: template.password } });
  const token = await login(baseUrl, owner.email); const outsider = await login(baseUrl, 'judge@test.com');
  const event = await client.event.create({ data: { name: 'Review fixture', startsAt: new Date('2099-01-01'), endsAt: new Date('2099-01-02') } });
  const other = await client.event.create({ data: { name: 'Other review fixture', startsAt: new Date('2099-01-01'), endsAt: new Date('2099-01-02') } });
  const request = async (path, auth = token, method = 'GET', body) => {
    const response = await fetch(baseUrl + '/api/v1' + path, { method, headers: { Authorization: 'Bearer ' + auth, 'Content-Type': 'application/json' }, ...(body && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const draft = await client.onboardingDraft.create({ data: { userId: owner.id, operationId: randomUUID(), intendedEventId: event.id, details: { studioName: 'Review studio', country: 'EE', city: 'Tallinn', directorName: 'Director', directorPhone: '' } } });
  const body = { operationId: randomUUID(), onboardingRevision: draft.revision, name: 'Review studio', representativeName: 'Contact', representativeEmail: 'editable-contact@example.invalid' };
  const root = '/events/' + event.id + '/studio-registrations';
  assert.equal((await request('/events/' + other.id + '/studio-registrations', token, 'POST', body)).status, 409);
  assert.equal((await client.onboardingDraft.findUniqueOrThrow({ where: { id: draft.id } })).status, 'DRAFT');
  const created = await request(root, token, 'POST', body); assert.equal(created.status, 201);
  const studioId = created.body.studioId; const item = root + '/' + studioId; const profile = '/studios/' + studioId;
  assert.equal((await client.onboardingDraft.findUniqueOrThrow({ where: { id: draft.id } })).status, 'COMPLETED');
  assert.equal((await request(root, token, 'POST', body)).body.id, created.body.id);
  const current = () => client.studioEventRegistration.findUniqueOrThrow({ where: { id: created.body.id } });
  const org = { status: 'APPROVED', revision: 1 };
  assert.equal((await request(profile + '/approval', adminToken, 'PATCH', { status: 'APPROVED' })).status, 400);
  assert.equal((await request(profile + '/approval', token, 'PATCH', org)).status, 403);
  assert.equal((await request(profile + '/approval', adminToken, 'PATCH', org)).status, 200);
  assert.equal((await request(profile + '/approval', adminToken, 'PATCH', org)).status, 200);
  assert.equal(await client.reviewNotice.count({ where: { registrationId: created.body.id } }), 1, 'Matching retry never duplicates mail intent');
  assert.equal((await request(item, adminToken, 'PATCH', { status: 'APPROVED', revision: 1 })).status, 409, 'Organization review invalidates stale event review');
  assert.equal((await request(profile, token, 'PATCH', { city: 'Corrected', expectedRevision: 1 })).status, 409);
  const correction = { city: 'Corrected', invoiceDetails: { z: 1, a: { z: 2, a: 3 } }, expectedRevision: 2 };
  assert.equal((await request(profile, token, 'PATCH', correction)).status, 200);
  assert.equal((await request(profile, token, 'PATCH', correction)).status, 200);
  assert.equal((await current()).revision, 3, 'Matching correction retry increments once');
  assert.equal((await request(profile + '/approval', adminToken, 'PATCH', org)).status, 409);
  const reject = { status: 'REJECTED', revision: 3, reason: 'INCOMPLETE_DETAILS' };
  assert.equal((await request(profile + '/approval', adminToken, 'PATCH', reject)).status, 200);
  assert.equal((await request(profile)).body.approvalReason, 'INCOMPLETE_DETAILS');
  const contacts = (await request(profile)).body.representatives;
  const contactBody = { name: 'Changed contact', expectedRevision: 4 };
  assert.equal((await request(profile + '/representatives/' + contacts[0].id, token, 'PATCH', contactBody)).status, 200);
  assert.equal((await request(profile + '/representatives/' + contacts[0].id, token, 'PATCH', contactBody)).status, 200);
  assert.equal((await current()).revision, 5);
  const decisions = await Promise.all(['APPROVED', 'REJECTED'].map(status => request(profile + '/approval', adminToken, 'PATCH', { status, revision: 5 })));
  assert.equal(decisions.filter(value => value.status === 200).length, 1); assert.equal(decisions.filter(value => value.status === 409).length, 1);
  const review = await request(item + '/review'); assert.equal(review.status, 200);
  assert.ok(review.body.history.some(value => value.action === 'STUDIO_APPROVAL_CHANGED' && value.reason === 'INCOMPLETE_DETAILS'));
  assert.ok(review.body.notifications.every(value => value.state === 'SIMULATED'));
  for (const row of review.body.notifications) assert.deepEqual(Object.keys(row).sort(), ['axis','createdAt','id','revision','state']);
  for (const row of review.body.history) assert.deepEqual(Object.keys(row).sort(), ['action','createdAt','fromStatus','reason','revision','toStatus']);
  assert.equal((await request(item + '/review', outsider)).status, 403);
  assert.equal((await request('/events/' + other.id + '/studio-registrations/' + studioId + '/review', adminToken)).status, 404);
  await client.studioRepresentative.update({ where: { id: contacts[0].id }, data: { active: false } });
  assert.equal((await request(item + '/review')).status, 403);
  assert.equal((await request(item, adminToken, 'PATCH', { status: 'REJECTED', revision: (await current()).revision, reason: 'CAPACITY' })).status, 200);
  assert.equal((await request(item + '/review', adminToken)).body.notifications[0].state, 'NO_RECIPIENT');
  await client.studioRepresentative.update({ where: { id: contacts[0].id }, data: { active: true } });
  // A notification persistence failure must roll back decision, access and audit.
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_notice_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic notice failure'; END $$`);
  await client.$executeRawUnsafe(`CREATE TRIGGER reject_notice_fixture BEFORE INSERT ON "ReviewNotice" FOR EACH ROW EXECUTE FUNCTION reject_notice_fixture()`);
  const before = await current(); const audits = await client.auditLog.count(); const notices = await client.reviewNotice.count();
  try {
    assert.equal((await request(item, adminToken, 'PATCH', { status: 'APPROVED', revision: before.revision })).status, 500);
    assert.deepEqual(await current(), before); assert.equal(await client.auditLog.count(), audits); assert.equal(await client.reviewNotice.count(), notices);
  } finally { await client.$executeRawUnsafe('DROP TRIGGER reject_notice_fixture ON "ReviewNotice"'); await client.$executeRawUnsafe('DROP FUNCTION reject_notice_fixture()'); }
  await assert.rejects(client.reviewNotice.create({ data: { registrationId: before.id, revision: 0, axis: 'EVENT', mode: 'SIMULATED' } }));
  await assert.rejects(client.reviewNotice.create({ data: { registrationId: before.id, revision: 99, axis: 'WRONG', mode: 'SIMULATED' } }));
  console.log('PASS: revisioned independent reviews, reasons, notice/audit rollback, conflict races, exact private DTOs, owner/event denials and atomic verified draft completion.');
};
