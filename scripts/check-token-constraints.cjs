const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync, readdirSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

// Isolated upgrade/refusal fixtures only; no application connection is read.
module.exports = function checkTokenConstraints(database) {
  assert.match(database, /^dance_baseline_[a-f0-9]{32}$/);
  const directory = path.join(__dirname, '../apps/api/prisma/migrations');
  const target = '20261025030000_identity_token_checks';
  const history = readdirSync(directory).filter(name => name < target).sort()
    .map(name => readFileSync(path.join(directory, name, 'migration.sql'), 'utf8')).join('\n');
  const migration = readFileSync(path.join(directory, target, 'migration.sql'), 'utf8');
  const violations = [
    ['AccountToken_digest_format', `UPDATE "AccountToken" SET digest='not-a-digest';`],
    ['AccountToken_lifetime', `UPDATE "AccountToken" SET "expiresAt"="createdAt";`],
    ['AccountToken_terminal_state', `UPDATE "AccountToken" SET "consumedAt"='2026-01-01', "revokedAt"='2026-01-02';`],
    ['Invitation_digest_format', `UPDATE "Invitation" SET "tokenDigest"='not-a-digest' WHERE id='live';`],
    ['Invitation_legacy_token_state', `UPDATE "Invitation" SET "tokenDigest"=NULL WHERE id='live';`],
    ['Invitation_revocation_state', `UPDATE "Invitation" SET "revokedAt"='2026-01-01' WHERE id='live';`],
  ];
  const run = sql => spawnSync('docker', ['compose', '-f', 'docker/docker-compose.yml', 'exec', '-T', 'postgres',
    'psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-U', 'dance_user', '-d', database],
  { input: sql, encoding: 'utf8', timeout: 30000 });
  const success = sql => {
    const result = run(sql);
    assert.equal(result.status, 0, 'Token constraint fixture SQL must succeed');
    return result.stdout.trim();
  };
  for (const scenario of [null, ...violations]) {
    const schema = 'token_checks_' + randomUUID().replaceAll('-', '');
    const prefix = `SET search_path TO ${schema};\n`;
    const snapshot = () => success(prefix + `SELECT jsonb_build_object(
      'users',(SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM "User" u),
      'tokens',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM "AccountToken" t),
      'invitations',(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM "Invitation" i));`);
    try {
      success(`CREATE SCHEMA ${schema};\n${prefix}${history}
INSERT INTO "User" (id,email,name,password,active) VALUES ('u','checks@example.invalid','Fixture','unchanged',false);
INSERT INTO "AccountToken" (id,"userId",email,purpose,digest,"createdAt","expiresAt") VALUES ('t','u','checks@example.invalid','VERIFY_EMAIL',repeat('a',64),'2020-01-01','2030-01-01');
INSERT INTO "Invitation" (id,email,"roleKey","tokenDigest","createdBy","expiresAt","usedAt","supersededAt","revokedAt") VALUES
('live','live@example.invalid','judge',repeat('b',64),'u','2030-01-01',NULL,NULL,NULL),
('used','used@example.invalid','judge',NULL,'u','2020-01-01','2019-01-01',NULL,NULL),
('revoked','revoked@example.invalid','judge',NULL,'u','2020-01-01',NULL,'2021-01-01','2021-01-01');`);
      // Before the fix each invalid state is accepted; after it the entire upgrade refuses it.
      if (scenario) success(prefix + scenario[1]);
      const before = snapshot();
      const result = run(prefix + migration);
      if (scenario) {
        assert.notEqual(result.status, 0, 'Invalid retained data must refuse migration');
        assert.ok(result.stderr.includes(scenario[0]), 'Refusal must identify the violated constraint');
        assert.equal(success(prefix + `SELECT count(*) FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND conname IN (${violations.map(([name]) => "'" + name + "'").join(',')});`), '0', 'All new checks must roll back on refusal');
      } else {
        assert.equal(result.status, 0, 'Valid lifecycle/history must upgrade');
        for (const [constraint, mutation] of violations) {
          const denied = run(prefix + mutation);
          assert.notEqual(denied.status, 0, 'Direct invalid writes must fail');
          assert.ok(denied.stderr.includes(constraint));
          assert.equal(snapshot(), before, 'Rejected writes preserve complete records');
        }
      }
      assert.equal(snapshot(), before, 'Upgrade/refusal must preserve every field');
    } finally {
      success(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
    }
  }
  console.log('Token CHECKs: direct SQL denial, historical null digests, full-record upgrade preservation and atomic refusal passed.');
};
