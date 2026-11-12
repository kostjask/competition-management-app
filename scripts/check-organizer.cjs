const assert = require("node:assert/strict");
module.exports = async function checkOrganizer({ client, baseUrl, adminToken, login }) {
  const template = await client.user.findUniqueOrThrow({ where: { email: "admin@test.com" } });
  const owner = await client.user.create({
    data: {
      email: "organizer-owner@example.invalid",
      name: "Organizer fixture owner",
      emailVerified: true,
      password: template.password,
      preferredLocale: "ru",
    },
  });
  const outsiderToken = await login(baseUrl, "judge@test.com");
  const ownerToken = await login(baseUrl, owner.email);
  const send = async (path, method = "GET", body, token = adminToken) => {
    const response = await fetch(baseUrl + "/api/v1" + path, {
      method,
      headers: {
        ...(token && { Authorization: "Bearer " + token }),
        "Content-Type": "application/json",
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10000),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  };
  const input = {
    name: "Organizer integration",
    startsAt: "2099-10-25T10:00:00+02:00",
    endsAt: "2099-10-25T12:00:00+02:00",
    timeZone: "Europe/Tallinn",
    organizerEmail: "organizer@example.invalid",
    organizerPhone: "+372 555 1234",
    venue: "Fixture hall",
    city: "Tallinn",
    country: "EE",
    maxStudios: 10,
    maxPerformances: 20,
    description: "Legacy text",
  };
  const created = await send("/events", "POST", input);
  assert.equal(created.status, 201);
  const event = created.body;
  const path = "/events/" + event.id;
  assert.equal(event.authoredDescription, null);
  assert.equal(event.description, input.description);
  const content = {
    sourceLocale: "et",
    sourceText: "Fixture source text",
    translations: { en: "Fixture translation" },
  };
  const saved = await send(path, "PATCH", {
    authoredDescription: content,
    description: null,
    expectedRevision: event.revision,
  });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.authoredDescription, content);
  assert.equal(saved.body.description, null);
  assert.equal(
    (await send(path, "PATCH", { city: "Stale", expectedRevision: event.revision })).status,
    409,
  );
  assert.equal(
    (
      await send(path, "PATCH", {
        stage: "REGISTRATION_OPEN",
        expectedStage: "PRE_REGISTRATION",
        expectedRevision: saved.body.revision,
      })
    ).status,
    200,
    "No scoring prerequisite",
  );
  for (const body of [
    { organizerEmail: "bad" },
    { authoredDescription: { ...content, translations: { et: "Spoof" } } },
    { timeZone: "Invalid/Zone" },
    { registrationDeadline: "2100-01-01T00:00:00Z" },
  ])
    assert.equal((await send(path, "PATCH", body)).status, 400);
  const application = await send(
    path + "/studio-registrations",
    "POST",
    {
      name: "Organizer studio",
      representativeName: owner.name,
      representativeEmail: "contact-does-not-establish-identity@example.invalid",
    },
    ownerToken,
  );
  assert.equal(application.status, 201);
  const studioId = application.body.studioId;
  const registrationId = application.body.id;
  const decisionPath = path + "/studio-registrations/" + studioId;
  const overview = () => send(path + "/review");
  const current = async () =>
    (await overview()).body.applications.find((a) => a.studio.id === studioId);
  for (const token of ["", outsiderToken, ownerToken]) {
    assert.equal((await send(path + "/review", "GET", undefined, token)).status, token ? 403 : 401);
    assert.equal(
      (await send(path + "/review/no-such-id/retry", "POST", {}, token)).status,
      token ? 403 : 401,
    );
  }
  assert.equal((await send("/events/missing/review")).status, 404);
  assert.equal((await send(path + "/review/missing/retry", "POST", {})).status, 404);
  let row = await current();
  assert.equal(row.registration.nextActor, "ORGANIZER");
  assert.equal(row.notifications.length, 0);
  let decision = await send(decisionPath, "PATCH", {
    status: "APPROVED",
    revision: row.registration.revision,
  });
  assert.equal(decision.status, 200);
  row = await current();
  assert.equal(row.studio.approvalStatus, "PENDING");
  assert.equal(row.notifications.length, 1);
  assert.equal(row.notifications[0].delivery, "TEST_ONLY");
  assert.equal(row.notifications[0].kind, "EVENT");
  assert.equal(
    (await send(decisionPath, "PATCH", { status: "APPROVED", revision: application.body.revision }))
      .status,
    200,
  );
  assert.equal(
    (await current()).notifications.length,
    1,
    "Matching retry does not duplicate notifications",
  );
  assert.equal(
    (
      await send("/studios/" + studioId + "/approval", "PATCH", {
        status: "APPROVED",
        eventId: "foreign",
        revision: row.registration.revision,
      })
    ).status,
    404,
  );
  const org = { status: "APPROVED", eventId: event.id, revision: row.registration.revision };
  assert.equal(
    (await send("/studios/" + studioId + "/approval", "PATCH", org, ownerToken)).status,
    403,
  );
  assert.equal((await send("/studios/" + studioId + "/approval", "PATCH", org)).status, 200);
  assert.equal((await send("/studios/" + studioId + "/approval", "PATCH", org)).status, 200);
  row = await current();
  assert.equal(row.notifications.length, 2);
  assert.ok(row.history.some((h) => h.action === "STUDIO_APPROVAL_CHANGED"));
  assert.equal(
    (
      await send(decisionPath, "PATCH", {
        status: "REJECTED",
        revision: org.revision,
        reason: "CAPACITY",
      })
    ).status,
    409,
    "Organization decision invalidates stale event review",
  );
  const beforeNotifications = await client.reviewNotification.count({ where: { registrationId } });
  // PostgreSQL refuses notification intent; the decision, derived access and audit must roll back.
  await client.$executeRawUnsafe(
    `CREATE FUNCTION organizer_reject_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture rollback'; END $$`,
  );
  await client.$executeRawUnsafe(
    `CREATE TRIGGER organizer_reject_notification BEFORE INSERT ON "ReviewNotification" FOR EACH ROW EXECUTE FUNCTION organizer_reject_notification()`,
  );
  const before = await client.studioEventRegistration.findUniqueOrThrow({
    where: { id: registrationId },
  });
  const audits = await client.auditLog.count({ where: { eventId: event.id } });
  try {
    assert.equal(
      (
        await send(decisionPath, "PATCH", {
          status: "REJECTED",
          reason: "CAPACITY",
          revision: before.revision,
        })
      ).status,
      500,
    );
  } finally {
    await client.$executeRawUnsafe(
      'DROP TRIGGER organizer_reject_notification ON "ReviewNotification"',
    );
    await client.$executeRawUnsafe("DROP FUNCTION organizer_reject_notification()");
  }
  assert.deepEqual(
    await client.studioEventRegistration.findUniqueOrThrow({ where: { id: registrationId } }),
    before,
  );
  assert.equal(await client.auditLog.count({ where: { eventId: event.id } }), audits);
  assert.equal(
    await client.reviewNotification.count({ where: { registrationId } }),
    beforeNotifications,
  );
  const races = await Promise.all(
    ["REJECTED", "PENDING"].map((status) =>
      send(decisionPath, "PATCH", { status, revision: before.revision }),
    ),
  );
  assert.ok(races.some((r) => r.status === 200));
  assert.ok(races.some((r) => r.status === 409));
  row = await current();
  const notice = row.notifications[0];
  assert.equal((await send(path + "/review/" + notice.id + "/retry", "POST", {})).status, 204);
  const other = await send("/events", "POST", { ...input, name: "Other organizer event" });
  assert.equal(
    (await send("/events/" + other.body.id + "/review/" + notice.id + "/retry", "POST", {})).status,
    404,
  );
  assert.equal((await send(path + "/review/" + notice.id + "/retry", "POST", { recipientId: "spoofed" })).status, 400);
  const delivery = await client.emailDelivery.create({ data: { id: require('node:crypto').randomUUID(), ciphertext: 'synthetic', expiresAt: new Date(Date.now() + 3600000) } });
  await client.reviewNotification.update({ where: { id: notice.id }, data: { deliveryId: delivery.id } });
  assert.equal((await send(path + '/review/' + notice.id + '/retry', 'POST', {})).status, 204);
  assert.equal((await client.reviewNotification.findUniqueOrThrow({ where: { id: notice.id } })).deliveryId, delivery.id, 'Pending intent is not duplicated');
  await client.emailDelivery.update({ where: { id: delivery.id }, data: { state: 'ACCEPTED', ciphertext: null, acceptedAt: new Date(), providerId: 'synthetic-provider-receipt' } });
  assert.equal((await send(path + '/review/' + notice.id + '/retry', 'POST', {})).status, 204);
  assert.equal((await current()).notifications.find(n => n.id === notice.id).delivery, 'ACCEPTED');
  await client.emailDelivery.update({ where: { id: delivery.id }, data: { state: 'PENDING', acceptedAt: null, providerId: null, createdAt: new Date(0), expiresAt: new Date(1), ciphertext: 'synthetic' } });
  await client.studioRepresentative.updateMany({ where: { studioId }, data: { active: false } });
  assert.equal((await send(path + '/review/' + notice.id + '/retry', 'POST', {})).status, 403);
  await client.studioRepresentative.updateMany({ where: { studioId }, data: { active: true } });
  assert.equal((await send(path + '/review/' + notice.id + '/retry', 'POST', {})).status, 204);
  assert.equal((await client.emailDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).state, 'CANCELLED');
  assert.equal((await client.emailDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).ciphertext, null);
  // Remove only this suite's synthetic transport receipt; later worker fixtures count their own receipts.
  await client.emailDelivery.delete({ where: { id: delivery.id } });
  // Private dispatch fields and account identity are never part of the organizer overview.
  const serialized = JSON.stringify((await overview()).body);
  for (const field of ["ciphertext", "requestDigest", "recipientId", "bindingDigest", "password"])
    assert.equal(serialized.includes('"' + field + '"'), false);
  await client.studio.update({ where: { id: studioId }, data: { deletedAt: new Date() } });
  assert.equal((await overview()).body.applications.length, 0);
  assert.equal((await send(path + "/review/" + notice.id + "/retry", "POST", {})).status, 404);
  console.log(
    "PASS: organizer setup/content/revisions, independent decisions, scope/active/identity denials, durable notification deduplication, decision race and PostgreSQL notification/audit rollback.",
  );
};
