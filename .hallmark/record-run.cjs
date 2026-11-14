const { spawnSync } = require('node:child_process');
const entry = {
  scope: 'app', shape: 'app screen', theme: 'cobalt', genre: 'modern-minimal',
  axes: ['decision ledger', 'queue/detail', 'short application', 'ruled facts', 'account-bound mail', 'explicit recovery'],
  hero: 'none', nav: 'existing shared shell', footer: 'none', imagery: 'actual operational data', photos: [],
  entry: 'apps/web/src/pages/applications/application.css',
  fingerprint: 'independent organization/event ledger with retained filtered selection',
  sections: ['review queue', 'decision ledger', 'profile/contact', 'notification state', 'history'],
  signature: 'independent organization/event decision ledger', waived: [],
  prompt: 'P4-REVIEW and P5-APPLICATION owning UI with ET/EN/RU and accessibility',
  sweep: 'static 0 FAIL 0 REFLEX 0 WARN; Playwright captures; subagent 2 findings 2 resolved',
};
const result = spawnSync(process.execPath, ['C:/Users/Kosta SK/.codex/skills/hallmark/scripts/theme.mjs', 'log', '--entry', JSON.stringify(entry)], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
