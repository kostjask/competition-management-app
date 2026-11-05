const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const intent = require('./fixtures/studio-signup.cjs');
module.exports = async function ({ client, baseUrl, jwtSecret }) {
  const jwt = require('../apps/api/node_modules/jsonwebtoken');
  const request = async (path, body, token) => {
    const response = await fetch(baseUrl + '/api/v1/auth/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.json() };
  };
  const account = { email: 'public-draft@example.invalid', password: 'password123', name: 'Synthetic owner', locale: 'ru', onboarding: intent() };
  const snapshot = async () => Object.fromEntries(await Promise.all(['user', 'onboardingDraft', 'accountToken', 'studio', 'studioRepresentative', 'studioEventRegistration', 'userRole', 'auditLog', 'emailDelivery'].map(async model => [model, await client[model].findMany({ orderBy: { id: 'asc' } })])));
  let before = await snapshot();
  assert.equal((await request('register', { email: account.email, password: account.password, name: account.name })).status, 400);
  assert.deepEqual(await snapshot(), before);
  assert.equal((await request('register', { ...account, onboarding: { ...account.onboarding, intendedEventId: 'absent' } })).status, 404);
  assert.deepEqual(await snapshot(), before, 'Invalid intended event cannot create an account or mail');
  // Audit failure must roll back account, draft, token and encrypted delivery together.
  await client.$executeRawUnsafe(`CREATE FUNCTION onboarding_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'ONBOARDING_SAVED' THEN RAISE EXCEPTION 'synthetic rollback'; END IF; RETURN NEW; END $$`);
  await client.$executeRawUnsafe('CREATE TRIGGER onboarding_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION onboarding_failure()');
  try { assert.equal((await request('register', account)).status, 500); assert.deepEqual(await snapshot(), before); }
  finally { await client.$executeRawUnsafe('DROP TRIGGER onboarding_failure ON "AuditLog"'); await client.$executeRawUnsafe('DROP FUNCTION onboarding_failure()'); }
  const created = await request('register', account); assert.equal(created.status, 201); assert.equal(created.body.token, undefined); assert.equal(created.body.delivery, 'unconfirmed');
  const user = await client.user.findUniqueOrThrow({ where: { email: account.email } });
  assert.equal(user.emailVerified, false);
  for (const model of ['studio', 'studioRepresentative', 'studioEventRegistration', 'userRole']) assert.deepEqual((await snapshot())[model], before[model], 'Signup grants no domain privileges');
  before = await snapshot();
  assert.equal((await request('register', account)).status, 201); assert.deepEqual(await snapshot(), before, 'Identical proven retry sends no duplicate mail');
  assert.equal((await request('register', { ...account, onboarding: intent() })).status, 409); assert.deepEqual(await snapshot(), before);
  const proof = { email: account.email, password: account.password };
  const pendingToken = jwt.sign({ userId: user.id, sessionVersion: user.sessionVersion }, jwtSecret);
  assert.equal((await request('onboarding/read', {}, pendingToken)).status, 401);
  assert.equal((await request('login', proof)).status, 403);
  assert.equal((await request('onboarding/read', { ...proof, password: 'wrong' })).status, 401);
  assert.equal((await request('onboarding/read', { ...proof, userId: 'other' })).status, 400);
  assert.deepEqual(await snapshot(), before);
  const read = await request('onboarding/read', proof); assert.equal(read.status, 200); assert.equal(read.body.draft.revision, 1); assert.equal(read.body.emailVerified, false);
  require('../packages/schemas/dist').OnboardingContextSchema.parse(read.body);
  const draft = { ...account.onboarding, operationId: randomUUID(), revision: 1, details: { ...account.onboarding.details, city: 'Changed city' } };
  const results = await Promise.all([request('onboarding/save', { ...proof, draft }), request('onboarding/save', { ...proof, draft: { ...draft, operationId: randomUUID(), details: { ...draft.details, city: 'Other tab' } } })]);
  assert.equal(results.filter(row => row.status === 200).length, 1); assert.ok(results.every(row => [200, 409].includes(row.status)));
  const current = (await request('onboarding/read', proof)).body.draft;
  before = await snapshot();
  assert.equal((await request('onboarding/save', { ...proof, draft: { ...draft, operationId: randomUUID() } })).status, 409); assert.deepEqual(await snapshot(), before, 'Stale tab preserves latest work');
  const other = await client.user.create({ data: { email: 'draft-other@example.invalid', name: 'Other', password: user.password, emailVerified: true } });
  const otherToken = jwt.sign({ userId: other.id, sessionVersion: other.sessionVersion }, jwtSecret);
  assert.equal((await request('onboarding/read', {}, otherToken)).body.draft, null, 'Session is owner scoped');
  await client.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  assert.equal((await request('onboarding/read', {}, pendingToken)).body.draft.id, current.id);
  const cancelled = await request('onboarding/cancel', { ...proof, revision: current.revision }); assert.equal(cancelled.status, 200); assert.equal(cancelled.body.draft.status, 'CANCELLED');
  before = await snapshot();
  assert.equal((await request('onboarding/cancel', { ...proof, revision: current.revision })).status, 200); assert.deepEqual(await snapshot(), before);
  assert.equal((await request('onboarding/save', { ...proof, draft: { ...draft, operationId: randomUUID(), revision: cancelled.body.draft.revision } })).status, 409);
  assert.equal((await request('register', account)).status, 409); assert.deepEqual(await snapshot(), before, 'Cancelled history cannot be reopened');
  await client.user.update({ where: { id: user.id }, data: { active: false } }); before = await snapshot();
  assert.equal((await request('onboarding/read', proof)).status, 401); assert.deepEqual(await snapshot(), before);
  console.log('Public studio signup, atomic rollback, owner proof, no privilege/session grant, revision races and retained cancellation passed.');
};
