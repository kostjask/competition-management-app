// One-off suitability evidence using only a random schema in the Compose fixture.
// No application environment, user rows, secrets or private values are read/output.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync, readdirSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const schema = 'schema_audit_' + randomUUID().replaceAll('-', '');
const prefix = `SET search_path TO ${schema};\n`;
const directory = path.join(__dirname, '../apps/api/prisma/migrations');
const run = sql => {
  const result = spawnSync('docker', ['compose', '-f', 'docker/docker-compose.yml', 'exec', '-T', 'postgres',
    'psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-U', 'dance_user', '-d', 'dance_comp'],
  { input: sql, encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, 'Schema audit fixture SQL must succeed');
  return result.stdout.trim();
};
try {
  const history = readdirSync(directory).filter(name => /^\d+_/.test(name)).sort()
    .map(name => readFileSync(path.join(directory, name, 'migration.sql'), 'utf8')).join('\n');
  run(`CREATE SCHEMA ${schema};\n${prefix}${history}`);
  const catalog = JSON.parse(run(prefix + `SELECT jsonb_build_object(
    'tables',(SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE'),
    'columns',(SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema()),
    'types',(SELECT jsonb_object_agg(udt_name,n) FROM (SELECT udt_name,count(*) n FROM information_schema.columns WHERE table_schema=current_schema() GROUP BY udt_name) t),
    'foreignKeys',(SELECT count(*) FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND contype='f'),
    'deleteActions',(SELECT jsonb_object_agg(confdeltype,n) FROM (SELECT confdeltype,count(*) n FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND contype='f' GROUP BY confdeltype) f),
    'indexes',(SELECT count(*) FROM pg_indexes WHERE schemaname=current_schema()),
    'checks',(SELECT jsonb_agg(conname ORDER BY conname) FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND contype='c')
  );`));
  run(prefix + `
INSERT INTO "Event" (id,name,"startsAt","endsAt") SELECT 'e'||i,'Fixture '||i,'2026-01-01','2026-01-02' FROM generate_series(1,100) i;
INSERT INTO "User" (id,email,name) SELECT 'u'||i,'fixture'||i||'@example.invalid','Fixture' FROM generate_series(1,10000) i;
INSERT INTO "Role" (id,key,name) VALUES ('r','fixture','Fixture');
INSERT INTO "UserRole" (id,"userId","roleId") SELECT 'ur'||i,'u'||i,'r' FROM generate_series(1,10000) i;
INSERT INTO "AccountToken" (id,"userId",email,purpose,digest,"createdAt","expiresAt") SELECT 't'||i,'u'||i,'fixture'||i||'@example.invalid','VERIFY_EMAIL',lpad(to_hex(i),64,'0'),'2026-01-01','2030-01-01' FROM generate_series(1,10000) i;
INSERT INTO "Invitation" (id,email,"roleKey","tokenDigest","createdBy","expiresAt") SELECT 'i'||i,'invite'||i||'@example.invalid','judge',lpad(to_hex(i),64,'0'),'u'||i,'2030-01-01' FROM generate_series(1,10000) i;
INSERT INTO "Studio" (id,"eventId",name) SELECT 's'||i,'e'||(i%100+1),'Fixture studio '||i FROM generate_series(1,10000) i;
INSERT INTO "StudioRepresentative" (id,"studioId","userId",name,email) SELECT 'sr'||i,'s'||i,'u'||i,'Fixture','fixture'||i||'@example.invalid' FROM generate_series(1,10000) i;
INSERT INTO "StudioEventRegistration" (id,"studioId","eventId","updatedAt") SELECT 'reg'||i,'s'||i,'e'||(i%100+1),CURRENT_TIMESTAMP FROM generate_series(1,10000) i;
INSERT INTO "Judge" (id,"userId","eventId",name) SELECT 'j'||i,'u'||i,'e'||(i%100+1),'Fixture' FROM generate_series(1,10000) i;
INSERT INTO "Dancer" (id,"studioId","firstName","lastName","birthDate") SELECT 'd'||i,'s'||i,'Fixture','Dancer','2010-01-01' FROM generate_series(1,10000) i;
INSERT INTO "DanceCategory" (id,"eventId",name) SELECT 'c'||i,'e'||i,'Fixture' FROM generate_series(1,100) i;
INSERT INTO "AgeGroup" (id,"eventId",name,"minAge") SELECT 'a'||i,'e'||i,'Fixture',0 FROM generate_series(1,100) i;
INSERT INTO "DanceFormat" (id,"eventId",name,"minParticipants","maxParticipants","maxDurationSeconds") SELECT 'f'||i,'e'||i,'Fixture',1,10,300 FROM generate_series(1,100) i;
INSERT INTO "Performance" (id,"eventId","categoryId","ageGroupId","formatId",title,"durationSec","orderOnStage") SELECT 'p'||i,'e'||(i%100+1),'c'||(i%100+1),'a'||(i%100+1),'f'||(i%100+1),'Fixture',60,i FROM generate_series(1,10000) i;
INSERT INTO "PerformanceParticipant" ("performanceId","dancerId") SELECT 'p'||i,'d'||i FROM generate_series(1,10000) i;
ANALYZE "UserRole"; ANALYZE "AccountToken"; ANALYZE "Invitation"; ANALYZE "StudioRepresentative";
ANALYZE "StudioEventRegistration"; ANALYZE "Judge"; ANALYZE "Dancer"; ANALYZE "PerformanceParticipant";
`);
  const queries = {
    authRoles: `SELECT id FROM "UserRole" WHERE "userId"='u42'`,
    accountRotation: `SELECT id FROM "AccountToken" WHERE "userId"='u42' AND purpose='VERIFY_EMAIL' AND "consumedAt" IS NULL AND "revokedAt" IS NULL`,
    invitationSlot: `SELECT id FROM "Invitation" WHERE email='invite42@example.invalid' AND "roleKey"='judge' AND "eventId" IS NULL AND "usedAt" IS NULL AND "supersededAt" IS NULL`,
    membershipsByUser: `SELECT id FROM "StudioRepresentative" WHERE "userId"='u42' AND active`,
    registrationsByEvent: `SELECT id FROM "StudioEventRegistration" WHERE "eventId"='e42' AND status='PENDING' ORDER BY "createdAt",id`,
    judgesByEvent: `SELECT id FROM "Judge" WHERE "eventId"='e42'`,
    activeRoster: `SELECT id FROM "Dancer" WHERE "studioId"='s42' AND "deletedAt" IS NULL`,
    participantsByDancer: `SELECT "performanceId" FROM "PerformanceParticipant" WHERE "dancerId"='d42'`,
  };
  const plans = {};
  for (const [name, query] of Object.entries(queries)) {
    const plan = JSON.parse(run(prefix + `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query};`))[0];
    const nodes = [];
    const visit = node => {
      nodes.push({ node: node['Node Type'], index: node['Index Name'], rows: node['Actual Rows'], removed: node['Rows Removed by Filter'] });
      for (const child of node.Plans || []) visit(child);
    };
    visit(plan.Plan);
    plans[name] = { nodes, sharedHitBlocks: plan.Plan['Shared Hit Blocks'] };
  }
  console.log(JSON.stringify({ fixtureRowsPerReviewedTable: 10000, catalog, plans }, null, 2));
} finally {
  assert.match(schema, /^schema_audit_[a-f0-9]{32}$/);
  run(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
}
