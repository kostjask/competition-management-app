import { test } from "node:test";
import assert from "node:assert/strict";
import { eventCalendarDays, ApplicationEstimateCountsSchema, SaveApplicationEstimatesSchema } from "@dance/schemas";

test("event estimates enumerate local dates across DST, leap days and viewer-independent midnight", () => {
  assert.deepEqual(eventCalendarDays("2026-03-28T23:00:00Z", "2026-03-30T00:00:00Z", "Europe/Tallinn"), ["2026-03-29", "2026-03-30"]);
  assert.deepEqual(eventCalendarDays("2028-02-28T12:00:00Z", "2028-03-01T12:00:00Z", "UTC"), ["2028-02-28", "2028-02-29", "2028-03-01"]);
  assert.deepEqual(eventCalendarDays("2026-11-01T03:00:00Z", "2026-11-02T06:00:00Z", "America/New_York"), ["2026-10-31", "2026-11-01", "2026-11-02"]);
});
test("estimates distinguish zero from absent and reject duplicates, fractions and authority injection", () => {
  assert.equal(ApplicationEstimateCountsSchema.safeParse([{ date: "2026-01-01", count: 0 }]).success, true);
  for (const counts of [[], [{ date: "2026-01-01" }], [{ date: "2026-01-01", count: -1 }], [{ date: "2026-01-01", count: 1.5 }], [{ date: "2026-02-30", count: 1 }], [{ date: "2026-01-01", count: 1 }, { date: "2026-01-01", count: 2 }]]) assert.equal(ApplicationEstimateCountsSchema.safeParse(counts).success, false);
  assert.equal(SaveApplicationEstimatesSchema.safeParse({ operationId: crypto.randomUUID(), revision: 1, eventRevision: 1, counts: [{ date: "2026-01-01", count: 0 }], actorId: "other" }).success, false);
});
