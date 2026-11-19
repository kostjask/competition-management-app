const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

module.exports = async function checkApplicationEstimates({ client, baseUrl, adminToken, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const owner = await client.user.create({ data: { email: 'estimate-owner@example.invalid', name: 'Estimate owner', emailVerified: true, password: template.password } });
  const token = await login(baseUrl, owner.email); const outsider = await login(baseUrl, 'judge@test.com');
  const event = await client.event.create({ data: { name: 'Estimate fixture', startsAt: new Date('2028-02-28T22:30:00Z'), endsAt: new Date('2028-03-02T00:00:00Z'), timeZone: 'Europe/Tallinn' } });
  const root = '/events/' + event.id + '/studio-registrations';
  const counts = ['2028-02-29', '2028-03-01', '2028-03-02'].map((date, index) => ({ date, count: index }));
  const request = async (path, auth = token, method = 'GET', body) => {
    const response = await fetch(baseUrl + '/api/v1' + path, { method, headers: { Authorization: 'Bearer ' + auth, 'Content-Type': 'application/json' }, ...(body && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.json() };
  };
  const create = { operationId: randomUUID(), name: 'Estimate studio', representativeName: 'Owner', representativeEmail: owner.email, estimates: counts, eventRevision: 1 };
  const invalidInitial = await request(root, token, 'POST', { ...create, estimates: counts.slice(1) });
  assert.equal(invalidInitial.status, 400); assert.equal(invalidInitial.body.issues[0].path[0], 'estimates');
  assert.equal(await client.studio.count({ where: { eventId: event.id } }), 0, 'Invalid initial days roll back creation');
  const initial = await request(root, token, 'POST', create); assert.equal(initial.status, 201);
  assert.equal((await request(root, token, 'POST', create)).body.id, initial.body.id);
  const item = root + '/' + initial.body.studioId; const path = item + '/estimates';
  const current = () => client.studioEventRegistration.findUniqueOrThrow({ where: { id: initial.body.id } });
  const command = { operationId: randomUUID(), revision: 1, eventRevision: 1, counts: counts.map(row => ({ ...row, count: 4 })) };
  assert.equal((await request(path, outsider, 'PATCH', command)).status, 403);
  assert.equal((await request(path.replace(event.id, 'foreign-event'), adminToken, 'PATCH', command)).status, 404);
  assert.equal((await request(path, token, 'PATCH', { ...command, actorId: owner.id })).status, 400);
  assert.equal((await request(path, token, 'PATCH', { ...command, eventRevision: 2 })).status, 409);
  for (const bad of [counts.slice(1), [...counts, counts[0]], [{ ...counts[0], count: -1 }], [{ ...counts[0], date: '2028-02-30' }]]) assert.equal((await request(path, token, 'PATCH', { ...command, counts: bad })).status, 400);
  const saved = await request(path, token, 'PATCH', command); assert.equal(saved.status, 200); assert.equal(saved.body.revision, 2);
  assert.deepEqual((await request(path, token, 'PATCH', command)).body, saved.body, 'Exact retry returns the immutable original acknowledgement');
  assert.equal((await request(path, adminToken, 'PATCH', command)).status, 409, 'Another actor cannot replay a receipt');
  assert.equal((await request(path, token, 'PATCH', { ...command, counts })).status, 409);
  const before = await current(); assert.equal(before.status, 'PENDING'); assert.equal(before.revision, 2);
  assert.equal(await client.reviewNotice.count({ where: { registrationId: before.id } }), 0, 'Planning never queues approval mail');
  const history = await request(item + '/review'); assert.deepEqual(history.body.estimates[1].counts, counts);
  assert.equal('actorId' in history.body.estimates[0], false); assert.equal('digest' in history.body.estimates[0], false);
  await client.event.update({ where: { id: event.id }, data: { stage: 'DATA_REVIEW' } });
  const correction = { ...command, operationId: randomUUID(), revision: 2 };
  assert.equal((await request(path, token, 'PATCH', correction)).status, 403);
  assert.equal((await request(path, adminToken, 'PATCH', correction)).status, 400);
  const corrected = await request(path, adminToken, 'PATCH', { ...correction, reason: 'Confirmed planning correction' }); assert.equal(corrected.status, 200);
  assert.equal(corrected.body.source, 'ORGANIZER'); assert.equal((await current()).status, 'PENDING');
  await client.event.update({ where: { id: event.id }, data: { stage: 'PRE_REGISTRATION', registrationDeadline: new Date('2000-01-01') } });
  assert.equal((await request(path, token, 'PATCH', { ...command, operationId: randomUUID(), revision: 3 })).status, 403);
  await client.event.update({ where: { id: event.id }, data: { registrationDeadline: null, revision: 2, endsAt: new Date('2028-03-03') } });
  assert.equal((await request(path, token, 'PATCH', { ...command, operationId: randomUUID(), revision: 3 })).status, 409);
  assert.equal((await request(path, token, 'PATCH', { ...command, operationId: randomUUID(), revision: 3, eventRevision: 2 })).status, 400);
  const next = { ...command, revision: 3, eventRevision: 2, counts: [...counts, { date: '2028-03-03', count: 0 }] };
  const raced = await Promise.all([request(path, token, 'PATCH', { ...next, operationId: randomUUID() }), request(path, token, 'PATCH', { ...next, operationId: randomUUID() })]);
  assert.deepEqual(raced.map(row => row.status).sort(), [200, 409]);
  const revision = (await current()).revision;
  // Verify atomic audit failure on the isolated runner-owned database only.
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_estimate_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'REGISTRATION_CORRECTED' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe('CREATE TRIGGER reject_estimate_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_estimate_audit()');
  try { assert.equal((await request(path, token, 'PATCH', { ...next, revision, operationId: randomUUID() })).status, 500); assert.equal((await current()).revision, revision); }
  finally { await client.$executeRawUnsafe('DROP TRIGGER reject_estimate_audit ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION reject_estimate_audit()'); }
  assert.equal(await client.applicationEstimateRevision.count({ where: { registrationId: before.id } }), 4);
  const receipt = await client.applicationEstimateRevision.findFirstOrThrow({ where: { registrationId: before.id } });
  await assert.rejects(client.applicationEstimateRevision.update({ where: { id: receipt.id }, data: { counts } }));
  await client.studioRepresentative.updateMany({ where: { studioId: before.studioId, userId: owner.id }, data: { active: false } });
  assert.equal((await request(path, token, 'PATCH', command)).status, 403, 'Offboarded owners cannot replay');
  assert.equal((await request(item + '/review')).status, 403);
  await client.studio.update({ where: { id: before.studioId }, data: { deletedAt: new Date() } });
  assert.equal((await request(path, adminToken, 'PATCH', command)).status, 404);
  console.log('PASS: application estimates enforce event days, immutable retries, scope, review windows, concurrency and audit rollback.');
};
