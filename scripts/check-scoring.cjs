const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

// Only called by the baseline in its verified random disposable database.
module.exports = async function checkScoring({ client, baseUrl, adminToken, login }) {
  const admin = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const event = await client.event.create({ data: { name: 'Exact scoring fixture', startsAt: new Date('2026-12-05T08:00:00Z'), endsAt: new Date('2026-12-05T18:00:00Z'), stage: 'REGISTRATION_OPEN',
    categories: { create: [{ name: 'Open' }, { name: 'Novice' }] }, ageGroups: { create: { name: 'All', minAge: 0 } }, formats: { create: { name: 'Solo', minParticipants: 1, maxParticipants: 1, maxDurationSeconds: 300 } } }, include: { categories: true, ageGroups: true, formats: true } });
  const open = event.categories.find(category => category.name === 'Open');
  const other = await client.event.create({ data: { name: 'Other scoring event', startsAt: event.startsAt, endsAt: event.endsAt } });
  const judges = [];
  for (let i = 0; i < 2; i++) {
    const user = await client.user.create({ data: { email: `scoring-${i}@example.invalid`, name: `Synthetic judge ${i}`, emailVerified: true, password: admin.password } });
    const role = await client.role.findUniqueOrThrow({ where: { key: 'judge' } });
    const assignment = await client.userRole.create({ data: { userId: user.id, roleId: role.id, eventId: event.id } });
    const judge = await client.judge.create({ data: { eventId: event.id, userId: user.id, name: user.name } });
    judges.push({ ...judge, assignment, token: await login(baseUrl, user.email) });
  }
  const moderator = await client.user.create({ data: { email: 'scoring-moderator@example.invalid', name: 'Scoring moderator', emailVerified: true, password: admin.password } });
  const moderatorRole = await client.role.findUniqueOrThrow({ where: { key: 'moderator' } });
  const moderatorAssignment = await client.userRole.create({ data: { userId: moderator.id, roleId: moderatorRole.id, eventId: event.id } });
  const modToken = await login(baseUrl, moderator.email);
  const req = async (url, method = 'GET', body, token = adminToken) => { const r = await fetch(`${baseUrl}/api/v1${url}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body !== undefined && { body: JSON.stringify(body) }) }); return { status: r.status, body: await r.json(), cacheControl: r.headers.get('cache-control') }; };
  const prefix = `/events/${event.id}`, url = prefix + '/scoring';
  const resultPath = prefix + '/results';
  const results = async (query = {}) => {
    const response = await req(resultPath + '?' + new URLSearchParams(query));
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.cacheControl, 'no-store');
    return response.body;
  };
  const resultCommand = body => req(resultPath + '/commands', 'POST', body);
  const resultBody = (current, action = 'CALCULATE') => ({
    action, expectedRevision: current.revisions[0]?.revision ?? 0, source: current.current.source, operationId: randomUUID(),
  });
  const read = async (token = adminToken) => { const r = await req(url, 'GET', undefined, token); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body; };
  const judgeRead = (token, operationId) => req(url + '/judge' + (operationId ? '?operationId=' + operationId : ''), 'GET', undefined, token);
  const moderatorRead = (token, query = {}) => req(prefix + '/schedule/live?' + new URLSearchParams(query), 'GET', undefined, token);
  const command = async (body, token = adminToken) => req(url + '/commands', 'POST', { operationId: randomUUID(), expectedRevision: (await read()).revision, ...body }, token);
  const preview = async setup => { const r = await req(url + '/preview', 'POST', { expectedRevision: (await read()).revision, setup }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body; };
  const config = async setup => { const p = await preview(setup); const body = { action: 'CONFIGURE', setup, previewToken: p.previewToken, expectedRevision: p.revision, operationId: randomUUID() }; return { result: await req(url + '/commands', 'POST', body), body }; };
  const stageId = randomUUID(), sessionId = randomUUID(), otherSession = randomUUID();
  await client.competitionStage.create({ data: { id: stageId, eventId: event.id, name: 'Stage' } });
  await client.competitionSession.create({ data: { id: sessionId, eventId: event.id, stageId, name: 'Session', startsAt: new Date('2026-12-05T09:00:00Z'), moderatorId: moderator.id } });
  await client.competitionSession.create({ data: { id: otherSession, eventId: event.id, stageId, name: 'Private session', startsAt: new Date('2026-12-05T10:00:00Z') } });
  assert.equal((await req(prefix + '/entry-configuration', 'PUT', { expectedRevision: 0, settings: { basic: { enabled: false, deadline: null }, final: { enabled: true, deadline: null }, allowYounger: true, olderPercent: 100, requireTeacher: false, requireAuthor: false, nominations: [] } })).status, 200);
  const studio = await client.studio.create({ data: { eventId: event.id, name: 'Exact scoring studio', approvalStatus: 'APPROVED', registrations: { create: { eventId: event.id, status: 'APPROVED' } }, dancers: { create: { firstName: 'Private', lastName: 'Dancer', birthDate: new Date('2010-01-01') } } }, include: { dancers: true } });
  const performances = [];
  for (const title of ['First score', 'Second score']) {
    const created = await req(prefix + '/performances', 'POST', { studioId: studio.id, title, durationSec: 60, categoryId: open.id, ageGroupId: event.ageGroups[0].id, formatId: event.formats[0].id, dancerIds: [studio.dancers[0].id] });
    assert.equal(created.status, 201, JSON.stringify(created.body)); performances.push(created.body.id);
    await client.scheduleSlot.create({ data: { eventId: event.id, sessionId, performanceId: created.body.id, position: performances.length } });
  }
  const review = (await req(prefix + `/studios/${studio.id}/entry-review`)).body.checkpoints.find(c => c.kind === 'FINAL');
  assert.equal((await req(prefix + `/studios/${studio.id}/entry-review/FINAL`, 'POST', { action: 'SUBMIT', operationId: randomUUID(), expectedRevision: review.revision, expectedReview: review.reviewToken })).status, 200);
  await client.event.update({ where: { id: event.id }, data: { stage: 'DATA_REVIEW' } });
  const templateId = randomUUID(), criterionId = randomUUID();
  const setup = { templates: [{ id: templateId, name: 'Synthetic exact rubric', criteria: [{ id: criterionId, label: { et: 'Tehnika', en: 'Technique', ru: 'Техника' }, instructions: { et: '', en: '', ru: '' }, min: '0', max: '10', step: '0.001', weightBps: 10000 }] }], bindings: [{ categoryId: open.id, templateId }], panels: [{ sessionId, judgeIds: judges.map(j => j.id) }] };
  assert.equal((await req(url + '/preview', 'POST', { expectedRevision: 0, setup, extra: true })).status, 400);
  assert.equal((await req(url + '/preview', 'POST', { expectedRevision: 0, setup }, judges[0].token)).status, 403);
  assert.equal((await req(`/events/${other.id}/scoring`, 'GET', undefined, judges[0].token)).status, 403);
  const wrong = structuredClone(setup); wrong.bindings[0].categoryId = 'foreign'; assert.equal((await req(url + '/preview', 'POST', { expectedRevision: 0, setup: wrong })).status, 404);
  assert.equal((await read()).blockers.some(b => b.kind === 'PANEL'), true);
  const configured = await config(setup);
  assert.equal(configured.result.status, 200, JSON.stringify(configured.result.body));
  assert.equal((await req(url + '/commands', 'POST', configured.body)).body.revision, 1);
  assert.equal((await req(url + '/commands', 'POST', { ...configured.body, setup: { ...setup, bindings: [] } })).status, 409);
  const canonical = (await read()).setup;
  const stale = await preview(canonical); await client.userRole.update({ where: { id: judges[1].assignment.id }, data: { removedAt: new Date() } });
  assert.equal((await read()).judges.find(j => j.id === judges[1].id).eligible, false, 'Unavailable assigned judges remain inspectable for panel repair');
  assert.equal((await command({ action: 'CONFIGURE', setup: canonical, previewToken: stale.previewToken })).status, 403);
  await client.userRole.update({ where: { id: judges[1].assignment.id }, data: { removedAt: null } });
  const current = await preview(canonical);
  const races = await Promise.all([1, 2].map(() => req(url + '/commands', 'POST', { action: 'CONFIGURE', setup: canonical, previewToken: current.previewToken, expectedRevision: current.revision, operationId: randomUUID() })));
  assert.deepEqual(races.map(r => r.status).sort(), [200, 409]);
  await assert.rejects(client.scoringTemplate.update({ where: { id: templateId }, data: { name: 'mutated' } }));
  await assert.rejects(client.scoringCriterion.update({ where: { id: criterionId }, data: { max: 20000 } }));
  await assert.rejects(client.scoringPanel.create({ data: { sessionId, eventId: other.id, judgeId: judges[0].id } }));
  const stage = async next => { const e = await client.event.findUniqueOrThrow({ where: { id: event.id } }); return req(prefix, 'PATCH', { expectedRevision: e.revision, expectedStage: e.stage, stage: next }); };
  assert.equal((await stage('SCHEDULED')).status, 200);
  await client.studio.update({ where: { id: studio.id }, data: { approvalStatus: 'REJECTED' } });
  assert.equal((await stage('LIVE')).status, 409, 'Live entry rechecks current source eligibility, not only rubric readiness');
  await client.studio.update({ where: { id: studio.id }, data: { approvalStatus: 'APPROVED' } });
  assert.equal((await stage('LIVE')).status, 200);
  assert.equal((await judgeRead(adminToken)).status, 403);
  assert.equal((await judgeRead(modToken)).status, 403);
  assert.equal((await judgeRead(judges[0].token, 'invalid')).status, 400);
  assert.equal((await req(url + '/judge?operationId=' + randomUUID() + '&operationId=' + randomUUID(), 'GET', undefined, judges[0].token)).status, 400);
  assert.equal((await req(`/events/${other.id}/scoring/judge`, 'GET', undefined, judges[0].token)).status, 403);
  assert.deepEqual((await judgeRead(judges[0].token)).body.sheets, []);
  assert.equal((await moderatorRead(judges[0].token)).status, 403);
  assert.equal((await req(`/events/${other.id}/schedule/live`, 'GET', undefined, modToken)).status, 403);
  assert.equal((await moderatorRead(modToken, { sessionId: otherSession })).status, 403);
  assert.equal((await moderatorRead(modToken, { sessionId: 'invalid' })).status, 400);
  assert.equal((await moderatorRead(modToken, { operationId: 'invalid' })).status, 400);
  assert.equal((await req(prefix + '/schedule/live?sessionId=' + sessionId + '&sessionId=' + sessionId, 'GET', undefined, modToken)).status, 400);
  const assigned = await moderatorRead(modToken, { sessionId });
  assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
  assert.equal(assigned.cacheControl, 'no-store');
  assert.deepEqual(assigned.body.sessions.map(s => s.id), [sessionId]);
  assert.equal(assigned.body.session.current, null);
  assert.equal(assigned.body.session.next.title, 'First score');
  assert.equal(assigned.body.scoringReady, true);
  const schedule = async (action, token = adminToken, reason) => { const s = (await req(prefix + '/schedule')).body; const session = s.sessions.find(s => s.id === sessionId); return req(prefix + '/schedule/commands', 'POST', { action, operationId: randomUUID(), expectedRevision: s.revision, sessionId, expectedSlotId: session.slots.find(s => s.state === 'CURRENT')?.id ?? null, ...(reason && { reason }) }, token); };
  const started = await schedule('START', modToken);
  assert.equal(started.status, 200, JSON.stringify(started.body));
  const startQuery = { sessionId, operationId: started.body.operationId };
  const running = (await moderatorRead(modToken, startQuery)).body;
  assert.equal(running.session.current.title, 'First score');
  assert.equal(running.session.next.title, 'Second score');
  assert.deepEqual(running.session.current.completion, { required: 2, locked: 0, unavailable: 0 });
  assert.deepEqual(running.session.correctionSheets, []);
  assert.deepEqual(running.acknowledgement, { kind: 'schedule', action: 'START', operationId: started.body.operationId,
    sessionId, expectedSlotId: null, revision: started.body.revision, createdAt: running.acknowledgement.createdAt });
  assert.equal((await moderatorRead(adminToken, startQuery)).body.acknowledgement, null, 'Receipt lookup is actor-bound even for admins');
  await client.competitionSession.update({ where: { id: otherSession }, data: { moderatorId: moderator.id } });
  assert.equal((await moderatorRead(modToken, { ...startQuery, sessionId: otherSession })).body.acknowledgement, null);
  await client.competitionSession.update({ where: { id: sessionId }, data: { moderatorId: null } });
  assert.equal((await moderatorRead(modToken, startQuery)).status, 403, 'Reassignment prevents historical receipt lookup');
  await client.competitionSession.update({ where: { id: sessionId }, data: { moderatorId: moderator.id } });
  await client.userRole.update({ where: { id: moderatorAssignment.id }, data: { removedAt: new Date() } });
  assert.equal((await moderatorRead(modToken, startQuery)).status, 403, 'Offboarding prevents historical receipt lookup');
  await client.userRole.update({ where: { id: moderatorAssignment.id }, data: { removedAt: null } });
  assert.equal((await read()).sheets.length, 2);
  const own = (await read(judges[0].token)).sheets[0]; assert.equal((await read(judges[0].token)).sheets.length, 1); assert.equal((await read(modToken)).sheets.length, 0);
  const liveView = await judgeRead(judges[0].token);
  assert.equal(liveView.status, 200); assert.equal(liveView.cacheControl, 'no-store');
  assert.deepEqual(liveView.body.sheets.map(s => s.id), [own.id]);
  assert.equal(liveView.body.sheets[0].writable, true); assert.equal(liveView.body.sheets[0].current, true);
  assert.equal(liveView.body.sheets[0].rubric.criteria[0].id, criterionId);
  assert.equal(liveView.body.sheets[0].stageName, 'Stage');
  assert.equal(JSON.stringify(await read(judges[0].token)).includes('Private'), false);
  const submit = async (judge, value, overrides = {}) => { const s = (await read(judge.token)).sheets.find(s => s.performanceId === performances[0]); return command({ action: 'SUBMIT', sheetId: s.id, expectedRevision: s.revision, values: [{ criterionId, value, comment: null }], ...overrides }, judge.token); };
  assert.equal((await command({ action: 'DRAFT', sheetId: own.id, expectedRevision: own.revision, values: [] }, judges[1].token)).status, 403);
  assert.equal((await submit(judges[0], '1.0001')).status, 400);
  assert.equal((await submit(judges[0], '11')).status, 409);
  assert.equal((await submit(judges[0], '5', { values: [] })).status, 409);
  assert.equal((await submit(judges[0], '5', { values: [{ criterionId: randomUUID(), value: '5', comment: null }] })).status, 409);
  const drafts = await Promise.all([1, 2].map(() => req(url + '/commands', 'POST', { action: 'DRAFT', sheetId: own.id, expectedRevision: own.revision, values: [], operationId: randomUUID() }, judges[0].token)));
  assert.deepEqual(drafts.map(r => r.status).sort(), [200, 409]);
  const currentOwn = (await read(judges[0].token)).sheets.find(s => s.id === own.id); assert.deepEqual(currentOwn.values, []);
  const firstBody = { operationId: randomUUID(), action: 'SUBMIT', sheetId: own.id, expectedRevision: currentOwn.revision, values: [{ criterionId, value: '0', comment: null }] };
  const adminRole = await client.role.findUniqueOrThrow({ where: { key: 'admin' } });
  const extraAdmin = await client.userRole.create({ data: { userId: judges[0].userId, roleId: adminRole.id } });
  const submitted = await req(url + '/commands', 'POST', firstBody, judges[0].token); assert.equal(submitted.status, 200);
  assert.equal(submitted.body.workspace.sheets.length, 1, 'A judge-write receipt never includes administrative peer data');
  const submittedView = (await judgeRead(judges[0].token, firstBody.operationId)).body;
  assert.deepEqual(submittedView.sheets.map(s => s.id), [own.id], 'An admin who judges reads only their own score sheet here');
  assert.equal(submittedView.sheets[0].writable, false); assert.equal(submittedView.sheets[0].values[0].value, '0.000');
  assert.equal(submittedView.acknowledgement.revision, currentOwn.revision + 1);
  assert.equal(submittedView.acknowledgement.action, 'SUBMIT');
  assert.equal((await judgeRead(judges[1].token, firstBody.operationId)).body.acknowledgement, null);
  await client.userRole.update({ where: { id: extraAdmin.id }, data: { removedAt: new Date() } });
  const replayed = await req(url + '/commands', 'POST', firstBody, judges[0].token); assert.equal(replayed.status, 200); assert.equal(replayed.body.workspace.sheets.length, 1);
  await client.userRole.update({ where: { id: judges[0].assignment.id }, data: { removedAt: new Date() } });
  assert.equal((await req(url + '/commands', 'POST', firstBody, judges[0].token)).status, 403);
  assert.equal((await judgeRead(judges[0].token, firstBody.operationId)).status, 403);
  await client.userRole.update({ where: { id: judges[0].assignment.id }, data: { removedAt: null } });
  assert.equal((await submit(judges[0], '5')).status, 403);
  await assert.rejects(client.scoringValue.update({ where: { sheetId_criterionId: { sheetId: own.id, criterionId } }, data: { value: 5000 } }));
  const peerDraft = (await read(judges[1].token)).sheets[0];
  await client.userRole.update({ where: { id: judges[1].assignment.id }, data: { removedAt: new Date() } });
  const blocked = (await moderatorRead(modToken, { sessionId })).body;
  assert.equal(blocked.scoringReady, false);
  assert.deepEqual(blocked.session.current.completion, { required: 2, locked: 1, unavailable: 1 });
  assert.equal(JSON.stringify(blocked).includes('Synthetic judge'), false);
  assert.equal(JSON.stringify(blocked).includes('values'), false);
  await client.userRole.update({ where: { id: judges[1].assignment.id }, data: { removedAt: null } });
  await assert.rejects(client.scoringValue.update({ where: { sheetId_criterionId: { sheetId: own.id, criterionId } }, data: { sheetId: peerDraft.id } }), 'Locked values cannot be moved into another draft sheet');
  assert.equal((await schedule('ADVANCE', modToken)).status, 409);
  assert.equal((await submit(judges[1], '10')).status, 200);
  const recordId = (await read()).completion[0].recordId;
  const calculated = await command({ action: 'CALCULATE', recordId }); assert.equal(calculated.status, 200); assert.equal(calculated.body.calculation.total, '50.000');
  assert.equal((await schedule('PAUSE', modToken)).status, 200);
  assert.equal((await command({ action: 'ADJUST', recordId, penalty: '1.125', disqualified: false, reason: 'Synthetic timing deduction' })).status, 200);
  assert.equal((await command({ action: 'CALCULATE', recordId })).body.calculation.total, '48.875');
  const locked = (await read()).sheets.find(s => s.id === own.id);
  const correction = { action: 'REOPEN', sheetId: own.id, expectedRevision: locked.revision, reason: 'Synthetic correction', operationId: randomUUID() };
  assert.equal((await command(correction, modToken)).status, 403);
  assert.equal((await command(correction)).status, 200);
  const correctionView = (await moderatorRead(adminToken, { sessionId, operationId: correction.operationId })).body;
  assert.equal(correctionView.acknowledgement.kind, 'sheet');
  assert.equal(correctionView.acknowledgement.sheetId, own.id);
  assert.equal(correctionView.acknowledgement.revision, locked.revision + 1);
  assert.deepEqual(correctionView.session.current.completion, { required: 2, locked: 1, unavailable: 0 });
  assert.equal(correctionView.session.correctionSheets.find(sheet => sheet.id === own.id).state, 'DRAFT');
  assert.equal(JSON.stringify(correctionView).includes('values'), false);
  assert.equal((await moderatorRead(modToken, { sessionId, operationId: correction.operationId })).body.acknowledgement, null);
  assert.equal((await command({ action: 'CALCULATE', recordId })).status, 409);
  assert.equal((await submit(judges[0], '2')).status, 200);
  assert.equal(await client.scoringCalculation.count({ where: { recordId } }), 2, 'Prior calculations survive correction');
  const calculations = await client.scoringCalculation.findMany({ where: { recordId } });
  const { exactTotal } = require('../apps/api/dist/services/scoringMath');
  for (const calculation of calculations) assert.equal(exactTotal(calculation.inputs.criteria, calculation.inputs.sheets.map(s => s.values), calculation.inputs.penalty), calculation.result.total, 'Retained inputs reproduce prior totals after correction');
  const adjustment = await client.scoringOperation.findFirstOrThrow({ where: { eventId: event.id, action: 'ADJUST' } });
  assert.equal(adjustment.request.penalty, '1.125');
  assert.equal((await schedule('START', modToken)).status, 200);
  assert.equal((await schedule('ADVANCE', modToken)).status, 200);
  const advancedView = (await judgeRead(judges[0].token, firstBody.operationId)).body;
  assert.equal(advancedView.acknowledgement.revision, firstBody.expectedRevision + 1, 'Receipt lookup follows the original sheet after the queue advances');
  assert.equal(advancedView.sheets.find(s => s.id === own.id).current, false);
  assert.equal(advancedView.sheets.find(s => s.performanceId === performances[1]).writable, true);
  assert.equal((await schedule('ADVANCE_OVERRIDE', modToken, 'Denied override')).status, 403);
  assert.equal((await schedule('ADVANCE_OVERRIDE', adminToken, 'Synthetic manual continuation')).status, 200);
  const incomplete = await results();
  assert.ok(incomplete.current.snapshot.blockers.some(b => b.kind === 'SHEETS' && b.performanceId === performances[1]));
  assert.ok(incomplete.current.snapshot.groups[0].entries.every(entry => entry.rank === null), 'Incomplete group ranks are withheld');
  assert.equal((await resultCommand(resultBody(incomplete))).status, 409, 'Override never makes missing sheets complete');
  assert.equal((await schedule('REOPEN', adminToken, 'Resolve the manual override')).status, 200);
  for (const judge of judges) {
    const pending = (await read(judge.token)).sheets.find(s => s.performanceId === performances[1]);
    assert.equal((await command({ action: 'REOPEN', sheetId: pending.id, expectedRevision: pending.revision, reason: 'Complete the missing sheet after manual continuation' })).status, 200);
    const view = (await judgeRead(judge.token)).body.sheets.find(s => s.id === pending.id);
    assert.equal(view.current, false); assert.equal(view.writable, true);
    assert.equal(view.reopenReason, 'Complete the missing sheet after manual continuation');
    assert.equal((await command({ action: 'SUBMIT', sheetId: pending.id, expectedRevision: pending.revision + 1, values: [{ criterionId, value: '5', comment: null }] }, judge.token)).status, 200);
  }
  const receipt = await client.scoringOperation.findFirstOrThrow({ where: { eventId: event.id } });
  await assert.rejects(client.scoringOperation.delete({ where: { operationId: receipt.operationId } }));
  const version = await client.scoringSheetVersion.findFirstOrThrow({ where: { sheetId: own.id } });
  await assert.rejects(client.scoringSheetVersion.update({ where: { id: version.id }, data: { reason: 'rewrite' } }));
  await client.$executeRawUnsafe(`CREATE FUNCTION fail_scoring_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'SCORING_CHANGED' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe('CREATE TRIGGER fail_scoring_fixture BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION fail_scoring_fixture()');
  const before = (await read()).revision, operationId = randomUUID();
  try { assert.equal((await command({ action: 'CALCULATE', recordId, operationId })).status, 500); }
  finally { await client.$executeRawUnsafe('DROP TRIGGER fail_scoring_fixture ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION fail_scoring_fixture()'); }
  assert.equal((await read()).revision, before); assert.equal(await client.scoringOperation.count({ where: { operationId } }), 0);
  assert.equal((await stage('FINALIZED')).status, 409, 'Generic event editing cannot bypass revision finalization');
  const novice = event.categories.find(category => category.name === 'Novice');
  const seedEntry = await client.performance.findUniqueOrThrow({ where: { id: performances[0] } });
  async function resultFixture(title, position, options = {}) {
    const { categoryId = seedEntry.categoryId, state = 'DONE', withdrawn = false, disqualified = false, values = [0, 0] } = options;
    const entry = await client.performance.create({ data: {
      title, eventId: event.id, studioId: studio.id, registrationId: seedEntry.registrationId, categoryId, ageGroupId: seedEntry.ageGroupId,
      formatId: seedEntry.formatId, durationSec: 60, deletedAt: withdrawn ? new Date() : null, deletedBy: withdrawn ? admin.id : null,
    } });
    await client.scheduleSlot.create({ data: {
      eventId: event.id, sessionId: otherSession, performanceId: entry.id, position: state === 'REMOVED' ? null : position,
      state, reason: state === 'SKIPPED' ? 'Synthetic skip' : null,
    } });
    if (state !== 'DONE') return entry;
    const record = await client.scoringRecord.create({ data: {
      eventId: event.id, performanceId: entry.id, sessionId: otherSession, templateId, disqualified, reason: disqualified ? 'Fixture decision' : null,
    } });
    for (const [index, judge] of judges.entries()) {
      const sheet = await client.scoringSheet.create({ data: { eventId: event.id, recordId: record.id, templateId, judgeId: judge.id } });
      await client.scoringValue.create({ data: { sheetId: sheet.id, templateId, criterionId, value: values[index], comment: 'Private worksheet comment' } });
      await client.scoringSheet.update({ where: { id: sheet.id }, data: { state: 'LOCKED', submittedAt: new Date() } });
    }
    return entry;
  }
  await resultFixture('Tied score', 1, { values: [5887, 5888] });
  await resultFixture('Zero score', 2);
  await resultFixture('Disqualified score', 3, { disqualified: true });
  const withdrawn = await resultFixture('Withdrawn score', 4, { state: 'CURRENT' });
  await resultFixture('Removed score', 5, { state: 'REMOVED' });
  await resultFixture('Independent group', 5, { categoryId: novice.id, values: [10000, 10000] });
  const queueItem = { eventId_performanceId: { eventId: event.id, performanceId: withdrawn.id } };
  await client.scheduleSlot.update({ where: queueItem, data: { state: 'SKIPPED', reason: 'Synthetic skip' } });
  const skipped = await results();
  assert.ok(skipped.current.snapshot.blockers.some(b => b.kind === 'QUEUE' && b.performanceId === withdrawn.id), 'A skip does not constitute a withdrawal');
  assert.equal((await req(prefix + '/performances/' + withdrawn.id, 'DELETE', {
    action: 'WITHDRAW', expectedRevision: withdrawn.revision, operationId: randomUUID(), reason: 'Synthetic withdrawal',
  })).status, 200);
  await client.scheduleSlot.update({ where: queueItem, data: { state: 'CURRENT', reason: null } });
  const onStage = await results();
  assert.ok(onStage.current.snapshot.blockers.some(b => b.kind === 'QUEUE' && b.performanceId === withdrawn.id), 'Withdrawal cannot finalize a performance still marked current');
  await client.scheduleSlot.update({ where: queueItem, data: { state: 'SKIPPED', reason: 'Clear current withdrawn slot' } });

  const ready = await results();
  assert.deepEqual(ready.current.snapshot.blockers, []);
  const groups = ready.current.snapshot.groups;
  const rows = groups.find(g => g.category.name === 'Open').entries;
  const golden = Object.fromEntries(rows.map(row => [row.title, [row.state, row.total, row.rank]]));
  assert.deepEqual(golden, {
    'First score': ['RANKABLE', '58.875', 1], 'Tied score': ['RANKABLE', '58.875', 1],
    'Second score': ['RANKABLE', '50.000', 3], 'Zero score': ['RANKABLE', '0.000', 4],
    'Disqualified score': ['DISQUALIFIED', null, null], 'Withdrawn score': ['WITHDRAWN', null, null],
  });
  assert.deepEqual(groups.find(g => g.category.name === 'Novice').entries.map(row => [row.total, row.rank]), [['100.000', 1]]);
  assert.doesNotMatch(JSON.stringify(ready), /Private worksheet comment|Synthetic judge|Private Dancer|Fixture decision/);
  assert.equal((await req(resultPath, 'GET', undefined, judges[0].token)).status, 403);
  assert.equal((await req(resultPath, 'GET', undefined, modToken)).status, 403);
  assert.equal((await req(resultPath + '?revision=1&revision=2')).status, 400);
  assert.equal((await req(resultPath + '?revision=999')).status, 404);
  assert.equal((await resultCommand({ ...resultBody(ready), unpublished: true })).status, 400);
  assert.equal((await resultCommand(resultBody(ready, 'FINALIZE'))).status, 409, 'Finalization requires a saved revision');

  const calculate = resultBody(ready);
  const resultsRace = await Promise.all([calculate, { ...calculate, operationId: randomUUID() }].map(resultCommand));
  assert.deepEqual(resultsRace.map(r => r.status).sort(), [200, 409]);
  const acknowledged = resultsRace.find(r => r.status === 200).body;
  const winning = { ...calculate, operationId: acknowledged.operationId };
  assert.deepEqual((await resultCommand(winning)).body, acknowledged);
  assert.equal((await req(`/events/${other.id}/results?operationId=${winning.operationId}`)).body.receipt, null);
  assert.equal((await req(`/events/${other.id}/results/commands`, 'POST', winning)).status, 409);
  assert.equal((await req(resultPath + '/commands', 'POST', winning, modToken)).status, 403);
  await client.userRole.update({ where: { id: extraAdmin.id }, data: { removedAt: null } });
  assert.equal((await req(resultPath + '?operationId=' + winning.operationId, 'GET', undefined, judges[0].token)).body.receipt, null);
  assert.equal((await req(resultPath + '/commands', 'POST', winning, judges[0].token)).status, 409);
  await client.userRole.update({ where: { id: extraAdmin.id }, data: { removedAt: new Date() } });
  assert.deepEqual((await results({ operationId: winning.operationId })).receipt, acknowledged);

  const saved = await results();
  assert.equal(saved.stage, 'LIVE');
  assert.deepEqual(saved.saved.snapshot, ready.current.snapshot);
  for (const row of saved.saved.snapshot.groups.flatMap(group => group.entries).filter(row => row.calculationSource)) {
    const record = await client.scoringRecord.findUniqueOrThrow({ where: { performanceId: row.performanceId } });
    const retained = await client.scoringCalculation.findUniqueOrThrow({ where: { recordId_source: { recordId: record.id, source: row.calculationSource } } });
    const total = exactTotal(retained.inputs.criteria, retained.inputs.sheets.map(sheet => sheet.values), retained.inputs.penalty);
    assert.equal(row.total, record.disqualified ? null : total);
  }
  const staleFinalize = resultBody(saved, 'FINALIZE');
  assert.equal((await command({ action: 'ADJUST', recordId, penalty: '1', disqualified: false, reason: 'Fixture recalculation' })).status, 200);
  assert.equal((await resultCommand(staleFinalize)).status, 409, 'Correction invalidates the reviewed finalization source');
  await client.userRole.update({ where: { id: judges[1].assignment.id }, data: { removedAt: new Date() } });
  const changed = await results();
  assert.deepEqual(changed.current.snapshot.blockers, [], 'Frozen submitted sheets survive offboarding');
  assert.equal((await resultCommand(resultBody(changed))).status, 200);
  assert.deepEqual((await results({ revision: '1' })).saved.snapshot, saved.saved.snapshot);
  const finalize = resultBody(await results(), 'FINALIZE');
  await assert.rejects(client.resultFinalization.create({ data: { eventId: other.id, revision: 2, actorId: admin.id, operationId: randomUUID(), digest: finalize.source } }));
  await client.$executeRawUnsafe(`CREATE FUNCTION fail_results_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'RESULTS_FINALIZED' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe('CREATE TRIGGER fail_results_fixture BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION fail_results_fixture()');
  try { assert.equal((await resultCommand(finalize)).status, 500); }
  finally { await client.$executeRawUnsafe('DROP TRIGGER fail_results_fixture ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION fail_results_fixture()'); }
  assert.equal((await results()).stage, 'LIVE');
  assert.equal(await client.resultFinalization.count({ where: { eventId: event.id } }), 0);
  const final = await resultCommand(finalize);
  assert.equal(final.status, 200, JSON.stringify(final.body));
  assert.equal((await results()).stage, 'FINALIZED');
  assert.deepEqual((await results()).finalized, { revision: final.body.revision, createdAt: final.body.createdAt });
  assert.equal((await stage('ENDED')).status, 200);
  assert.deepEqual((await resultCommand(finalize)).body, final.body);
  assert.equal((await resultCommand({ ...finalize, operationId: randomUUID() })).status, 403);
  await assert.rejects(client.resultRevision.update({ where: { eventId_revision: { eventId: event.id, revision: 1 } }, data: { source: 'a'.repeat(64) } }));
  await assert.rejects(client.resultFinalization.delete({ where: { eventId: event.id } }));
  assert.equal((await req('/public' + resultPath)).status, 404);
  const anonymous = await fetch(`${baseUrl}/api/v1${resultPath}`);
  assert.equal(anonymous.status, 401);
  assert.doesNotMatch(await anonymous.text(), /First score|58\.875/);
  console.log('Private grouped results, frozen-source reproducibility, scope, recovery, immutable revisions and atomic finalization passed.');
  console.log('Exact scoring API, source preview, assignment scope, locks/corrections, concurrency/replay, immutable history and audit rollback passed.');
};
