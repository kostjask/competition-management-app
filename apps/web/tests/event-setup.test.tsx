import assert from "node:assert/strict";
import { test } from "node:test";
import { CreateEventBodySchema, UpdateEventBodySchema, eventSetupBlockers } from "@dance/schemas";
import { offsetLabel, wallTime, wallTimeCandidates } from "../src/features/events/eventTime";

test("event wall times reject gaps and invalid dates and expose both offsets at folds", () => {
  assert.deepEqual(wallTimeCandidates("2026-03-29T03:30", "Europe/Tallinn"), []);
  assert.deepEqual(wallTimeCandidates("2026-10-25T03:30", "Europe/Tallinn"), ["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"]);
  assert.equal(offsetLabel("2026-10-25T00:30:00.000Z", "Europe/Tallinn"), "UTC+03:00");
  assert.equal(offsetLabel("2026-10-25T01:30:00.000Z", "Europe/Tallinn"), "UTC+02:00");
  assert.deepEqual(wallTimeCandidates("2026-02-30T10:00", "UTC"), []);
  assert.deepEqual(wallTimeCandidates("2026-01-01T10:00", "Invalid/Zone"), []);
  assert.deepEqual(wallTimeCandidates("2026-01-01T10:00", "Asia/Kathmandu"), ["2026-01-01T04:15:00.000Z"]);
  assert.equal(wallTime("2026-01-01T00:00:00.000Z", "Pacific/Honolulu"), "2025-12-31T14:00");
  assert.equal(wallTimeCandidates("2026-04-05T01:45", "Australia/Lord_Howe").length, 2);
});
test("setup contracts require revision, bound authored content and keep optional setup independent of scoring", () => {
  const ready = { venue: "Hall", country: "EE", city: "Tallinn", organizerEmail: "organizer@example.invalid", unclassifiedDescription: null };
  assert.deepEqual(eventSetupBlockers(ready), []);
  assert.deepEqual(eventSetupBlockers({ ...ready, organizerEmail: null, unclassifiedDescription: "Retained text" }), ["organizerEmail", "description"]);
  for (const body of [{ name: "Changed" }, { expectedRevision: 1 }, { expectedRevision: 0, name: "Changed" }, { expectedRevision: 1, description: "unclassified" }]) assert.equal(UpdateEventBodySchema.safeParse(body).success, false);
  assert.equal(UpdateEventBodySchema.safeParse({ expectedRevision: 1, organizerEmail: null, description: null }).success, true);
  assert.equal(CreateEventBodySchema.safeParse({ name: "Minimal", startsAt: "2026-11-11T10:00:00Z", endsAt: "2026-11-11T12:00:00Z" }).success, true);
});
