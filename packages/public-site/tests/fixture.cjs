const { CmsPublicSchema, CmsPublicPortalSchema } = require('@dance/schemas');
const ids = { revision: '11111111-1111-4111-8111-111111111111', teacher: '22222222-2222-4222-8222-222222222222', class: '33333333-3333-4333-8333-333333333333', asset: '44444444-4444-4444-8444-444444444444' };
function fixture(locale = 'et', kind = 'STUDIO_SITE', fallback = false) {
  const text = (et,en,ru) => ({ text: fallback ? et : {et,en,ru}[locale], lang: fallback ? 'et' : locale, fallback: fallback && locale !== 'et' });
  const content = CmsPublicSchema.parse({ kind, revisionId: ids.revision, publishedAt: '2026-11-17T12:00:00.000Z', requestedLocale: locale, primaryLocale: 'et',
    identity: kind === 'FESTIVAL_EDITION' ? {festivalSlug:'dance-express',editionSlug:'2026'} : null,
    fields: [
      {path:'title',value:text('Neposedõ tantsustuudio','Neposedõ dance studio','Танцевальная студия Neposedõ')},
      {path:'introduction',value:text('Leia endale sobiv tantsutund.','Find the class that suits you.','Найдите занятие для себя.')},
      {path:'metadata',value:text('Õpetajad, tantsutunnid ja tunniplaan.','Teachers, dance classes and timetable.','Преподаватели, занятия и расписание.')},
      {path:'about',value:text('Õpi tantsima koos Neposedõga.','Learn to dance with Neposedõ.','Учитесь танцевать с Neposedõ.')},
      {path:'joining',value:text('Tunni valimiseks võta meiega ühendust.','Contact us to choose a class.','Свяжитесь с нами для выбора занятия.')},
      {path:'contact.address',value:text('Näidissaal, Tallinn','Example hall, Tallinn','Учебный зал, Таллинн')},
      {path:`teachers.${ids.teacher}.biography`,value:text('Näidisõpetaja tutvustus.','Synthetic teacher biography.','Учебная биография преподавателя.')},
      {path:`classes.${ids.class}.title`,value:text('Kaasaegne tants','Contemporary dance','Современный танец')},
      {path:`classes.${ids.class}.style`,value:text('Kaasaegne','Contemporary','Современный')},
      {path:`classes.${ids.class}.ages`,value:text('Noored','Young people','Подростки')},
      {path:'rules.55555555-5555-4555-8555-555555555555.heading',value:text('Osalemine','Participation','Участие')},
      {path:'rules.55555555-5555-4555-8555-555555555555.0',value:text('Tutvu avaldatud tingimustega.','Read the published conditions.','Прочтите опубликованные условия.')},
      {path:`judges.${ids.teacher}.biography`,value:text('Näidisžürii tutvustus.','Synthetic judge biography.','Учебная биография члена жюри.')},
    ], images: [], links: [{path:'contact.links.social',title:text('Sotsiaalmeedia','Social media','Социальные сети'),url:'https://example.invalid/social'}],
    facts:null,policyChanged:false,contact:{email:'public@example.invalid',phone:'+372 555 1234'},action:{kind:'contact',email:'public@example.invalid',phone:'+372 555 1234'},
    timetable:[{classId:ids.class,weekday:1,start:'17:00',end:'18:00',timeZone:'Europe/Tallinn',location:'Example hall',validFrom:'2026-09-01',validUntil:'2027-05-31'}],
    profiles:[{id:ids.teacher,name:'Example teacher'}],classes:[{id:ids.class,teacherIds:[ids.teacher]}],brand:kind==='STUDIO_SITE'?null:'forest',startsOn:kind==='FESTIVAL_EDITION'?'2026-11-17':null,endsOn:kind==='FESTIVAL_EDITION'?'2026-11-18':null,
  });
  if(kind!=='STUDIO_SITE') {
    content.fields.find(row=>row.path==='title').value=kind==='FESTIVAL_PORTAL'?text('Neposedõ festivalid','Neposedõ festivals','Фестивали Neposedõ'):text('Dance Express 2026','Dance Express 2026','Dance Express 2026');
    content.fields.find(row=>row.path==='introduction').value=text('Reeglid, žürii ja varasemad tulemused.','Rules, judges and results from past editions.','Правила, жюри и результаты прошлых выпусков.');
  }
  return content;
}
function portal(locale='et', fallback=false) {
  const content=fixture(locale,'FESTIVAL_PORTAL',fallback);
  return CmsPublicPortalSchema.parse({content,festivals:[{slug:'dance-express',name:'Dance Express',summary:null}],editions:[
    {festivalSlug:'dance-express',editionSlug:'2026',title:content.fields[0].value,revisionId:ids.revision,startsOn:'2026-11-17',endsOn:'2026-11-18',period:'upcoming'},
    {festivalSlug:'dance-express',editionSlug:'2025',title:{text:'Dance Express 2025',lang:'et',fallback:locale!=='et'},revisionId:ids.revision,startsOn:'2025-11-17',endsOn:'2025-11-18',period:'past'},
  ]});
}
module.exports={fixture,portal,ids};
