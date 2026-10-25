const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const env = { ...process.env, DEV_AUTH: 'true', DEV_AUTH_EMAIL: '  Seeded@Example.INVALID  ',
  JWT_SECRET: require('node:crypto').randomBytes(32).toString('hex'),
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused', EMAIL_FROM: 'dev-auth@example.invalid' };

test('development auth resolves an eligible persisted identity and grants only actual roles', () => {
  const code = `
    const assert = require('node:assert/strict');
    const { createAuthMiddleware } = require('./dist/middleware/auth.js');
    let account; let roles = []; let roleReads = 0;
    const middleware = createAuthMiddleware({
      user: { findFirst: async ({ where }) => {
        assert.deepEqual(where, { email: 'seeded@example.invalid', active: true, emailVerified: true });
        return account?.active && account.emailVerified ? { id: account.id } : null;
      } },
      userRole: { findMany: async ({ where }) => {
        assert.equal(where.userId, 'persisted-user'); roleReads++; return roles;
      } },
    });
    (async () => {
      for (const state of [undefined, { active: false, emailVerified: true }, { active: true, emailVerified: false }]) {
        account = state && { id: 'persisted-user', ...state };
        const req = { headers: {} }; let error;
        await middleware(req, {}, value => { error = value; });
        assert.equal(error.statusCode, 401); assert.equal(req.auth, undefined);
      }
      assert.equal(roleReads, 0);
      account = { id: 'persisted-user', active: true, emailVerified: true };
      let req = { headers: {} };
      await middleware(req, {}, error => { if (error) throw error; });
      assert.equal(req.auth.userId, 'persisted-user'); assert.equal(req.auth.isAdmin, false);
      assert.equal(req.auth.permissionsByEvent.size, 0);
      roles = [{ eventId: 'event', role: { key: 'moderator', permissions: [{ permission: { key: 'event.manage' } }] } }];
      req = { headers: {} };
      await middleware(req, {}, error => { if (error) throw error; });
      assert.equal(req.auth.isAdmin, false);
      assert.deepEqual([...req.auth.permissionsByEvent.get('event')], ['event.manage']);
      assert.equal(req.auth.permissionsByEvent.has(null), false);
      roles = [{ eventId: null, role: { key: 'admin', permissions: [] } }];
      req = { headers: {} };
      await middleware(req, {}, error => { if (error) throw error; });
      assert.equal(req.auth.isAdmin, true); assert.equal(req.auth.userId, 'persisted-user');
    })().catch(() => process.exitCode = 2);
  `;
  const result = spawnSync(process.execPath, ['-e', code], { cwd: path.resolve(__dirname, '..'), env: { ...env, NODE_ENV: 'development' }, encoding: 'utf8' });
  assert.equal(result.status, 0, 'Development identity/role assertions must pass');
});

test('non-development environments reject DEV_AUTH at startup', () => {
  for (const NODE_ENV of ['test', 'production']) {
    const result = spawnSync(process.execPath, ['-e', "require('./dist/config/env.js')"], {
      cwd: path.resolve(__dirname, '..'), env: { ...env, NODE_ENV }, encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes('DEV_AUTH may only be enabled in development'));
  }
});
