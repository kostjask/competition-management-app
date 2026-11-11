import assert from "node:assert/strict";
import { test } from "node:test";
import { CreatePerformanceBodySchema, UpdatePerformanceBodySchema } from "@dance/schemas";

test("drafts accept omitted selections, empty participants and explicit clearing without a stage order", () => {
  const draft = CreatePerformanceBodySchema.parse({ studioId: "s" });
  assert.equal(draft.title, null);
  assert.equal(draft.orderOnStage, null);
  assert.deepEqual(draft.dancerIds, []);
  assert.equal(UpdatePerformanceBodySchema.safeParse({ expectedRevision: 1, categoryId: null, dancerIds: [] }).success, true);
  for (const body of [{ durationSec: 0 }, { orderOnStage: -1 }, { dancerIds: ["d", "d"] }, { title: " " }]) {
    assert.equal(CreatePerformanceBodySchema.safeParse({ studioId: "s", ...body }).success, false);
  }
});
