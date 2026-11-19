import { test } from "node:test";
import assert from "node:assert/strict";
import { MusicCommandSchema, MusicVersionSchema, MusicTrackSchema, nextMusicState } from "@dance/schemas";

test("music confirmation, organizer acceptance and explicit reopening are separate transitions", () => {
  assert.equal(nextMusicState("DRAFT", "CONFIRM", false, false), null);
  assert.equal(nextMusicState("DRAFT", "CONFIRM", true, false), "CONFIRMED");
  assert.equal(nextMusicState("CONFIRMED", "REPLACE", true, false), null);
  assert.equal(nextMusicState("CONFIRMED", "ACCEPT", true, false), null);
  assert.equal(nextMusicState("CONFIRMED", "ACCEPT", true, true), "ACCEPTED");
  assert.equal(nextMusicState("ACCEPTED", "REOPEN", true, false), null);
  assert.equal(nextMusicState("ACCEPTED", "REOPEN", true, true), "DRAFT");
  assert.equal(nextMusicState("DRAFT", "REPLACE", true, false), "DRAFT");
});
test("music metadata cannot expose storage or accept path names; commands pin version and reason", () => {
  const version = { id: crypto.randomUUID(), displayName: "Dance.mp3", detectedMime: "audio/mpeg", byteLength: 1024, durationMs: 60000, createdAt: "2026-11-18T00:00:00Z" };
  assert.equal(MusicVersionSchema.safeParse(version).success, true);
  for (const patch of [{ objectKey: "private" }, { displayName: "../music.mp3" }, { detectedMime: "text/html" }, { byteLength: 0 }, { durationMs: 0 }]) assert.equal(MusicVersionSchema.safeParse({ ...version, ...patch }).success, false);
  const command = { operationId: crypto.randomUUID(), expectedRevision: 1, action: "CONFIRM", versionId: version.id };
  assert.equal(MusicCommandSchema.safeParse(command).success, true);
  assert.equal(MusicCommandSchema.safeParse({ ...command, versionId: undefined }).success, false);
  assert.equal(MusicCommandSchema.safeParse({ ...command, action: "REOPEN", versionId: undefined }).success, false);
  assert.equal(MusicCommandSchema.safeParse({ ...command, action: "REOPEN", versionId: undefined, reason: "Correction", until: "2099-01-01T00:00:00Z" }).success, true);
  assert.equal(MusicTrackSchema.safeParse({ id: crypto.randomUUID(), registrationId: "r", studioId: "s", eventId: "e", performanceId: null, revision: 1, state: "CONFIRMED", currentVersion: null }).success, false);
});
