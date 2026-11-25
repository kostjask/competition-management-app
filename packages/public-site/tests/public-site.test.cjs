const assert = require('node:assert/strict');
const { test } = require('node:test');
const { fixture, portal, ids } = require('./fixture.cjs');
const { parsePublicRoute, publicPath, publicMetadata, renderPublicPage, renderPublicError, renderSitemap } = require('../dist');
const origins={studio:'https://studio.example.invalid',festival:'https://festival.example.invalid'};
const route=(section='home',surface='studio')=>({surface,section,locale:'en'});
test('public route allowlist preserves locale, edition and section without query or preview capabilities',()=>{
  for(const path of ['/en','/et/teachers','/ru/timetable','/en/media']) assert.ok(parsePublicRoute(path,'studio'));
  const edition=parsePublicRoute('/ru/festivals/dance-express/2026/rules','festival');
  assert.equal(publicPath(edition,'et'),'/et/festivals/dance-express/2026/rules');
  for(const path of ['/de','//evil.invalid','/en/','/en/teachers/other','/en/%2e%2e','/app/content/studio','/en/preview','/en?token=x']) assert.equal(parsePublicRoute(path,'studio'),null);
  for(const path of ['/en/festivals/dance-express/2026/preview','/en/festivals/dance-express/2026/../rules','/en/festivals/dance%2fexpress','/en/festivals/UPPER']) assert.equal(parsePublicRoute(path,'festival'),null);
});
test('server markup escapes authored text, keeps images public-only and ships no scripts or private shell',()=>{
  const data=fixture('en');data.fields[0].value.text='<script>alert("stored")</script>';
  data.images=[{path:'media.0',image:{id:ids.asset,url:`/api/v1/content/documents/${ids.revision}/assets/${ids.asset}`,width:400,height:300,alt:null,decorative:true}}];
  const html=renderPublicPage({route:route(),data,variants:{en:data},origins});
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script'));assert.ok(!html.includes('/api/v1/content'));assert.ok(!html.includes('localStorage'));
  assert.match(html,/<html lang="en"/);assert.match(html,/rel="canonical"/);assert.match(html,/<main id="main"/);
});
test('the festival opening features approved artwork and an available registration handoff', () => {
  const data = fixture('en', 'FESTIVAL_EDITION');
  const edition = { ...route('home', 'festival'), festivalSlug: 'dance-express', editionSlug: '2026' };
  const asset = `/api/v1/public/assets/${ids.asset}`;
  data.images = [{ path: 'brand.artwork', image: { id: ids.asset, url: asset, width: 600, height: 400, alt: null, decorative: true } }];
  data.action = { kind: 'external', url: 'https://example.invalid/registration' };
  const render = () => renderPublicPage({ route: edition, data, variants: { en: data }, origins });
  const html = render();
  assert.match(html, /class="opening opening--festival"/);
  assert.match(html, /<figure class="opening-artwork"><img [^>]+loading="eager"/);
  assert.equal(html.split(`src="${asset}"`).length - 1, 1);
  assert.match(html, /class="primary" href="\/en\/festivals\/dance-express\/2026\/registration"/);
  data.policyChanged = true;
  assert.doesNotMatch(render(), /class="primary" href="[^"]+\/registration"/);
});
test('fully fallback pages canonicalize to the source, mixed pages keep their route, authored alternates are reciprocal',()=>{
  const et=fixture('et'),en=fixture('en'),ru=fixture('ru',undefined,true);const variants={et,en,ru};
  let metadata=publicMetadata(ru,{...route(),locale:'ru'},variants,origins);
  assert.equal(metadata.canonical,origins.studio+'/et');assert.deepEqual(metadata.alternates.map(row=>row.locale),['et','en']);
  ru.fields.find(row=>row.path==='about').value={text:'О студии',lang:'ru',fallback:false};
  metadata=publicMetadata(ru,{...route(),locale:'ru'},variants,origins);assert.equal(metadata.canonical,origins.studio+'/ru');
  // Unrendered rules cannot suppress authored studio alternates.
  en.fields.find(row=>row.path.startsWith('rules.')).value={text:'Reeglid',lang:'et',fallback:true};
  assert.ok(publicMetadata(en,route(),variants,origins).alternates.some(row=>row.locale==='en'));
});
test('studio classes, teachers and timetable have identity links and event-zone calendar labels',()=>{
  const data=fixture('en');const html=renderPublicPage({route:route('timetable'),data,variants:{en:data},origins});
  assert.ok(html.includes('Monday'));assert.ok(html.includes('Europe/Tallinn'));assert.ok(html.includes('/en/classes#'+ids.class));assert.ok(html.includes('September 1, 2026'));
  const classes=renderPublicPage({route:route('classes'),data,variants:{en:data},origins});assert.ok(classes.includes('/en/teachers#'+ids.teacher));assert.ok(classes.includes('Contemporary dance'));
});
test('active external handoff retains public contact and reviewed result attribution',()=>{
  const data=fixture('en','FESTIVAL_EDITION');data.action={kind:'external',url:'https://example.invalid/registration'};
  const r={...route('registration','festival'),festivalSlug:'dance-express',editionSlug:'2026'};
  const html=renderPublicPage({route:r,data,variants:{en:data},origins});assert.ok(html.includes('Open registration'));assert.ok(html.includes('public@example.invalid'));
  data.links.push({path:'results.fixture',title:{text:'Results',lang:'en',fallback:false},url:'https://example.invalid/results.pdf',result:{editionLabel:'Dance Express 2025',date:'2025-11-17',locale:'et'}});
  const results=renderPublicPage({route:{...r,section:'results'},data,variants:{en:data},origins});assert.ok(results.includes('Dance Express 2025'));assert.ok(results.includes('Document language'));assert.ok(results.includes('results.pdf'));
});
test('portal renders separate past/upcoming ledgers and stable edition paths',()=>{
  const data=portal('en');const html=renderPublicPage({route:route('home','festival'),data,variants:{en:data},origins});
  for(const value of ['Upcoming and current','Past editions','/en/festivals/dance-express/2026','/en/festivals/dance-express/2025']) assert.ok(html.includes(value));
  assert.ok(html.includes('mailto:public%40example.invalid'));assert.ok(html.includes('https://example.invalid/social'));
});
test('alternate metadata accounts for fallback location and portal contact that are actually rendered',()=>{
  const edition=fixture('en','FESTIVAL_EDITION');edition.fields.push({path:'location',value:{text:'Eesti saal',lang:'et',fallback:true}});
  const r={...route('home','festival'),festivalSlug:'dance-express',editionSlug:'2026'};
  assert.equal(publicMetadata(edition,r,{en:edition},origins).alternates.length,0);
  const data=portal('en');data.editions=data.editions.slice(0,1);data.content.fields.find(row=>row.path==='contact.address').value={text:'Eesti aadress',lang:'et',fallback:true};
  assert.equal(publicMetadata(data,route('home','festival'),{en:data},origins).alternates.length,0);
});
test('missing/unavailable pages are localized and sitemap output is escaped and deduplicated',()=>{
  for(const locale of ['et','en','ru']) for(const status of [404,503]) { const html=renderPublicError({...route(),locale},origins,status);assert.ok(html.includes(`lang="${locale}"`));assert.ok(html.includes('noindex, nofollow')); }
  const xml=renderSitemap(['https://example.invalid/?a=1&b=2','https://example.invalid/?a=1&b=2']);assert.equal((xml.match(/<url>/g)||[]).length,1);assert.ok(xml.includes('&amp;'));
});
