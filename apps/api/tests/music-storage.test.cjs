const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
test('music provider refuses relative/public paths and verifies an explicit private writable volume', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'music-provider-'));
  t.after(async () => { await fs.rmdir(root); });
  const env = { ...process.env, DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused', NODE_ENV: 'test', DEV_AUTH: 'false', EMAIL_FROM: 'provider@example.invalid', JWT_SECRET: 'provider-fixture-with-32-characters' };
  const script = "require('./dist/services/musicStorage.js').initializeMusicStorage().catch(() => { process.exitCode = 7; })";
  for (const [configured, code] of [['relative-music', 7], [path.resolve(__dirname, '../uploads/music'), 7], [path.resolve(__dirname, '../../web/dist/music'), 7], [root, 0]]) {
    const result = spawnSync(process.execPath, ['-e', script], { cwd: path.resolve(__dirname, '..'), env: { ...env, MUSIC_STORAGE_PATH: configured }, encoding: 'utf8' });
    assert.equal(result.status, code, 'Explicit private provider startup validation');
  }
  assert.deepEqual(await fs.readdir(root), [], 'Startup probe removes only its own temporary object');
});
