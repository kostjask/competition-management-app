const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { BrowserSessionSchema } = require('node:module').createRequire(require('node:path').resolve(__dirname, '../apps/api/package.json'))('@dance/schemas');

module.exports = async function checkBrowserSession({ client, baseUrl, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const owner = await client.user.create({ data: { email: `session-${randomUUID()}@example.invalid`, name: 'Session fixture', password: template.password, emailVerified: true } });
  const otherToken = await login(baseUrl, template.email);
  const nativeToken = await login(baseUrl, owner.email);
  const browserHeaders = { Origin: 'http://localhost:5173', 'X-CSRF-Protection': '1', 'X-Session-Transport': 'cookie', 'Content-Type': 'application/json' };
  async function browserLogin() {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, { method: 'POST', headers: browserHeaders, body: JSON.stringify({ email: owner.email, password: 'password123' }) });
    assert.equal(res.status, 200); BrowserSessionSchema.parse(await res.json());
    return res.headers.get('set-cookie').split(';')[0];
  }
  const cookie = await browserLogin();
  const profile = headers => fetch(`${baseUrl}/api/v1/auth/profile`, { headers });
  const logout = (proof, body = {}) => fetch(`${baseUrl}/api/v1/auth/logout`, { method: 'POST', headers: { ...browserHeaders, Cookie: proof }, body: JSON.stringify(body) });
  const snapshot = await client.user.findUniqueOrThrow({ where: { id: owner.id } });
  assert.equal((await logout(cookie, { userId: template.id })).status, 400);
  assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: owner.id } }), snapshot);
  await client.$executeRawUnsafe(`CREATE FUNCTION reject_session_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='SESSION_REVOKED' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe(`CREATE TRIGGER reject_session_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION reject_session_audit()`);
  try {
    assert.equal((await logout(cookie)).status, 500);
    assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: owner.id } }), snapshot);
    assert.equal((await profile({ Cookie: cookie })).status, 200);
    assert.equal(await client.auditLog.count({ where: { action: 'SESSION_REVOKED', targetId: owner.id } }), 0);
  } finally {
    await client.$executeRawUnsafe(`DROP TRIGGER reject_session_audit ON "AuditLog"`);
    await client.$executeRawUnsafe(`DROP FUNCTION reject_session_audit()`);
  }
  const concurrent = await Promise.all([logout(cookie), logout(cookie)]);
  assert.deepEqual(concurrent.map(res => res.status).sort(), [204, 401]);
  assert.equal(await client.auditLog.count({ where: { action: 'SESSION_REVOKED', targetId: owner.id, actorId: owner.id } }), 1);
  const after = await client.user.findUniqueOrThrow({ where: { id: owner.id } });
  assert.equal(after.password, snapshot.password); assert.equal(after.sessionVersion, snapshot.sessionVersion + 1);
  assert.equal((await profile({ Cookie: cookie })).status, 401);
  assert.equal((await profile({ Authorization: `Bearer ${nativeToken}` })).status, 401);
  assert.equal((await profile({ Authorization: `Bearer ${otherToken}` })).status, 200);
  const fresh = await browserLogin();
  await client.user.update({ where: { id: owner.id }, data: { active: false } });
  assert.equal((await profile({ Cookie: fresh })).status, 401);
  assert.equal(await client.userRole.count({ where: { userId: owner.id } }), 0);
  console.log('Browser sessions: cookie/native isolation, owner-only atomic revision/audit, rollback, concurrent logout, unrelated-account preservation and immediate ineligibility passed.');
};
