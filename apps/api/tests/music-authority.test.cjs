const { test } = require('node:test');
const assert = require('node:assert/strict');
const { musicAuthority } = require('../dist/services/music.js');
test('commit-time music authority rechecks eligibility/session and active global-admin provenance', async () => {
  const actor = { id: 'actor', organizer: true, sessionVersion: 4 };
  let eligible = true; let global = true;
  const db = { user: { findFirst: async ({ where }) => { assert.deepEqual(where, { id: 'actor', sessionVersion: 4, active: true, emailVerified: true }); return eligible ? { id: 'actor' } : null; } },
    userRole: { findFirst: async ({ where }) => { assert.deepEqual(where, { userId: 'actor', eventId: null, removedAt: null, role: { key: 'admin' } }); return global ? { id: 'assignment' } : null; } } };
  await musicAuthority(db, actor); global = false; await assert.rejects(musicAuthority(db, actor), error => error.statusCode === 403);
  eligible = false; await assert.rejects(musicAuthority(db, actor), error => error.statusCode === 401);
});
