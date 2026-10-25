const assert = require('node:assert/strict');
const { newIdentitySecret, identityTransaction, rotateAccountToken } = require('../apps/api/dist/services/identityTokens.js');

// Only called with the baseline runner's disposable database and API.
module.exports = async function checkAuthEligibility({ client, baseUrl, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const role = await client.role.findUniqueOrThrow({ where: { key: 'admin' } });
  const user = await client.user.create({ data: { email: 'eligibility-contract@example.invalid', name: 'Eligibility fixture',
    emailVerified: true, password: template.password } });
  const bearer = await login(baseUrl, user.email);
  const request = async (path, method = 'GET', body, token = bearer) => {
    const response = await fetch(baseUrl + '/api/v1' + path, { method,
      headers: { ...(token && { Authorization: 'Bearer ' + token }), 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: await response.json() };
  };
  const profile = await request('/auth/profile');
  assert.equal(profile.status, 200); assert.deepEqual(profile.body.roles, []);
  assert.equal(profile.body.isAdmin, false);
  const body = { name: 'Eligibility event', startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-02T00:00:00Z' };
  assert.equal((await request('/events', 'POST', body)).status, 403, 'Verified roleless account must not become an admin');
  await client.userRole.create({ data: { userId: user.id, roleId: role.id } });
  const created = await request('/events', 'POST', body);
  assert.equal(created.status, 201, 'Eligible global admin remains permitted');
  const snapshot = async () => ({ user: await client.user.findUniqueOrThrow({ where: { id: user.id } }),
    roles: await client.userRole.findMany({ where: { userId: user.id } }),
    tokens: await client.accountToken.findMany({ where: { userId: user.id } }),
    event: await client.event.findUniqueOrThrow({ where: { id: created.body.id } }),
    eventCount: await client.event.count(), invitations: await client.invitation.count() });
  for (const state of [{ active: false, emailVerified: true }, { active: true, emailVerified: false }]) {
    await client.user.update({ where: { id: user.id }, data: state });
    const before = await snapshot();
    const result = await request('/auth/login', 'POST', { email: user.email, password: 'password123' }, null);
    assert.equal(result.status, 403); assert.equal(result.body.token, undefined);
    assert.equal(result.body.reason, state.active ? 'emailVerificationRequired' : 'accountDisabled');
    const wrong = await request('/auth/login', 'POST', { email: user.email, password: 'incorrect-password' }, null);
    assert.equal(wrong.status, 401); assert.equal(wrong.body.reason, 'invalidCredentials');
    for (const [path, method, payload] of [
      ['/events', 'GET'], ['/events', 'POST', body], ['/invitations', 'GET'],
      ['/events/' + created.body.id, 'PATCH', { name: 'Unauthorized' }],
      ['/images/events/' + created.body.id, 'POST', {}], ['/auth/profile', 'GET'],
    ]) {
      const denied = await request(path, method, payload);
      assert.equal(denied.status, 401, 'Existing JWT must fail before protected operations');
      assert.equal(denied.body.reason, 'authenticationRequired'); assert.equal(denied.body.token, undefined);
    }
    assert.deepEqual(await snapshot(), before, 'Denial must preserve account, credentials, roles, tokens and resource rows');
  }
  const removed = await client.user.create({ data: { email: 'deleted-eligibility@example.invalid', name: 'Deleted fixture',
    emailVerified: true, password: template.password } });
  const removedToken = await login(baseUrl, removed.email);
  await client.user.delete({ where: { id: removed.id } });
  assert.equal((await request('/events', 'GET', undefined, removedToken)).status, 401);
  assert.equal((await request('/auth/profile', 'GET', undefined, removedToken)).status, 401);
  const missing = await request('/auth/login', 'POST', { email: removed.email, password: 'password123' }, null);
  assert.equal(missing.status, 401); assert.equal(missing.body.reason, 'invalidCredentials');

  // Pending roleless users can verify publicly, then sign in/use permitted resources.
  const pending = await client.user.create({ data: { email: 'pending-eligibility@example.invalid', name: 'Pending fixture', password: template.password } });
  assert.equal((await request('/auth/login', 'POST', { email: pending.email, password: 'password123' }, null)).status, 403);
  const raw = await identityTransaction(client, tx => rotateAccountToken(tx, pending.id, 'VERIFY_EMAIL'));
  const verified = await request('/auth/verify-email', 'POST', { token: raw }, null);
  assert.equal(verified.status, 200);
  assert.equal((await request('/auth/profile', 'GET', undefined, verified.body.token)).status, 200);
  assert.equal((await request('/events', 'POST', body, verified.body.token)).status, 403);
  const signedIn = await login(baseUrl, pending.email);
  assert.equal((await request('/events', 'GET', undefined, signedIn)).status, 200);
  assert.equal(await client.userRole.count({ where: { userId: pending.id } }), 0);
  // Inactive verification remains nonconsuming and cannot mint a session.
  const inactive = await client.user.create({ data: { email: 'inactive-verify-eligibility@example.invalid', name: 'Inactive fixture', active: false } });
  const secret = newIdentitySecret('VERIFY_EMAIL');
  const record = await client.accountToken.create({ data: { userId: inactive.id, email: inactive.email, purpose: 'VERIFY_EMAIL',
    digest: secret.digest, expiresAt: secret.expiresAt } });
  const denied = await request('/auth/verify-email', 'POST', { token: secret.raw }, null);
  assert.equal(denied.status, 403); assert.equal(denied.body.token, undefined);
  assert.deepEqual(await client.accountToken.findUniqueOrThrow({ where: { id: record.id } }), record);
  assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: inactive.id } }), inactive);
  console.log('Auth eligibility: verified roleless/admin paths, disabled/unverified/deleted sessions, denied-write preservation and pending verification passed.');
};
