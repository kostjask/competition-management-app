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
    ['GET', '/studios'], ['GET', '/studios/s'], ['PATCH', '/studios/s'], ['DELETE', '/studios/s'],
    ['PATCH', '/studios/s/approval'], ['PATCH', '/studios/s/representatives/r'],
    ['GET', '/studios/s/dancers'],
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
  const { request, calls, prisma } = await fixture(t);
  for (const [path, handler] of [
    ['/events', 'events'], ['/events/e/judges', 'judges'],
    ['/events/e/categories', 'categories'], ['/events/e/formats', 'formats'],
    ['/events/e/age-groups', 'age-groups'], ['/studios', 'studios'],
    ['/studios/s/dancers', 'dancers'], ['/invitations', 'invitations'],
  ]) {
    calls.length = 0;
    if (handler === 'judges') prisma.event.findUnique = async (args) => {
      calls.push({ name: 'event', args }); return { id: args.where.id };
    };
    const result = await request(`/api/v1${path}`, { user: 'admin' });
    assert.equal(result.status, 200, path);
    assert.deepEqual(result.body, []);
    assert.deepEqual(calls.map(({ name }) => name), path.endsWith('/dancers') ? ['roles', 'studio', handler] :
      handler === 'judges' ? ['roles', 'event', handler] : ['roles', handler], path);
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
  prisma.user.findUnique = async ({ where }) => ({ id: where.id, name: 'Fixture', email: 'fixture@example.invalid', createdAt: new Date('2026-01-01'), roles: [] });
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

test('registration creation maps database uniqueness failures to a private global conflict response', async (t) => {
  const { request, prisma } = await registrationFixture(t);
  const { Prisma } = require('@prisma/client');
  prisma.studio.create = async () => {
    throw new Prisma.PrismaClientKnownRequestError('Private database/index details', {
      code: 'P2002', clientVersion: '7.10.1', meta: { target: ['name'] },
    });
  };
  for (const user of ['applicant', 'admin']) {
    const result = await request(registrationPath, { user, method: 'POST', body: application });
    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'CONFLICT');
    assert.equal(result.body.statusCode, 409);
    assert.equal(result.body.error, 'Studio with this name already exists');
    assert.ok(Number.isFinite(Date.parse(result.body.timestamp)));
    assert.equal(JSON.stringify(result.body).includes('Private'), false);
    assert.equal(JSON.stringify(result.body).includes('target'), false);
  }
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

const performancePath = '/api/v1/events/e/performances';
const performanceInput = { studioId: 's', title: ' Title ', durationSec: 60, orderOnStage: 1,
  categoryId: 'c', ageGroupId: 'a', formatId: 'f', dancerIds: ['d'] };
async function performanceFixture(t) {
  const f = await fixture(t);
  const { prisma, calls } = f;
  const dancer = { id: 'd', studioId: 's', firstName: 'First', lastName: 'Last', birthDate: new Date('2012-02-29'), photoUrl: null };
  const performance = { id: 'p', eventId: 'e', title: 'Title', durationSec: 60, orderOnStage: 1,
    categoryId: 'c', ageGroupId: 'a', formatId: 'f', participants: [{ dancerId: 'd', dancer }] };
  const studio = { approvalStatus: 'APPROVED', event: { stage: 'REGISTRATION_OPEN' },
    representatives: [{ id: 'r' }], registrations: [{ status: 'APPROVED', canEditDuringReview: false }] };
  prisma.userRole.findMany = async ({ where }) => where.userId === 'admin'
    ? [{ eventId: null, role: { key: 'admin', permissions: [] } }]
    : [{ eventId: where.userId === 'wrong-event' ? 'other' : 'e', role: { key: 'representative',
      permissions: [{ permission: { key: 'performance.manage' } }] } }];
  prisma.event.findUnique = async () => ({ id: 'e' });
  prisma.studio.findFirst = async ({ where }) => where.id === 's' && where.eventId === 'e' ? studio : null;
  prisma.studio.findMany = async (args) => { calls.push({ name: 'performance-studios', args }); return [{ id: 's' }]; };
  prisma.danceCategory.findFirst = prisma.ageGroup.findFirst = prisma.danceFormat.findFirst = async ({ where }) =>
    where.id === 'foreign' ? null : { id: where.id };
  prisma.dancer.findMany = async ({ where }) => where.id.in.every((id) => id === 'd') ? [{ id: 'd' }] : [];
  prisma.performance = {
    findFirst: async ({ where }) => where.id === 'p' && where.eventId === 'e' ? performance : null,
    findMany: async (args) => { calls.push({ name: 'performance-list', args }); return [performance]; },
    create: async (args) => { calls.push({ name: 'performance-create', args }); return performance; },
    update: async (args) => { calls.push({ name: 'performance-update', args }); return { ...performance, ...args.data, participants: performance.participants }; },
    updateMany: async (args) => { calls.push({ name: 'performance-delete', args }); return { count: 1 }; },
  };
  prisma.$transaction = async (fn) => fn(prisma);
  return { ...f, studio, performance };
}

test('performance canonical CRUD uses explicit DTOs and transactional nested participant writes', async (t) => {
  const { request, calls } = await performanceFixture(t);
  assert.equal((await request(performancePath, { user: 'owner' })).status, 200);
  const created = await request(performancePath, { user: 'owner', method: 'POST', body: performanceInput });
  assert.equal(created.status, 201);
  assert.deepEqual(Object.keys(created.body).sort(), ['ageGroupId', 'categoryId', 'durationSec', 'eventId', 'formatId', 'id', 'orderOnStage', 'participants', 'title']);
  assert.equal(created.body.participants[0].dancer.birthDate, '2012-02-29');
  const data = calls.find(({ name }) => name === 'performance-create').args.data;
  assert.equal(data.title, 'Title');
  assert.equal('studioId' in data, false);
  assert.deepEqual(data.participants.createMany.data, [{ dancerId: 'd' }]);
  assert.equal((await request(`${performancePath}/p`, { user: 'owner' })).status, 200);
  const patched = await request(`${performancePath}/p`, { user: 'owner', method: 'PATCH', body: { title: ' Changed ', dancerIds: ['d'] } });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.title, 'Changed');
  const update = calls.find(({ name }) => name === 'performance-update').args;
  assert.deepEqual(update.data.participants.deleteMany, {});
  assert.deepEqual(update.where, { id: 'p', eventId: 'e', deletedAt: null });
  assert.equal((await request(`${performancePath}/p`, { user: 'owner', method: 'DELETE' })).status, 204);
  const archive = calls.find(({ name }) => name === 'performance-delete').args;
  assert.equal(archive.data.deletedBy, 'owner');
  assert.ok(archive.data.deletedAt instanceof Date);
});

test('performance authentication, event permissions, ownership, approval and review gates apply', async (t) => {
  const { request, studio } = await performanceFixture(t);
  for (const [method, suffix] of [['GET', ''], ['POST', ''], ['GET', '/p'], ['PATCH', '/p'], ['DELETE', '/p']]) {
    assert.equal((await request(performancePath + suffix, { method })).status, 401);
    assert.equal((await request(performancePath + suffix, { method, user: 'wrong-event', body: method === 'POST' ? performanceInput : method === 'PATCH' ? { title: 'x' } : undefined })).status, 403);
  }
  for (const change of [() => { studio.representatives = []; }, () => { studio.approvalStatus = 'PENDING'; },
    () => { studio.registrations[0].status = 'LOCKED'; }]) {
    studio.representatives = [{ id: 'r' }]; studio.approvalStatus = 'APPROVED'; studio.registrations[0].status = 'APPROVED';
    change();
    assert.equal((await request(`${performancePath}/p`, { user: 'owner' })).status, 403);
    assert.equal((await request(`${performancePath}/p`, { user: 'admin' })).status, 200);
  }
  studio.registrations[0].status = 'APPROVED';
  studio.event.stage = 'DATA_REVIEW';
  assert.equal((await request(`${performancePath}/p`, { user: 'owner' })).status, 200);
  assert.equal((await request(performancePath, { user: 'owner', method: 'POST', body: performanceInput })).status, 403);
  studio.registrations[0].canEditDuringReview = true;
  assert.equal((await request(performancePath, { user: 'owner', method: 'POST', body: performanceInput })).status, 201);
  studio.event.stage = 'FINALIZED';
  assert.equal((await request(`${performancePath}/p`, { user: 'owner', method: 'DELETE' })).status, 403);
});

test('performance strict inputs reject spoofing, invalid selections and duplicate participants', async (t) => {
  const { request, calls } = await performanceFixture(t);
  for (const body of [{ ...performanceInput, eventId: 'other' }, { ...performanceInput, title: ' ' },
    { ...performanceInput, dancerIds: [] }, { ...performanceInput, dancerIds: ['d', 'd'] },
    { ...performanceInput, durationSec: 2147483648 }]) {
    const result = await request(performancePath, { user: 'owner', method: 'POST', body });
    assert.equal(result.status, 400); assert.equal(result.body.code, 'VALIDATION_ERROR');
  }
  for (const body of [{}, { studioId: 's' }, { deletedAt: null }])
    assert.equal((await request(`${performancePath}/p`, { user: 'owner', method: 'PATCH', body })).status, 400);
  for (const body of [{ categoryId: 'foreign' }, { ageGroupId: 'foreign' }, { formatId: 'foreign' }, { dancerIds: ['foreign'] }]) {
    assert.equal((await request(`${performancePath}/p`, { user: 'admin', method: 'PATCH', body })).status, 409);
  }
  assert.equal(calls.some(({ name }) => name === 'performance-update'), false);
  assert.equal((await request(`${performancePath}?studioId=s&studioId=other`, { user: 'owner' })).status, 400);
  assert.equal((await request(`${performancePath}?eventId=other`, { user: 'owner' })).status, 400);
});

test('performance parent substitution and ambiguous legacy participants fail closed for admins too', async (t) => {
  const { request, performance } = await performanceFixture(t);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    assert.equal((await request('/api/v1/events/other/performances/p', { user: 'admin', method, body: method === 'PATCH' ? { title: 'x' } : undefined })).status, 404);
  }
  assert.equal((await request(performancePath, { user: 'admin', method: 'POST', body: { ...performanceInput, studioId: 'other' } })).status, 404);
  const original = performance.participants;
  for (const participants of [[], [...original, { dancerId: 'foreign', dancer: { ...original[0].dancer, id: 'foreign', studioId: 'other' } }]]) {
    performance.participants = participants;
    assert.equal((await request(`${performancePath}/p`, { user: 'admin' })).status, 409);
    assert.deepEqual((await request(performancePath, { user: 'admin' })).body, []);
  }
});

