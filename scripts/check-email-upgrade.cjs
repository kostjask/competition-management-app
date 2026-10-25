const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync, readdirSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

module.exports = function checkEmailUpgrade(database) {
  assert.match(database, /^dance_baseline_[a-f0-9]{32}$/);
  const directory = path.join(__dirname, '../apps/api/prisma/migrations');
  const target = '20261025010000_email_identity';
  const migration = readFileSync(path.join(directory, target, 'migration.sql'), 'utf8');
  const history = readdirSync(directory).filter(name => name < target).sort()
    .map(name => readFileSync(path.join(directory, name, 'migration.sql'), 'utf8')).join('\n');
  const run = sql => spawnSync('docker', ['compose', '-f', 'docker/docker-compose.yml', 'exec', '-T', 'postgres',
    'psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-U', 'dance_user', '-d', database],
  { input: sql, encoding: 'utf8', timeout: 30000 });
  const success = sql => {
    const result = run(sql);
    assert.equal(result.status, 0, 'Email fixture SQL must succeed');
    return result.stdout.trim();
  };
  for (const scenario of ['valid', 'account-collision', 'global-collision', 'event-collision']) {
    const schema = 'email_upgrade_' + randomUUID().replaceAll('-', '');
    const prefix = `SET search_path TO ${schema};\n`;
    try {
      success(`CREATE SCHEMA ${schema};\n${prefix}${history}
INSERT INTO "Event" (id,name,"startsAt","endsAt") VALUES ('e','Fixture','2026-01-01','2026-01-02');
INSERT INTO "User" (id,email,name,password,active,"verificationToken") VALUES ('u',' Person@Example.INVALID ','Fixture','unchanged',false,'unchanged');
INSERT INTO "Invitation" (id,email,"roleKey","eventId",token,"createdBy","expiresAt","usedAt","supersededAt") VALUES
('global',' Person@Example.INVALID ','judge',NULL,'global-secret','u','2020-01-01',NULL,NULL),
('event',' Person@Example.INVALID ','judge','e','event-secret','u','2030-01-01',NULL,NULL),
('used','PERSON@example.invalid','judge',NULL,'used-secret','u','2020-01-01','2019-01-01',NULL),
('superseded','PERSON@example.invalid','judge',NULL,'old-secret','u','2020-01-01',NULL,'2021-01-01');`);
      if (scenario === 'account-collision') success(prefix + `INSERT INTO "User" (id,email,name) VALUES ('collision','person@example.invalid','Other');`);
      if (scenario.endsWith('-collision') && scenario !== 'account-collision') success(prefix + `INSERT INTO "Invitation" (id,email,"roleKey","eventId",token,"createdBy","expiresAt") VALUES ('collision','person@example.invalid','judge',${scenario === 'global-collision' ? 'NULL' : "'e'"},'collision-secret','u','2020-01-01');`);
      const snapshot = canonical => success(prefix + `SELECT jsonb_build_object(
'users',(SELECT jsonb_agg(${canonical ? "to_jsonb(u) || jsonb_build_object('email', lower(btrim(email, ' ') COLLATE \"C\"))" : 'to_jsonb(u)'} ORDER BY id) FROM "User" u),
'invitations',(SELECT jsonb_agg(${canonical ? "to_jsonb(i) || jsonb_build_object('email', lower(btrim(email, ' ') COLLATE \"C\"))" : 'to_jsonb(i)'} ORDER BY id) FROM "Invitation" i));`);
      const before = snapshot(false);
      const expected = snapshot(true);
      const audit = success(prefix + readFileSync(path.join(__dirname, 'audit-email-identity.sql'), 'utf8'));
      assert.ok(audit.includes('account_collision_groups|' + (scenario === 'account-collision' ? '1' : '0')));
      assert.ok(audit.includes('outstanding_invitation_collision_groups|' + (['global-collision', 'event-collision'].includes(scenario) ? '1' : '0')));
      const result = run(prefix + migration);
      if (scenario === 'valid') {
        assert.equal(result.status, 0, 'Noncolliding legacy data must upgrade');
        assert.equal(snapshot(false), expected, 'Every field except canonical email must be preserved');
        assert.notEqual(run(prefix + `UPDATE "User" SET email = 'PERSON@example.invalid';`).status, 0);
        assert.notEqual(run(prefix + `UPDATE "Invitation" SET email = ' Person@example.invalid ';`).status, 0);
        assert.notEqual(run(prefix + `INSERT INTO "User" (id,email,name) VALUES ('duplicate','person@example.invalid','Duplicate');`).status, 0);
      } else {
        assert.notEqual(result.status, 0, 'Ambiguous identities must refuse migration');
        assert.match(result.stderr, /Email identity: .* collisions require reviewed repair/);
        assert.equal(snapshot(false), before, 'Refusal must preserve all rows/fields');
        assert.equal(success(prefix + `SELECT count(*) FROM pg_constraint WHERE conrelid = '"User"'::regclass AND conname = 'User_email_canonical';`), '0');
      }
    } finally {
      success(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
    }
  }
  console.log('Email migration: canonicalization, full-field preservation, checks and atomic collision refusal passed.');
};
