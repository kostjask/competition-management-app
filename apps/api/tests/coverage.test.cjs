process.env.NODE_ENV = 'test';
process.env.DEV_AUTH = 'false';
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
process.env.EMAIL_FROM = 'coverage@example.invalid';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
test('Phase 1 coverage inventory matches every mounted resource method/path and names evidence', () => {
  const { operations } = require('../../../docs/api-coverage.json');
  const actual = [];
  for (const router of new Set(operations.map(row => row.router))) {
    const sample = operations.find(row => row.router === router);
    const factory = require('../dist/routes/' + router + '.js')[sample.exportName];
    for (const layer of factory({}, (_req, _res, next) => next()).stack) if (layer.route) for (const method of Object.keys(layer.route.methods)) actual.push(router + ':' + method.toUpperCase() + ':' + layer.route.path);
  }
  assert.deepEqual(actual.sort(), operations.map(row => row.router + ':' + row.method + ':' + row.path).sort());
  const tests = fs.readFileSync(path.join(__dirname, 'routes.test.cjs'), 'utf8');
  for (const operation of operations) for (const [dimension, evidence] of Object.entries(operation.tests)) {
    assert.ok(evidence.startsWith('N/A:') || tests.includes(evidence), operation.router + ' ' + operation.method + ' ' + operation.path + ': missing ' + dimension + ' evidence');
  }
  const composition = fs.readFileSync(path.join(__dirname, '../src/routes/api.ts'), 'utf8');
  for (const name of Object.values(require('../dist/routes/api.js'))) assert.equal(typeof name, 'function');
  for (const operation of operations) assert.ok(composition.includes(operation.exportName + '(prisma'), 'Router must remain mounted');
});
