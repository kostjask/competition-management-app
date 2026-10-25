const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');

// A second API process uses only the baseline runner's isolated database/env.
module.exports = async function checkDevAuth({ client, serverEnv }) {
  const seed = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const listener = net.createServer().listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const server = spawn(process.execPath, ['dist/index.js'], { cwd: path.resolve(__dirname, '../apps/api'),
    env: { ...serverEnv, PORT: String(port), NODE_ENV: 'development', DEV_AUTH: 'true', DEV_AUTH_EMAIL: seed.email }, stdio: 'ignore' });
  let changed = false;
  try {
    let ready = false;
    const baseUrl = 'http://127.0.0.1:' + port;
    for (let attempt = 0; attempt < 100; attempt++) {
      assert.equal(server.exitCode, null, 'Development API must stay running');
      try { if ((await fetch(baseUrl + '/health', { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch { /* bounded startup retry */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'Development API must become healthy');
    const request = async (path, method = 'GET', body) => {
      const response = await fetch(baseUrl + '/api/v1' + path, { method, headers: { 'Content-Type': 'application/json' },
        ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
      return { status: response.status, body: await response.json() };
    };
    const profile = await request('/auth/profile');
    assert.equal(profile.status, 200); assert.equal(profile.body.id, seed.id); assert.equal(profile.body.isAdmin, true);
    const event = await client.event.create({ data: { name: 'Dev actor event', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
    const invitation = await request('/invitations', 'POST', { email: 'dev-actor-invite@example.invalid', roleKey: 'judge', eventId: event.id });
    assert.equal(invitation.status, 201);
    assert.equal((await client.invitation.findUniqueOrThrow({ where: { id: invitation.body.invitationId } })).createdBy, seed.id,
      'Development writes must use the persisted seed actor foreign key');
    const count = await client.invitation.count();
    for (const state of [{ active: false, emailVerified: true }, { active: true, emailVerified: false }]) {
      changed = true;
      await client.user.update({ where: { id: seed.id }, data: state });
      assert.equal((await request('/auth/profile')).status, 401);
      assert.equal((await request('/invitations', 'POST', { email: 'denied-dev-actor@example.invalid', roleKey: 'judge', eventId: event.id })).status, 401);
      assert.equal(await client.invitation.count(), count);
    }
  } finally {
    if (changed) await client.user.update({ where: { id: seed.id }, data: { active: seed.active, emailVerified: seed.emailVerified } });
    if (server.exitCode === null) { const stopped = once(server, 'exit'); server.kill(); await stopped; }
  }
  assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: seed.id } }), seed);
  console.log('Development auth: real seeded profile/actor foreign key, current eligibility checks and no reactivation passed.');
};
