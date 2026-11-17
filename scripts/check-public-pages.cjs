const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {once}=require('node:events');
const {randomUUID}=require('node:crypto');
const {createServer}=require('node:http');
module.exports=({serverEnv,baseUrl})=>{
  const result=spawnSync(process.execPath,[__filename],{env:{...serverEnv,PUBLIC_TEST_API:baseUrl},encoding:'utf8',timeout:120000});
  if(result.status!==0)throw new Error('Public HTML fixture failed: '+result.stderr.trim());
  console.log(result.stdout.trim());
};
async function main(){
  const target=new URL(process.env.DATABASE_URL);assert.equal(target.hostname,'localhost');assert.match(target.pathname,/^\/dance_baseline_[a-f0-9]{32}$/);
  const api=new URL(process.env.PUBLIC_TEST_API);assert.equal(api.hostname,'127.0.0.1');assert.equal(api.protocol,'http:');
  const {PrismaClient}=require('@prisma/client');const {PrismaPg}=require('@prisma/adapter-pg');
  const {createPublicApp}=require('../apps/api/dist/publicApp');const {emptyCmsPayload}=require('../packages/schemas/dist');
  const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});const servers=[];
  const origins={studio:'',festival:''};let stage='setup';
  try{
    for(const surface of ['studio','festival']){const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');origins[surface]=`http://127.0.0.1:${server.address().port}`;servers.push(server);}
    servers[0].on('request',createPublicApp(db,{surface:'studio',origins}));servers[1].on('request',createPublicApp(db,{surface:'festival',origins}));
    const login=await fetch(api.origin+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@test.com',password:'password123'})});assert.equal(login.status,200);const {token}=await login.json();
    async function command(path,body){const res=await fetch(api.origin+'/api/v1/content/'+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(res.status,200,stage+' command '+path);return res.json();}
    async function get(path){const res=await fetch(api.origin+'/api/v1/content/'+path,{headers:{Authorization:'Bearer '+token}});assert.equal(res.status,200);return res.json();}
    const cmd=(version,extra={})=>({operationId:randomUUID(),expectedVersion:version,...extra});
    const detail=id=>get('documents/'+id);
    async function save(id,payload){const doc=await detail(id);await command(`documents/${id}/revisions`,cmd(doc.version,{payload}));return detail(id);}
    async function publish(id){const doc=await detail(id);const preview=await get(`documents/${id}/preview?revisionId=${doc.draft.id}&locale=et`);assert.equal(preview.issues.length,0);await command(`documents/${id}/publish`,cmd(doc.version,{revisionId:doc.draft.id,reviewed:true,policyDigest:preview.policyDigest}));}
    async function unpublish(id){const doc=await detail(id);await command(`documents/${id}/unpublish`,cmd(doc.version));}
    const text=(sourceText,translate=true)=>({sourceLocale:'et',sourceText,translations:translate?{en:'English '+sourceText,ru:'Русский '+sourceText}:{}});
    const ready=kind=>({...emptyCmsPayload(kind),title:text('Synthetic public title'),introduction:text('Synthetic introduction'),metadata:text('Synthetic metadata'),contact:{email:'public@example.invalid',phone:'+372 555 1234',address:text('Synthetic hall'),links:[]}});
    const index=await get('documents');const studio=index.documents.find(row=>row.kind==='STUDIO_SITE');const portal=index.documents.find(row=>row.kind==='FESTIVAL_PORTAL');assert.ok(studio&&portal);
    stage='studio request rendering and draft exclusion';await unpublish(studio.id);
    assert.equal((await fetch(origins.studio+'/en')).status,404);
    const payload=ready('STUDIO_SITE');payload.about=text('<script>PRIVATE_DRAFT_SCRIPT</script>');payload.joining=text('Ask about a class');
    const teacherId=randomUUID(),classId=randomUUID();payload.teachers=[{id:teacherId,name:'Synthetic teacher',biography:text('Biography'),portrait:null}];
    payload.classes=[{id:classId,title:text('Synthetic class'),style:text('Style'),ages:text('Ages'),joining:text('Contact teacher'),teacherIds:[teacherId]}];
    payload.timetable=[{id:randomUUID(),classId,weekday:1,start:'17:00',end:'18:00',timeZone:'Europe/Tallinn',location:'Synthetic hall',validFrom:'2026-09-01',validUntil:'2027-05-31'}];
    await save(studio.id,payload);assert.equal((await fetch(origins.studio+'/en/about')).status,404);await publish(studio.id);
    for(const locale of ['et','en','ru'])for(const section of ['','/about','/teachers','/classes','/timetable','/join','/contact','/media']){
      const res=await fetch(origins.studio+'/'+locale+section);assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(res.headers.get('etag'),null);const html=await res.text();assert.ok(html.includes(`<html lang="${locale}"`));assert.ok(!html.includes('<script'));assert.ok(html.includes('rel="canonical"'));assert.ok(!html.includes('sessionVersion'));
    }
    let html=await (await fetch(origins.studio+'/en/about')).text();assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('PRIVATE_DRAFT_SCRIPT'));
    const draft={...payload,about:text('UNPUBLISHED_CHANGED_TEXT')};await save(studio.id,draft);html=await(await fetch(origins.studio+'/en/about')).text();assert.ok(!html.includes('UNPUBLISHED_CHANGED_TEXT'));
    stage='metadata and sitemap';let sitemap=await(await fetch(origins.studio+'/sitemap.xml')).text();assert.ok(sitemap.includes(origins.studio+'/en/timetable'));assert.ok(!sitemap.includes('/content/'));
    const fallback=ready('STUDIO_SITE');for(const key of ['title','introduction','metadata'])fallback[key]=text('Ainult eesti',false);fallback.about=text('Ainult allikas',false);await save(studio.id,fallback);await publish(studio.id);
    html=await(await fetch(origins.studio+'/ru/about')).text();assert.ok(html.includes(`rel="canonical" href="${origins.studio}/et/about"`));assert.ok(html.includes('lang="et"'));assert.ok(!/<link rel="alternate" hrefLang="ru"/.test(html));sitemap=await(await fetch(origins.studio+'/sitemap.xml')).text();assert.ok(!sitemap.includes(origins.studio+'/ru'));
    await save(studio.id,payload);await publish(studio.id);
    stage='public raster HTML/HEAD and immediate rights withdrawal';const sharp=require('../apps/api/node_modules/sharp');const bytes=await sharp({create:{width:16,height:12,channels:3,background:'#2359b8'}}).png().toBuffer();
    let doc=await detail(studio.id);const assetId=randomUUID();const form=new FormData();form.set('image',new Blob([bytes],{type:'image/png'}),'synthetic.png');let res=await fetch(api.origin+`/api/v1/content/documents/${studio.id}/assets`,{method:'POST',headers:{Authorization:'Bearer '+token,'X-Content-Operation':assetId,'X-Content-Version':String(doc.version)},body:form});assert.equal(res.status,200);
    doc=await detail(studio.id);await command(`documents/${studio.id}/assets/${assetId}/review`,cmd(doc.version,{approved:true}));await save(studio.id,{...payload,media:[{assetId,decorative:false,alt:text('Synthetic raster')} ]});await publish(studio.id);
    html=await(await fetch(origins.studio+'/en/media')).text();assert.ok(html.includes(`/api/v1/public/assets/${assetId}`));assert.equal((await fetch(origins.studio+`/api/v1/public/assets/${assetId}`,{method:'HEAD'})).status,200);
    doc=await detail(studio.id);await command(`documents/${studio.id}/assets/${assetId}/review`,cmd(doc.version,{approved:false}));assert.equal((await fetch(origins.studio+'/en/media')).status,404);assert.equal((await fetch(origins.studio+`/api/v1/public/assets/${assetId}`,{method:'HEAD'})).status,404);
    await save(studio.id,payload);await publish(studio.id);
    stage='festival publication, stable archives and cross-festival isolation';const slug='public-html-'+randomUUID().slice(0,8);doc=await detail(portal.id);await command('festivals',cmd(doc.version,{name:'Synthetic festival',slug}));const festival=(await get('documents')).festivals.find(row=>row.slug===slug);
    doc=await detail(portal.id);await command('editions',cmd(doc.version,{festivalId:festival.id,slug:'2025',copyDocumentId:null,sections:[]}));let edition=(await get('documents')).documents.find(row=>row.festivalSlug===slug&&row.slug==='2025');
    const editionPayload=ready('FESTIVAL_EDITION');editionPayload.startsOn='2025-11-17';editionPayload.endsOn='2025-11-18';editionPayload.rules=[{id:randomUUID(),heading:text('Rules'),paragraphs:[text('Published conditions')]}];editionPayload.judges=[{id:teacherId,name:'Synthetic judge',biography:text('Judge biography'),portrait:null}];editionPayload.handoff={kind:'external',url:'https://example.invalid/current-registration',availableFrom:'2020-01-01T00:00:00.000Z',availableUntil:'2099-01-01T00:00:00.000Z',reviewed:true};editionPayload.results=[{id:randomUUID(),title:text('Results'),url:'https://example.invalid/results.pdf',editionLabel:'Synthetic festival 2025',date:'2025-11-18',locale:'et',reviewed:true}];
    await save(edition.id,editionPayload);const editionPath=`/en/festivals/${slug}/2025`;assert.equal((await fetch(origins.festival+editionPath)).status,404);await publish(edition.id);
    const portalPayload=ready('FESTIVAL_PORTAL');portalPayload.festivals=[{festivalId:festival.id,summary:text('Festival summary')}];await save(portal.id,portalPayload);await publish(portal.id);
    html=await(await fetch(origins.festival+'/en')).text();assert.ok(html.includes(editionPath));assert.ok(html.includes('Past editions'));assert.ok(html.includes('mailto:public%40example.invalid'));
    for(const section of ['','/rules','/judges','/registration','/results','/contact']){const response=await fetch(origins.festival+editionPath+section);assert.equal(response.status,200);html=await response.text();if(section==='/registration'){assert.ok(html.includes('current-registration'));assert.ok(html.includes('public@example.invalid'));}if(section==='/results')assert.ok(html.includes('Synthetic festival 2025'));}
    assert.equal((await fetch(origins.festival+'/en/festivals/wrong-festival/2025')).status,404);assert.equal((await fetch(origins.festival+'/en/festivals/'+slug)).status,200);
    doc=await detail(portal.id);await command('editions',cmd(doc.version,{festivalId:festival.id,slug:'draft-only',copyDocumentId:null,sections:[]}));html=await(await fetch(origins.festival+'/en')).text();assert.ok(!html.includes('draft-only'));
    sitemap=await(await fetch(origins.festival+'/sitemap.xml')).text();assert.ok(sitemap.includes(editionPath+'/results'));assert.ok(!sitemap.includes('draft-only'));
    stage='publication withdrawal and private-route preservation';await unpublish(edition.id);assert.equal((await fetch(origins.festival+editionPath,{method:'HEAD',headers:{'If-None-Match':'*'}})).status,404);html=await(await fetch(origins.festival+'/en')).text();assert.ok(!html.includes(editionPath));sitemap=await(await fetch(origins.festival+'/sitemap.xml')).text();assert.ok(!sitemap.includes(editionPath));
    for(const origin of Object.values(origins))for(const path of ['/api/v1/auth/profile','/api/v1/events','/app/content/studio','/uploads/users/private.png','/en?preview=true'])assert.equal((await fetch(origin+path)).status,404);
    assert.equal((await fetch(api.origin+'/api/v1/events')).status,401);
    console.log('PASS: real published HTML/JSON, 24 localized studio routes, archives/handoff/contact, source canonical/sitemap, draft/cross-festival/private exclusion, raster rights and immediate GET/HEAD withdrawal.');
  }catch(error){throw new Error(`stage ${stage}: ${error.message}`);}finally{await Promise.all(servers.map(server=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})));await db.$disconnect();}
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
