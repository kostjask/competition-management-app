const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
process.env.NODE_ENV = 'test'; process.env.DEV_AUTH = 'false';
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.EMAIL_FROM = 'workspace-tests@example.invalid';
const { ReturnPathSchema, safeReturnPath, routerReturnPath, legacyWorkspaceRedirect } = require('@dance/schemas');
const { renderEmail } = require('../dist/services/emailTemplates');
const { createPublicApp } = require('../dist/publicApp');

test('canonical returns migrate exactly once, retain scoped studio filters and reject redirect tricks', () => {
  for (const path of ['/events/e/register','/events/e/studio?studio=s','/admin/events/e/performances?studio=s','/content/studio','/studios/s/dancers','/events/e/studios/s/performances/p/edit','/events/e/studios/s/music','/events/e/studios/s/music?performance=p&track=00000000-0000-4000-8000-000000000001']) {
    assert.equal(safeReturnPath(path), '/app' + path);
    assert.equal(safeReturnPath('/app' + path), '/app' + path);
    assert.equal(routerReturnPath('/app' + path), path);
  }
  for (const path of ['//evil.invalid','https://evil.invalid','/app//evil.invalid','/app/app/events','/app/arbitrary','/app/events/../admin','/app/events/e%2Fedit','/app/events/e%252Fedit','/app/events/e?token=secret','/app/events/e#secret','/app/content/studio\n','/app/events/e/studio?studio=s&extra=x']) {
    assert.equal(ReturnPathSchema.safeParse(path).success, false, path); assert.equal(safeReturnPath(path), '/app');
  }
  for (const suffix of ['?performance=//evil.invalid','?performance=p&token=secret','?track=bad','?performance=a&performance=b','?performance=p#secret']) assert.equal(ReturnPathSchema.safeParse('/app/events/e/studios/s/music' + suffix).success, false);
});

test('legacy mapping is bounded, excludes public paths and forwards only typed link parameters', () => {
  assert.equal(legacyWorkspaceRedirect('/verify-email?token=old_queued-token&lang=ru&returnTo=%2Fevents%2Fe%2Fregister&email=PRIVATE'), '/app/verify-email?lang=ru&token=old_queued-token&returnTo=%2Fapp%2Fevents%2Fe%2Fregister');
  assert.equal(legacyWorkspaceRedirect('/admin/events/e/applications?studio=s&preview=true&token=PRIVATE'), '/app/admin/events/e/applications?studio=s');
  assert.equal(legacyWorkspaceRedirect('/auth/reset-password?token=a&token=b&lang=de&returnTo=%2F%2Fevil.invalid'), '/app/auth/reset-password');
  for (const path of ['/','/en','/en/festivals/f/e','/api/v1/auth/profile','/auth/unknown','/app/auth/login','/events/%2e%2e/admin','/events/../admin','//evil.invalid/events','/events/e#secret']) assert.equal(legacyWorkspaceRedirect(path),null,path);
});

test('new mail links use /app and preserve token and recipient language without changing WEB_ORIGIN', () => {
  for (const locale of ['et','en','ru']) for (const [kind,path] of [['verification','verify-email'],['invitation','auth/accept-invitation'],['recovery','auth/reset-password'],['reviewChanged','applications']]) {
    const mail = renderEmail({to:'synthetic@example.invalid',locale,kind,token:'queued-secret'},'https://festival.example.invalid');
    const url = new URL(mail.text.split('\n').find(line=>line.startsWith('https://')));
    assert.equal(url.origin,'https://festival.example.invalid'); assert.equal(url.pathname,'/app/'+path); assert.equal(url.searchParams.get('lang'),locale);
    assert.equal(url.searchParams.get('token'),kind==='reviewChanged'?null:'queued-secret');
  }
});

test('opt-in festival cohost serves only built workspace routes/assets and retains anonymous API boundaries', async t => {
  const directory = mkdtempSync(join(tmpdir(),'dance-workspace-')); const checked = resolve(directory);
  assert.equal(checked.startsWith(resolve(tmpdir()) + require('node:path').sep), true);
  mkdirSync(join(directory,'assets')); writeFileSync(join(directory,'index.html'),'<html><body>Private workspace shell</body></html>');
  writeFileSync(join(directory,'assets','app.js'),'/* synthetic bundle */'); writeFileSync(join(directory,'identity-link.js'),'/* synthetic head script */');
  t.after(()=>rmSync(checked,{recursive:true,force:true}));
  const options={surface:'festival',origins:{studio:'https://studio.example.invalid',festival:'https://festival.example.invalid'}};
  const prisma={};
  assert.throws(()=>createPublicApp(prisma,{...options,surface:'studio'},directory));
  const server=createPublicApp(prisma,options,directory).listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const request=(path,method='GET')=>new Promise((resolve,reject)=>{
    const req=require('node:http').request({hostname:'127.0.0.1',port:server.address().port,path,method,headers:{Host:'festival.example.invalid'}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve(new Response(Buffer.concat(chunks).length?Buffer.concat(chunks):null,{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end();
  });
  for(const path of ['/app','/app/auth/login','/app/content/studio','/app/events/e/studios/s/performances/p/edit','/app/events/e/studios/s/music?performance=p','/app/assets/app.js','/app/identity-link.js']) {
    const res=await request(path);assert.equal(res.status,200,path);assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(res.headers.get('referrer-policy'),'no-referrer');assert.ok(res.headers.get('content-security-policy').includes("script-src 'self'"));
    assert.ok(res.headers.get('content-security-policy').includes("media-src 'self'"), 'Private playback is restricted to the same-origin authenticated proxy');
  }
  for(const path of ['/app/not-implemented','/app/assets/missing.js','/app/package.json','/api/v1/auth/profile','/api/v1/events/e','/uploads/users/private.png']) {
    const res=await request(path);assert.ok([401,404].includes(res.status),path);assert.ok(!(await res.text()).includes('Private workspace shell'));
  }
  const old=await request('/auth/accept-invitation?token=old-queued&lang=et');assert.equal(old.status,302);assert.equal(old.headers.get('location'),'/app/auth/accept-invitation?lang=et&token=old-queued');
  assert.equal((await request('/auth/login','POST')).status,404);
  assert.equal((await request('/')).headers.get('location'),'/et');
});
