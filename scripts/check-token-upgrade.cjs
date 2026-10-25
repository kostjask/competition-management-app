const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync, readdirSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

module.exports = function checkTokenUpgrade(database) {
  assert.match(database, /^dance_baseline_[a-f0-9]{32}$/);
  const directory = path.join(__dirname, '../apps/api/prisma/migrations');
  const target = '20261025020000_identity_tokens';
  const history = readdirSync(directory).filter(name => name < target).sort()
    .map(name => readFileSync(path.join(directory, name, 'migration.sql'), 'utf8')).join('\n');
  const schema = 'token_upgrade_' + randomUUID().replaceAll('-', '');
  const prefix = `SET search_path TO ${schema};\n`;
  const run = sql => {
    const result = spawnSync('docker', ['compose', '-f', 'docker/docker-compose.yml', 'exec', '-T', 'postgres',
      'psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-U', 'dance_user', '-d', database],
    { input: sql, encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 0, 'Token upgrade fixture SQL must succeed');
    return result.stdout.trim();
  };
  try {
    run(`CREATE SCHEMA ${schema};\n${prefix}${history}
INSERT INTO "User" (id,email,name,password,active,"verificationToken") VALUES ('u','token-upgrade@example.invalid','Fixture','preserved',false,'legacy-verification');
INSERT INTO "Role" (id,key,name) VALUES ('r','token-fixture','Fixture');
INSERT INTO "UserRole" (id,"userId","roleId") VALUES ('role','u','r');
INSERT INTO "Invitation" (id,email,"roleKey",token,"createdBy","expiresAt","usedAt","supersededAt") VALUES
('pending','pending@example.invalid','judge','legacy-pending','u','2030-01-01',NULL,NULL),
('expired','expired@example.invalid','judge','legacy-expired','u','2020-01-01',NULL,NULL),
('used','used@example.invalid','judge','legacy-used','u','2020-01-01','2019-01-01',NULL),
('superseded','superseded@example.invalid','judge','legacy-superseded','u','2020-01-01',NULL,'2021-01-01');`);
    const user = run(prefix + `SELECT to_jsonb(u) - 'verificationToken' FROM "User" u;`);
    const roles = run(prefix + `SELECT to_jsonb(r) FROM "UserRole" r;`);
    const invitations = run(prefix + `SELECT jsonb_agg(to_jsonb(i) - 'token' - 'supersededAt' ORDER BY id) FROM "Invitation" i;`);
    run(prefix + readFileSync(path.join(directory, target, 'migration.sql'), 'utf8'));
    assert.equal(run(prefix + `SELECT to_jsonb(u) FROM "User" u;`), user);
    assert.equal(run(prefix + `SELECT to_jsonb(r) FROM "UserRole" r;`), roles);
    assert.equal(run(prefix + `SELECT jsonb_agg(to_jsonb(i) - 'tokenDigest' - 'revokedAt' - 'supersededAt' ORDER BY id) FROM "Invitation" i;`), invitations);
    assert.equal(run(prefix + `SELECT count(*) FROM "Invitation" WHERE "tokenDigest" IS NOT NULL;`), '0');
    assert.equal(run(prefix + `SELECT count(*) FROM "Invitation" WHERE id IN ('pending','expired') AND "revokedAt" IS NOT NULL AND "revokedAt" = "supersededAt";`), '2');
    assert.equal(run(prefix + `SELECT count(*) FROM "Invitation" WHERE id IN ('used','superseded') AND "revokedAt" IS NULL;`), '2');
    assert.equal(run(prefix + `SELECT "supersededAt"::date FROM "Invitation" WHERE id='superseded';`), '2021-01-01');
    assert.equal(run(`SELECT count(*) FROM information_schema.columns WHERE table_schema='${schema}' AND column_name IN ('verificationToken','token');`), '0');
  } finally {
    run(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
  }
  console.log('Token upgrade: plaintext removal, legacy invalidation and account/access/invitation-history preservation passed.');
};
