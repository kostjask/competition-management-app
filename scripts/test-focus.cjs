const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function selection(args) {
  const [area, file] = args;
  const folders = { api: 'apps/api/tests', web: 'apps/web/tests', browser: 'tests/browser' };
  if (args.length !== 2 || !Object.hasOwn(folders, area) ||
      !/^[a-zA-Z0-9-]+\.(test\.cjs|test\.tsx|spec\.ts)$/.test(file || '')) {
    throw new Error('Usage: pnpm test:focus <api|web|browser> <test-file-name>');
  }
  const suffix = { api: '.test.cjs', web: '.test.tsx', browser: '.spec.ts' }[area];
  if (!file.endsWith(suffix) || !existsSync(path.join(root, folders[area], file))) {
    throw new Error('Selected test file does not exist in the requested suite.');
  }
  return { area, file, folder: folders[area] };
}

function pnpm(args, cwd = root) {
  // All arguments are fixed below or validated test basenames; never shell input.
  const windows = process.platform === 'win32';
  const result = spawnSync(windows ? (process.env.ComSpec || 'cmd.exe') : 'pnpm',
    windows ? ['/d', '/s', '/c', `pnpm.cmd ${args.join(' ')}`] : args,
    { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

function main(args) {
  const { area, file, folder } = selection(args);
  // Build only runtime dependencies. API tests import its compiled application.
  pnpm(['exec', 'turbo', 'build', '--filter', area === 'api' ? 'api...' : '@dance/schemas...']);
  if (area === 'browser') {
    pnpm(['exec', 'playwright', 'test', `${folder}/${file}`]);
  } else if (area === 'api') {
    pnpm(['exec', 'node', '--test', `tests/${file}`], path.join(root, 'apps/api'));
  } else {
    pnpm(['exec', 'tsx', '--tsconfig', 'tsconfig.app.json', '--test', `tests/${file}`], path.join(root, 'apps/web'));
  }
}

module.exports = { selection };
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
