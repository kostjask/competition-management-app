const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isActionAllowed } = require('../dist/utils/stageChecks.js');
const { PrismaClient, EventStage } = require('@prisma/client');
const { CreateEventBodySchema } = require('@dance/schemas');

test('built API dependencies resolve through Node without TypeScript aliases', () => {
  assert.equal(typeof PrismaClient, 'function');
  assert.equal(EventStage.CANCELLED, 'CANCELLED');
  assert.equal(CreateEventBodySchema.safeParse({ name: 'Fixture', startsAt: '2026-01-02T00:00:00Z', endsAt: '2026-01-01T00:00:00Z' }).success, false);
  assert.equal(typeof require('../dist/controllers/EventsController.js').EventsController, 'function');
});

test('terminal stages never permit registration changes, including review overrides', () => {
  for (const stage of ['FINALIZED', 'ENDED', 'CANCELLED']) {
    for (const action of ['studio.register', 'studio.edit', 'dancer.manage', 'performance.manage']) {
      assert.equal(isActionAllowed(stage, action, true), false, `${stage}: ${action}`);
    }
  }
});

test('review exceptions permit dancer/performance changes only', () => {
  assert.equal(isActionAllowed('DATA_REVIEW', 'dancer.manage'), false);
  assert.equal(isActionAllowed('DATA_REVIEW', 'performance.manage', true), true);
  assert.equal(isActionAllowed('DATA_REVIEW', 'studio.register', true), false);
  assert.equal(isActionAllowed('DATA_REVIEW', 'studio.edit', true), false);
});

test('JWT expiry configuration signs supported durations and rejects invalid values at startup', () => {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  const cwd = path.resolve(__dirname, '..');
  const baseEnv = { ...process.env, NODE_ENV: 'test', DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
    JWT_SECRET: require('node:crypto').randomBytes(32).toString('hex'), EMAIL_FROM: 'config@example.invalid' };
  const code = `const { config } = require('./dist/config/env.js');
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(jwt.sign({ userId: 'fixture' }, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiry }));
    if (!Number.isFinite(decoded.exp)) process.exit(2);`;
  for (const value of ['7d', '1h', '30m', '1.5h', '500ms', '0d', '-1h', 'forever', '7', 'Infinityd']) {
    const result = spawnSync(process.execPath, ['-e', code], { cwd, env: { ...baseEnv, JWT_EXPIRY: value }, encoding: 'utf8' });
    assert.equal(result.status === 0, ['7d', '1h', '30m', '1.5h', '500ms'].includes(value), value);
  }
});
