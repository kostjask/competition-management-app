import assert from "node:assert/strict";
import { test } from "node:test";
import { matchingInstants, wallTime, resolveWallTime } from "../src/pages/events/eventTime";

test("event wall times reject DST gaps and invalid dates, and expose both fold offsets", () => {
  assert.deepEqual(matchingInstants("2026-03-29T03:30", "Europe/Tallinn"), []);
  assert.deepEqual(matchingInstants("2026-10-25T03:30", "Europe/Tallinn"), [
    "2026-10-25T00:30:00.000Z",
    "2026-10-25T01:30:00.000Z",
  ]);
  assert.deepEqual(matchingInstants("2026-02-30T10:00", "UTC"), []);
  assert.deepEqual(matchingInstants("2026-01-01T10:00", "Invalid/Zone"), []);
  assert.deepEqual(matchingInstants("2026-11-05T10:00", "UTC"), ["2026-11-05T10:00:00.000Z"]);
  assert.deepEqual(matchingInstants("2026-01-01T10:00", "Asia/Kathmandu"), [
    "2026-01-01T04:15:00.000Z",
  ]);
  assert.equal(wallTime("2026-10-25T01:30:00Z", "Europe/Tallinn"), "2026-10-25T03:30");
});

test("unmodified event wall times preserve stored precision and explicit fold selection", () => {
  const original = "2026-10-25T00:30:45.123Z";
  assert.equal(resolveWallTime("2026-10-25T03:30", "Europe/Tallinn", "2026-10-25T00:30:00.000Z", original, "Europe/Tallinn"), original);
  assert.equal(resolveWallTime("2026-10-25T03:30", "Europe/Tallinn", "2026-10-25T01:30:00.000Z", original, "Europe/Tallinn"), "2026-10-25T01:30:00.000Z");
  assert.equal(resolveWallTime("2026-10-25T03:30", "Europe/Tallinn", undefined, original, "Europe/Tallinn"), undefined);
});
