const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

// Only test-baseline's random migrated database is supplied here.
module.exports = async function checkEventSetup({ client, baseUrl, adminToken, login }) {
  const outsider = await login(baseUrl, 'judge@test.com');
  const request = async (path, method = 'GET', body, token = adminToken) => {
    const response = await fetch(baseUrl + '/api/v1' + path, { method,
      headers: { ...(token && { Authorization: 'Bearer ' + token }), 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.json() };
  };
  const input = { name: 'Setup fixture', startsAt: '2099-10-25T10:00:00+02:00', endsAt: '2099-10-25T12:00:00+02:00', timeZone: 'Europe/Tallinn', registrationDeadline: null, operationId: randomUUID() };
  const beforeCount = await client.event.count();
  for (const token of [null, outsider]) assert.equal((await request('/events', 'POST', input, token)).status, token === null ? 401 : 403);
  const result = await request('/events', 'POST', input); assert.equal(result.status, 201);
  const event = result.body; const path = '/events/' + event.id;
  const auditCount = () => client.auditLog.count({ where: { targetId: event.id } });
  assert.equal(event.revision, 1); assert.equal(event.organizerEmail, null);
  for (const key of ['imagePath', 'creationDigest', 'creationOperationId', 'descriptionTranslations', 'descriptionSourceLocale']) assert.equal(key in event, false);
  assert.equal((await request('/events', 'POST', input)).body.id, event.id);
  assert.equal(await client.event.count(), beforeCount + 1); assert.equal(await auditCount(), 1);
  assert.equal((await request('/events', 'POST', { ...input, name: 'Changed retry' })).status, 409);
  const racesInput = { ...input, operationId: randomUUID(), name: 'Concurrent creation' };
  const creations = await Promise.all([request('/events', 'POST', racesInput), request('/events', 'POST', racesInput)]);
  assert.ok(creations.some(value => value.status === 201)); assert.ok(creations.every(value => [201,409].includes(value.status)));
  assert.equal(await client.event.count({ where: { creationOperationId: racesInput.operationId } }), 1);
  assert.equal((await request('/events', 'POST', racesInput)).status, 201);
  const beforeOpen = await client.event.findUniqueOrThrow({ where: { id: event.id } });
  const opening = { stage: 'REGISTRATION_OPEN', expectedStage: 'PRE_REGISTRATION', expectedRevision: 1 };
  const deniedOpen = await request(path, 'PATCH', opening); assert.equal(deniedOpen.status, 400);
  for (const field of ['venue','city','country','organizerEmail']) assert.ok(deniedOpen.body.issues.some(issue => issue.path[0] === field));
  assert.deepEqual(await client.event.findUniqueOrThrow({ where: { id: event.id } }), beforeOpen); assert.equal(await auditCount(), 1);
  assert.equal((await request(path, 'PATCH', { name: 'No revision' })).status, 400);
  assert.equal((await request(path, 'PATCH', { expectedRevision: 1, organizerEmail: 'bad' })).status, 400);
  for (const token of [null, outsider]) assert.equal((await request(path, 'PATCH', { expectedRevision: 1, name: 'Spoof' }, token)).status, token === null ? 401 : 403);
  const setup = { expectedRevision: 1, venue: 'Hall', city: 'Tallinn', country: 'EE', organizerEmail: 'organizer@example.invalid', organizerPhone: '+372 555 0100',
    description: { sourceLocale: 'et', sourceText: 'Algtekst <script>plain text</script>', translations: { en: 'Instructions' } } };
  const saved = await request(path, 'PATCH', setup); assert.equal(saved.status, 200); assert.equal(saved.body.revision, 2);
  assert.deepEqual(saved.body.description, setup.description);
  const readOnlyOther = await request(path, 'GET', undefined, outsider); assert.deepEqual(readOnlyOther.body.description, setup.description);
  const count = await auditCount(); assert.equal((await request(path, 'PATCH', setup)).body.revision, 2); assert.equal(await auditCount(), count);
  assert.equal((await request(path, 'PATCH', { ...setup, city: 'Stale city' })).status, 409);
  assert.equal((await request(path, 'PATCH', { ...opening, expectedRevision: 2 })).status, 200);
  assert.equal((await request(path, 'PATCH', { expectedRevision: 3, stage: 'DATA_REVIEW', expectedStage: 'REGISTRATION_OPEN' })).status, 200);
  assert.equal((await request(path, 'PATCH', { expectedRevision: 4, stage: 'REGISTRATION_OPEN', expectedStage: 'DATA_REVIEW' })).status, 403);
  const other = await client.event.create({ data: { name: 'Setup other', startsAt: new Date('2099-01-01'), endsAt: new Date('2099-01-02'), description: 'Retained unclassified prose' } });
  const otherPath = '/events/' + other.id;
  const retained = (await request(otherPath)).body; assert.equal(retained.description, null); assert.equal(retained.unclassifiedDescription, other.description);
  assert.equal((await request(otherPath, 'PATCH', { ...opening, venue: 'Hall', city: 'Tallinn', country: 'EE', organizerEmail: 'organizer@example.invalid' })).status, 400);
  assert.equal((await request(otherPath, 'PATCH', { expectedRevision: 1, description: { sourceLocale: 'ru', sourceText: other.description, translations: {} } })).status, 200);
  const snapshot = await client.event.findUniqueOrThrow({ where: { id: event.id } });
  const edits = await Promise.all([
    request(path, 'PATCH', { expectedRevision: snapshot.revision, city: 'One city' }),
    request(path, 'PATCH', { expectedRevision: snapshot.revision, city: 'Other city' }),
  ]);
  assert.deepEqual(edits.map(value => value.status).sort(), [200,409]);
  assert.equal((await client.event.findUniqueOrThrow({ where: { id: other.id } })).city, null, 'Other event remains unchanged');
  // A failing audit must roll back content, contact, stage and revision together.
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_event_setup_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic event rollback'; END $$`);
  await client.$executeRawUnsafe(`CREATE TRIGGER reject_event_setup_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW WHEN (NEW.action = 'EVENT_UPDATED') EXECUTE FUNCTION reject_event_setup_audit()`);
  try {
    const before = await client.event.findUniqueOrThrow({ where: { id: event.id } }); const total = await auditCount();
    assert.equal((await request(path, 'PATCH', { expectedRevision: before.revision, stage: 'CANCELLED', expectedStage: before.stage, organizerEmail: 'changed@example.invalid', description: null })).status, 500);
    assert.deepEqual(await client.event.findUniqueOrThrow({ where: { id: event.id } }), before); assert.equal(await auditCount(), total);
    const eventsBefore = await client.event.count();
    assert.equal((await request('/events', 'POST', { ...input, operationId: randomUUID() })).status, 500); assert.equal(await client.event.count(), eventsBefore);
  } finally { await client.$executeRawUnsafe('DROP TRIGGER reject_event_setup_audit ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION reject_event_setup_audit()'); }
  for (const data of [{ revision: 0 }, { descriptionSourceLocale: 'fi' }, { descriptionTranslations: { et: 'Duplicate source' } }, { descriptionTranslations: { en: null } }, { descriptionTranslations: { fi: 'Unknown language' } }]) {
    await assert.rejects(client.event.update({ where: { id: event.id }, data }));
  }
  console.log('PASS: event setup readiness, source-language retention, contact/content contracts, denied scope, revisions, retry/concurrency and transactional audit rollback.');
};
