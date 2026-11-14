import assert from "node:assert/strict";
import { test } from "node:test";
import { EntryConfigurationBodySchema, EntryOptionsSchema, PerformanceLifecycleBodySchema, type EntrySettings } from "@dance/schemas";
import { danceExpressPreset, presetNames, type PresetNames } from "../src/pages/performances/entryPreset";
import { getTranslation } from "../src/i18n/translations";

test("Dance Express copies all allowed nominations, preserves windows and reuses exact existing options", () => {
  const names: PresetNames = {
    stage: "Stage", contemporary: "Contemporary", lyrical: "Lyrical", folk: "Folk", folkStylized: "Folk styled", show: "Show", street: "Street", classical: "Classical", ballroom: "Ballroom", kids: "Kids",
    big: "Big", small: "Small", duet: "Duet", solo: "Solo", kidsAge: "Up to 7", age7: "7–10", age11: "11–13", age14: "14–17", age18: "18–25", age26: "26+",
  };
  let next = 0; const id = () => `option-${++next}`;
  const settings: EntrySettings = { basic: { enabled: false, deadline: "2026-12-01T10:00:00Z" }, final: { enabled: true, deadline: null }, allowYounger: false, olderPercent: 0, requireTeacher: false, requireAuthor: false, nominations: [] };
  const first = danceExpressPreset({ categories: [], ages: [], formats: [] }, settings, names, id);
  assert.equal(EntryConfigurationBodySchema.safeParse({ expectedRevision: 0, ...first }).success, true);
  assert.equal(first.settings.nominations.length, 182); assert.equal(first.options.categories.length, 10);
  assert.equal(first.options.ages.length, 6); assert.equal(first.options.formats.length, 4);
  assert.deepEqual(first.settings.basic, settings.basic); assert.deepEqual(first.settings.final, settings.final);
  const kids = first.options.categories.find(row => row.name === "Kids")!;
  const kidsRows = first.settings.nominations.filter(row => row.categoryId === kids.id);
  assert.equal(kidsRows.length, 2); assert.ok(kidsRows.every(row => row.maxDurationSeconds === 210));
  const big = first.options.formats.find(row => row.name === "Big")!;
  assert.equal(big.maxParticipants, null); assert.equal(big.minParticipants, 7);
  assert.equal(first.options.ages.filter(row => row.minAge <= 7 && (row.maxAge === null || row.maxAge >= 7)).length, 2);
  assert.deepEqual(danceExpressPreset(first.options, first.settings, names, id), first);
  const other = danceExpressPreset({ categories: [], ages: [], formats: [] }, settings, names, id);
  assert.ok(other.settings.nominations.every(row => !first.options.categories.some(existing => existing.id === row.categoryId)));
  for (const locale of ["et", "en", "ru"] as const) for (const key of presetNames) assert.notEqual(getTranslation(`Entry.preset_${key}`, locale), `Entry.preset_${key}`);
});

test("lifecycle and option contracts reject spoofing, invalid bounds and duplicate identifiers", () => {
  const body = { expectedRevision: 1, operationId: "99780545-8d44-43db-ad08-58468ba5c710", action: "RESTORE", reason: "Reviewed" };
  assert.equal(PerformanceLifecycleBodySchema.safeParse(body).success, true);
  for (const patch of [{ expectedRevision: 0 }, { operationId: "bad" }, { reason: " " }, { studioId: "foreign" }, { action: "SUBMIT" }]) assert.equal(PerformanceLifecycleBodySchema.safeParse({ ...body, ...patch }).success, false);
  assert.equal(EntryOptionsSchema.safeParse({ categories: [{ id: "c", name: "First" }, { id: "c", name: "Second" }], ages: [], formats: [] }).success, false);
  assert.equal(EntryOptionsSchema.safeParse({ categories: [], ages: [{ id: "a", name: "Invalid range", minAge: 8, maxAge: 7 }], formats: [] }).success, false);
  assert.equal(EntryOptionsSchema.safeParse({ categories: [], ages: [], formats: [{ id: "f", name: "Invalid group", minParticipants: 7, maxParticipants: 6, maxDurationSeconds: 240 }] }).success, false);
});
