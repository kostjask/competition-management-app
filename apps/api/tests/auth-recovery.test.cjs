const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
process.env.NODE_ENV = 'test'; process.env.DEV_AUTH = 'false';
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
process.env.EMAIL_FROM = 'recovery-tests@example.invalid';
const { createApp } = require('../dist/app.js');
const tokens = require('../dist/services/identityTokens.js');

async function fixture(t) {
  const sends = []; const rotations = []; let user; let available = true; let fail = false; let reads = 0;
  const delivery = { available: () => available, verification: async data => { if (fail) throw new Error('synthetic-private'); sends.push({ kind: 'verification', ...data }); },
    recovery: async data => { if (fail) throw new Error('synthetic-private'); sends.push({ kind: 'recovery', ...data }); } };
  const prisma = { auditLog: { create: async ({ data }) => ({ id: 'audit', ...data }) }, user: {
    findUnique: async ({ where }) => { reads++; return user?.email === where.email ? user : null; },
    updateMany: async ({ data }) => { user = { ...user, email: data.email, sessionVersion: user.sessionVersion + 1 }; return { count: 1 }; },
  } };
  prisma.$transaction = async operation => operation(prisma);
  t.mock.method(tokens, 'rotateAccountToken', async (_tx, id, purpose) => { rotations.push({ id, purpose }); return 'synthetic-raw-secret'; });
  const server = createApp(prisma, delivery).listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const request = async (path, body, headers = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/auth/${path}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json(), retryAfter: response.headers.get('retry-after') };
  };
  return { request, sends, rotations, reads: () => reads, setUser: value => { user = value; },
    unavailable: () => { available = false; }, fail: () => { fail = true; } };
}

test('public recovery contracts reject invalid bodies before account reads', async t => {
  const f = await fixture(t);
  for (const [route, valid] of [
    ['resend-verification', { email: 'p@example.invalid' }], ['request-password-reset', { email: 'p@example.invalid' }],
    ['correct-email', { email: 'p@example.invalid', password: 'password', newEmail: 'n@example.invalid' }],
    ['reset-password', { token: 'secret', password: 'password123' }],
  ]) {
    for (const body of [{}, { ...valid, userId: 'other' }, { ...valid, roleKey: 'admin' }]) {
      const result = await f.request(route, body); assert.equal(result.status, 400);
      require('@dance/schemas').ErrorResponseSchema.parse(result.body);
      assert.equal(result.body.token, undefined);
    }
  }
  assert.equal(f.reads(), 0); assert.equal(f.sends.length, 0);
});

test('recovery requests return neutral acknowledgements and never expose delivery secrets', async t => {
  const f = await fixture(t);
  const expected = { messageId: 'authRequestAccepted', delivery: 'unconfirmed' };
  const request = () => f.request('resend-verification', { email: '  P@Example.INVALID  ' });
  assert.deepEqual((await request()).body, expected);
  for (const state of [{ active: false, emailVerified: false }, { active: true, emailVerified: true }, { active: true, emailVerified: false }]) {
    f.setUser({ id: 'u', email: 'p@example.invalid', ...state });
    const result = await request(); assert.equal(result.status, 202); assert.deepEqual(result.body, expected);
  }
  assert.equal(f.sends.length, 1); assert.equal(f.sends[0].to, 'p@example.invalid');
  assert.deepEqual(f.rotations, [{ id: 'u', purpose: 'VERIFY_EMAIL' }]);
  f.setUser({ id: 'u', email: 'p@example.invalid', active: true, emailVerified: true });
  const reset = await f.request('request-password-reset', { email: 'p@example.invalid' });
  assert.equal(reset.status, 202); assert.deepEqual(reset.body, expected);
  assert.equal(f.sends[1].kind, 'recovery');
});

test('email correction requires password proof and keeps pending identity privileges unchanged', async t => {
  const f = await fixture(t); const password = await require('bcrypt').hash('fixture-password', 4);
  f.setUser({ id: 'u', email: 'p@example.invalid', password, active: true, emailVerified: false, sessionVersion: 0 });
  const body = { email: 'p@example.invalid', password: 'wrong', newEmail: ' NEW@Example.INVALID ' };
  assert.equal((await f.request('correct-email', body)).status, 202); assert.equal(f.sends.length, 0);
  const result = await f.request('correct-email', { ...body, password: 'fixture-password' });
  assert.deepEqual(result.body, { messageId: 'authRequestAccepted', delivery: 'unconfirmed' });
  assert.equal(f.sends[0].to, 'new@example.invalid'); assert.equal(result.body.token, undefined);
});

