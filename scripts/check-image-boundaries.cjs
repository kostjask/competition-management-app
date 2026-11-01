const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { isDeepStrictEqual } = require('node:util');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');

module.exports = function checkImages({ serverEnv }) {
  const result = spawnSync(process.execPath, [__filename], { env: serverEnv, encoding: 'utf8', timeout: 90000 });
  if (result.status !== 0) throw new Error('Image boundary fixture failed: ' + result.stderr.trim());
  console.log('Image boundaries: authorization/active parents/stages, raster decoding, private retrieval, safe headers, audit rollback, revoked access and concurrent replacement passed.');
};

let stage = 'target';
async function main() {
  const target = new URL(process.env.DATABASE_URL);
  assert.equal(target.hostname, 'localhost'); assert.match(target.pathname, /^\/dance_baseline_[a-f0-9]{32}$/);
  const apiRequire = createRequire(path.resolve(__dirname, '../apps/api/package.json'));
  const sharp = apiRequire('sharp'); const jwt = apiRequire('jsonwebtoken');
  const { PrismaClient } = require('@prisma/client'); const { PrismaPg } = require('@prisma/adapter-pg');
  const { createApp } = require('../apps/api/dist/app.js');
  const { LocalStorageService } = require('../apps/api/dist/services/local-storage.js');
  const { setStorageProvider } = require('../apps/api/dist/services/storage.js');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dance-images-'));
  const real = new LocalStorageService(root);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  let afterUpload; let uploads = 0; let cleanupFailure = false;
  setStorageProvider({
    uploadFile: async (...args) => { uploads++; const key = await real.uploadFile(...args); if (afterUpload) await afterUpload(); return key; },
    readFile: key => real.readFile(key), getFileUrl: key => '/uploads/' + key,
    deleteFile: key => { if (cleanupFailure) throw new Error('Synthetic cleanup failure'); return real.deleteFile(key); },
  });
  const server = createApp(client).listen(0, '127.0.0.1'); await require('node:events').once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const png = await sharp({ create: { width: 3, height: 2, channels: 3, background: 'red' } }).png().toBuffer();
  const session = user => jwt.sign({ userId: user.id, sessionVersion: user.sessionVersion }, process.env.JWT_SECRET);
  const post = async (resource, id, token, bytes = png, mimetype = 'image/png', filename = 'fixture.png') => {
    const form = new FormData();
    form.set(resource === 'events' ? 'image' : resource === 'studios' ? 'logo' : 'photo', new Blob([bytes], { type: mimetype }), filename);
    const response = await fetch(`${base}/api/v1/images/${resource}/${id}`, { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: form, signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.json() };
  };
  const get = (url, token) => fetch(base + url, { headers: token ? { Authorization: 'Bearer ' + token } : {}, signal: AbortSignal.timeout(10000) });
  const files = async () => (await fs.readdir(root, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile()).map(entry => entry.name).sort();
  const snapshot = async () => Object.fromEntries(await Promise.all(['user','userRole','studio','dancer','event','studioRepresentative','studioEventRegistration','auditLog']
    .map(async model => [model, await client[model].findMany({ orderBy: { id: 'asc' } })])));
  try {
    stage = 'fixtures';
    const event = await client.event.create({ data: { name: 'Image scope', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'), stage: 'REGISTRATION_OPEN' } });
    const otherEvent = await client.event.create({ data: { name: 'Other image scope', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'), stage: 'REGISTRATION_OPEN' } });
    const owner = await client.user.create({ data: { email: 'image-owner@example.invalid', name: 'Owner', emailVerified: true } });
    const stranger = await client.user.create({ data: { email: 'image-stranger@example.invalid', name: 'Stranger', emailVerified: true } });
    const admin = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
    const representative = await client.role.findUniqueOrThrow({ where: { key: 'representative' } });
    const assigned = await client.userRole.create({ data: { userId: owner.id, roleId: representative.id, eventId: event.id } });
    const studio = await client.studio.create({ data: { eventId: event.id, name: 'Images studio', approvalStatus: 'APPROVED', representatives: { create: { userId: owner.id, name: 'Owner', email: owner.email } }, registrations: { create: { eventId: event.id, status: 'APPROVED' } } } });
    const foreign = await client.studio.create({ data: { eventId: event.id, name: 'Foreign images studio', approvalStatus: 'APPROVED' } });
    const crossEvent = await client.studio.create({ data: { eventId: otherEvent.id, name: 'Cross-event images studio', approvalStatus: 'APPROVED', representatives: { create: { userId: owner.id, name: 'Owner', email: owner.email } }, registrations: { create: { eventId: otherEvent.id, status: 'APPROVED' } } } });
    const dancer = await client.dancer.create({ data: { studioId: studio.id, firstName: 'Synthetic', lastName: 'Dancer', birthDate: new Date('2010-01-01') } });
    const foreignDancer = await client.dancer.create({ data: { studioId: foreign.id, firstName: 'Synthetic', lastName: 'Other', birthDate: new Date('2010-01-01') } });
    const crossDancer = await client.dancer.create({ data: { studioId: crossEvent.id, firstName: 'Synthetic', lastName: 'Cross', birthDate: new Date('2010-01-01') } });
    const tokens = { owner: session(owner), stranger: session(stranger), admin: session(admin) };
    const denied = async (resource, id, token, status, ...args) => {
      const before = await snapshot(); const oldFiles = await files(); const oldUploads = uploads;
      const result = await post(resource, id, token, ...args);
      assert.equal(result.status, status, resource + ' denied in ' + stage);
      assert.ok(isDeepStrictEqual(await snapshot(), before), 'Denied image request changed domain or audit');
      assert.deepEqual(await files(), oldFiles); assert.equal(uploads, oldUploads, 'Denied before storage');
    };
    stage = 'ownership and scope';
    for (const [resource, id] of [['events', event.id], ['users', owner.id], ['studios', studio.id], ['dancers', dancer.id]]) {
      await denied(resource, id, null, 401); await denied(resource, id, tokens.stranger, 403);
    }
    await denied('events', event.id, tokens.owner, 403);
    await denied('studios', foreign.id, tokens.owner, 403); await denied('dancers', foreignDancer.id, tokens.owner, 403);
    await denied('studios', crossEvent.id, tokens.owner, 403);
    await denied('dancers', crossDancer.id, tokens.owner, 403);
    await client.userRole.update({ where: { id: assigned.id }, data: { removedAt: new Date() } });
    await denied('dancers', dancer.id, tokens.owner, 403);
    await denied('studios', studio.id, tokens.owner, 403);
    await client.userRole.update({ where: { id: assigned.id }, data: { removedAt: null } });
    await client.studioRepresentative.update({ where: { studioId_userId: { studioId: studio.id, userId: owner.id } }, data: { active: false } });
    await denied('studios', studio.id, tokens.owner, 403); await denied('dancers', dancer.id, tokens.owner, 403);
    await client.studioRepresentative.update({ where: { studioId_userId: { studioId: studio.id, userId: owner.id } }, data: { active: true } });
    stage = 'active parents and stage';
    await client.studio.update({ where: { id: studio.id }, data: { deletedAt: new Date() } });
    await denied('studios', studio.id, tokens.admin, 404); await denied('dancers', dancer.id, tokens.admin, 404);
    await client.studio.update({ where: { id: studio.id }, data: { deletedAt: null } });
    await client.dancer.update({ where: { id: dancer.id }, data: { deletedAt: new Date() } });
    await denied('dancers', dancer.id, tokens.admin, 404);
    await client.dancer.update({ where: { id: dancer.id }, data: { deletedAt: null } });
    await client.user.update({ where: { id: stranger.id }, data: { active: false } });
    await denied('users', stranger.id, tokens.admin, 404); await denied('users', owner.id, tokens.stranger, 401);
    await client.user.update({ where: { id: stranger.id }, data: { active: true } });
    await client.event.update({ where: { id: event.id }, data: { stage: 'FINALIZED' } });
    await denied('dancers', dancer.id, tokens.owner, 403); await denied('studios', studio.id, tokens.owner, 403);
    await client.event.update({ where: { id: event.id }, data: { stage: 'REGISTRATION_OPEN' } });
    await client.studio.update({ where: { id: studio.id }, data: { approvalStatus: 'PENDING' } });
    await denied('dancers', dancer.id, tokens.owner, 403);
    await client.studio.update({ where: { id: studio.id }, data: { approvalStatus: 'APPROVED' } });
    await client.studioEventRegistration.update({ where: { studioId_eventId: { studioId: studio.id, eventId: event.id } }, data: { status: 'PENDING' } });
    await denied('dancers', dancer.id, tokens.owner, 403);
    await client.studioEventRegistration.update({ where: { studioId_eventId: { studioId: studio.id, eventId: event.id } }, data: { status: 'APPROVED' } });
    stage = 'content';
    for (const [resource, id] of [['events', event.id], ['users', owner.id], ['studios', studio.id], ['dancers', dancer.id]]) {
      await denied(resource, id, tokens.admin, 400, Buffer.from('<html><script>active()</script></html>'));
      await denied(resource, id, tokens.admin, 400, Buffer.from('<svg/>'));
      await denied(resource, id, tokens.admin, 400, png, 'image/png', 'payload.html');
      await denied(resource, id, tokens.admin, 400, png, 'image/jpeg', 'fixture.jpg');
    }
    stage = 'successful storage, audit and private retrieval';
    const urls = [];
    for (const [resource, id, token, type] of [['events', event.id, tokens.admin, 'EVENT'], ['users', owner.id, tokens.owner, 'USER'], ['studios', studio.id, tokens.owner, 'STUDIO'], ['dancers', dancer.id, tokens.owner, 'DANCER']]) {
      const result = await post(resource, id, token); assert.equal(result.status, 200);
      const url = result.body.imageUrl ?? result.body.photoUrl ?? result.body.logoUrl; urls.push(url);
      assert.match(url, /^\/uploads\/[a-z]+\/[0-9a-f-]{36}\.webp$/);
      const response = await get(url, token); assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'image/webp'); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.match(response.headers.get('content-security-policy'), /sandbox/);
      assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format, 'webp');
      assert.equal((await get(url)).status, 401);
      if (resource !== 'events') assert.equal((await get(url, tokens.stranger)).status, 403);
      const audits = await client.auditLog.findMany({ where: { action: 'IMAGE_REPLACED', targetType: type, targetId: id } });
      assert.equal(audits.length, 1); assert.equal(audits[0].actorId, resource === 'events' ? admin.id : owner.id); assert.deepEqual(audits[0].metadata, {});
    }
    assert.equal((await post('users', stranger.id, tokens.stranger)).status, 200, 'Roleless self-service photo');
    await client.studio.update({ where: { id: studio.id }, data: { deletedAt: new Date() } });
    assert.equal((await get(urls[2], tokens.admin)).status, 404); assert.equal((await get(urls[3], tokens.admin)).status, 404);
    await client.studio.update({ where: { id: studio.id }, data: { deletedAt: null } });
    stage = 'stored review exception';
    await client.event.update({ where: { id: event.id }, data: { stage: 'DATA_REVIEW' } });
    await denied('dancers', dancer.id, tokens.owner, 403);
    await client.studioEventRegistration.update({ where: { studioId_eventId: { studioId: studio.id, eventId: event.id } }, data: { canEditDuringReview: true } });
    assert.equal((await post('dancers', dancer.id, tokens.owner)).status, 200);
    await client.event.update({ where: { id: event.id }, data: { stage: 'ENDED' } });
    await denied('dancers', dancer.id, tokens.owner, 403);
    await client.event.update({ where: { id: event.id }, data: { stage: 'REGISTRATION_OPEN' } });
    // Unsafe legacy files and unreferenced canonical files are never served.
    await fs.writeFile(path.join(root, 'payload.html'), '<script>active()</script>');
    assert.equal((await get('/uploads/payload.html', tokens.admin)).status, 404);
    assert.equal((await get('/uploads/events/00000000-0000-4000-8000-000000000000.webp', tokens.admin)).status, 404);
    stage = 'audit failure rollback and cleanup';
    const before = await snapshot(); const oldFiles = await files();
    await client.$executeRawUnsafe(`CREATE FUNCTION image_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'IMAGE_REPLACED' THEN RAISE EXCEPTION 'synthetic image audit failure'; END IF; RETURN NEW; END $$`);
    await client.$executeRawUnsafe(`CREATE TRIGGER image_audit_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION image_audit_failure()`);
    try { assert.equal((await post('users', owner.id, tokens.owner)).status, 500); }
    finally { await client.$executeRawUnsafe('DROP TRIGGER image_audit_failure ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION image_audit_failure()'); }
    assert.ok(isDeepStrictEqual(await snapshot(), before)); assert.deepEqual(await files(), oldFiles);
    stage = 'permission changes during storage';
    afterUpload = () => client.studioRepresentative.update({ where: { studioId_userId: { studioId: studio.id, userId: owner.id } }, data: { active: false } });
    const oldDancer = await client.dancer.findUniqueOrThrow({ where: { id: dancer.id } });
    assert.equal((await post('dancers', dancer.id, tokens.owner)).status, 403); afterUpload = undefined;
    assert.deepEqual(await client.dancer.findUniqueOrThrow({ where: { id: dancer.id } }), oldDancer); assert.deepEqual(await files(), oldFiles);
    await client.studioRepresentative.update({ where: { studioId_userId: { studioId: studio.id, userId: owner.id } }, data: { active: true } });
    stage = 'concurrent replacement';
    let release; const barrier = new Promise(resolve => { release = resolve; }); let waiting = 0;
    afterUpload = async () => { if (++waiting === 2) release(); await barrier; };
    const race = await Promise.all([post('users', owner.id, tokens.owner), post('users', owner.id, tokens.owner)]); afterUpload = undefined;
    assert.deepEqual(race.map(row => row.status).sort(), [200, 409]);
    assert.equal((await get(urls[1], tokens.owner)).status, 404, 'Superseded image is inaccessible');
    stage = 'cleanup failure after commit';
    const previous = (await client.user.findUniqueOrThrow({ where: { id: owner.id } })).photoUrl;
    cleanupFailure = true; assert.equal((await post('users', owner.id, tokens.owner)).status, 200); cleanupFailure = false;
    assert.equal((await get(previous, tokens.owner)).status, 404, 'Orphan file cannot be served');
    await assert.rejects(real.readFile('../escape.webp')); await assert.rejects(real.deleteFile('events/../../escape.webp'));
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await client.$disconnect();
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir())); assert.match(path.basename(resolved), /^dance-images-[a-zA-Z0-9]+$/);
    await fs.rm(resolved, { recursive: true, force: true });
  }
}
if (require.main === module) main().catch(error => { console.error('Image fixture failed at ' + stage + ': ' + (error instanceof Error ? error.message : 'unknown failure')); process.exitCode = 1; });
