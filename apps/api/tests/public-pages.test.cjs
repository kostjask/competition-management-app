const assert=require('node:assert/strict');
const {test}=require('node:test');
const {once}=require('node:events');
Object.assign(process.env,{NODE_ENV:'test',DEV_AUTH:'false',DATABASE_URL:'postgresql://unused:unused@127.0.0.1:1/unused',JWT_SECRET:require('node:crypto').randomBytes(32).toString('hex'),EMAIL_FROM:'public@example.invalid',EMAIL_PROVIDER:'fake',RATE_LIMIT_MAX_REQUESTS:'1000'});
const {createPublicApp}=require('../dist/publicApp');
const {PublicSiteOptionsSchema}=require('../dist/config/public');
const origins={studio:'https://studio.example.invalid',festival:'https://festival.example.invalid'};
async function fixture(t,{fail=false}={}) {
  let reads=0;const prisma={$transaction:async work=>{reads++;if(fail)throw new Error('PRIVATE database detail');return work({contentDocument:{findFirst:async()=>null}});}};
  const app=createPublicApp(prisma,{surface:'studio',origins});const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  return {reads:()=>reads,request:(path,options={})=>new Promise((resolve,reject)=>{
    const req=require('node:http').request({hostname:'127.0.0.1',port:server.address().port,path,method:options.method??'GET',headers:{Host:'studio.example.invalid',...options.headers}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve(new Response(Buffer.concat(chunks).length?Buffer.concat(chunks):null,{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end();
  })};
}
test('public configuration requires exact distinct origins and forbids credentialed/non-HTTPS remote origins',()=>{
  for(const studio of ['https://user:secret@example.invalid','https://example.invalid/path','http://remote.invalid','javascript:alert(1)'])assert.equal(PublicSiteOptionsSchema.safeParse({surface:'studio',origins:{...origins,studio}}).success,false);
  assert.equal(PublicSiteOptionsSchema.safeParse({surface:'studio',origins:{studio:origins.studio,festival:origins.studio}}).success,false);
});
test('public-only entry has no private SPA/auth routes, preview capabilities, writes or hostile-host fallback',async t=>{
  const f=await fixture(t);
  for(const path of ['/api/v1/auth/profile','/uploads/users/private.png','/app/content/studio','/content/studio','/en?revisionId=secret','/en?preview=true','/de','/en/%2fprivate']) {const res=await f.request(path);assert.equal(res.status,404);assert.equal(res.headers.get('x-robots-tag'),'noindex, nofollow');}
  assert.equal((await f.request('/en',{method:'POST'})).status,404);assert.equal(f.reads(),0);
  assert.equal((await f.request('/en',{headers:{Host:'evil.invalid','X-Forwarded-Host':'studio.example.invalid'}})).status,421);assert.equal(f.reads(),0);
  const root=await f.request('/',{redirect:'manual'});assert.equal(root.status,302);assert.equal(root.headers.get('location'),'/et');
});
test('unpublished and failed reads return real localized no-store status, no private errors or conditional reuse',async t=>{
  for(const fail of [false,true]) {
    const f=await fixture(t,{fail});
    for(const method of ['GET','HEAD']) {const res=await f.request('/ru/classes',{method,headers:{'If-None-Match':'*'}});assert.equal(res.status,fail?503:404);assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(res.headers.get('etag'),null);assert.equal(res.headers.get('access-control-allow-credentials'),null);assert.ok(res.headers.get('content-security-policy').includes("script-src 'none'"));const html=await res.text();if(method==='GET'){assert.ok(html.includes('<html lang="ru"'));assert.ok(!html.includes('PRIVATE'));}else assert.equal(html,'');}
  }
});
test('public stylesheet works under strict CSP and has no private bundle imports',async t=>{
  const f=await fixture(t);const response=await f.request('/site.css');assert.equal(response.status,200);assert.ok(response.headers.get('content-type').includes('text/css'));const css=await response.text();assert.ok(css.includes('overflow-x: clip'));assert.ok(!css.includes('@import'));assert.equal(f.reads(),0);
});
