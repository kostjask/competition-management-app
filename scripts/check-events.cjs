const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { EventSchema, EventsSchema } = createRequire(path.resolve(__dirname, '../apps/api/package.json'))('@dance/schemas');

// Runs exclusively in test-baseline.cjs's disposable database.
module.exports = async function checkEvents({ client, baseUrl, adminToken }) {
  const request = async (suffix = '', method = 'GET', body) => {
    const response = await fetch(`${baseUrl}/api/v1/events${suffix}`, {
      method, headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000),
    });
    return { status: response.status, body: await response.json() };
  };
  const created = await request('', 'POST', {
    name: ' Event contract ', startsAt: '2026-11-01T10:00:00+02:00', endsAt: '2026-11-01T12:00:00+02:00',
    venue: ' Hall ', country: ' EE ', city: ' Tallinn ', description: ' Example ', maxStudios: 10, maxPerformances: 100,
  });
  assert.equal(created.status, 201);
  const event = EventSchema.parse(created.body);
  assert.equal(event.name, 'Event contract'); assert.equal(event.venue, 'Hall');
  assert.equal(event.startsAt, '2026-11-01T08:00:00.000Z'); assert.equal(event.stage, 'PRE_REGISTRATION');
  await client.event.update({ where: { id: event.id }, data: { imagePath: 'private/fixture', imageUrl: '/uploads/fixture.png' } });
  const detail = EventSchema.parse((await request(`/${event.id}`)).body);
  assert.equal(detail.imageUrl, '/uploads/fixture.png'); assert.equal('imagePath' in detail, false);
  assert.ok(EventsSchema.parse((await request()).body).some(item => item.id === event.id));
  const before = await client.event.findUniqueOrThrow({ where: { id: event.id } });
  for (const body of [{ startsAt: event.endsAt }, { endsAt: event.startsAt }, { imagePath: 'spoof' }, { maxStudios: 0 }]) {
    const invalid = await request(`/${event.id}`, 'PATCH', body);
    assert.equal(invalid.status, 400); assert.equal(invalid.body.code, 'VALIDATION_ERROR');
    assert.deepEqual(await client.event.findUniqueOrThrow({ where: { id: event.id } }), before);
  }
  const patch = await request(`/${event.id}`, 'PATCH', { venue: null, description: null, maxStudios: null, maxPerformances: 50 });
  assert.equal(patch.status, 200); assert.equal(patch.body.venue, null); assert.equal(patch.body.country, 'EE');
  const changed = await client.event.findUniqueOrThrow({ where: { id: event.id } });
  assert.equal(changed.maxStudios, null); assert.equal(changed.maxPerformances, 50); assert.equal(changed.imagePath, before.imagePath);
  // Each edit is valid against the original pair, but both together are invalid.
  for (let attempt = 0; attempt < 5; attempt++) {
    await client.event.update({ where: { id: event.id }, data: {
      startsAt: new Date('2026-11-01T08:00:00Z'), endsAt: new Date('2026-11-01T10:00:00Z'),
    } });
    const results = await Promise.all([
      request(`/${event.id}`, 'PATCH', { startsAt: '2026-11-01T09:00:00Z' }),
      request(`/${event.id}`, 'PATCH', { endsAt: '2026-11-01T08:30:00Z' }),
    ]);
    assert.equal(results.filter(result => result.status === 200).length, 1);
    assert.ok(results.every(result => [200, 400, 409].includes(result.status)));
    const stored = await client.event.findUniqueOrThrow({ where: { id: event.id } });
    assert.ok(stored.startsAt < stored.endsAt, 'Concurrent date edits preserve ordering');
  }
  for (const method of ['GET', 'PATCH']) {
    const missing = await request('/missing-event-contract', method, method === 'PATCH' ? { name: 'x' } : undefined);
    assert.equal(missing.status, 404); assert.equal(missing.body.code, 'NOT_FOUND');
  }
  console.log('Event DTOs, nullable persistence, date validation and concurrent date edits passed.');
};
