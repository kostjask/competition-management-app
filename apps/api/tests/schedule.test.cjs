const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { scheduleConflicts } = require('../dist/services/schedule.js');
const { ScheduleCommandSchema, SchedulePreviewBodySchema, safeReturnPath } = require('@dance/schemas');

test('schedule intervals enforce rest across stages, stage overlap and exact rest boundary', () => {
  const a = randomUUID(), b = randomUUID();
  const data = { event: { startsAt: new Date('2026-12-05T08:00:00Z'), endsAt: new Date('2026-12-05T18:00:00Z') },
    sessions: [a, b].map((id, i) => ({ id, stageId: `stage-${i}`, startsAt: new Date('2026-12-05T10:00:00Z'), bufferSec: 0, restSec: 120, state: 'PAUSED', slots: [] })),
    entries: ['p', 'q'].map(id => ({ id, title: id, studioName: 'Studio', revision: 1, durationSec: 60, legacyOrder: null, eligible: true, dancers: ['same-dancer'] })) };
  const queues = [{ sessionId: a, performanceIds: ['p'] }, { sessionId: b, performanceIds: ['q'] }];
  assert.deepEqual(scheduleConflicts(data, queues).conflicts.map(c => c.kind), ['DANCER']);
  data.sessions[1].startsAt = new Date('2026-12-05T10:03:00Z');
  assert.equal(scheduleConflicts(data, queues).conflicts.length, 0, 'Exact minimum rest is allowed');
  data.sessions[1].startsAt = new Date('2026-12-05T10:02:59.999Z');
  assert.equal(scheduleConflicts(data, queues).conflicts[0].kind, 'DANCER');
  data.entries[1].dancers = []; data.sessions[1].stageId = data.sessions[0].stageId; data.sessions[1].startsAt = data.sessions[0].startsAt;
  assert.equal(scheduleConflicts(data, queues).conflicts[0].kind, 'STAGE');
  data.sessions[1].startsAt = new Date('2026-12-06T10:00:00Z');
  assert.equal(scheduleConflicts(data, queues).conflicts[0].kind, 'WINDOW');
  assert.throws(() => scheduleConflicts(data, [queues[0], queues[0]]));
  const duplicates = scheduleConflicts(data, [{ sessionId: a, performanceIds: ['p', 'p'] }, { sessionId: b, performanceIds: [] }]);
  assert.ok(duplicates.conflicts.some(c => c.kind === 'ENTRY'));
});

test('running queues and started slot prefixes cannot be changed by schedule edits', () => {
  const id = randomUUID(); const slot = { id: randomUUID(), performanceId: 'p', position: 1, state: 'CURRENT', reason: null };
  const data = { event: { startsAt: new Date(0), endsAt: new Date(1000000) }, sessions: [{ id, stageId: 's', startsAt: new Date(0), bufferSec: 0, restSec: 0, state: 'RUNNING', slots: [slot] }], entries: [{ id: 'p', eligible: true, durationSec: 60, dancers: [] }] };
  assert.ok(scheduleConflicts(data, [{ sessionId: id, performanceIds: [] }]).conflicts.some(c => c.kind === 'LOCKED'));
  data.sessions[0].state = 'PAUSED';
  assert.ok(scheduleConflicts(data, [{ sessionId: id, performanceIds: [] }]).conflicts.some(c => c.kind === 'LOCKED'));
});

test('schedule command contracts refuse unknown input, ambiguous dates and missing exception reasons', () => {
  const base = { expectedRevision: 0, operationId: randomUUID(), action: 'CREATE_SESSION', id: randomUUID(), stageId: randomUUID(), name: 'Session', startsAt: '2026-12-05T10:00:00+02:00', bufferSec: 30, restSec: 120, moderatorId: null };
  assert.equal(ScheduleCommandSchema.safeParse(base).success, true);
  for (const change of [{ startsAt: '2026-12-05T10:00:00' }, { bufferSec: -1 }, { restSec: 0.5 }, { unexpected: true }]) assert.equal(ScheduleCommandSchema.safeParse({ ...base, ...change }).success, false);
  assert.equal(ScheduleCommandSchema.safeParse({ action: 'SKIP', expectedRevision: 1, operationId: randomUUID(), sessionId: randomUUID(), expectedSlotId: null, reason: ' ' }).success, false);
  assert.equal(SchedulePreviewBodySchema.safeParse({ expectedRevision: -1, queues: [] }).success, false);
  const path = `/app/admin/events/e/schedule?session=${randomUUID()}`;
  assert.equal(safeReturnPath(path), path);
  assert.equal(safeReturnPath(path + '&returnTo=https://example.invalid'), '/app');
});
