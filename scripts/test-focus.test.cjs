const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { selection } = require('./test-focus.cjs');

test('focus selects existing tests in each supported layer', () => {
  for (const [area, file] of [ ['api', 'routes.test.cjs'], ['web', 'event-setup.test.tsx'], ['browser', 'event-setup.spec.ts'] ]) {
    assert.equal(selection([area, file]).file, file);
  }
});

test('focus rejects traversal, shell syntax, unknown suites, missing files and extra arguments', () => {
  for (const args of [[], ['unknown', 'routes.test.cjs'], ['api', '../routes.test.cjs'],
    ['api', 'routes.test.cjs&echo'], ['api', 'missing.test.cjs'], ['web', 'routes.test.cjs'],
    ['api', 'routes.test.cjs', '--skip']]) {
    assert.throws(() => selection(args));
  }
});

test('invalid focus invocation exits unsuccessfully before building', () => {
  const result = spawnSync(process.execPath, [require.resolve('./test-focus.cjs'), 'api', '../routes.test.cjs'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
  assert.equal(result.stdout, '');
});
