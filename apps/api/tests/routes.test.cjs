const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const { randomBytes } = require('node:crypto');

// Isolated configuration; these tests never connect to an application database.
process.env.NODE_ENV = 'test';
process.env.DEV_AUTH = 'false';
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
process.env.EMAIL_FROM = 'routes@example.invalid';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const jwt = require('jsonwebtoken');
const { createApp } = require('../dist/app.js');

async function fixture(t) {
  const calls = [];
  const record = (name, value) => async (args) => {
    calls.push({ name, args });
    return value;
  };
  const prisma = {
    $queryRaw: record('health', []),
    userRole: {
      findMany: async ({ where }) => {
        calls.push({ name: 'roles', userId: where.userId });
        return where.userId === 'admin'
          ? [{ eventId: null, role: { key: 'admin', permissions: [] } }]
          : [{ eventId: 'allowed-event', role: { key: 'moderator', permissions: [
            { permission: { key: 'event.manage' } },
          ] } }];
      },
    },
    user: { findUnique: record('user', null) },
    event: { findMany: record('events', []), findUnique: record('event', null) },
    judge: { findMany: record('judges', []) },
    danceCategory: { findMany: record('categories', []) },
    danceFormat: { findMany: record('formats', []) },
    ageGroup: { findMany: record('age-groups', []) },
    studio: { findMany: record('studios', []), findFirst: record('studio', { eventId: 'e', approvalStatus: 'APPROVED', representatives: [], registrations: [], event: { stage: 'REGISTRATION_OPEN' } }) },
    dancer: { findMany: record('dancers', []) },
    invitation: {
      findMany: record('invitations', []),
      findUnique: record('invitation', null),
    },
  };
  const server = createApp(prisma).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  const request = async (path, { user, method = 'GET', body, token } = {}) => {
    const headers = {};
    if (user || token) headers.Authorization = `Bearer ${token || jwt.sign({ userId: user }, process.env.JWT_SECRET)}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  return { request, calls, prisma };
}

test('all mounted resource groups and invitation administration require authentication', async (t) => {
  const { request, calls } = await fixture(t);
  for (const [method, path] of [
    ['GET', '/auth/profile'], ['GET', '/events'], ['POST', '/events'],
    ['GET', '/events/e/judges'], ['GET', '/events/e/categories'],
    ['GET', '/events/e/formats'], ['GET', '/events/e/age-groups'],
    ['GET', '/events/e/studio-registrations'], ['POST', '/events/e/studio-registrations'],
    ['PATCH', '/events/e/studio-registrations/s'], ['DELETE', '/events/e/studio-registrations/s'],
    ['GET', '/studios'], ['GET', '/studios/s/dancers'],
    ['POST', '/studios/s/dancers'], ['GET', '/studios/s/dancers/d'],
    ['PATCH', '/studios/s/dancers/d'], ['DELETE', '/studios/s/dancers/d'],
    ['POST', '/images/events/e'], ['GET', '/invitations'], ['POST', '/invitations'],
  ]) {
    const result = await request(`/api/v1${path}`, { method });
    assert.equal(result.status, 401, `${method} ${path}`);
    assert.equal(result.body.code, 'UNAUTHORIZED');
  }
  assert.deepEqual(calls, [], 'Unauthenticated requests must not reach database handlers');
});

test('public auth and invitation operations reach handlers without a bearer token', async (t) => {
  const { request, calls } = await fixture(t);
  for (const path of ['/auth/register', '/auth/login', '/auth/verify-email', '/invitations/accept']) {
    const result = await request(`/api/v1${path}`, { method: 'POST', body: {} });
    assert.equal(result.status, 400, path);
  }
  const inspect = await request('/api/v1/invitations/missing-token');
  assert.equal(inspect.status, 404);
  assert.equal(inspect.body.error, 'Invitation not found');
  const accept = await request('/api/v1/invitations/accept', {
    method: 'POST', body: { token: 'missing-token', name: 'Fixture', password: 'fixture-password' },
  });
  assert.equal(accept.status, 404);
  assert.equal(accept.body.error, 'Invalid invitation token');
  assert.deepEqual(calls.map(({ name }) => name), ['invitation', 'invitation']);
});

test('versioned resources dispatch once using the injected authentication database', async (t) => {
  const { request, calls } = await fixture(t);
  for (const [path, handler] of [
    ['/events', 'events'], ['/events/e/judges', 'judges'],
    ['/events/e/categories', 'categories'], ['/events/e/formats', 'formats'],
    ['/events/e/age-groups', 'age-groups'], ['/studios', 'studios'],
    ['/studios/s/dancers', 'dancers'], ['/invitations', 'invitations'],
  ]) {
    calls.length = 0;
    const result = await request(`/api/v1${path}`, { user: 'admin' });
    assert.equal(result.status, 200, path);
    assert.deepEqual(result.body, []);
    assert.deepEqual(calls.map(({ name }) => name), path.endsWith('/dancers') ? ['roles', 'studio', handler] : ['roles', handler], path);
  }
});

test('invalid tokens and wrong-event permissions cannot reach resource handlers', async (t) => {
  const { request, calls } = await fixture(t);
  assert.equal((await request('/api/v1/events', { token: 'invalid' })).status, 401);
  assert.deepEqual(calls, []);
  assert.equal((await request('/api/v1/events/other-event/categories', { user: 'moderator' })).status, 403);
  assert.deepEqual(calls.map(({ name }) => name), ['roles']);
  calls.length = 0;
  assert.equal((await request('/api/v1/events/allowed-event/categories', { user: 'moderator' })).status, 200);
  assert.equal(calls[1].args.where.eventId, 'allowed-event');
  calls.length = 0;
  assert.equal((await request('/api/v1/invitations', { user: 'moderator' })).status, 403);
  assert.deepEqual(calls.map(({ name }) => name), ['roles']);
});

test('studio ownership checks remain behind the versioned mount', async (t) => {
  const { request, prisma } = await fixture(t);
  prisma.userRole.findMany = async () => [{ eventId: null, role: {
    key: 'representative', permissions: [{ permission: { key: 'studio.manage' } }],
  } }];
  prisma.studio.findFirst = async () => ({
    id: 'other-studio', eventId: 'e', approvalStatus: 'APPROVED',
    representatives: [{ userId: 'owner', active: true }], registrations: [],
  });
  const result = await request('/api/v1/studios/other-studio', { user: 'outsider' });
  assert.equal(result.status, 403);
  assert.equal(result.body.code, 'FORBIDDEN');
});

test('validation errors use the global handler and health stays outside the API prefix', async (t) => {
  const { request } = await fixture(t);
  const invalid = await request('/api/v1/events', { user: 'admin', method: 'POST', body: {} });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, 'VALIDATION_ERROR');
  assert.equal(invalid.body.statusCode, 400);
  assert.equal(typeof invalid.body.details.fields.name, 'string');
  assert.ok(Number.isFinite(Date.parse(invalid.body.timestamp)));
  assert.deepEqual(await request('/health'), { status: 200, body: { status: 'ok' } });
});

test('profile and upload operations dispatch after authentication; health errors omit internals', async (t) => {
  const { request, prisma, calls } = await fixture(t);
  prisma.user.findUnique = async ({ where }) => ({ id: where.id, name: 'Fixture', roles: [] });
  const profile = await request('/api/v1/auth/profile', { user: 'admin' });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.id, 'admin');
  assert.equal(profile.body.isAdmin, true);
  calls.length = 0;
  const upload = await request('/api/v1/images/events/e', { method: 'POST', user: 'admin' });
  assert.equal(upload.status, 404, 'Authorized upload must reach resource lookup');
  assert.equal(upload.body.error, 'Event not found');
  assert.deepEqual(calls.map(({ name }) => name), ['roles', 'event']);
  prisma.$queryRaw = async () => { throw new Error('Private database connection details'); };
  assert.deepEqual(await request('/health'), { status: 500, body: { status: 'error' } });
});

test('legacy URLs, duplicated invitation paths, and unknown auth routes have no handlers', async (t) => {
  const { request, calls } = await fixture(t);
  for (const [method, path] of [
    ['GET', '/events'], ['POST', '/auth/login'],
    ['POST', '/invitations/invitations/accept'],
    ['POST', '/api/v1/invitations/invitations/accept'],
    ['GET', '/api/v1/auth/future-admin-operation'],
    ['POST', '/api/v1/auth/profile'],
    ['GET', '/api/v2/events'],
  ]) {
    const result = await request(path, { method });
    assert.equal(result.status, 404, `${method} ${path}`);
    assert.equal(result.body.code, 'NOT_FOUND');
  }
  assert.deepEqual(calls, [], 'Unknown routes must not execute application queries');
});

function registrationRecord(status = 'PENDING') {
  return {
    id: 'registration', eventId: 'e', studioId: 's', status, canEditDuringReview: false,
    createdAt: new Date('2026-10-24T00:00:00Z'), updatedAt: new Date('2026-10-24T00:00:00Z'),
    studio: { id: 's', name: 'Fixture', approvalStatus: 'PENDING', country: null, city: null },
  };
}

async function registrationFixture(t) {
  const context = await fixture(t);
  const { prisma, calls } = context;
  // A newly verified applicant has no roles or permissions yet.
  const originalRoles = prisma.userRole.findMany;
  prisma.userRole.findMany = async (args) => args.where.userId === 'admin' ? originalRoles(args) : [];
  prisma.$transaction = async (operation) => operation(prisma);
  prisma.event.findUnique = async () => ({ id: 'e', stage: 'REGISTRATION_OPEN' });
  prisma.studio.create = async ({ data }) => {
    calls.push({ name: 'create', data });
    return { registrations: [registrationRecord()] };
  };
  prisma.studio.findFirst = async ({ where }) => {
    if (where.eventId !== 'e' || where.id !== 's') return null;
    return { approvalStatus: 'APPROVED', representatives: [{ id: 'rep', userId: 'applicant' }] };
  };
  prisma.studioEventRegistration = {
    findMany: async (args) => { calls.push({ name: 'list', args }); return [registrationRecord()]; },
    findUnique: async () => registrationRecord(),
    update: async (args) => { calls.push({ name: 'update', args }); return registrationRecord(args.data.status); },
    deleteMany: async (args) => { calls.push({ name: 'cancel', args }); return { count: 1 }; },
  };
  prisma.role = { findUnique: async () => ({ id: 'representative-role' }) };
  prisma.userRole.upsert = async (args) => calls.push({ name: 'assign', args });
  return context;
}

const registrationPath = '/api/v1/events/e/studio-registrations';
const application = { name: ' Fixture ', representativeName: ' Applicant ', representativeEmail: 'applicant@example.invalid' };

test('roleless applicants create a pending registration and their own membership in one nested write', async (t) => {
  const { request, calls } = await registrationFixture(t);
  const result = await request(registrationPath, { user: 'applicant', method: 'POST', body: application });
  assert.equal(result.status, 201);
  const data = calls.find(({ name }) => name === 'create').data;
  assert.equal(data.name, 'Fixture');
  assert.equal(data.approvalStatus, 'PENDING');
  assert.deepEqual(data.representatives.create, {
    userId: 'applicant', name: 'Applicant', email: application.representativeEmail,
  });
  assert.deepEqual(data.registrations.create, { eventId: 'e', status: 'PENDING', canEditDuringReview: false });
  assert.equal(calls.some(({ name }) => name === 'assign'), false);
  assert.equal(result.body.createdAt, '2026-10-24T00:00:00.000Z');
  assert.equal(result.body.studio.country, null);
  assert.equal('representatives' in result.body.studio, false);
  assert.equal('invoiceDetails' in result.body.studio, false);
});

test('admin registration also creates pending membership in the event without becoming a representative', async (t) => {
  const { request, prisma, calls } = await registrationFixture(t);
  prisma.event.findUnique = async () => ({ stage: 'ENDED' });
  const result = await request(registrationPath, { user: 'admin', method: 'POST', body: { name: 'Fixture' } });
  assert.equal(result.status, 201);
  const data = calls.find(({ name }) => name === 'create').data;
  assert.equal(data.representatives, undefined);
  assert.equal(data.registrations.create.status, 'PENDING');
  assert.equal(data.approvalStatus, 'PENDING');
});

test('registration rejects whitespace, missing contacts, spoofed relationships and closed or missing events', async (t) => {
  const { request, prisma, calls } = await registrationFixture(t);
  for (const body of [
    { ...application, name: '   ' }, { name: 'Fixture' },
    { ...application, studioId: 'other' }, { ...application, eventId: 'other' },
    { ...application, status: 'APPROVED' }, { ...application, userId: 'other-user' },
  ]) {
    assert.equal((await request(registrationPath, { user: 'applicant', method: 'POST', body })).status, 400);
  }
  for (const stage of ['DATA_REVIEW', 'FINALIZED', 'ENDED', 'CANCELLED']) {
    prisma.event.findUnique = async () => ({ stage });
    assert.equal((await request(registrationPath, { user: 'applicant', method: 'POST', body: application })).status, 403);
  }
  prisma.event.findUnique = async () => null;
  assert.equal((await request(registrationPath, { user: 'admin', method: 'POST', body: { name: 'Fixture' } })).status, 404);
  assert.equal(calls.some(({ name }) => name === 'create'), false);
});

test('registration lists require active ownership even when the applicant has no role', async (t) => {
  const { request, calls } = await registrationFixture(t);
  assert.equal((await request(registrationPath, { user: 'applicant' })).status, 200);
  const where = calls.find(({ name }) => name === 'list').args.where;
  assert.deepEqual(where, {
    eventId: 'e', studio: { eventId: 'e', deletedAt: null, representatives: { some: { userId: 'applicant', active: true } } },
  });
});

test('approval requires admin and organization approval and assigns roles in the same transaction', async (t) => {
  const { request, prisma, calls } = await registrationFixture(t);
  const options = { method: 'PATCH', body: { status: 'APPROVED' } };
  assert.equal((await request(`${registrationPath}/s`, { ...options, user: 'applicant' })).status, 403);
  const result = await request(`${registrationPath}/s`, { ...options, user: 'admin' });
  assert.equal(result.status, 200);
  assert.equal(result.body.status, 'APPROVED');
  const assigned = calls.find(({ name }) => name === 'assign').args;
  assert.deepEqual(assigned.where.userId_roleId_eventId, { userId: 'applicant', roleId: 'representative-role', eventId: 'e' });
  const studioLookup = prisma.studio.findFirst;
  prisma.studio.findFirst = async (args) => ({ ...await studioLookup(args), approvalStatus: 'PENDING' });
  assert.equal((await request(`${registrationPath}/s`, { ...options, user: 'admin' })).status, 403);
});

test('registration mutations reject wrong event scope and cannot create missing registrations', async (t) => {
  const { request, prisma, calls } = await registrationFixture(t);
  for (const method of ['PATCH', 'DELETE']) {
    assert.equal((await request('/api/v1/events/other/studio-registrations/s', {
      user: 'admin', method, ...(method === 'PATCH' && { body: { status: 'APPROVED' } }),
    })).status, 404);
  }
  prisma.studioEventRegistration.findUnique = async () => null;
  assert.equal((await request(`${registrationPath}/s`, { user: 'admin', method: 'PATCH', body: { status: 'APPROVED' } })).status, 404);
  assert.equal(calls.some(({ name }) => ['update', 'cancel', 'assign'].includes(name)), false);
});

test('cancellation enforces ownership and pending state and uses a conditional delete', async (t) => {
  const { request, prisma, calls } = await registrationFixture(t);
  prisma.studio.findFirst = async () => ({ representatives: [] });
  assert.equal((await request(`${registrationPath}/s`, { user: 'applicant', method: 'DELETE' })).status, 403);
  prisma.studio.findFirst = async () => ({ representatives: [{ id: 'rep' }] });
  for (const status of ['APPROVED', 'REJECTED', 'LOCKED']) {
    prisma.studioEventRegistration.findUnique = async () => registrationRecord(status);
    assert.equal((await request(`${registrationPath}/s`, { user: 'applicant', method: 'DELETE' })).status, 403);
  }
  prisma.studioEventRegistration.findUnique = async () => registrationRecord();
  assert.equal((await request(`${registrationPath}/s`, { user: 'applicant', method: 'DELETE' })).status, 204);
  const where = calls.find(({ name }) => name === 'cancel').args.where;
  assert.equal(where.status, 'PENDING');
  assert.deepEqual(where.studio.representatives.some, { userId: 'applicant', active: true });
  prisma.studioEventRegistration.deleteMany = async () => ({ count: 0 });
  assert.equal((await request(`${registrationPath}/s`, { user: 'applicant', method: 'DELETE' })).status, 409);
});

test('retired studio registration paths no longer execute handlers', async (t) => {
  const { request, calls } = await registrationFixture(t);
  for (const [method, path] of [
    ['POST', '/events/e/studios'], ['GET', '/events/e/studios'],
    ['POST', '/events/e/studios/s/registration'], ['PATCH', '/events/e/studios/s/registration'],
    ['DELETE', '/events/e/studios/s/registration'],
  ]) assert.equal((await request(`/api/v1${path}`, {
    user: 'admin', method, ...(method !== 'GET' && { body: {} }),
  })).status, 404);
  assert.equal(calls.some(({ name }) => ['create', 'update', 'cancel', 'assign'].includes(name)), false);
});

const dancerPath = '/api/v1/studios/s/dancers';
const dancerInput = { firstName: ' First ', lastName: ' Last ', birthDate: '2012-02-29' };
const dancerRecord = () => ({
  id: 'd', studioId: 's', firstName: 'First', lastName: 'Last',
  birthDate: new Date('2012-02-29T00:00:00.000Z'), photoUrl: null,
});

async function dancerFixture(t) {
  const context = await fixture(t);
  const { prisma, calls } = context;
  const adminRoles = prisma.userRole.findMany;
  prisma.userRole.findMany = async (args) => args.where.userId === 'admin' ? adminRoles(args) : [{
    eventId: 'e', role: { key: 'representative', permissions: [{ permission: { key: 'dancer.manage' } }] },
  }];
  prisma.$transaction = async (operation) => operation(prisma);
  prisma.studio.findFirst = async () => ({
    eventId: 'e', approvalStatus: 'APPROVED', representatives: [{ id: 'membership' }],
    registrations: [{ eventId: 'e', status: 'APPROVED', canEditDuringReview: false }],
    event: { stage: 'REGISTRATION_OPEN' },
  });
  prisma.dancer.findFirst = async ({ where }) => where.studioId === 's' && where.id === 'd' ? dancerRecord() : null;
  prisma.dancer.findMany = async (args) => { calls.push({ name: 'dancer-list', args }); return [dancerRecord()]; };
  prisma.dancer.create = async (args) => { calls.push({ name: 'dancer-create', args }); return { ...dancerRecord(), ...args.data }; };
  prisma.dancer.update = async (args) => { calls.push({ name: 'dancer-update', args }); return { ...dancerRecord(), ...args.data }; };
  prisma.dancer.updateMany = async (args) => { calls.push({ name: 'dancer-delete', args }); return { count: args.where.studioId === 's' ? 1 : 0 }; };
  return context;
}

test('dancer CRUD accepts event-scoped permission and returns calendar-only DTOs', async (t) => {
  const { request, calls } = await dancerFixture(t);
  const created = await request(dancerPath, { user: 'owner', method: 'POST', body: dancerInput });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, { id: 'd', studioId: 's', firstName: 'First', lastName: 'Last', birthDate: '2012-02-29', photoUrl: null });
  assert.equal(calls.find(({ name }) => name === 'dancer-create').args.data.birthDate.toISOString(), '2012-02-29T00:00:00.000Z');
  assert.equal((await request(`${dancerPath}/d`, { user: 'owner' })).status, 200);
  const updated = await request(`${dancerPath}/d`, { user: 'owner', method: 'PATCH', body: { firstName: ' Changed ' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.firstName, 'Changed');
  assert.equal(updated.body.birthDate, '2012-02-29');
  assert.equal((await request(dancerPath, { user: 'owner' })).body.length, 1);
  const where = calls.find(({ name }) => name === 'dancer-list').args.where;
  assert.deepEqual(where, { studioId: 's', deletedAt: null });
});

test('dancer access requires matching event permission, ownership, and both approval gates', async (t) => {
  const { request, prisma } = await dancerFixture(t);
  const original = prisma.studio.findFirst;
  for (const overrides of [
    { eventId: 'other' }, { representatives: [] }, { approvalStatus: 'PENDING' },
    { registrations: [] }, { registrations: [{ eventId: 'e', status: 'LOCKED' }] },
    { registrations: [{ eventId: 'other', status: 'APPROVED' }] },
  ]) {
    prisma.studio.findFirst = async () => ({ ...await original(), ...overrides });
    assert.equal((await request(dancerPath, { user: 'owner' })).status, 403);
    assert.equal((await request(dancerPath, { user: 'owner', method: 'POST', body: dancerInput })).status, 403);
  }
  prisma.studio.findFirst = original;
  prisma.userRole.findMany = async () => [];
  assert.equal((await request(dancerPath, { user: 'owner' })).status, 403);
  prisma.userRole.findMany = async () => [{ eventId: null, role: { key: 'custom', permissions: [{ permission: { key: 'dancer.manage' } }] } }];
  assert.equal((await request(dancerPath, { user: 'owner' })).status, 200);
});

test('dancer stage locks govern writes while reads remain available', async (t) => {
  const { request, prisma } = await dancerFixture(t);
  const original = prisma.studio.findFirst;
  for (const stage of ['PRE_REGISTRATION', 'DATA_REVIEW', 'FINALIZED', 'ENDED', 'CANCELLED']) {
    prisma.studio.findFirst = async () => ({ ...await original(), event: { stage } });
    assert.equal((await request(dancerPath, { user: 'owner' })).status, 200);
    for (const [method, route, body] of [
      ['POST', dancerPath, dancerInput], ['PATCH', `${dancerPath}/d`, { firstName: 'Changed' }],
      ['DELETE', `${dancerPath}/d`, undefined],
    ]) assert.equal((await request(route, { user: 'owner', method, ...(body && { body }) })).status, 403);
  }
  prisma.studio.findFirst = async () => ({ ...await original(), event: { stage: 'DATA_REVIEW' },
    registrations: [{ eventId: 'e', status: 'APPROVED', canEditDuringReview: true }],
  });
  assert.equal((await request(dancerPath, { user: 'owner', method: 'POST', body: dancerInput })).status, 201);
  prisma.studio.findFirst = async () => ({ ...await original(), event: { stage: 'ENDED' } });
  assert.equal((await request(dancerPath, { user: 'admin', method: 'POST', body: dancerInput })).status, 201);
});

test('dancer item paths enforce their studio parent even for admins', async (t) => {
  const { request, calls } = await dancerFixture(t);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    const result = await request('/api/v1/studios/other/dancers/d', {
      user: 'admin', method, ...(method === 'PATCH' && { body: { firstName: 'Changed' } }),
    });
    assert.equal(result.status, 404);
    assert.equal(result.body.code, 'NOT_FOUND');
  }
  assert.equal(calls.some(({ name }) => name === 'dancer-update'), false);
});

test('dancer schemas reject invalid dates, blank names, empty patches, and client relationships', async (t) => {
  const { request } = await dancerFixture(t);
  for (const body of [
    { ...dancerInput, birthDate: '2011-02-29' }, { ...dancerInput, birthDate: '2012-02-30' },
    { ...dancerInput, birthDate: '2012-02-29T00:00:00Z' }, { ...dancerInput, firstName: '  ' },
    { ...dancerInput, studioId: 'other' }, { ...dancerInput, deletedBy: 'other' },
  ]) {
    const result = await request(dancerPath, { user: 'owner', method: 'POST', body });
    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'VALIDATION_ERROR');
  }
  assert.equal((await request(`${dancerPath}/d`, { user: 'owner', method: 'PATCH', body: {} })).status, 400);
});

test('dancer delete records the actor; missing active studios and dancers are inaccessible', async (t) => {
  const { request, prisma, calls } = await dancerFixture(t);
  assert.equal((await request(`${dancerPath}/d`, { user: 'owner', method: 'DELETE' })).status, 204);
  const args = calls.find(({ name }) => name === 'dancer-delete').args;
  assert.deepEqual(args.where, { id: 'd', studioId: 's', deletedAt: null });
  assert.equal(args.data.deletedBy, 'owner');
  assert.ok(args.data.deletedAt instanceof Date);
  prisma.dancer.findFirst = async () => null;
  assert.equal((await request(`${dancerPath}/d`, { user: 'owner' })).status, 404);
  prisma.studio.findFirst = async () => null;
  assert.equal((await request(dancerPath, { user: 'admin' })).status, 404);
});

test('retired dancer paths have no handlers', async (t) => {
  const { request, calls } = await dancerFixture(t);
  for (const [method, path] of [
    ['GET', '/dancers/s/dancers'], ['POST', '/dancers/s/dancers'],
    ['PATCH', '/dancers/d'], ['DELETE', '/dancers/d'],
  ]) assert.equal((await request(`/api/v1${path}`, { user: 'admin', method })).status, 404);
  assert.deepEqual(calls, []);
});