test('unavailable recovery is uniform and failed sends remain explicitly unconfirmed with secret-free logs', async t => {
  const f = await fixture(t); f.fail();
  const logs = []; t.mock.method(console, 'error', (...args) => logs.push(args));
  f.setUser({ id: 'u', email: 'p@example.invalid', active: true, emailVerified: false });
  const result = await f.request('resend-verification', { email: 'p@example.invalid' });
  assert.equal(result.status, 202); assert.equal(result.body.delivery, 'unconfirmed');
  assert.deepEqual(logs, [['Auth recovery delivery unconfirmed']]);
  f.unavailable(); const before = f.reads();
  for (const email of ['p@example.invalid', 'missing@example.invalid']) {
    const denied = await f.request('resend-verification', { email });
    assert.equal(denied.status, 503); assert.equal(denied.body.reason, 'authDeliveryUnavailable');
  }
  assert.equal(f.reads(), before);
});

test('password reset has an explicit no-session response and shared validation', async t => {
  const f = await fixture(t); let claimed;
  t.mock.method(tokens, 'recoverAccountPassword', async (_prisma, token, password) => { claimed = { token, password }; });
  assert.equal((await f.request('reset-password', { token: 'secret', password: 'short' })).status, 400);
  assert.equal((await f.request('reset-password', { token: 'secret', password: 'a'.repeat(73) })).status, 400);
  assert.equal((await f.request('reset-password', { token: 'secret', password: '🔐'.repeat(19) })).status, 400);
  assert.equal(require('@dance/schemas').ResetPasswordSchema.safeParse({ token: 'secret', password: '🔐'.repeat(18) }).success, true);
  assert.equal(claimed, undefined);
  const result = await f.request('reset-password', { token: 'secret', password: 'password123' });
  assert.equal(result.status, 200); assert.deepEqual(result.body, { messageId: 'passwordReset' });
  assert.deepEqual(claimed, { token: 'secret', password: 'password123' });
});

test('recovery throttle uses bounded IP windows, Retry-After and independent expiry', () => {
  const { authRecoveryLimit } = require('../dist/middleware/authRecoveryLimit.js');
  let time = 0; const limit = authRecoveryLimit({ maxRequests: 2, windowMs: 1000 }, () => time);
  const req = { ip: 'socket-ip', socket: {}, headers: { 'x-forwarded-for': 'spoof' } };
  const headers = {}; const res = { setHeader: (name, value) => headers[name] = value };
  let error;
  const run = () => { error = undefined; limit(req, res, value => { error = value; }); };
  run(); run(); assert.equal(error, undefined);
  req.headers['x-forwarded-for'] = 'different-spoof'; run();
  assert.equal(error.statusCode, 429); assert.equal(error.reason, 'tooManyRequests'); assert.equal(headers['Retry-After'], '1');
  time = 1001; run(); assert.equal(error, undefined);
});

test('public recovery routes share throttling and ignore spoofed forwarded addresses', async t => {
  const module = require('../dist/middleware/authRecoveryLimit.js');
  const realLimit = module.authRecoveryLimit;
  t.mock.method(module, 'authRecoveryLimit', () => realLimit({ maxRequests: 2, windowMs: 60000 }));
  const f = await fixture(t);
  assert.equal((await f.request('resend-verification', { email: 'missing@example.invalid' })).status, 202);
  assert.equal((await f.request('request-password-reset', { email: 'missing@example.invalid' })).status, 202);
  const result = await f.request('resend-verification', { email: 'missing@example.invalid' }, { 'X-Forwarded-For': '203.0.113.1' });
  assert.equal(result.status, 429); assert.equal(result.body.reason, 'tooManyRequests');
  assert.ok(Number(result.retryAfter) > 0); assert.equal(f.reads(), 2);
});

test('session revisions reject legacy and reset-era JWTs before granting access', async () => {
  const { createAuthMiddleware } = require('../dist/middleware/auth.js'); const jwt = require('jsonwebtoken');
  let currentVersion = 0; let roleReads = 0;
  const middleware = createAuthMiddleware({ user: { findFirst: async ({ where }) => where.sessionVersion === currentVersion ? { id: 'u' } : null },
    userRole: { findMany: async () => { roleReads++; return []; } } });
  const run = async claims => {
    const req = { headers: { authorization: 'Bearer ' + jwt.sign({ userId: 'u', ...claims }, process.env.JWT_SECRET) } }; let error;
    await middleware(req, {}, value => { error = value; }); return { req, error };
  };
  assert.equal((await run({ sessionVersion: 0 })).req.auth.userId, 'u');
  currentVersion = 1;
  assert.equal((await run({ sessionVersion: 0 })).error.statusCode, 401);
  for (const sessionVersion of [undefined, null, -1, 0.5, '1', 2147483648]) {
    assert.equal((await run({ sessionVersion })).error.statusCode, 401);
  }
  assert.equal(roleReads, 1);
  assert.equal((await run({ sessionVersion: 1 })).req.auth.userId, 'u');
});