test('performance lists constrain every participant and retired routes cannot mutate', async (t) => {
  const { request, calls } = await performanceFixture(t);
  assert.equal((await request(`${performancePath}?studioId=s`, { user: 'owner' })).status, 200);
  const where = calls.find(({ name }) => name === 'performance-list').args.where;
  assert.equal(where.eventId, 'e'); assert.equal(where.deletedAt, null);
  assert.deepEqual(where.participants.every.dancer.studioId.in, ['s']);
  const studios = calls.find(({ name }) => name === 'performance-studios').args.where;
  assert.deepEqual(studios.representatives, { some: { userId: 'owner', active: true } });
  assert.deepEqual(studios.registrations, { some: { eventId: 'e', status: 'APPROVED' } });
  for (const path of ['/api/v1/studios/s/performances', '/api/v1/performances/studios/s/events/e', '/events/e/performances'])
    assert.equal((await request(path, { user: 'admin', method: 'POST', body: performanceInput })).status, 404);
});

async function studioFixture(t) {
  const f = await fixture(t);
  const { prisma, calls } = f;
  const rep = { id: 'r', studioId: 's', userId: 'owner', name: 'Owner', email: 'owner@example.invalid', active: true, createdAt: new Date('2026-01-01') };
  const studio = { id: 's', eventId: 'e', name: 'Studio', approvalStatus: 'PENDING', country: 'EE', city: 'Tallinn',
    directorName: null, directorPhone: null, invoiceDetails: null, logoUrl: null,
    representatives: [rep], registrations: [{ id: 'registration', studioId: 's', eventId: 'e', status: 'PENDING',
      canEditDuringReview: false, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') }],
    event: { stage: 'REGISTRATION_OPEN' } };
  prisma.userRole.findMany = async ({ where }) => where.userId === 'admin'
    ? [{ eventId: null, role: { key: 'admin', permissions: [] } }]
    : where.userId === 'applicant' ? [] : [{ eventId: where.userId === 'wrong-event' ? 'other' : where.userId === 'global' ? null : 'e',
      role: { key: 'representative', permissions: [{ permission: { key: 'studio.manage' } }] } }];
  prisma.studio.findFirst = async ({ where }) => {
    calls.push({ name: 'studio-find', where });
    return where.id === 's' ? studio : null;
  };
  prisma.studio.findMany = async (args) => { calls.push({ name: 'studio-list', args }); return [studio]; };
  prisma.studio.update = async (args) => { calls.push({ name: 'studio-update', args }); return { ...studio, ...args.data }; };
  prisma.studio.updateMany = async (args) => { calls.push({ name: 'studio-archive', args }); return { count: 1 }; };
  prisma.studioRepresentative = {
    findFirst: async ({ where }) => where.id === rep.id && where.studioId === rep.studioId && rep.active ? rep : null,
    update: async (args) => { calls.push({ name: 'representative-update', args }); return { ...rep, ...args.data }; },
  };
  prisma.$transaction = async (work) => { calls.push({ name: 'studio-transaction' }); return work(prisma); };
  return { ...f, studio, rep };
}
const studioPath = '/api/v1/studios/s';

test('studio reads allow active roleless membership and return explicit identical profile DTOs', async (t) => {
  const { request, studio, calls } = await studioFixture(t);
  studio.representatives[0].userId = 'applicant';
  const result = await request(studioPath, { user: 'applicant' });
  assert.equal(result.status, 200);
  assert.equal(result.body.approvalStatus, 'PENDING');
  assert.equal(result.body.directorName, null);
  assert.equal('event' in result.body, false);
  assert.equal('createdAt' in result.body, false);
  assert.equal('logoPath' in result.body, false);
  assert.equal('user' in result.body.representatives[0], false);
  assert.equal(result.body.representatives[0].createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(result.body.registrations[0].status, 'PENDING');
  const list = await request('/api/v1/studios', { user: 'applicant' });
  assert.equal(list.status, 200); assert.deepEqual(list.body, [result.body]);
  assert.deepEqual(calls.find(({ name }) => name === 'studio-list').args.where,
    { deletedAt: null, representatives: { some: { userId: 'applicant', active: true } } });
  studio.representatives = [];
  assert.equal((await request(studioPath, { user: 'applicant' })).status, 403);
  assert.equal((await request(studioPath, { user: 'admin' })).status, 200);
});

test('studio writes derive permissions from the stored event and always require ownership', async (t) => {
  const { request, rep, calls } = await studioFixture(t);
  const patch = (user) => request(studioPath, { user, method: 'PATCH', body: { directorName: ' Changed ' } });
  assert.equal((await patch('owner')).status, 200);
  rep.userId = 'wrong-event'; assert.equal((await patch('wrong-event')).status, 403);
  rep.userId = 'global'; assert.equal((await patch('global')).status, 200);
  rep.userId = 'applicant'; assert.equal((await patch('applicant')).status, 403);
  rep.userId = 'owner'; assert.equal((await patch('outsider')).status, 403);
  assert.equal((await patch('admin')).status, 200);
  assert.ok(calls.some(({ name }) => name === 'studio-transaction'));
});

test('studio stage locks cover profile, representative and archive while admin bypass remains explicit', async (t) => {
  const { request, studio } = await studioFixture(t);
  studio.registrations[0].canEditDuringReview = true;
  for (const stage of ['DATA_REVIEW', 'FINALIZED', 'ENDED', 'CANCELLED']) {
    studio.event.stage = stage;
    assert.equal((await request(studioPath, { user: 'owner' })).status, 200);
    for (const [method, suffix, body] of [['PATCH', '', { name: 'x' }], ['DELETE', '', undefined],
      ['PATCH', '/representatives/r', { name: 'x' }]]) {
      assert.equal((await request(studioPath + suffix, { user: 'owner', method, body })).status, 403);
      assert.equal((await request(studioPath + suffix, { user: 'admin', method, body })).status, method === 'DELETE' ? 204 : 200);
    }
  }
  studio.event.stage = 'PRE_REGISTRATION';
  assert.equal((await request(studioPath, { user: 'owner', method: 'PATCH', body: { name: 'Open' } })).status, 200);
});

test('studio PATCH trims text, preserves omitted values, permits explicit clearing and validates strict bodies', async (t) => {
  const { request, calls, prisma } = await studioFixture(t);
  const patch = (body) => request(studioPath, { user: 'owner', method: 'PATCH', body });
  const updated = await patch({ directorName: ' New director ', city: null, invoiceDetails: { nested: { tax: 1 }, items: [null, true] } });
  assert.equal(updated.status, 200); assert.equal(updated.body.directorName, 'New director');
  assert.equal(updated.body.country, 'EE'); assert.equal(updated.body.city, null);
  assert.deepEqual(calls.find(({ name }) => name === 'studio-update').args.data,
    { directorName: 'New director', city: null, invoiceDetails: { nested: { tax: 1 }, items: [null, true] } });
  for (const body of [{}, { name: ' ' }, { name: null }, { country: '' }, { eventId: 'foreign' },
    { approvalStatus: 'APPROVED' }, { representatives: [] }, { logoUrl: 'url' }, { deletedAt: null }, { invoiceDetails: [] }]) {
    const result = await patch(body); assert.equal(result.status, 400); assert.equal(result.body.code, 'VALIDATION_ERROR');
  }
  const find = prisma.studio.findFirst;
  let collisionWhere;
  prisma.studio.findFirst = async (args) => {
    if (typeof args.where.id === 'object') { collisionWhere = args.where; return { id: 'collision' }; }
    return find(args);
  };
  assert.equal((await patch({ name: 'Collision' })).status, 409);
  assert.deepEqual(collisionWhere, { id: { not: 's' }, name: 'Collision', deletedAt: null });
  prisma.studio.findFirst = find;
  prisma.studio.update = async () => { throw new (require('@prisma/client').Prisma.PrismaClientKnownRequestError)(
    'Fixture uniqueness race', { code: 'P2002', clientVersion: '7.10.1' },
  ); };
  assert.equal((await patch({ name: 'Concurrent rename' })).status, 409);
});

test('studio representative and approval operations enforce active parents, self ownership and strict inputs', async (t) => {
  const { request, rep, prisma } = await studioFixture(t);
  const route = `${studioPath}/representatives/r`;
  assert.equal((await request(route, { user: 'owner', method: 'PATCH', body: { name: ' Changed ' } })).body.name, 'Changed');
  for (const body of [{}, { name: ' ' }, { email: 'invalid' }, { userId: 'other' }, { active: false }])
    assert.equal((await request(route, { user: 'owner', method: 'PATCH', body })).status, 400);
  rep.userId = 'other';
  assert.equal((await request(route, { user: 'owner', method: 'PATCH', body: { name: 'Blocked' } })).status, 403);
  rep.active = false;
  assert.equal((await request(route, { user: 'admin', method: 'PATCH', body: { name: 'Blocked' } })).status, 404);
  assert.equal((await request(`${studioPath}/representatives/foreign`, { user: 'admin', method: 'PATCH', body: { name: 'x' } })).status, 404);
  assert.equal((await request(`${studioPath}/approval`, { user: 'owner', method: 'PATCH', body: { status: 'APPROVED' } })).status, 403);
  assert.equal((await request(`${studioPath}/approval`, { user: 'admin', method: 'PATCH', body: { status: 'APPROVED' } })).body.approvalStatus, 'APPROVED');
  assert.equal((await request(`${studioPath}/approval`, { user: 'admin', method: 'PATCH', body: { status: 'APPROVED', eventId: 'other' } })).status, 400);
  prisma.studio.findFirst = async () => null;
  assert.equal((await request(route, { user: 'admin', method: 'PATCH', body: { name: 'x' } })).status, 404);
});

test('studio delete archives with actor and returns 204; missing/deleted resources and retired paths cannot mutate', async (t) => {
  const { request, calls, prisma } = await studioFixture(t);
  assert.equal((await request(studioPath, { user: 'owner', method: 'DELETE' })).status, 204);
  const archived = calls.find(({ name }) => name === 'studio-archive').args;
  assert.deepEqual(archived.where, { id: 's', deletedAt: null });
  assert.equal(archived.data.deletedBy, 'owner'); assert.ok(archived.data.deletedAt instanceof Date);
  prisma.studio.findFirst = async () => null;
  for (const [method, body] of [['GET', undefined], ['PATCH', { name: 'x' }], ['DELETE', undefined]])
    assert.equal((await request(studioPath, { user: 'admin', method, body })).status, 404);
  for (const [method, route, body] of [['PATCH', '/events/e/studios/s', { name: 'x' }],
    ['DELETE', '/events/e/studios/s', undefined], ['PATCH', '/studios/s/representative', { name: 'x' }]])
    assert.equal((await request(`/api/v1${route}`, { user: 'admin', method, body })).status, 404);
});

test('judge CRUD uses strict DTOs, nullable patch fields and immutable relationships', async (t) => {
  const { request, prisma } = await fixture(t);
  const { JudgeSchema } = require('@dance/schemas');
  let stored;
  const missing = () => new (require('@prisma/client').Prisma.PrismaClientKnownRequestError)(
    'Fixture missing', { code: 'P2025', clientVersion: 'test' });
  prisma.event.findUnique = async ({ where }) => where.id === 'e' ? { id: 'e' } : null;
  prisma.user.findUnique = async ({ where }) => where.id === 'u' ? { active: true } : null;
  prisma.judge = {
    create: async ({ data }) => (stored = { id: 'j', description: null, country: null, city: null, ...data }),
    findMany: async ({ where }) => stored?.eventId === where.eventId ? [stored] : [],
    findFirst: async ({ where }) => stored?.id === where.id && stored.eventId === where.eventId ? stored : null,
    update: async ({ where, data }) => {
      if (stored?.id !== where.id || stored.eventId !== where.eventId) throw missing();
      return (stored = { ...stored, ...data });
    },
    delete: async ({ where }) => {
      if (stored?.id !== where.id || stored.eventId !== where.eventId) throw missing();
      stored = undefined;
    },
  };
  const send = (path, method = 'GET', body, user = 'admin') => request(`/api/v1/events/${path}`, { user, method, body });
  assert.equal((await send('e/judges', 'POST', { userId: 'u', name: ' Judge ' })).status, 201);
  const created = JudgeSchema.parse((await send('e/judges/j')).body);
  assert.equal(created.name, 'Judge'); assert.equal(created.description, null);
  stored.password = 'must not be returned';
  assert.deepEqual((await send('e/judges')).body, [created]);
  assert.equal((await send('e/judges/j', 'PATCH', { description: ' Note ', country: ' EE ' })).body.description, 'Note');
  assert.equal((await send('e/judges/j', 'PATCH', { description: null })).body.country, 'EE');
  for (const body of [{}, { name: '  ' }, { city: '' }, { eventId: 'other' }, { userId: 'other' }, { scores: [] }]) {
    const result = await send('e/judges/j', 'PATCH', body);
    assert.equal(result.status, 400); assert.equal(result.body.code, 'VALIDATION_ERROR');
    assert.ok(result.body.details.fields);
  }
  for (const body of [{ userId: 'u', name: 'J', eventId: 'e' }, { userId: 'u', name: ' ' }, { name: 'J' }]) {
    assert.equal((await send('e/judges', 'POST', body)).status, 400);
  }
  assert.equal((await send('e/judges', 'POST', { userId: 'missing', name: 'J' })).status, 404);
  prisma.user.findUnique = async () => ({ active: false });
  assert.equal((await send('e/judges', 'POST', { userId: 'u', name: 'J' })).status, 409);
  for (const [method, path, body] of [['GET', 'missing/judges'], ['POST', 'missing/judges', { userId: 'u', name: 'J' }],
    ['GET', 'missing/judges/j'], ['PATCH', 'missing/judges/j', { name: 'J' }], ['DELETE', 'missing/judges/j']]) {
    assert.equal((await send(path, method, body)).status, 404);
  }
  prisma.event.findUnique = async ({ where }) => ({ id: where.id });
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    const result = await send('other/judges/j', method, method === 'PATCH' ? { name: 'J' } : undefined);
    assert.equal(result.status, 404); assert.equal(result.body.code, 'NOT_FOUND');
  }
  assert.equal((await send('e/judges/j', 'DELETE')).status, 204);
  assert.equal((await send('e/judges/j')).status, 404);
  assert.deepEqual((await send('e/judges')).body, []);
});

test('judge operations enforce authentication, event read scope and admin writes', async (t) => {
  const { request, prisma, calls } = await fixture(t);
  prisma.event.findUnique = async () => ({ id: 'allowed-event' });
  prisma.judge.findFirst = async () => null;
  for (const [method, suffix, body] of [['GET', ''], ['GET', '/j'], ['POST', '', { userId: 'u', name: 'J' }],
    ['PATCH', '/j', { name: 'J' }], ['DELETE', '/j']]) {
    const path = `/api/v1/events/allowed-event/judges${suffix}`;
    assert.equal((await request(path, { method, body })).status, 401);
    const denied = await request(path.replace('allowed-event', 'other-event'), { user: 'moderator', method, body });
    assert.equal(denied.status, 403); assert.equal(denied.body.code, 'FORBIDDEN');
    if (!['GET'].includes(method)) {
      assert.equal((await request(path, { user: 'moderator', method, body })).body.code, 'FORBIDDEN');
    }
  }
  assert.equal((await request('/api/v1/events/allowed-event/judges', { user: 'moderator' })).status, 200);
  assert.equal((await request('/api/v1/events/allowed-event/judges/j', { user: 'moderator' })).status, 404);
  prisma.userRole.findMany = async () => [{ eventId: null, role: { key: 'organizer',
    permissions: [{ permission: { key: 'event.manage' } }] } }];
  assert.equal((await request('/api/v1/events/other-event/judges', { user: 'organizer' })).status, 200);
  assert.ok(calls.every(({ name }) => ['roles', 'judges'].includes(name)));
});

test('judge uniqueness, foreign key and concurrent disappearance use global errors', async (t) => {
  const { request, prisma } = await fixture(t);
  const { Prisma } = require('@prisma/client');
  prisma.event.findUnique = async () => ({ id: 'e' });
  prisma.user.findUnique = async () => ({ active: true });
  for (const [method, code, expected] of [['POST', 'P2002', 409], ['POST', 'P2003', 409],
    ['PATCH', 'P2025', 404], ['DELETE', 'P2025', 404], ['DELETE', 'P2003', 409]]) {
    const operation = { POST: 'create', PATCH: 'update', DELETE: 'delete' }[method];
    prisma.judge[operation] = async () => { throw new Prisma.PrismaClientKnownRequestError('Fixture', { code, clientVersion: 'test' }); };
    const result = await request(`/api/v1/events/e/judges${method === 'POST' ? '' : '/j'}`, {
      user: 'admin', method, body: method === 'POST' ? { userId: 'u', name: 'J' } : method === 'PATCH' ? { name: 'J' } : undefined,
    });
    assert.equal(result.status, expected); assert.equal(result.body.statusCode, expected);
    assert.equal(result.body.code, expected === 409 ? 'CONFLICT' : 'NOT_FOUND');
    assert.ok(Number.isFinite(Date.parse(result.body.timestamp)));
  }
});

async function eventFixture(t) {
  const f = await fixture(t);
  let stored;
  f.prisma.event = {
    create: async ({ data }) => (stored = { id: 'e', createdAt: new Date('2026-01-01'),
      stage: 'PRE_REGISTRATION', venue: null, country: null, city: null, description: null,
      maxStudios: null, maxPerformances: null, imageUrl: null, ...data }),
    findUnique: async ({ where }) => stored?.id === where.id ? stored : null,
    findMany: async (args) => { f.calls.push({ name: 'event-list', args }); return stored ? [stored] : []; },
    update: async ({ data }) => (stored = { ...stored, ...data }),
  };
  f.prisma.$transaction = async (work, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    return work(f.prisma);
  };
  return { ...f, stored: () => stored };
}
const eventInput = { name: ' Event ', startsAt: '2026-11-01T10:00:00+02:00', endsAt: '2026-11-01T12:00:00+02:00' };

test('event CRUD contracts include stored nullable fields and omit private/nonexistent fields', async (t) => {
  const { request, stored, calls } = await eventFixture(t);
  const { EventSchema } = require('@dance/schemas');
  const created = await request('/api/v1/events', { user: 'admin', method: 'POST', body: {
    ...eventInput, venue: ' Hall ', country: ' EE ', city: ' Tallinn ', description: ' Description ',
    maxStudios: 20, maxPerformances: 100, stage: 'REGISTRATION_OPEN',
  } });
  assert.equal(created.status, 201);
  const event = EventSchema.parse(created.body);
  assert.equal(event.name, 'Event'); assert.equal(event.venue, 'Hall');
  assert.equal(event.startsAt, '2026-11-01T08:00:00.000Z');
  assert.equal(event.maxStudios, 20); assert.equal(event.imageUrl, null);
  stored().imagePath = 'private'; stored().password = 'private';
  const read = await request('/api/v1/events/e', { user: 'moderator' });
  assert.deepEqual(read.body, event);
  assert.deepEqual((await request('/api/v1/events', { user: 'moderator' })).body, [event]);
  assert.deepEqual(calls.find(c => c.name === 'event-list').args.orderBy, [{ startsAt: 'asc' }, { id: 'asc' }]);
  const patched = await request('/api/v1/events/e', { user: 'admin', method: 'PATCH', body: {
    city: null, venue: null, description: null, maxStudios: null, maxPerformances: 50,
  } });
  assert.equal(patched.status, 200); assert.equal(patched.body.city, null);
  assert.equal(patched.body.country, 'EE'); assert.equal(patched.body.maxPerformances, 50);
});

test('event operations require authentication and all non-admin write scopes fail with standard errors', async (t) => {
  const { request, prisma, stored } = await eventFixture(t);
  for (const [method, path, body] of [['GET', '/events'], ['GET', '/events/e'],
    ['POST', '/events', eventInput], ['PATCH', '/events/e', { name: 'x' }]]) {
    const result = await request(`/api/v1${path}`, { method, body });
    assert.equal(result.status, 401); assert.equal(result.body.code, 'UNAUTHORIZED');
  }
  for (const scope of ['allowed-event', 'e', 'other', null]) {
    prisma.userRole.findMany = async () => [{ eventId: scope, role: { key: 'organizer',
      permissions: [{ permission: { key: 'event.manage' } }] } }];
    for (const [method, suffix, body] of [['POST', '', eventInput], ['PATCH', '/e', { name: 'x' }]]) {
      const result = await request(`/api/v1/events${suffix}`, { user: 'organizer', method, body });
      assert.equal(result.status, 403); assert.equal(result.body.code, 'FORBIDDEN');
      assert.equal(result.body.statusCode, 403); assert.ok(Number.isFinite(Date.parse(result.body.timestamp)));
    }
  }
  assert.equal(stored(), undefined);
  assert.deepEqual((await request('/api/v1/events', { user: 'organizer' })).body, []);
});

test('event strict mutation validation and partial date ordering reject invalid writes without changes', async (t) => {
  const { request, stored } = await eventFixture(t);
  const send = (body, method = 'PATCH') => request(`/api/v1/events${method === 'PATCH' ? '/e' : ''}`, { user: 'admin', method, body });
  assert.equal((await send(eventInput, 'POST')).status, 201);
  const before = { ...stored() };
  for (const body of [{}, { name: ' ' }, { name: null }, { venue: '' }, { maxStudios: 0 },
    { maxPerformances: 1.5 }, { maxStudios: 2147483648 }, { stage: 'LIVE' },
    { startsAt: '2026-11-01' }, { endsAt: '2026-02-30T12:00:00Z' },
    { startsAt: '2026-11-01T10:00:00Z' }, { endsAt: '2026-11-01T08:00:00Z' },
    { id: 'other' }, { imageUrl: 'url' }, { imagePath: 'path' }, { updatedAt: 'now' }, { createdAt: 'now' }]) {
    const result = await send(body);
    assert.equal(result.status, 400, JSON.stringify(body)); assert.equal(result.body.code, 'VALIDATION_ERROR');
    assert.ok(result.body.details.fields); assert.deepEqual(stored(), before);
  }
  for (const extra of [{ imageUrl: 'url' }, { name: ' ' }, { maxPerformances: -1 },
    { endsAt: eventInput.startsAt }, { startsAt: '2026-11-01T10:00:00' }]) {
    assert.equal((await send({ ...eventInput, ...extra }, 'POST')).status, 400);
  }
  const result = await send({ startsAt: '2026-11-02T08:00:00Z', endsAt: '2026-11-02T09:00:00Z' });
  assert.equal(result.status, 200);
  assert.equal((await send({ endsAt: '2026-11-02T10:00:00Z' })).status, 200);
});

test('event missing records and transaction conflicts use standard errors', async (t) => {
  const { request, prisma } = await eventFixture(t);
  for (const method of ['GET', 'PATCH']) {
    const result = await request('/api/v1/events/missing', { user: 'admin', method, body: method === 'PATCH' ? { name: 'x' } : undefined });
    assert.equal(result.status, 404); assert.equal(result.body.code, 'NOT_FOUND');
  }
  for (const [code, status] of [['P2025', 404], ['P2034', 409]]) {
    prisma.$transaction = async () => { throw new (require('@prisma/client').Prisma.PrismaClientKnownRequestError)(
      'Fixture', { code, clientVersion: 'test' }); };
    const result = await request('/api/v1/events/e', { user: 'admin', method: 'PATCH', body: { name: 'x' } });
    assert.equal(result.status, status); assert.equal(result.body.statusCode, status);
  }
});

async function authFixture(t) {
  const f = await fixture(t);
  const email = require('../dist/utils/email.js');
  const deliveries = [];
  t.mock.method(email, 'sendVerificationEmail', async data => { deliveries.push(data); });
  let user;
  f.prisma.user = {
    findUnique: async ({ where, select }) => {
      f.calls.push({ name: 'auth-user', where, select });
      return user && Object.entries(where).every(([key, value]) => user[key] === value) ? user : null;
    },
    create: async ({ data, select }) => {
      f.calls.push({ name: 'auth-create', data, select });
      return (user = { id: 'account', active: true, createdAt: new Date('2026-01-02'), roles: [], ...data });
    },
    update: async ({ data }) => (user = { ...user, ...data }),
  };
  return { ...f, deliveries, stored: () => user, setUser: value => { user = value; } };
}
const authInput = { email: 'auth-contract@example.invalid', name: ' Account ', password: 'fixture-password' };

test('auth registration validates explicit response and private fields, hashes passwords and maps duplicates', async (t) => {
  const { request, deliveries, stored, prisma } = await authFixture(t);
  const { RegisterResponseSchema, ErrorResponseSchema } = require('@dance/schemas');
  const created = await request('/api/v1/auth/register', { method: 'POST', body: authInput });
  assert.equal(created.status, 201);
  assert.equal(RegisterResponseSchema.parse(created.body).userId, 'account');
  assert.deepEqual(Object.keys(created.body).sort(), ['message', 'userId']);
  assert.equal(stored().name, 'Account'); assert.equal(stored().emailVerified, false);
  assert.notEqual(stored().password, authInput.password);
  assert.ok(await require('bcrypt').compare(authInput.password, stored().password));
  assert.equal(deliveries.length, 1); assert.equal(deliveries[0].token, stored().verificationToken);
  const duplicate = await request('/api/v1/auth/register', { method: 'POST', body: authInput });
  assert.equal(duplicate.status, 409); ErrorResponseSchema.parse(duplicate.body);
  prisma.user.findUnique = async () => null;
  prisma.user.create = async () => { throw new (require('@prisma/client').Prisma.PrismaClientKnownRequestError)(
    'Private duplicate details', { code: 'P2002', clientVersion: 'test' }); };
  const race = await request('/api/v1/auth/register', { method: 'POST', body: authInput });
  assert.equal(race.status, 409); assert.equal(race.body.error, 'Email already registered');
  assert.equal(deliveries.length, 1);
});

test('auth mutations reject unknown fields, missing values and whitespace names with shared error envelopes', async (t) => {
  const { request, calls } = await authFixture(t);
  const { ErrorResponseSchema } = require('@dance/schemas');
  for (const [path, bodies] of [
    ['register', [{}, { ...authInput, name: '  ' }, { ...authInput, password: 'short' },
      { ...authInput, isAdmin: true }, { ...authInput, roles: [] }, { ...authInput, email: 'invalid' }]],
    ['login', [{}, { email: authInput.email, password: '' }, { email: authInput.email, password: 'x', active: true }]],
    ['verify-email', [{}, { token: '' }, { token: 'x', userId: 'other' }]],
  ]) {
    for (const body of bodies) {
      const result = await request(`/api/v1/auth/${path}`, { method: 'POST', body });
      assert.equal(result.status, 400); const error = ErrorResponseSchema.parse(result.body);
      assert.equal(error.code, 'VALIDATION_ERROR'); assert.ok(error.details.fields);
    }
  }
  assert.equal(calls.length, 0);
});

test('auth login returns only a validated bearer session and preserves credential and disabled-account failures', async (t) => {
  const { request, setUser, stored } = await authFixture(t);
  const { AuthResponseSchema, ErrorResponseSchema } = require('@dance/schemas');
  const login = password => request('/api/v1/auth/login', { method: 'POST', body: { email: authInput.email, password } });
  assert.equal((await login('missing')).status, 401);
  setUser({ id: 'account', email: authInput.email, name: 'Account', active: true, emailVerified: false,
    password: await require('bcrypt').hash(authInput.password, 4), verificationToken: 'private', photoPath: 'private' });
  const invalid = await login('incorrect'); assert.equal(invalid.status, 401); ErrorResponseSchema.parse(invalid.body);
  const success = await login(authInput.password);
  assert.equal(success.status, 200); const session = AuthResponseSchema.parse(success.body);
  const claims = jwt.verify(session.token, process.env.JWT_SECRET);
  assert.equal(claims.userId, 'account'); assert.ok(claims.exp > claims.iat);
  assert.deepEqual(session.user, { id: 'account', email: authInput.email, name: 'Account' });
  stored().active = false;
  const disabled = await login(authInput.password); assert.equal(disabled.status, 403);
  assert.equal(disabled.body.error, 'Account is disabled'); ErrorResponseSchema.parse(disabled.body);
  stored().active = true; stored().password = null;
  assert.equal((await login(authInput.password)).status, 401);
});

test('auth verification returns its explicit session contract and clears the stored token', async (t) => {
  const { request, setUser, stored } = await authFixture(t);
  const { VerifyEmailResponseSchema, ErrorResponseSchema } = require('@dance/schemas');
  const verify = token => request('/api/v1/auth/verify-email', { method: 'POST', body: { token } });
  const missing = await verify('missing'); assert.equal(missing.status, 404); ErrorResponseSchema.parse(missing.body);
  setUser({ id: 'account', email: authInput.email, name: 'Account', emailVerified: true, verificationToken: 'fixture' });
  assert.equal((await verify('fixture')).status, 403);
  stored().emailVerified = false;
  const success = await verify('fixture'); assert.equal(success.status, 200);
  const session = VerifyEmailResponseSchema.parse(success.body);
  assert.equal(jwt.verify(session.token, process.env.JWT_SECRET).userId, 'account');
  assert.equal(stored().emailVerified, true); assert.equal(stored().verificationToken, null);
  assert.equal((await verify('fixture')).status, 404);
});

test('auth profile constrains identity to the caller and explicitly serializes role keys and scopes', async (t) => {
  const { request, setUser, calls } = await authFixture(t);
  const { UserProfileSchema, ErrorResponseSchema } = require('@dance/schemas');
  assert.equal((await request('/api/v1/auth/profile')).status, 401);
  const missing = await request('/api/v1/auth/profile', { user: 'account' });
  assert.equal(missing.status, 404); ErrorResponseSchema.parse(missing.body);
  setUser({ id: 'account', email: authInput.email, name: 'Account', createdAt: new Date('2026-01-02'),
    password: 'private', verificationToken: 'private', photoPath: 'private', roles: [
      { id: 'global', userId: 'account', eventId: null, roleId: 'r',
        role: { id: 'r', key: 'judge', name: 'Judge', description: 'private', permissions: ['private'] }, event: null },
      { id: 'scoped', eventId: 'e', role: { id: 's', key: 'representative', name: 'Studio Representative' },
        event: { id: 'e', name: 'Event', imagePath: 'private' } },
    ] });
  const result = await request('/api/v1/auth/profile', { user: 'account' });
  assert.equal(result.status, 200); const profile = UserProfileSchema.parse(result.body);
  assert.equal(profile.createdAt, '2026-01-02T00:00:00.000Z'); assert.equal(profile.isAdmin, false);
  assert.equal(profile.roles[0].eventId, null); assert.equal(profile.roles[1].role.key, 'representative');
  assert.equal(JSON.stringify(profile).includes('private'), false);
  const lookup = calls.filter(c => c.name === 'auth-user').at(-1);
  assert.deepEqual(lookup.where, { id: 'account' }); assert.equal(lookup.select.roles.select.role.select.key, true);
  assert.equal(lookup.select.password, undefined);
  assert.equal((await request('/api/v1/auth/profile?userId=account', { user: 'someone-else' })).status, 404);
});
