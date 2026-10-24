const assert = require('node:assert/strict');
// Runs exclusively in the baseline-owned disposable database.
module.exports = async function checkSetup({ client, baseUrl, adminToken }) {
  const event = await client.event.create({ data: { name: 'Setup checks', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
  const other = await client.event.create({ data: { name: 'Other setup checks', startsAt: new Date('2026-11-01'), endsAt: new Date('2026-11-02') } });
  const request = async (path, method = 'GET', body) => {
    const res = await fetch(baseUrl + '/api/v1/events/' + path, { method, headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' }, ...(body !== undefined && { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };
  const entries = [];
  for (const [path, delegate, body, invalid, clear] of [
    ['formats', 'danceFormat', { name: ' Solo ', minParticipants: 1, maxParticipants: 2, maxDurationSeconds: 60 }, { minParticipants: 3 }, { maxParticipants: 5 }],
    ['age-groups', 'ageGroup', { name: ' Junior ', minAge: 8, maxAge: 12 }, { minAge: 13 }, { maxAge: null }],
  ]) {
    const url = event.id + '/' + path;
    const created = await request(url, 'POST', body); assert.equal(created.status, 201);
    const id = created.body.id; entries.push(id);
    assert.equal(created.body.name, body.name.trim());
    assert.equal((await request(url, 'POST', body)).status, 201, 'Existing setup models deliberately permit duplicate labels');
    assert.equal((await request(other.id + '/' + path, 'POST', body)).status, 201);
    for (const method of ['GET', 'PATCH', 'DELETE']) assert.equal((await request(other.id + '/' + path + '/' + id, method, method === 'PATCH' ? { name: 'Blocked' } : undefined)).status, 404);
    const before = await client[delegate].findUniqueOrThrow({ where: { id } });
    assert.equal((await request(url + '/' + id, 'PATCH', invalid)).status, 400);
    assert.deepEqual(await client[delegate].findUniqueOrThrow({ where: { id } }), before);
    assert.equal((await request(url + '/' + id, 'PATCH', clear)).status, 200);
    if (path === 'age-groups') assert.equal((await client[delegate].findUniqueOrThrow({ where: { id } })).maxAge, null);
    const race = await Promise.all([request(url, 'POST', { ...body, name: 'Concurrent' }), request(url, 'POST', { ...body, name: 'Concurrent' })]);
    assert.deepEqual(race.map(r => r.status).sort(), [201, 201]);
    const spare = await request(url, 'POST', { ...body, name: 'Spare' });
    assert.equal((await request(url + '/' + spare.body.id, 'PATCH', { name: body.name.trim() })).status, 200);
    assert.equal((await client[delegate].findUniqueOrThrow({ where: { id: spare.body.id } })).name, body.name.trim());
    assert.equal((await request(url + '/' + spare.body.id, 'DELETE')).status, 204);
  }
  const category = await client.danceCategory.create({ data: { eventId: event.id, name: 'Setup category' } });
  const performance = await client.performance.create({ data: { eventId: event.id, categoryId: category.id, formatId: entries[0], ageGroupId: entries[1], title: 'Setup use', durationSec: 60, orderOnStage: 1 } });
  for (const archived of [false, true]) {
    if (archived) await client.performance.update({ where: { id: performance.id }, data: { deletedAt: new Date() } });
    for (const [path, id] of [['formats', entries[0]], ['age-groups', entries[1]]]) {
      const blocked = await request(event.id + '/' + path + '/' + id, 'DELETE'); assert.equal(blocked.status, 409); assert.equal(blocked.body.reason, 'relationshipConflict');
    }
    assert.ok(await client.performance.findUnique({ where: { id: performance.id } }));
  }
  // Competing valid partial edits must not produce an invalid combined range.
  for (const [path, delegate, data, first, second, valid] of [
    ['formats', 'danceFormat', { eventId: event.id, name: 'Concurrent range', minParticipants: 1, maxParticipants: 10, maxDurationSeconds: 60 }, { minParticipants: 8 }, { maxParticipants: 5 }, row => row.minParticipants <= row.maxParticipants],
    ['age-groups', 'ageGroup', { eventId: event.id, name: 'Concurrent range', minAge: 1, maxAge: 10 }, { minAge: 8 }, { maxAge: 5 }, row => row.maxAge === null || row.minAge <= row.maxAge],
  ]) {
    const row = await client[delegate].create({ data });
    const results = await Promise.all([request(event.id + '/' + path + '/' + row.id, 'PATCH', first), request(event.id + '/' + path + '/' + row.id, 'PATCH', second)]);
    assert.ok(results.every(r => [200, 400, 409].includes(r.status)));
    assert.equal(results.filter(r => r.status === 200).length, 1);
    assert.ok(valid(await client[delegate].findUniqueOrThrow({ where: { id: row.id } })));
  }
  console.log('Setup CRUD, conflicts, archived-performance preservation and concurrent partial ranges passed.');
};
