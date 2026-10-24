const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID, randomBytes } = require('node:crypto');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const root = path.resolve(__dirname, '..');
const database = `dance_baseline_${randomUUID().replaceAll('-', '')}`;
// Only the checked-in Compose fixture is used, never application .env credentials.
const env = {
  ...process.env,
  DATABASE_URL: `postgresql://dance_user:dance_pass@localhost:5432/${database}`,
  JWT_SECRET: randomBytes(32).toString('hex'),
  EMAIL_FROM: 'baseline@example.invalid',
  NODE_ENV: 'test', DEV_AUTH: 'false', HOST: '127.0.0.1',
};
let created = false;
let client;
let server;

function psql(sql) {
  const result = spawnSync('docker', ['compose', '-f', 'docker/docker-compose.yml', 'exec', '-T', 'postgres',
    'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'dance_user', '-d', 'postgres'],
  { cwd: root, input: sql, encoding: 'utf8', timeout: 30000 });
  if (result.error || result.status !== 0) throw new Error('Compose PostgreSQL command failed; check Docker access and startup.');
}

function pnpm(...args) {
  // Arguments are fixed script/task names; all environment values stay outside shell text.
  if (!args.every((arg) => /^[a-z:-]+$/.test(arg))) throw new Error('Invalid baseline task name');
  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'pnpm';
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', `pnpm.cmd ${args.join(' ')}`] : args;
  const result = spawnSync(command, commandArgs, {
    cwd: root, env, encoding: 'utf8', timeout: 60000,
  });
  if (result.error || result.status !== 0) throw new Error(`pnpm ${args.join(' ')} failed; run this command against an isolated database for diagnostics.`);
}

async function snapshot() {
  const models = ['permission', 'role', 'rolePermission', 'user', 'userRole', 'event', 'danceCategory',
    'ageGroup', 'danceFormat', 'studio', 'studioRepresentative', 'studioEventRegistration'];
  const entries = await Promise.all(models.map(async (model) => [model, (await client[model].findMany()).map(JSON.stringify).sort()]));
  return Object.fromEntries(entries);
}

async function login(baseUrl, email) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }), signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200, 'Seeded login must work');
  const body = await response.json();
  assert.equal(typeof body.token, 'string');
  return body.token;
}

async function main() {
  try {
    psql(`CREATE DATABASE ${database};`);
    created = true;
    pnpm('db:migrate');
    client = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
    const migrations = await client.$queryRaw`SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    const { readdirSync } = require('node:fs');
    const expectedCount = readdirSync(path.join(root, 'apps/api/prisma/migrations'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).length;
    assert.equal(migrations[0].count, expectedCount, 'Every migration must be recorded as finished');
    pnpm('seed');
    // Exercise reruns after administrators have changed fixture configuration/state.
    await client.studio.updateMany({ data: { approvalStatus: 'APPROVED' } });
    await client.studioEventRegistration.updateMany({ data: { status: 'LOCKED', canEditDuringReview: true } });
    await client.ageGroup.updateMany({ where: { minAge: 6 }, data: { minAge: 7 } });
    const first = await snapshot();
    // Counts alone would miss credential/status resets or replacements.
    pnpm('seed');
    assert.ok(isDeepStrictEqual(await snapshot(), first), 'Rerunning seed must preserve complete seeded records');
    assert.equal(first.ageGroup.length, 3);
    assert.equal(first.danceFormat.length, 3);
    assert.equal(first.studio.length, 1);
    env.NODE_ENV = 'production';
    try {
      assert.throws(() => pnpm('seed'), /failed/, 'Demonstration seed must refuse production');
    } finally {
      env.NODE_ENV = 'test';
    }
    assert.ok(isDeepStrictEqual(await snapshot(), first), 'Refused production seed must leave data unchanged');
    pnpm('db:migrate');
    assert.ok(isDeepStrictEqual(await snapshot(), first), 'Redeploying migrations must preserve data');

    const listener = net.createServer();
    listener.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    env.PORT = String(listener.address().port);
    await new Promise((resolve) => listener.close(resolve));
    server = spawn(process.execPath, ['dist/index.js'], { cwd: path.join(root, 'apps/api'), env, stdio: 'ignore' });
    const baseUrl = `http://127.0.0.1:${env.PORT}`;
    let healthy = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error('Built API exited before becoming healthy.');
      try {
        const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) { healthy = true; break; }
      } catch { /* Retry while Node starts. */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(healthy, 'Built API must connect to migrated PostgreSQL');
    assert.equal((await fetch(`${baseUrl}/api/v1/events`)).status, 401);
    const token = await login(baseUrl, 'admin@test.com');
    const profile = await fetch(`${baseUrl}/api/v1/auth/profile`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(profile.status, 200);
    assert.equal((await profile.json()).isAdmin, true);
    const judgeToken = await login(baseUrl, 'judge@test.com');
    const forbidden = await fetch(`${baseUrl}/api/v1/events`, {
      method: 'POST', headers: { Authorization: `Bearer ${judgeToken}`, 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(forbidden.status, 403);
    await require('./check-studio-registrations.cjs')({
      client, baseUrl, adminToken: token, login, jwtSecret: env.JWT_SECRET,
    });
    await require('./check-dancers.cjs')({ client, baseUrl, adminToken: token, login });
    await require('./check-performances.cjs')({ client, baseUrl, adminToken: token, login });
    await require('./check-studios.cjs')({ client, baseUrl, adminToken: token, login });
    await require('./check-judges.cjs')({ client, baseUrl, adminToken: token, login });
    await require('./check-events.cjs')({ client, baseUrl, adminToken: token });
    await require('./check-auth.cjs')({ client, baseUrl, login });
    console.log('PASS: empty-database Prisma deployment, full-record seed idempotency, migration redeployment, built API health/login/profile and authorization smoke checks.');
  } finally {
    if (server && server.exitCode === null) {
      const stopped = once(server, 'exit');
      server.kill();
      await stopped;
    }
    if (client) await client.$disconnect();
    if (created) {
      if (!/^dance_baseline_[a-f0-9]{32}$/.test(database)) throw new Error('Invalid test database cleanup target');
      psql(`DROP DATABASE ${database};`);
    }
  }
}

main().catch((error) => {
  // Do not print snapshots, tokens, passwords, or application environment values.
  console.error(error.message);
  process.exitCode = 1;
});
