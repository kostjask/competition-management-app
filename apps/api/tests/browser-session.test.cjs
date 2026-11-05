const assert = require('node:assert/strict');
const { test } = require('node:test'); const { once } = require('node:events');
Object.assign(process.env, { NODE_ENV: 'test', DEV_AUTH: 'false', EMAIL_PROVIDER: 'fake', DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused', JWT_SECRET: require('node:crypto').randomBytes(32).toString('hex'), EMAIL_FROM: 'session@example.invalid', CORS_ORIGIN: 'https://app.example.invalid' });
const { createApp } = require('../dist/app.js'); const jwt = require('jsonwebtoken');
const { BrowserSessionSchema, ErrorResponseSchema } = require('@dance/schemas');
const browser = { Origin: 'https://app.example.invalid', 'X-CSRF-Protection': '1', 'X-Session-Transport': 'cookie' };
async function fixture(t) {
  const user = { id: 'owner', name: 'Synthetic', email: 'session@example.invalid', password: await require('bcrypt').hash('password123', 4), sessionVersion: 0, active: true, emailVerified: true, createdAt: new Date(), roles: [] };
  let failAudit = false; const audits = []; let reads = 0;
  const db = { user: {
    findUnique: async ({ where }) => { reads++; return where.id === user.id || where.email === user.email ? user : null; },
    findFirst: async ({ where }) => where.id === user.id && where.sessionVersion === user.sessionVersion && user.active && user.emailVerified ? user : null,
    updateMany: async ({ where }) => { if (where.id !== user.id || where.sessionVersion !== user.sessionVersion) return { count: 0 }; user.sessionVersion++; return { count: 1 }; },
  }, userRole: { findMany: async () => [] }, auditLog: { create: async ({ data }) => { if (failAudit) throw new Error('PRIVATE'); audits.push(data); return data; } } };
  db.$transaction = async fn => { const version = user.sessionVersion; try { return await fn(db); } catch (err) { user.sessionVersion = version; throw err; } };
  const server = createApp(db).listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const request = (path, headers = {}, body) => fetch('http://127.0.0.1:' + server.address().port + '/api/v1' + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const login = headers => request('/auth/login', headers, { email: user.email, password: 'password123' });
  return { user, request, login, audits, reads: () => reads, failAudit: () => { failAudit = true; } };
}
async function denied(res, status) { assert.equal(res.status,status); const body = ErrorResponseSchema.parse(await res.json()); assert.ok(!JSON.stringify(body).includes('PRIVATE')); }
test('browser sessions isolate transport, require origin/CSRF and revoke only the caller account', async t => {
  const f = await fixture(t);
  await denied(await f.login({ 'X-Session-Transport': 'cookie' }),403); assert.equal(f.reads(),0);
  await denied(await f.login({ Origin: browser.Origin, 'X-Session-Transport': 'cookie' }),403);
  const login = await f.login(browser); assert.equal(login.status,200);
  const session = BrowserSessionSchema.parse(await login.json()); assert.equal(session.token,undefined);
  const setCookie = login.headers.get('set-cookie'); assert.ok(setCookie.includes('HttpOnly')); assert.ok(setCookie.includes('SameSite=Lax')); assert.ok(setCookie.includes('Path=/'));
  const cookie = setCookie.split(';')[0];
  assert.equal((await f.request('/auth/profile',{ Cookie: cookie })).status,200);
  const nativeLogin = await f.login({}); const native = await nativeLogin.json(); assert.equal(native.tokenType,'Bearer'); assert.equal(nativeLogin.headers.get('set-cookie'),null);
  await denied(await f.request('/auth/profile',{ Cookie: 'dance_session='+native.token }),401);
  await denied(await f.request('/auth/profile',{ Authorization: 'Bearer '+cookie.slice('dance_session='.length) }),401);
  await denied(await f.request('/auth/profile',{ Cookie: cookie, Authorization: 'Bearer '+native.token }),401);
  await denied(await f.request('/auth/logout',{ Cookie: cookie },{}),403);
  await denied(await f.request('/auth/logout',{ ...browser, Origin: 'https://foreign.invalid', Cookie: cookie },{}),403);
  await denied(await f.request('/auth/logout',{ ...browser, Cookie: cookie },{ userId: 'another' }),400); assert.equal(f.user.sessionVersion,0);
  const logout = await f.request('/auth/logout',{ ...browser, Cookie: cookie },{}); assert.equal(logout.status,204); assert.ok(logout.headers.get('set-cookie').includes('1970'));
  assert.equal(f.user.sessionVersion,1); assert.equal(f.audits[0].actorId,'owner'); assert.equal(f.audits[0].action,'SESSION_REVOKED');
  await denied(await f.request('/auth/profile',{ Cookie: cookie }),401);
  await denied(await f.request('/auth/profile',{ Authorization: 'Bearer '+native.token }),401);
});
test('browser sessions reject stale/ineligible/expired/duplicate cookie proofs and roll back failed audit', async t => {
  const f = await fixture(t); const login = await f.login(browser); const cookie = login.headers.get('set-cookie').split(';')[0];
  f.failAudit(); await denied(await f.request('/auth/logout',{ ...browser, Cookie: cookie },{}),500); assert.equal(f.user.sessionVersion,0);
  assert.equal((await f.request('/auth/profile',{ Cookie: cookie })).status,200);
  await denied(await f.request('/auth/profile',{ Cookie: cookie+'; '+cookie }),401);
  f.user.active = false; await denied(await f.request('/auth/profile',{ Cookie: cookie }),401); f.user.active = true;
  f.user.emailVerified = false; await denied(await f.request('/auth/profile',{ Cookie: cookie }),401); f.user.emailVerified = true;
  const expired = jwt.sign({ userId: 'owner', sessionVersion: 0, transport: 'cookie' },process.env.JWT_SECRET,{ expiresIn: -1 });
  await denied(await f.request('/auth/profile',{ Cookie: 'dance_session='+expired }),401);
});
test('production browser cookies use host-only secure attributes', () => {
  const { spawnSync } = require('node:child_process');
  const code = "const assert=require('node:assert/strict');const {issueSession}=require('./dist/services/browserSession');let name,options;const result=issueSession({header:()=> 'cookie'},{cookie:(n,t,o)=>{name=n;options=o;}},{id:'u',name:'Synthetic',email:'u@example.invalid',sessionVersion:0});assert.equal(name,'__Host-dance_session');assert.equal(options.secure,true);assert.equal(options.httpOnly,true);assert.equal(options.domain,undefined);assert.equal(result.token,undefined);";
  const result = spawnSync(process.execPath,['-e',code],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,NODE_ENV:'production'},encoding:'utf8'}); assert.equal(result.status,0);
});
