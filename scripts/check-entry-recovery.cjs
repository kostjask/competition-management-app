const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

// Uses only the random disposable database owned and cleaned by test-baseline.cjs.
module.exports = async function checkEntryRecovery({ client, baseUrl, adminToken, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const owner = await client.user.create({ data: { email: 'recovery-owner@example.invalid', name: 'Recovery owner', emailVerified: true, password: template.password } });
  const stranger = await client.user.create({ data: { email: 'recovery-stranger@example.invalid', name: 'Recovery stranger', emailVerified: true, password: template.password } });
  const event = await client.event.create({ data: { name: 'Entry recovery', stage: 'REGISTRATION_OPEN', startsAt: new Date('2026-12-05'), endsAt: new Date('2026-12-06'), timeZone: 'Europe/Tallinn' } });
  const other = await client.event.create({ data: { name: 'Recovery other event', startsAt: new Date('2026-12-05'), endsAt: new Date('2026-12-06') } });
  const prefix = `/events/${event.id}`; const configPath = prefix + '/entry-configuration';
  const request = async (path, token = adminToken, method = 'GET', body) => {
    const response = await fetch(`${baseUrl}/api/v1${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  const ownerToken = await login(baseUrl, owner.email); const strangerToken = await login(baseUrl, stranger.email);
  const transition = (path, token, body) => request(body.action === 'WITHDRAW' ? path : path + '/restore', token, body.action === 'WITHDRAW' ? 'DELETE' : 'POST', body);
  const role = await client.role.findUniqueOrThrow({ where: { key: 'representative' } });
  await client.userRole.createMany({ data: [owner.id, stranger.id].map(userId => ({ userId, roleId: role.id, eventId: event.id })) });
  const options = { categories: [{ id: randomUUID(), name: 'Recovery category' }], ages: [{ id: randomUUID(), name: 'All ages', minAge: 0, maxAge: null }],
    formats: [{ id: randomUUID(), name: 'Unbounded group', minParticipants: 1, maxParticipants: null, maxDurationSeconds: 240 }] };
  const settings = { basic: { enabled: true, deadline: new Date(Date.now() + 3600000).toISOString() }, final: { enabled: true, deadline: null },
    allowYounger: true, olderPercent: 20, requireTeacher: false, requireAuthor: false,
    nominations: [{ categoryId: options.categories[0].id, ageGroupId: options.ages[0].id, formatId: options.formats[0].id, maxParticipants: null, maxDurationSeconds: 210 }] };
  const configuration = { expectedRevision: 0, options, settings };
  // Exercise the complete source-table size against PostgreSQL, not only UI mocks.
  const presetEvent = await client.event.create({ data: { name: 'Complete nomination copy', startsAt: new Date('2026-12-05'), endsAt: new Date('2026-12-06') } });
  const presetOptions = {
    categories: Array.from({ length: 10 }, (_, i) => ({ id: randomUUID(), name: `Preset category ${i}` })),
    ages: [[0, 7], [7, 10], [11, 13], [14, 17], [18, 25], [26, null]].map(([minAge, maxAge]) => ({ id: randomUUID(), name: `Age ${minAge}`, minAge, maxAge })),
    formats: [[7, null, 240], [3, 6, 240], [2, 2, 150], [1, 1, 150]].map(([minParticipants, maxParticipants, maxDurationSeconds]) => ({ id: randomUUID(), name: `Format ${minParticipants}`, minParticipants, maxParticipants, maxDurationSeconds })),
  };
  const presetNominations = presetOptions.categories.flatMap((category, i) => (i === 9 ? presetOptions.ages.slice(0, 1) : presetOptions.ages.slice(1)).flatMap(age =>
    (i === 9 ? presetOptions.formats.slice(0, 2) : presetOptions.formats).map(format => ({ categoryId: category.id, ageGroupId: age.id, formatId: format.id, maxParticipants: format.maxParticipants, maxDurationSeconds: i === 9 ? 210 : format.maxDurationSeconds }))));
  const fullPreset = await request(`/events/${presetEvent.id}/entry-configuration`, adminToken, 'PUT', { expectedRevision: 0, options: presetOptions, settings: { ...settings, nominations: presetNominations } });
  assert.equal(fullPreset.status, 200); assert.equal(fullPreset.body.settings.nominations.length, 182);
  assert.equal(await client.danceCategory.count({ where: { eventId: presetEvent.id } }), 10);
  assert.equal(await client.ageGroup.count({ where: { eventId: presetEvent.id } }), 6);
  assert.equal(await client.danceFormat.count({ where: { eventId: presetEvent.id, maxParticipants: null } }), 1);
  assert.equal((await request(configPath, ownerToken, 'PUT', configuration)).status, 403);
  assert.equal((await request(configPath, adminToken, 'PUT', { ...configuration, options: { ...options, formats: [{ ...options.formats[0], minParticipants: 0 }] } })).status, 400);
  assert.equal((await request(configPath, adminToken, 'PUT', { ...configuration, settings: { ...settings, nominations: [{ ...settings.nominations[0], formatId: 'missing' }] } })).status, 409);
  assert.equal(await client.danceCategory.count({ where: { eventId: event.id } }), 0, 'Invalid policy rolls back its new options');
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_recovery_setup_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'ENTRY_CONFIGURED' THEN RAISE EXCEPTION 'Synthetic setup audit failure'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe(`CREATE TRIGGER recovery_setup_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_recovery_setup_audit()`);
  try { assert.equal((await request(configPath, adminToken, 'PUT', configuration)).status, 500); assert.equal(await client.danceFormat.count({ where: { eventId: event.id } }), 0); }
  finally { await client.$executeRawUnsafe('DROP TRIGGER recovery_setup_failure ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION reject_recovery_setup_audit()'); }
  const configured = await request(configPath, adminToken, 'PUT', configuration); assert.equal(configured.status, 200);
  assert.equal((await request(configPath, adminToken, 'PUT', configuration)).status, 409);
  assert.equal((await request(`/events/${other.id}/entry-configuration`, adminToken, 'PUT', configuration)).status, 409, 'Cannot copy another event option identity');
  const studio = await client.studio.create({ data: { name: 'Recovery studio', eventId: event.id, approvalStatus: 'APPROVED',
    registrations: { create: { eventId: event.id, status: 'APPROVED' } }, representatives: { create: { userId: owner.id, name: owner.name, email: owner.email } },
    dancers: { create: { firstName: 'Recovery', lastName: 'Dancer', birthDate: new Date('2000-01-01') } } }, include: { dancers: true } });
  assert.equal((await request(configPath, adminToken, 'PUT', { expectedRevision: configured.body.revision, settings, options: { ...options, categories: [{ id: randomUUID(), name: 'Frozen new category' }] } })).status, 409);
  const created = await request(prefix + '/performances', ownerToken, 'POST', { studioId: studio.id, title: 'Retained identity', categoryId: options.categories[0].id,
    ageGroupId: options.ages[0].id, formatId: options.formats[0].id, dancerIds: [studio.dancers[0].id], durationSec: 210 });
  assert.equal(created.status, 201); const id = created.body.id; const item = prefix + '/performances/' + id;
  const review = prefix + `/studios/${studio.id}/entry-review`;
  const command = async (action, extra = {}, token = adminToken) => {
    const head = (await request(review)).body.checkpoints.find(row => row.kind === 'FINAL');
    return request(review + '/FINAL', token, 'POST', { action, operationId: randomUUID(), expectedRevision: head.revision, ...extra });
  };
  assert.equal((await command('SUBMIT', {}, ownerToken)).status, 200);
  assert.equal((await command('ACCEPT')).status, 200);
  const oldReceipts = await client.entryReceipt.findMany({ where: { checkpoint: { registration: { studioId: studio.id } } }, orderBy: { revision: 'asc' } });
  const version = await client.performance.findUniqueOrThrow({ where: { id } });
  const withdrawal = { expectedRevision: version.revision, operationId: randomUUID(), action: 'WITHDRAW', reason: 'Studio withdrew before deadline' };
  assert.equal((await transition(item, strangerToken, withdrawal)).status, 403);
  assert.equal((await transition(`/events/${other.id}/performances/${id}`, adminToken, withdrawal)).status, 404);
  assert.equal((await transition(item, ownerToken, { ...withdrawal, reason: '' })).status, 400);
  const withdrawn = await transition(item, ownerToken, withdrawal); assert.equal(withdrawn.status, 200, 'Early checkpoint lock does not prevent timely withdrawal');
  assert.equal(withdrawn.body.archived, true);
  assert.deepEqual((await transition(item, ownerToken, withdrawal)).body, withdrawn.body);
  assert.equal((await transition(item, ownerToken, { ...withdrawal, reason: 'Changed reuse' })).status, 409);
  assert.equal((await request(item + '/history', ownerToken)).status, 200);
  assert.equal((await request(prefix + '/performances?state=withdrawn', ownerToken)).body[0].id, id);
  assert.equal((await request(prefix + '/performances?state=invalid', ownerToken)).status, 400);
  assert.equal((await request(prefix + '/performances', ownerToken)).body.length, 0);
  assert.equal((await request(review)).body.checkpoints.find(row => row.kind === 'FINAL').status, 'DRAFT');
  const restore = { expectedRevision: withdrawn.body.revision, operationId: randomUUID(), action: 'RESTORE', reason: 'Returned to the studio manifest' };
  assert.equal((await transition(item, strangerToken, restore)).status, 403);
  assert.equal((await transition(`/events/${other.id}/performances/${id}`, adminToken, restore)).status, 404);
  assert.equal((await request(item + '/restore', ownerToken, 'POST', withdrawal)).status, 400, 'Restore route cannot be used as another withdrawal endpoint');
  assert.equal((await transition(item, ownerToken, restore)).status, 403, 'Restoration cannot bypass submitted membership locks');
  await client.dancer.update({ where: { id: studio.dancers[0].id }, data: { deletedAt: new Date() } });
  assert.equal((await transition(item, adminToken, restore)).status, 409, 'Organizer cannot restore inactive participants');
  await client.dancer.update({ where: { id: studio.dancers[0].id }, data: { deletedAt: null } });
  assert.equal((await command('REOPEN', { reason: 'Restore studio entry membership', grant: { fields: ['entries'], performanceIds: null, until: new Date(Date.now() + 3600000).toISOString() } })).status, 200);
  const restored = await transition(item, ownerToken, restore); assert.equal(restored.status, 200);
  const current = (await request(item, ownerToken)).body; assert.equal(current.id, id); assert.equal(current.registrationId, created.body.registrationId); assert.equal(current.archived, false); assert.equal(current.participants.length, 1);
  assert.equal((await command('SUBMIT', {}, ownerToken)).status, 200);
  const receipts = await client.entryReceipt.findMany({ where: { id: { in: oldReceipts.map(row => row.id) } }, orderBy: { revision: 'asc' } });
  assert.deepEqual(receipts, oldReceipts, 'Recovery never rewrites past submissions or acceptance');
  assert.equal((await request(item + '/history')).body[0].snapshot.configuration.format.maxParticipants, null);
  const operation = await client.performanceOperation.findUniqueOrThrow({ where: { operationId: restore.operationId } });
  await assert.rejects(client.performanceOperation.update({ where: { operationId: restore.operationId }, data: { reason: 'Rewrite' } }));
  await assert.rejects(client.performanceOperation.delete({ where: { operationId: restore.operationId } }));
  assert.equal(operation.actorId, owner.id);
  const config = (await request(configPath)).body;
  assert.equal((await request(configPath, adminToken, 'PUT', { expectedRevision: config.revision, settings: { ...settings, basic: { ...settings.basic, deadline: new Date(Date.now() - 1000).toISOString() } } })).status, 200);
  const late = { ...withdrawal, operationId: randomUUID(), expectedRevision: (await request(item)).body.revision };
  assert.equal((await transition(item, ownerToken, late)).status, 403);
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_recovery_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'PERFORMANCE_ARCHIVED' THEN RAISE EXCEPTION 'Synthetic recovery audit failure'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe(`CREATE TRIGGER recovery_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_recovery_audit()`);
  const before = await client.performance.findUniqueOrThrow({ where: { id } });
  try { assert.equal((await transition(item, adminToken, late)).status, 500); assert.deepEqual(await client.performance.findUniqueOrThrow({ where: { id } }), before); assert.equal(await client.performanceOperation.count({ where: { operationId: late.operationId } }), 0); }
  finally { await client.$executeRawUnsafe('DROP TRIGGER recovery_failure ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION reject_recovery_audit()'); }
  const race = await Promise.all([1, 2].map(() => transition(item, adminToken, late)));
  assert.ok(race.some(row => row.status === 200)); assert.ok(race.every(row => [200, 409].includes(row.status)));
  assert.equal(await client.performanceOperation.count({ where: { operationId: late.operationId } }), 1);
  const originalRestoreRetry = await transition(item, ownerToken, restore); assert.deepEqual(originalRestoreRetry.body, restored.body, 'An older retry acknowledges without restoring a newly withdrawn entry');
  assert.equal((await request(item)).body.archived, true);
  await client.event.update({ where: { id: event.id }, data: { stage: 'ENDED' } });
  const terminalRestore = { ...restore, operationId: randomUUID(), expectedRevision: (await request(item)).body.revision };
  assert.equal((await transition(item, ownerToken, terminalRestore)).status, 403);
  assert.equal((await transition(item, adminToken, terminalRestore)).status, 200, 'Organizer can restore late with retained reason/history');
  await client.studioRepresentative.updateMany({ where: { studioId: studio.id }, data: { active: false } });
  assert.equal((await transition(item, ownerToken, restore)).status, 403, 'Retry requires current access');
  assert.equal((await request(item + '/history', ownerToken)).status, 403);
  await client.studio.update({ where: { id: studio.id }, data: { deletedAt: new Date() } });
  assert.equal((await transition(item, adminToken, restore)).status, 404);
  console.log('PASS: atomic option creation, nullable format bounds, retained withdrawal/restore/resubmission, current access, deadlines, locks, immutable retries and audit rollback.');
};
