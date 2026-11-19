import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath, ReturnPathSchema, EntryCommandSchema } from "@dance/schemas";

test("submission recovery keeps only supported checkpoint destinations", () => {
  const path = "/events/e/studios/s/performances";
  for (const suffix of ["?entry=review", "?entry=review&checkpoint=BASIC", "/p/edit?entry=review&checkpoint=FINAL"]) {
    assert.equal(safeReturnPath(path + suffix), "/app" + path + suffix);
    assert.equal(safeReturnPath("/app" + path + suffix), "/app" + path + suffix);
  }
  for (const suffix of ["?entry=review&checkpoint=FINAL&checkpoint=BASIC", "?entry=review&next=//evil.invalid", "?entry=review&checkpoint=ADMIN", "?entry=review#edit-title"]) {
    assert.equal(ReturnPathSchema.safeParse(path + suffix).success, false);
  }
});

test("submission commands require the exact reviewed-source fingerprint", () => {
  const command = { action: "SUBMIT", operationId: crypto.randomUUID(), expectedRevision: 1, expectedReview: "a".repeat(64) };
  assert.equal(EntryCommandSchema.safeParse(command).success, true);
  for (const expectedReview of [undefined, "", "a".repeat(63), "a".repeat(65), "G".repeat(64)]) {
    assert.equal(EntryCommandSchema.safeParse({ ...command, expectedReview }).success, false);
  }
});
