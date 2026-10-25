const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync, readdirSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

// Only called by the isolated baseline runner; never reads application credentials.
module.exports = function checkScopeUpgrade(database) {
  assert.match(database, /^dance_baseline_[a-f0-9]{32}$/);
  const directory = path.join(__dirname, '../apps/api/prisma/migrations');
  const target = '20261025000000_scope_integrity';
  const migration = readFileSync(path.join(directory, target, 'migration.sql'), 'utf8');
  const history = readdirSync(directory).filter(name => name < target).sort()
    .map(name => readFileSync(path.join(directory, name, 'migration.sql'), 'utf8')).join('\n');
  const run = sql => spawnSync('docker', ['compose', '-f', 'docker/docker-compose.yml', 'exec', '-T', 'postgres',
    'psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-U', 'dance_user', '-d', database],
  { input: sql, encoding: 'utf8', timeout: 30000 });
  const success = sql => {
    const result = run(sql);
    assert.equal(result.status, 0, 'Scope upgrade fixture SQL must succeed');
    return result.stdout.trim();
  };
  for (const scenario of ['valid', 'duplicate-role', 'duplicate-invitation']) {
    const schema = 'scope_upgrade_' + randomUUID().replaceAll('-', '');
    const prefix = `SET search_path TO ${schema};\n`;
    try {
      success(`CREATE SCHEMA ${schema};\n${prefix}${history}
INSERT INTO "Event" (id,name,"startsAt","endsAt") VALUES ('e','Fixture','2026-01-01','2026-01-02');
INSERT INTO "User" (id,email,name) VALUES ('u','scope-upgrade@example.invalid','Fixture');
INSERT INTO "Role" (id,key,name) VALUES ('r','scope-upgrade','Fixture');
INSERT INTO "UserRole" (id,"userId","roleId","eventId") VALUES ('global','u','r',NULL),('scoped','u','r','e');
INSERT INTO "Invitation" (id,email,"roleKey","eventId",token,"createdBy","expiresAt","usedAt") VALUES
('global','scope@example.invalid','r',NULL,'global-secret','u','2020-01-01',NULL),
('scoped','scope@example.invalid','r','e','scoped-secret','u','2030-01-01',NULL),
('history','scope@example.invalid','r',NULL,'history-secret','u','2020-01-01','2019-01-01');`);
      if (scenario === 'duplicate-role') success(prefix + `INSERT INTO "UserRole" (id,"userId","roleId") VALUES ('duplicate','u','r');`);
      if (scenario === 'duplicate-invitation') success(prefix + `INSERT INTO "Invitation" (id,email,"roleKey",token,"createdBy","expiresAt") VALUES ('duplicate','scope@example.invalid','r','duplicate-secret','u','2020-01-01');`);
      const audit = () => success(prefix + readFileSync(path.join(__dirname, 'audit-scope-integrity.sql'), 'utf8'));
      const preflight = audit();
      assert.match(preflight, /global_roles_for_review\|/);
      assert.ok(preflight.includes('duplicate_role_groups|' + (scenario === 'duplicate-role' ? '1' : '0')));
      assert.ok(preflight.includes('duplicate_unconsumed_invitation_groups|' + (scenario === 'duplicate-invitation' ? '1' : '0')));
      const snapshotSql = `SELECT jsonb_build_object('roles', (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM "UserRole" r), 'invitations', (SELECT jsonb_agg(to_jsonb(i) - 'supersededAt' ORDER BY id) FROM "Invitation" i));`;
      const before = success(prefix + snapshotSql);
      const result = run(prefix + migration);
      if (scenario === 'valid') {
        assert.equal(result.status, 0, 'Legitimate historical records must upgrade');
        assert.equal(success(prefix + `SELECT count(*) FROM "Invitation" WHERE "supersededAt" IS NOT NULL;`), '0');
        assert.equal(audit(), preflight, 'Read-only preflight must work before and after migration');
      } else {
        assert.notEqual(result.status, 0, 'Ambiguous duplicates must refuse migration');
        assert.match(result.stderr, /Scope integrity: duplicate/);
        assert.equal(success(`SELECT count(*) FROM information_schema.columns WHERE table_schema = '${schema}' AND column_name = 'supersededAt';`), '0', 'Failed migration must roll back');
      }
      assert.equal(success(prefix + snapshotSql), before, 'Upgrade/refusal must preserve every existing field and ID');
    } finally {
      success(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
    }
  }
  console.log('Scope upgrade: full-record preservation and atomic refusal of ambiguous role/invitation duplicates passed.');
};
