const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { randomBytes } = require('node:crypto');
process.env.NODE_ENV = 'test';
process.env.DEV_AUTH = 'false';
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.EMAIL_FROM = 'eligibility@example.invalid';
const jwt = require('jsonwebtoken');
const { createApp } = require('../dist/app.js');

test('protected requests reject missing inactive and unverified accounts before resolving roles', async t => {
  let account;
  let roleReads = 0;
  let writes = 0;
  const prisma = {
    user: { findFirst: async ({ where }) => {
      assert.equal(where.active, true); assert.equal(where.emailVerified, true);
      return account?.id === where.id && account.active && account.emailVerified ? { id: account.id } : null;
    } },
    userRole: { findMany: async () => { roleReads++; return [{ eventId: null, role: { key: 'admin', permissions: [] } }]; } },
    event: { findMany: async () => [], create: async () => { writes++; return {}; } },
  };
  const server = createApp(prisma).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  // Keep the same JWT while changing authoritative account state.
  const token = jwt.sign({ userId: 'account', sessionVersion: 0 }, process.env.JWT_SECRET);
  const request = (path, method = 'GET') => fetch(`http://127.0.0.1:${server.address().port}/api/v1${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(method === 'POST' && { body: '{}' }),
  });
  for (const state of [undefined, { active: false, emailVerified: true }, { active: true, emailVerified: false }]) {
    account = state && { id: 'account', ...state };
    const protectedOperations = require('../../../docs/api-coverage.json').operations
      .filter(row => !row.tests.authentication.startsWith('N/A:'))
      .map(row => [row.mount + (row.path === '/' ? '' : row.path).replace(/:[A-Za-z]+/g, 'fixture'), row.method]);
    for (const [path, method] of protectedOperations) {
      const response = await request(path, method);
      assert.equal(response.status, 401);
      const body = require('@dance/schemas').ErrorResponseSchema.parse(await response.json());
      assert.equal(body.reason, 'authenticationRequired');
      assert.equal(body.token, undefined);
    }
  }
  assert.equal(roleReads, 0); assert.equal(writes, 0);
  account = { id: 'account', active: true, emailVerified: true };
  assert.equal((await request('/events')).status, 200);
  assert.equal(roleReads, 1);
  account.active = false;
  assert.equal((await request('/events', 'POST')).status, 401);
  assert.equal(roleReads, 1); assert.equal(writes, 0);
  account = undefined;
  assert.equal((await request('/events')).status, 401);
});
