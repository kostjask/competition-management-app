const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { AuthResponseSchema, UserProfileSchema, ErrorResponseSchema } = createRequire(path.resolve(__dirname, '../apps/api/package.json'))('@dance/schemas');

// Uses only the baseline runner's disposable database and compiled API.
module.exports = async function checkAuth({ client, baseUrl, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
  const user = await client.user.create({ data: {
    email: 'auth-profile-contract@example.invalid', name: 'Profile contract', password: template.password,
    emailVerified: true, photoPath: 'private-auth-profile-path',
  } });
  const token = await login(baseUrl, user.email);
  const getProfile = async suffix => {
    const response = await fetch(`${baseUrl}/api/v1/auth/profile${suffix || ''}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, 200);
    return UserProfileSchema.parse(await response.json());
  };
  const roleless = await getProfile();
  assert.deepEqual(roleless.roles, []); assert.equal(roleless.id, user.id); assert.equal(roleless.isAdmin, false);
  assert.equal(roleless.createdAt, user.createdAt.toISOString());
  const role = await client.role.findUniqueOrThrow({ where: { key: 'judge' } });
  const event = await client.event.create({ data: {
    name: 'Auth profile scope', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02'),
  } });
  await client.userRole.createMany({ data: [
    { userId: user.id, roleId: role.id, eventId: null }, { userId: user.id, roleId: role.id, eventId: event.id },
  ] });
  const profile = await getProfile(`?userId=${template.id}`);
  assert.equal(profile.id, user.id, 'A query cannot select another account');
  assert.equal(profile.roles.length, 2);
  assert.ok(profile.roles.some(assignment => assignment.eventId === null && assignment.event === null));
  assert.ok(profile.roles.some(assignment => assignment.eventId === event.id && assignment.event.name === event.name));
  assert.ok(profile.roles.every(assignment => assignment.role.key === 'judge'));
  assert.equal(JSON.stringify(profile).includes('private-auth-profile'), false);
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '  ' + user.email.toUpperCase() + '  ', password: 'password123' }), signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200); AuthResponseSchema.parse(await response.json());
  const beforeDuplicate = await client.user.findUniqueOrThrow({ where: { id: user.id } });
  const duplicate = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '  ' + user.email.toUpperCase() + '  ', name: 'Duplicate', password: 'different-password' }), signal: AbortSignal.timeout(5000),
  });
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await client.user.findUniqueOrThrow({ where: { id: user.id } }), beforeDuplicate);
  await client.user.update({ where: { id: user.id }, data: { active: false } });
  const disabled = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'password123' }), signal: AbortSignal.timeout(5000),
  });
  assert.equal(disabled.status, 403); assert.equal(ErrorResponseSchema.parse(await disabled.json()).error, 'Account is disabled');
  console.log('Auth bearer/profile DTOs, roleless/global/event scopes, private-field exclusion and disabled login passed.');
};
