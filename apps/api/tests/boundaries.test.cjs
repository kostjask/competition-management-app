const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
Object.assign(process.env, { NODE_ENV: 'test', DEV_AUTH: 'false', EMAIL_PROVIDER: 'fake',
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
  JWT_SECRET: require('node:crypto').randomBytes(32).toString('hex'), EMAIL_FROM: 'boundaries@example.invalid',
  CORS_ORIGIN: 'https://app.example.invalid, http://localhost:5173',
  RATE_LIMIT_MAX_REQUESTS: '2', LOGIN_RATE_LIMIT_MAX_REQUESTS: '1' });
const { createApp } = require('../dist/app.js');
const { ErrorResponseSchema } = require('@dance/schemas');
async function fixture(t) {
  let reads = 0;
  const app = createApp({ $queryRaw: async () => { reads++; return []; } });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { app, reads: () => reads, request: (route, options) => fetch('http://127.0.0.1:' + server.address().port + route, options) };
}
async function envelope(response, status, reason) {
  assert.equal(response.status, status); const body = await response.json();
  ErrorResponseSchema.parse(body); assert.equal(body.reason, reason);
  assert.ok(!JSON.stringify(body).includes('PRIVATE')); return body;
}
test('configured CORS allows exact origins and rejects denied origins before handlers', async t => {
  const f = await fixture(t);
  for (const origin of ['https://app.example.invalid', 'http://localhost:5173']) {
    const result = await f.request('/health', { headers: { Origin: origin } });
    assert.equal(result.status, 200); assert.equal(result.headers.get('access-control-allow-origin'), origin);
    assert.ok(result.headers.get('vary').includes('Origin'));
    const preflight = await f.request('/api/v1/auth/login', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
    assert.equal(preflight.status, 204); assert.ok(preflight.headers.get('access-control-allow-headers').includes('authorization'));
    assert.equal(preflight.headers.get('cache-control'), 'no-store');
    assert.equal(preflight.headers.get('x-content-type-options'), 'nosniff');
  }
  const before = f.reads();
  for (const origin of ['https://app.example.invalid.attacker.invalid', 'null', 'https://foreign.invalid']) {
    for (const method of ['GET', 'OPTIONS']) {
      const result = await f.request('/health', { method, headers: { Origin: origin } });
      await envelope(result, 403, 'permissionDenied'); assert.equal(result.headers.get('access-control-allow-origin'), null);
    }
  }
  assert.equal(f.reads(), before); assert.equal((await f.request('/health')).status, 200);
});
test('security headers cover success, preflight and errors without trusting forwarded headers', async t => {
  const f = await fixture(t); assert.equal(f.app.get('trust proxy'), false);
  for (const route of ['/health', '/missing', '/api/v1/images/users/u']) {
    const result = await f.request(route, { headers: { 'X-Forwarded-Proto': 'https' } });
    assert.equal(result.headers.get('x-powered-by'), null);
    assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(result.headers.get('x-frame-options'), 'DENY');
    assert.equal(result.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.ok(result.headers.get('content-security-policy').includes("default-src 'none'"));
  }
});
test('sensitive route limits run before JSON, authentication and multipart work, with separate buckets', async t => {
  const f = await fixture(t);
  const send = (route, n) => f.request('/api/v1/' + route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.' + n }, body: '{PRIVATE' });
  for (const [routes, max] of [[['auth/login'], 1], [['auth/onboarding/read', 'auth/onboarding/save', 'auth/onboarding/cancel'], 1], [['auth/register', 'auth/verify-email'], 2], [['auth/resend-verification', 'auth/correct-email', 'auth/request-password-reset', 'auth/reset-password'], 2], [['invitations/accept', 'invitations/'], 2], [['images/users/u', 'images/studios/s'], 2]]) {
    for (let i = 0; i < max; i++) await envelope(await send(routes[i % routes.length], i), 400, 'invalidInput');
    for (const route of routes) {
      const denied = await send(route, 99); await envelope(denied, 429, 'tooManyRequests');
      assert.ok(Number(denied.headers.get('retry-after')) > 0);
    }
  }
  assert.equal(f.reads(), 0);
});
test('parser failures return private shared 4xx envelopes and do not reach mutations', async t => {
  const f = await fixture(t);
  const cases = [
    [{ 'Content-Type': 'application/json' }, JSON.stringify({ PRIVATE: 'x'.repeat(103000) }), 413, 'requestTooLarge'],
    [{ 'Content-Type': 'application/json' }, '{PRIVATE', 400, 'invalidInput'],
    [{ 'Content-Type': 'application/json; charset=unknown' }, 'PRIVATE', 415, 'unsupportedEncoding'],
    [{ 'Content-Type': 'application/json', 'Content-Encoding': 'unknown' }, 'PRIVATE', 415, 'unsupportedEncoding'],
    [{ 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }, require('node:zlib').gzipSync('{"PRIVATE":true}'), 415, 'unsupportedEncoding'],
  ];
  for (const [headers, body, status, reason] of cases) await envelope(await f.request('/api/v1/events', { method: 'POST', headers, body }), status, reason);
  assert.equal(f.reads(), 0);
});
test('unrelated errors remain private 500s even with untrusted status properties', () => {
  const { errorHandler } = require('../dist/errors/handler.js');
  for (const type of ['request.aborted', 'request.size.invalid']) {
    const parser = Object.assign(new Error('PRIVATE'), { status: 400, type, body: 'PRIVATE' });
    let status; let body;
    errorHandler(parser, {}, { status: value => { status = value; return { json: value => body = value }; } }, () => {});
    assert.equal(status, 400); assert.equal(body.reason, 'invalidInput');
    ErrorResponseSchema.parse(body); assert.ok(!JSON.stringify(body).includes('PRIVATE'));
  }
  const error = Object.assign(new Error('PRIVATE'), { status: 413, type: 'unknown' });
  let status; let body;
  errorHandler(error, {}, { status: value => { status = value; return { json: value => body = value }; } }, () => {});
  assert.equal(status, 500); assert.equal(body.reason, 'unexpected'); assert.ok(!JSON.stringify(body).includes('PRIVATE'));
});
test('production startup refuses wildcard/malformed origins, placeholder secrets and unsupported storage', () => {
  const run = overrides => spawnSync(process.execPath, ['-e', "require('./dist/config/env.js')"], {
    cwd: path.resolve(__dirname, '..'), env: { ...process.env, NODE_ENV: 'production', CORS_ORIGIN: 'https://app.example.invalid', ...overrides }, encoding: 'utf8' });
  assert.equal(run({}).status, 0);
  for (const overrides of [{ CORS_ORIGIN: '*' }, { CORS_ORIGIN: 'https://app.example.invalid/path' }, { CORS_ORIGIN: 'https://a.invalid,' }, { JWT_SECRET: 'your_jwt_secret_key_here_minimum_32_characters_required' }, { STORAGE_TYPE: 's3' }]) assert.notEqual(run(overrides).status, 0);
  const result = spawnSync(process.execPath, ['-e', "const {createApp}=require('./dist/app.js'); const app=createApp({}); const s=app.listen(0,'127.0.0.1',async()=>{const r=await fetch('http://127.0.0.1:'+s.address().port+'/missing'); if(r.headers.get('strict-transport-security')!=='max-age=31536000')process.exitCode=1;s.close();s.closeAllConnections();});"], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, NODE_ENV: 'production' }, encoding: 'utf8' });
  assert.equal(result.status, 0);
});
