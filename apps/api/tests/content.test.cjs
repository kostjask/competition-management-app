const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { CmsPayloadSchema, emptyCmsPayload, cmsReadiness, CmsPublishSchema, CMS_BRAND_PALETTE, cmsContrast, ReturnPathSchema } = require('@dance/schemas');
test('CMS branding pairs meet text contrast and returns preserve only implemented CMS identities',()=>{
  for(const pair of Object.values(CMS_BRAND_PALETTE)) assert.ok(cmsContrast(pair.background,pair.foreground)>=4.5);
  assert.equal(ReturnPathSchema.safeParse('/content/studio').success,true); assert.equal(ReturnPathSchema.safeParse('/content/editions/'+randomUUID()).success,true);
  for(const path of ['/content/studio?token=secret','//evil.invalid/content/studio','/content/editions/------------------------------------','/app/content/studio']) assert.equal(ReturnPathSchema.safeParse(path).success,false);
});
test('CMS contracts reject unknown data, duplicate local identities, broken references and unsafe links', () => {
  const draft = emptyCmsPayload('STUDIO_SITE'); assert.equal(CmsPayloadSchema.safeParse(draft).success,true); assert.equal(cmsReadiness(draft).length,4);
  const teacher = {id:randomUUID(),name:'Synthetic teacher',biography:null,portrait:null};
  assert.equal(CmsPayloadSchema.safeParse({...draft,teachers:[teacher,teacher]}).success,false);
  const text={sourceLocale:'et',sourceText:'Class',translations:{}};
  assert.equal(CmsPayloadSchema.safeParse({...draft,classes:[{id:randomUUID(),title:text,style:null,ages:null,teacherIds:[teacher.id],joining:null}]}).success,false);
  assert.equal(CmsPayloadSchema.safeParse({...draft,contact:{...draft.contact,links:[{id:randomUUID(),title:text,url:'https://secret@example.invalid'}]}}).success,false);
  assert.equal(CmsPayloadSchema.safeParse({...draft,primaryLocale:'ru',title:text}).success,false);
  assert.equal(CmsPayloadSchema.safeParse({...draft,users:[]}).success,false);
  assert.equal(CmsPayloadSchema.safeParse({...draft,contact:{...draft.contact,phone:'-----'}}).success,false);
  assert.equal(CmsPayloadSchema.safeParse({...draft,contact:{...draft.contact,phone:'+372 555 1234'}}).success,true);
  assert.equal(CmsPublishSchema.safeParse({operationId:randomUUID(),expectedVersion:1,revisionId:randomUUID(),reviewed:false}).success,false);
});
test('CMS timetable validates local classes, calendar dates, IANA zones and increasing time ranges', () => {
  const draft=emptyCmsPayload('STUDIO_SITE'); const classId=randomUUID();
  draft.classes=[{id:classId,title:{sourceLocale:'et',sourceText:'Class',translations:{}},style:null,ages:null,teacherIds:[],joining:null}];
  const slot={id:randomUUID(),classId,weekday:1,start:'09:00',end:'10:00',timeZone:'Europe/Tallinn',location:'Hall',validFrom:'2026-01-01',validUntil:'2026-12-31'};
  assert.equal(CmsPayloadSchema.safeParse({...draft,timetable:[slot]}).success,true);
  for(const invalid of [{classId:randomUUID()},{end:'08:00'},{timeZone:'Mars/Unknown'},{validUntil:'2025-12-31'},{validFrom:'2026-02-30'}]) assert.equal(CmsPayloadSchema.safeParse({...draft,timetable:[{...slot,...invalid}]}).success,false);
});

test('CMS publication requires the exact policy fingerprint reviewed in preview', () => {
  const command = { operationId: randomUUID(), expectedVersion: 1, revisionId: randomUUID(), reviewed: true };
  assert.equal(CmsPublishSchema.safeParse(command).success, false);
  for (const policyDigest of ['', 'a'.repeat(63), 'g'.repeat(64)]) {
    assert.equal(CmsPublishSchema.safeParse({ ...command, policyDigest }).success, false);
  }
  assert.equal(CmsPublishSchema.safeParse({ ...command, policyDigest: 'a'.repeat(64) }).success, true);
});
