const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

function wav(samples = 800) {
  const data = Buffer.alloc(44 + samples * 2); data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(8000, 24); data.writeUInt32LE(16000, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(samples * 2, 40); return data;
}
module.exports = async function checkMusicDelivery({ client, baseUrl, adminToken, login, musicRoot }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const owner = await client.user.create({ data: { email: 'music-owner@example.invalid', name: 'Music owner', emailVerified: true, password: template.password } });
  const token = await login(baseUrl, owner.email); const outsider = await login(baseUrl, 'judge@test.com');
  const event = await client.event.create({ data: { name: 'Music delivery fixture', startsAt: new Date('2099-01-01'), endsAt: new Date('2099-01-02') } });
  const studio = await client.studio.create({ data: { name: 'Music studio', eventId: event.id, representatives: { create: { userId: owner.id, active: true, name: owner.name, email: owner.email } }, registrations: { create: { eventId: event.id } } }, include: { registrations: true } });
  const base = `/events/${event.id}/studios/${studio.id}/music`;
  const request = async (url, auth = token, method = 'GET', body, headers = {}) => {
    const response = await fetch(`${baseUrl}/api/v1${url}`, { method, headers: { Authorization: `Bearer ${auth}`, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...headers }, ...(body && { body: body instanceof FormData ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.json().catch(() => null), headers: response.headers };
  };
  const policyPath = `/events/${event.id}/music-configuration`;
  let policy = { allowedMime: ['audio/wav', 'audio/mpeg'], maxBytes: 20000, maxDurationMs: 1000, deadline: '2099-01-01T00:00:00Z', exceptionUntil: '2099-01-02T00:00:00Z' };
  assert.equal((await request(base)).body.configuration.policy, null);
  const create = { operationId: randomUUID(), trackId: randomUUID() };
  assert.equal((await request(base, token, 'POST', create)).status, 409);
  assert.equal((await request(policyPath, token, 'PUT', { expectedRevision: 0, policy })).status, 403);
  assert.equal((await request(policyPath, adminToken, 'PUT', { expectedRevision: 0, policy })).status, 200);
  assert.equal((await request(policyPath, adminToken, 'PUT', { expectedRevision: 0, policy })).status, 409);
  assert.equal((await request(policyPath, adminToken, 'PUT', { expectedRevision: 1, policy: { ...policy, maxBytes: 0 } })).status, 400);
  assert.equal((await request(base, token, 'POST', { ...create, actorId: owner.id })).status, 400);
  const created = await request(base, token, 'POST', create); assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.deepEqual((await request(base, token, 'POST', create)).body, created.body);
  const trackPath = `${base}/${create.trackId}`;
  assert.equal((await request(trackPath + '/commands', token, 'POST', { operationId: randomUUID(), expectedRevision: 1, action: 'REOPEN' })).status, 400);
  const upload = async (command, bytes = wav(), auth = token, name = 'Synthetic.wav') => { const form = new FormData(); form.set('file', new Blob([bytes], { type: 'text/plain' }), name);
    return request(trackPath + '/versions', auth, 'POST', form, { 'X-Operation-Id': command.operationId, 'X-Music-Revision': String(command.expectedRevision), 'X-Policy-Revision': String(command.policyRevision), 'X-Display-Name': encodeURIComponent(name) }); };
  const command = { operationId: randomUUID(), expectedRevision: 1, policyRevision: 1 };
  assert.equal((await upload(command, wav(), outsider)).status, 403);
  assert.equal((await request(base.replace(event.id, 'foreign-event'))).status, 404);
  const first = await upload(command); assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.track.currentVersion.detectedMime, 'audio/wav', 'Client MIME is never trusted');
  assert.deepEqual((await upload(command)).body, first.body, 'Exact upload retries return original receipt');
  const changedBytes = wav(); changedBytes[44] = 1;
  assert.equal((await upload(command, changedBytes)).status, 409);
  assert.equal((await upload(command, wav(), adminToken)).status, 409);
  const version = first.body.track.currentVersion;
  // A multipart body can outlive logout/offboarding: revoke after staging and
  // before sending the final bytes, rather than testing only the next request.
  const boundary = 'music-' + randomUUID(); const audio = wav();
  const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="Synthetic.wav"\r\nContent-Type: audio/wav\r\n\r\n`);
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`); const stagingCount = await client.musicUpload.count();
  const http = require('node:http');
  let outgoing;
  const completed = new Promise((resolve, reject) => {
    outgoing = http.request(baseUrl + '/api/v1' + trackPath + '/versions', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': prefix.length + audio.length + suffix.length, 'X-Operation-Id': randomUUID(), 'X-Music-Revision': '2', 'X-Policy-Revision': '1' } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
    outgoing.on('error', reject); outgoing.setTimeout(10000, () => outgoing.destroy(new Error('Streaming fixture timed out'))); outgoing.write(prefix); outgoing.write(audio.subarray(0, 100));
  });
  try {
    for (let attempt = 0; attempt < 200 && await client.musicUpload.count() === stagingCount; attempt++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(await client.musicUpload.count() > stagingCount, 'Streaming request reached authorized staging');
    await client.user.update({ where: { id: owner.id }, data: { active: false } });
    outgoing.end(Buffer.concat([audio.subarray(100), suffix])); assert.equal(await completed, 401, 'Revoked eligibility cannot commit an in-flight upload');
  } finally { outgoing.destroy(); await client.user.update({ where: { id: owner.id }, data: { active: true } }); }
  assert.equal((await client.musicTrack.findUniqueOrThrow({ where: { id: create.trackId } })).currentVersionId, version.id);
  assert.equal(JSON.stringify(first.body).includes('objectKey'), false);
  const bytesPath = `${trackPath}/versions/${version.id}/bytes`;
  let playback = await fetch(baseUrl + '/api/v1' + bytesPath, { headers: { Authorization: 'Bearer ' + token, Range: 'bytes=0-43' } });
  assert.equal(playback.status, 206); assert.equal(playback.headers.get('cache-control'), 'private, no-store'); assert.equal((await playback.arrayBuffer()).byteLength, 44);
  assert.equal((await request(bytesPath, outsider)).status, 403);
  assert.equal((await fetch(baseUrl + '/api/v1' + bytesPath)).status, 401);
  for (const [bytes, name] of [[Buffer.from('<script>fake audio</script>'), 'fake.mp3'], [wav(9000), 'too-long.wav'], [wav(12000), 'too-large.wav'], [wav(), '../unsafe.wav']]) {
    assert.equal((await upload({ ...command, operationId: randomUUID(), expectedRevision: 2 }, bytes, token, name)).status, 400);
    assert.equal((await client.musicTrack.findUniqueOrThrow({ where: { id: create.trackId } })).currentVersionId, version.id);
  }
  const racer = { ...command, expectedRevision: 2 };
  const raced = await Promise.all([upload({ ...racer, operationId: randomUUID() }, wav(900)), upload({ ...racer, operationId: randomUUID() }, wav(950))]);
  assert.deepEqual(raced.map(row => row.status).sort(), [200, 409]);
  assert.equal((await request(bytesPath)).status, 404, 'Historical versions cannot obtain fresh byte access');
  let current = (await request(base)).body.tracks[0];
  const commands = body => request(trackPath + '/commands', token, 'POST', { operationId: randomUUID(), expectedRevision: current.revision, ...body });
  assert.equal((await commands({ action: 'ACCEPT', versionId: current.currentVersion.id })).status, 403);
  const confirmed = await commands({ action: 'CONFIRM', versionId: current.currentVersion.id }); assert.equal(confirmed.status, 200); current = confirmed.body.track;
  assert.equal((await upload({ ...command, operationId: randomUUID(), expectedRevision: current.revision })).status, 409);
  const accept = { operationId: randomUUID(), expectedRevision: current.revision, action: 'ACCEPT', versionId: current.currentVersion.id };
  const accepted = await request(trackPath + '/commands', adminToken, 'POST', accept); assert.equal(accepted.status, 200); current = accepted.body.track;
  assert.deepEqual((await request(trackPath + '/commands', adminToken, 'POST', accept)).body, accepted.body);
  const reopen = { operationId: randomUUID(), expectedRevision: current.revision, action: 'REOPEN', reason: 'Correct the recording', until: '2099-01-01T12:00:00Z' };
  assert.equal((await request(trackPath + '/commands', token, 'POST', reopen)).status, 403);
  const reopened = await request(trackPath + '/commands', adminToken, 'POST', reopen); assert.equal(reopened.status, 200); current = reopened.body.track;
  const performance = await client.performance.create({ data: { eventId: event.id, studioId: studio.id, registrationId: studio.registrations[0].id } });
  const foreign = await client.studio.create({ data: { eventId: event.id, name: 'Other music studio', registrations: { create: { eventId: event.id } } }, include: { registrations: true } });
  const foreignPerformance = await client.performance.create({ data: { eventId: event.id, studioId: foreign.id, registrationId: foreign.registrations[0].id } });
  assert.equal((await commands({ action: 'ATTACH', performanceId: foreignPerformance.id })).status, 404);
  const attached = await commands({ action: 'ATTACH', performanceId: performance.id }); assert.equal(attached.status, 200); current = attached.body.track;
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_music_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'MUSIC_REPLACED' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe('CREATE TRIGGER reject_music_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_music_audit()');
  try { assert.equal((await upload({ ...command, operationId: randomUUID(), expectedRevision: current.revision })).status, 500); assert.equal((await client.musicTrack.findUniqueOrThrow({ where: { id: create.trackId } })).revision, current.revision); }
  finally { await client.$executeRawUnsafe('DROP TRIGGER reject_music_audit ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION reject_music_audit()'); }
  policy = { ...policy, deadline: '2000-01-01T00:00:00Z' };
  assert.equal((await request(policyPath, adminToken, 'PUT', { expectedRevision: 1, policy })).status, 200);
  assert.deepEqual((await upload(command)).body, first.body, 'An executed upload reconciles its receipt after policy changes');
  assert.equal((await upload({ operationId: randomUUID(), expectedRevision: current.revision, policyRevision: 1 })).status, 409);
  assert.equal((await upload({ operationId: randomUUID(), expectedRevision: current.revision, policyRevision: 2 })).status, 200, 'Explicit correction survives normal deadline');
  await client.musicTrack.update({ where: { id: current.id }, data: { correctionUntil: new Date('2000-01-01') } });
  current = (await request(base)).body.tracks[0];
  assert.equal((await upload({ operationId: randomUUID(), expectedRevision: current.revision, policyRevision: 2 })).status, 403);
  const activeBytes = `${trackPath}/versions/${current.currentVersion.id}/bytes`;
  await client.studioRepresentative.updateMany({ where: { studioId: studio.id }, data: { active: false } });
  assert.equal((await request(base)).status, 403); assert.equal((await request(activeBytes)).status, 403);
  assert.equal((await upload(command)).status, 403, 'Offboarded actors cannot replay receipts');
  for (const status of ['REJECTED', 'CANCELLED', 'LOCKED']) { await client.studioEventRegistration.update({ where: { id: studio.registrations[0].id }, data: { status } }); assert.equal((await request(base, adminToken)).status, 403); }
  assert.equal(await client.musicVersion.count({ where: { trackId: current.id } }), 3, 'Only acknowledged successful versions are retained');
  // Run the real cleanup worker against this isolated fixture root/database.
  process.env.MUSIC_STORAGE_PATH = musicRoot;
  process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused'; process.env.EMAIL_FROM = 'cleanup@example.invalid'; process.env.JWT_SECRET = 'cleanup-fixture-secret-with-32-characters';
  const { cleanupMusicUploads } = require('../apps/api/dist/services/musicStorage.js');
  const retained = await client.musicVersion.findMany({ where: { trackId: current.id } });
  await client.musicUpload.updateMany({ data: { expiresAt: new Date('2000-01-01') } });
  await cleanupMusicUploads(client);
  assert.equal(await client.musicUpload.count(), 0);
  for (const row of retained) assert.ok((await fs.stat(path.join(musicRoot, row.objectKey))).size > 0);
  const live = randomUUID(); await client.musicUpload.create({ data: { id: live, expiresAt: new Date(Date.now() + 3600000) } });
  await fs.writeFile(path.join(musicRoot, live), 'live staging'); await cleanupMusicUploads(client);
  assert.equal(await client.musicUpload.count({ where: { id: live } }), 1, 'Live staging is not orphaned');
  const failed = randomUUID(); await client.musicUpload.create({ data: { id: failed, expiresAt: new Date('2000-01-01') } });
  await fs.mkdir(path.join(musicRoot, failed)); await assert.rejects(cleanupMusicUploads(client));
  assert.equal((await client.musicUpload.findUniqueOrThrow({ where: { id: failed } })).deleting, true, 'Failed external deletion stays retired for retry');
  await fs.rmdir(path.join(musicRoot, failed)); await cleanupMusicUploads(client);
  assert.equal(await client.musicUpload.count({ where: { id: failed } }), 0);
  console.log('PASS: private music content/limits, exact scope, retry/concurrency, acceptance, correction, byte ranges, audit rollback and staging cleanup.');
};
