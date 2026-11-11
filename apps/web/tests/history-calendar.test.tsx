import assert from "node:assert/strict";
import { test } from "node:test";
import { ageOnDate, eventAgeDate, DancerBirthDateSchema, UpdatePerformanceBodySchema, PerformanceDeleteQuerySchema, PerformanceSnapshotSchema } from "@dance/schemas";

test("eligibility uses the event calendar day across midnight and DST transitions", () => {
  assert.equal(eventAgeDate("2026-11-01T00:30:00Z", "America/Los_Angeles"), "2026-10-31");
  assert.equal(eventAgeDate("2026-01-01T12:30:00Z", "Pacific/Kiritimati"), "2026-01-02");
  assert.equal(eventAgeDate("2026-03-29T00:59:59Z", "Europe/Tallinn"), "2026-03-29");
  assert.equal(eventAgeDate("2026-03-29T01:00:00Z", "Europe/Tallinn"), "2026-03-29");
  assert.equal(eventAgeDate("2026-10-25T00:30:00Z", "Europe/Tallinn"), "2026-10-25");
  assert.equal(eventAgeDate("2026-10-25T01:30:00Z", "Europe/Tallinn"), "2026-10-25");
  assert.throws(() => eventAgeDate("2026-11-01", "UTC"));
  assert.throws(() => eventAgeDate("2026-11-01T00:00:00Z", "Invalid/Zone"));
});

test("completed age preserves leap birthdays and rejects invalid/future calendar dates", () => {
  assert.equal(ageOnDate("2012-02-29", "2025-02-28"), 12);
  assert.equal(ageOnDate("2012-02-29", "2025-03-01"), 13);
  assert.equal(ageOnDate("2012-02-29", "2024-02-29"), 12);
  assert.equal(ageOnDate("2012-02-29", "2012-02-29"), 0);
  assert.equal(ageOnDate("2010-12-31", "2026-12-30"), 15);
  assert.equal(ageOnDate("2010-12-31", "2026-12-31"), 16);
  assert.throws(() => ageOnDate("2011-02-29", "2026-01-01"));
  assert.equal(DancerBirthDateSchema.safeParse("0000-01-01").success, false);
  assert.throws(() => ageOnDate("2027-01-01", "2026-01-01"));
});

test("revisioned mutations require a positive expectation and snapshot contracts reject private extras", () => {
  for (const input of [{ title: "Changed" }, { expectedRevision: 1 }, { title: "Changed", expectedRevision: 0 }]) {
    assert.equal(UpdatePerformanceBodySchema.safeParse(input).success, false);
  }
  assert.equal(UpdatePerformanceBodySchema.safeParse({ title: "Changed", expectedRevision: 1 }).success, true);
  for (const input of [{}, { expectedRevision: ["1", "2"] }, { expectedRevision: "0" }, { expectedRevision: "1", actorId: "x" }]) {
    assert.equal(PerformanceDeleteQuerySchema.safeParse(input).success, false);
  }
  assert.equal(PerformanceDeleteQuerySchema.parse({ expectedRevision: "1" }).expectedRevision, 1);
  assert.equal(PerformanceSnapshotSchema.safeParse({ policyVersion: 1, email: "private@example.invalid" }).success, false);
});
