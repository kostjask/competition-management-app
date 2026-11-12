const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// Keep delivery secrets in an isolated process, using only the baseline's disposable DB.
module.exports = function checkApplicantJourney({ serverEnv, adminToken }) {
  const result = spawnSync(process.execPath, [__filename], {
    env: { ...serverEnv, APPLICANT_FIXTURE_ADMIN: adminToken }, encoding: 'utf8', timeout: 60000,
  });
  if (result.status !== 0) throw new Error('Applicant journey fixture failed: ' + result.stderr.trim());
  console.log('PASS: fake-backed signup/verification, owner draft application, independent admin approvals, returning login/status and private account isolation.');
};

async function main() {
  const target = new URL(process.env.DATABASE_URL);
  assert.equal(target.hostname, 'localhost'); assert.match(target.pathname, /^\/dance_baseline_[a-f0-9]{32}$/);
  const { PrismaClient } = require('@prisma/client'); const { PrismaPg } = require('@prisma/adapter-pg');
  const { createApp } = require('../apps/api/dist/app.js'); const { once } = require('node:events');
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  let verification;
  const server = createApp(client, { available: () => true, verification: async data => { verification = data; }, recovery: async () => {} }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const request = async (path, body, token, method = body === undefined ? 'GET' : 'POST') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  try {
    const event = await client.event.create({ data: { name: 'Applicant journey fixture', startsAt: new Date('2099-06-01'), endsAt: new Date('2099-06-02'), timeZone: 'Europe/Tallinn' } });
    const credentials = { email: 'journey-owner@example.invalid', password: 'password123' };
    const signup = await request('/auth/register', { ...credentials, name: 'Journey owner', locale: 'en', onboarding: { ...require('./fixtures/studio-signup.cjs')(), intendedEventId: event.id } });
    assert.equal(signup.status, 201); assert.equal(signup.body.token, undefined);
    // Signup queues encrypted mail. Exercise the supported resend path through
    // the injected fake transport to obtain a real purpose-bound link in memory.
    assert.equal((await request('/auth/resend-verification', { email: credentials.email })).status, 202);
    assert.ok(verification?.token);
    assert.equal((await request('/auth/login', credentials)).status, 403);
    const verified = await request('/auth/verify-email', { token: verification.token }); assert.equal(verified.status, 200);
    const token = verified.body.token;
    const profile = await request('/auth/profile', undefined, token); assert.equal(profile.status, 200); assert.equal(profile.body.roles.length, 0);
    const draft = (await request('/auth/onboarding/read', {}, token)).body.draft;
    const root = '/events/' + event.id + '/studio-registrations';
    const application = { operationId: require('node:crypto').randomUUID(), name: 'Journey application studio', representativeName: 'Journey contact', representativeEmail: 'journey-contact@example.invalid', onboarding: { draftId: draft.id, revision: draft.revision } };
    const applied = await request(root, application, token); assert.equal(applied.status, 201);
    assert.equal((await request(root, application, token)).body.id, applied.body.id);
    assert.equal((await request('/auth/onboarding/read', {}, token)).body.draft.status, 'COMPLETED');
    const studioPath = '/studios/' + applied.body.studioId;
    const eventApproved = await request(root + '/' + applied.body.studioId, { status: 'APPROVED', revision: applied.body.revision }, process.env.APPLICANT_FIXTURE_ADMIN, 'PATCH');
    assert.equal(eventApproved.status, 200); assert.equal((await request('/auth/profile', undefined, token)).body.roles.length, 0);
    assert.equal((await request(studioPath + '/approval', { status: 'APPROVED', eventId: event.id, revision: eventApproved.body.revision }, process.env.APPLICANT_FIXTURE_ADMIN, 'PATCH')).status, 200);
    const returning = await request('/auth/login', credentials); assert.equal(returning.status, 200);
    const owned = await request('/studios', undefined, returning.body.token); assert.equal(owned.body.length, 1); assert.equal(owned.body[0].id, applied.body.studioId);
    assert.equal(owned.body[0].approvalStatus, 'APPROVED'); assert.equal(owned.body[0].registrations[0].status, 'APPROVED');
    assert.equal(owned.body[0].representatives[0].email, application.representativeEmail);
    const currentProfile = (await request('/auth/profile', undefined, returning.body.token)).body;
    assert.equal(currentProfile.email, credentials.email); assert.ok(currentProfile.roles.some(role => role.eventId === event.id && role.role.key === 'representative'));
    const outsider = await request('/auth/login', { email: 'judge@test.com', password: 'password123' }); assert.equal(outsider.status, 200);
    assert.equal((await request(studioPath, undefined, outsider.body.token)).status, 403);
    assert.equal((await request('/studios', undefined, process.env.APPLICANT_FIXTURE_ADMIN)).status, 200);
    const notifications = await client.reviewNotification.count({ where: { registrationId: applied.body.id } }); assert.equal(notifications, 2);
  } finally { await new Promise(resolve => server.close(resolve)); await client.$disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });
