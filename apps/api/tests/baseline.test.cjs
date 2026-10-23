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
