const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

// Only the random migrated database owned by test-baseline.cjs is used.
module.exports = async function checkEntryWorkflow({ client, baseUrl, adminToken, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const owner = await client.user.create({ data: { email: 'checkpoint-owner@example.invalid', name: 'Checkpoint owner', emailVerified: true, password: template.password } });
  const stranger = await client.user.create({ data: { email: 'checkpoint-stranger@example.invalid', name: 'Checkpoint stranger', emailVerified: true, password: template.password } });
  const event = await client.event.create({ data: { name: 'Studio checkpoints', stage: 'REGISTRATION_OPEN', startsAt: new Date('2026-12-05'), endsAt: new Date('2026-12-06'), timeZone: 'Europe/Tallinn',
    categories: { create: { name: 'Kids' } }, ageGroups: { create: { name: 'Up to 7', minAge: 0, maxAge: 7 } },
    formats: { create: { name: 'Group', minParticipants: 3, maxParticipants: 1000, maxDurationSeconds: 240 } } }, include: { categories: true, ageGroups: true, formats: true } });
  const otherEvent = await client.event.create({ data: { name: 'Other checkpoints', startsAt: new Date('2026-12-05'), endsAt: new Date('2026-12-06') } });
  const prefix = `/events/${event.id}`;
  const request = async (path, token = adminToken, method = 'GET', body) => {
    const response = await fetch(`${baseUrl}/api/v1${path}`, { method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const ownerToken = await login(baseUrl, owner.email); const strangerToken = await login(baseUrl, stranger.email);
  const role = await client.role.findUniqueOrThrow({ where: { key: 'representative' } });
  await client.userRole.createMany({ data: [owner.id, stranger.id].map(userId => ({ userId, roleId: role.id, eventId: event.id })) });
  const settings = { basic: { enabled: true, deadline: null }, final: { enabled: true, deadline: null }, allowYounger: true, olderPercent: 20,
    requireTeacher: true, requireAuthor: true, nominations: [{ categoryId: event.categories[0].id, ageGroupId: event.ageGroups[0].id, formatId: event.formats[0].id, maxDurationSeconds: 210, maxParticipants: null }] };
  assert.equal((await request(prefix + '/entry-configuration', strangerToken)).status, 403);
  assert.equal((await request(prefix + '/entry-configuration', adminToken, 'PUT', { expectedRevision: 0, settings, spoofed: true })).status, 400);
  assert.equal((await request(prefix + '/entry-configuration', adminToken, 'PUT', { expectedRevision: 0, settings })).status, 200);
  const studio = await client.studio.create({ data: { eventId: event.id, name: 'Checkpoint studio', approvalStatus: 'APPROVED',
    representatives: { create: { userId: owner.id, name: owner.name, email: owner.email } },
    registrations: { create: { eventId: event.id, status: 'APPROVED' } },
    dancers: { create: [1, 2, 3, 4, 5].map(i => ({ firstName: `Dancer ${i}`, lastName: 'Fixture', birthDate: new Date(i === 5 ? '2000-01-01' : '2020-01-01') })) } }, include: { dancers: true } });
  const review = prefix + `/studios/${studio.id}/entry-review`;
  const read = async () => { const response = await request(review); assert.equal(response.status, 200); return response.body; };
  const command = async (kind, action, token = adminToken, extras = {}) => {
    const state = (await read()).checkpoints.find(row => row.kind === kind);
    return request(review + '/' + kind, token, 'POST', { expectedRevision: state.revision, operationId: randomUUID(), action, ...extras });
  };
  assert.equal((await request(review, strangerToken)).status, 403);
  assert.equal((await request(`/events/${otherEvent.id}/studios/${studio.id}/entry-review`)).status, 404);
  assert.equal((await request(prefix + '/entry-configuration', ownerToken, 'PUT', { expectedRevision: 1, settings })).status, 403);
  assert.equal((await request(prefix + '/entry-configuration', adminToken, 'PUT', { expectedRevision: 1, settings: { ...settings, olderPercent: 100 } })).status, 409);
  await assert.rejects(client.ageGroup.update({ where: { id: event.ageGroups[0].id }, data: { maxAge: 8 } }));
  await assert.rejects(client.event.update({ where: { id: event.id }, data: { timeZone: 'UTC' } }));
  const input = { studioId: studio.id, title: 'Saved basic', categoryId: event.categories[0].id, ageGroupId: event.ageGroups[0].id, formatId: event.formats[0].id };
  const create = await request(prefix + '/performances', ownerToken, 'POST', input); assert.equal(create.status, 201);
  const id = create.body.id; const item = prefix + '/performances/' + id;
  const patch = async (fields, token = ownerToken) => {
    const stored = await client.performance.findUniqueOrThrow({ where: { id } });
    return request(item, token, 'PATCH', { expectedRevision: stored.revision, ...fields });
  };
  // Basic confirmation intentionally does not require final roster/duration/credits.
  const beforeBasic = (await read()).checkpoints.find(row => row.kind === 'BASIC');
  const operation = { expectedRevision: beforeBasic.revision, operationId: randomUUID(), action: 'SUBMIT' };
  const submitted = await request(review + '/BASIC', ownerToken, 'POST', operation); assert.equal(submitted.status, 200);
  assert.deepEqual(submitted.body.manifest.roster, [], 'Basic receipts do not retain the unrelated full studio roster');
  assert.equal((await request(review + '/BASIC', ownerToken, 'POST', operation)).body.id, submitted.body.id);
  assert.equal((await request(review + '/BASIC', ownerToken, 'POST', { ...operation, visible: true })).status, 409);
  assert.equal((await request(review + '/BASIC', ownerToken, 'POST', { ...operation, unknown: true })).status, 400);
  assert.equal((await patch({ title: 'Blocked' })).status, 403);
  assert.equal((await request(prefix + '/performances', ownerToken, 'POST', input)).status, 403);
  assert.equal((await command('BASIC', 'ACCEPT', ownerToken)).status, 403);
  assert.equal((await command('BASIC', 'ACCEPT')).status, 200);
  assert.equal((await command('FINAL', 'SUBMIT', ownerToken)).status, 409);
  assert.equal((await patch({ durationSec: 210, teacher: 'Teacher', author: 'Choreographer', dancerIds: studio.dancers.map(d => d.id) })).status, 200);
  const final = await command('FINAL', 'SUBMIT', ownerToken); assert.equal(final.status, 200);
  assert.equal(final.body.manifest.entries[0].snapshot.participants.length, 5, 'One dancer of any older age among five is allowed');
  const pinned = await client.performanceRevision.findUniqueOrThrow({ where: { performanceId_revision: { performanceId: id, revision: final.body.manifest.entries[0].revision } } });
  assert.deepEqual(pinned.snapshot, final.body.manifest.entries[0].snapshot);
  assert.equal((await patch({ durationSec: 200 })).status, 403);
  assert.equal((await request(`/studios/${studio.id}/dancers/${studio.dancers[0].id}`, ownerToken, 'PATCH', { firstName: 'Blocked' })).status, 403);
  await assert.rejects(client.entryReceipt.update({ where: { id: final.body.id }, data: { reason: 'Rewrite' } }));
  await assert.rejects(client.entryReceipt.delete({ where: { id: final.body.id } }));
  const storedReceipt = await client.entryReceipt.findUniqueOrThrow({ where: { id: final.body.id } });
  const otherStudio = await client.studio.create({ data: { name: 'Other checkpoint owner', eventId: otherEvent.id,
    registrations: { create: { eventId: otherEvent.id, status: 'APPROVED' } } }, include: { registrations: true } });
  await assert.rejects(client.entryCheckpoint.update({ where: { id: storedReceipt.checkpointId }, data: { registrationId: otherStudio.registrations[0].id } }));
  assert.equal((await request(`/events/${otherEvent.id}/entry-configuration`, adminToken, 'PUT', { expectedRevision: 0, settings: { ...settings, nominations: [] } })).status, 409, 'First policy publication must precede registration');
  await assert.rejects(client.entryReceipt.create({ data: { ...storedReceipt, id: randomUUID(), operationId: randomUUID(), revision: 9999,
    manifest: { ...storedReceipt.manifest, entries: storedReceipt.manifest.entries.map(entry => ({ ...entry, snapshot: { ...entry.snapshot, title: 'Forged snapshot' } })) } } }));
  const until = new Date(Date.now() + 3600000).toISOString();
  const config = (await request(prefix + '/entry-configuration')).body;
  assert.equal((await request(prefix + '/entry-configuration', adminToken, 'PUT', { expectedRevision: config.revision,
    settings: { ...settings, basic: { enabled: true, deadline: new Date(Date.now() - 1000).toISOString() }, final: { enabled: true, deadline: new Date(Date.now() - 1000).toISOString() } } })).status, 200);
  assert.equal((await request(review + '/BASIC', ownerToken, 'POST', operation)).body.id, submitted.body.id, 'A lost response is reconciled after the deadline');
  assert.equal((await command('FINAL', 'REOPEN', adminToken, { reason: 'Duration correction', grant: { fields: ['durationSec'], performanceIds: [id], until } })).status, 200);
  assert.equal((await command('FINAL', 'ACCEPT')).status, 409, 'An old submission cannot accept a reopened or changed form');
  assert.equal((await patch({ title: 'Outside scope' })).status, 403);
  assert.equal((await patch({ durationSec: 211 })).status, 200);
  assert.equal((await command('FINAL', 'SUBMIT', ownerToken)).status, 409, 'Kids category limit is 210 seconds, not the base format 240');
  assert.equal((await patch({ durationSec: 210 })).status, 200);
  assert.equal((await command('FINAL', 'SUBMIT', ownerToken)).status, 200);
  assert.equal((await patch({ durationSec: 200 })).status, 403, 'Resubmission consumes the reopening');
  const headBeforeReplace = (await read()).checkpoints.find(row => row.kind === 'FINAL');
  const oldGrant = { expectedRevision: headBeforeReplace.revision, operationId: randomUUID(), action: 'REOPEN', reason: 'First scope',
    grant: { fields: ['teacher'], performanceIds: [id], until } };
  assert.equal((await request(review + '/FINAL', adminToken, 'POST', oldGrant)).status, 200);
  const staleVersion = (await read()).checkpoints.find(row => row.kind === 'FINAL').revision;
  assert.equal((await command('FINAL', 'REOPEN', adminToken, { reason: 'Replacement scope', grant: { fields: ['durationSec'], performanceIds: [id], until } })).status, 200);
  assert.equal((await request(review + '/FINAL', ownerToken, 'POST', { expectedRevision: staleVersion, operationId: randomUUID(), action: 'SUBMIT' })).status, 409);
  assert.equal((await request(review + '/FINAL', adminToken, 'POST', oldGrant)).status, 200, 'Retry returns its old receipt without reinstating its old grant');
  assert.equal((await patch({ teacher: 'Old grant must not work' })).status, 403);
  assert.equal((await patch({ durationSec: 200 })).status, 200);
  assert.equal((await command('FINAL', 'SUBMIT', ownerToken)).status, 200);
  // Administrator changes retain locks, invalidate acceptance and can exceed time windows with an explicit eligibility exception.
  assert.equal((await patch({ dancerIds: studio.dancers.slice(1).map(d => d.id) }, adminToken)).status, 200);
  assert.ok((await read()).checkpoints.find(row => row.kind === 'FINAL').issues.some(issue => issue.reason === 'age'));
  assert.equal((await command('FINAL', 'SUBMIT', adminToken, { exception: true, reason: 'Approved age exception' })).status, 200);
  await client.dancer.update({ where: { id: studio.dancers[1].id }, data: { birthDate: new Date('2030-01-01') } });
  assert.equal((await command('FINAL', 'SUBMIT', adminToken, { exception: true, reason: 'A future birth date cannot be waived' })).status, 409);
  await client.dancer.update({ where: { id: studio.dancers[1].id }, data: { birthDate: new Date('2020-01-01') } });
  await client.event.update({ where: { id: event.id }, data: { stage: 'ENDED' } });
  assert.equal((await patch({ author: 'Late retained correction' }, adminToken)).status, 200);
  const state = (await read()).checkpoints.find(row => row.kind === 'FINAL');
  const concurrentBody = { expectedRevision: state.revision, action: 'SUBMIT', exception: true, reason: 'Late reviewed exception' };
  const concurrent = await Promise.all([1, 2].map(() => request(review + '/FINAL', adminToken, 'POST', { ...concurrentBody, operationId: randomUUID() })));
  assert.deepEqual(concurrent.map(row => row.status).sort(), [200, 409]);
  const beforeRollback = await client.entryReceipt.count();
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_checkpoint_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'ENTRY_REOPENED' THEN RAISE EXCEPTION 'Synthetic checkpoint failure'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe(`CREATE TRIGGER checkpoint_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_checkpoint_audit()`);
  const beforeHead = await read();
  try {
    assert.equal((await command('FINAL', 'REOPEN', adminToken, { reason: 'Rollback', grant: { fields: ['durationSec'], performanceIds: [id], until } })).status, 500);
    assert.equal(await client.entryReceipt.count(), beforeRollback); assert.deepEqual(await read(), beforeHead);
  } finally { await client.$executeRawUnsafe('DROP TRIGGER checkpoint_failure ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION reject_checkpoint_audit()'); }
  assert.equal((await command('FINAL', 'REOPEN', adminToken, { reason: 'Wrong scope', grant: { fields: ['durationSec'], performanceIds: ['foreign-entry'], until } })).status, 409);
  const checkpointAudits = await client.auditLog.findMany({ where: { studioId: studio.id, action: { in: ['ENTRY_SUBMITTED', 'ENTRY_ACCEPTED', 'ENTRY_REOPENED'] } } });
  for (const audit of checkpointAudits) {
    assert.equal(audit.targetType, 'ENTRY_CHECKPOINT');
    const receipt = await client.entryReceipt.findUnique({ where: { checkpointId_revision: { checkpointId: audit.targetId, revision: audit.metadata.revision } } });
    assert.ok(receipt); assert.equal(receipt.actorId, audit.actorId);
  }
  const applicationReview = await request(prefix + `/studio-registrations/${studio.id}/review`);
  assert.equal(applicationReview.status, 200); assert.ok(applicationReview.body.history.every(row => !row.action.startsWith('ENTRY_')));
  await client.studioRepresentative.updateMany({ where: { studioId: studio.id }, data: { active: false } });
  assert.equal((await request(review, ownerToken)).status, 403);
  console.log('PASS: studio-wide basic/final receipts, any-older 20% age rule, category duration, locks/roster scope, rule freeze, retries, stale/concurrent writes and immutable audit rollback.');
};
