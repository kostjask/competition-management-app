const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { exactTotal, competitionRanks } = require('../dist/services/scoringMath');
const { ScoringTemplateInputSchema, ScoringDecimalSchema, ScoringCommandSchema, ScoringCalculationSchema, scoringUnits, safeReturnPath } = require('@dance/schemas');
test('exact normalized weighted panels round once and retain zero/missing distinction', () => {
  const criteria = [{ id: 'a', min: 0, max: 10000, step: 1, weightBps: 6000 }, { id: 'b', min: 0, max: 20000, step: 1, weightBps: 4000 }];
  assert.equal(exactTotal(criteria, [[{ criterionId: 'a', value: 8000 }, { criterionId: 'b', value: 10000 }], [{ criterionId: 'a', value: 8000 }, { criterionId: 'b', value: 12000 }]], 1125), '68.875');
  assert.equal(exactTotal(criteria, [[{ criterionId: 'a', value: 0 }, { criterionId: 'b', value: 0 }]], 0), '0.000');
  assert.throws(() => exactTotal(criteria, [[]], 0));
  assert.throws(() => exactTotal(criteria, [[{ criterionId: 'a', value: 0 }, { criterionId: 'a', value: 0 }]], 0));
  assert.equal(exactTotal([{ id: 'a', min: 0, max: 200000, step: 1, weightBps: 10000 }], [[{ criterionId: 'a', value: 137749 }]], 0), '68.875');
  assert.equal(exactTotal([{ id: 'a', min: 0, max: 200000, step: 1, weightBps: 10000 }], [[{ criterionId: 'a', value: 137748 }]], 0), '68.874');
  assert.equal(exactTotal(criteria, [[{ criterionId: 'a', value: 0 }, { criterionId: 'b', value: 0 }]], 100000), '0.000');
});
test('ties use shared competition ranks and disqualification never gets a rank', () => {
  assert.deepEqual(competitionRanks([{ total: '10.000', disqualified: false }, { total: '20.000', disqualified: false }, { total: '20.000', disqualified: false }, { total: null, disqualified: true }]).map(r => r.rank), [1, 1, 3, null]);
});
test('rubric rejects precision, range, unreachable steps and invalid weights', () => {
  assert.equal(safeReturnPath('/app/admin/events/e/scoring'), '/app/admin/events/e/scoring');
  for (const path of ['/app/admin/events/e/scoring?redirect=https://example.invalid', '//example.invalid/scoring', '/app/admin/events/e/scoring#x']) assert.equal(safeReturnPath(path), '/app');
  for (const value of ['NaN', 'Infinity', '-1', '1e2', '0.0001', '1000.001', '01', '1,5']) assert.equal(ScoringDecimalSchema.safeParse(value).success, false, value);
  assert.equal(scoringUnits('0.001'), 1);
  for (const penalty of ['NaN', '1e2', '-0.1', '0.0001', '100.001']) assert.equal(ScoringCommandSchema.safeParse({ action: 'ADJUST', operationId: randomUUID(), expectedRevision: 0, recordId: randomUUID(), penalty, disqualified: false, reason: 'Fixture' }).success, false);
  for (const total of ['NaN', 'invalid', '100.001', '1.2345', null]) assert.equal(ScoringCalculationSchema.safeParse({ policy: 'normalized-v1', source: 'a'.repeat(64), total, disqualified: false }).success, false);
  const criterion = { id: randomUUID(), label: { et: 'A', en: 'A', ru: 'A' }, instructions: { et: '', en: '', ru: '' }, min: '1', max: '10', step: '0.5', weightBps: 10000 };
  const template = { id: randomUUID(), name: 'Test', criteria: [criterion] };
  assert.equal(ScoringTemplateInputSchema.safeParse(template).success, true);
  for (const change of [{ max: '1' }, { step: '0' }, { step: '2' }, { weightBps: 9999 }, { min: '-1' }]) assert.equal(ScoringTemplateInputSchema.safeParse({ ...template, criteria: [{ ...criterion, ...change }] }).success, false);
});
