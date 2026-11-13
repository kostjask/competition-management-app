import { test } from "node:test";
import assert from "node:assert/strict";
import { UpdateStudioApprovalBodySchema, UpdateStudioBodySchema, NewStudioRegistrationBodySchema, ApplicationReviewSchema, safeReturnPath, EventSchema } from "@dance/schemas";
import { applicationOpen, reviewOpen } from "../src/pages/applications/policy";

test("application and review affordances obey stage and exact cutoff independently", () => {
  const event = EventSchema.parse({ id: "e", name: "Fixture", startsAt: "2099-01-02T00:00:00.000Z", endsAt: "2099-01-03T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", stage: "REGISTRATION_OPEN", timeZone: "Europe/Tallinn", registrationDeadline: "2099-01-01T00:00:00.000Z", organizerEmail: null, organizerPhone: null, venue: null, country: null, city: null, description: null, unclassifiedDescription: null, maxStudios: null, maxPerformances: null, imageUrl: null, revision: 1 });
  assert.equal(applicationOpen(event, Date.parse(event.registrationDeadline!) - 1), true);
  assert.equal(applicationOpen(event, Date.parse(event.registrationDeadline!)), false);
  assert.equal(reviewOpen(event), true);
  assert.equal(applicationOpen({ ...event, stage: "DATA_REVIEW", registrationDeadline: null }), false);
  assert.equal(reviewOpen({ ...event, stage: "DATA_REVIEW" }), true);
  assert.equal(reviewOpen({ ...event, stage: "CANCELLED" }), false);
});

test("review commands, draft continuation and history strictly reject authority and private payloads", () => {
  assert.equal(UpdateStudioApprovalBodySchema.safeParse({ status: "APPROVED" }).success, false);
  assert.equal(UpdateStudioApprovalBodySchema.safeParse({ status: "REJECTED", reason: "CAPACITY", revision: 2 }).success, true);
  assert.equal(UpdateStudioBodySchema.safeParse({ expectedRevision: 2 }).success, false);
  assert.equal(NewStudioRegistrationBodySchema.safeParse({ name: "Studio", onboardingRevision: 0 }).success, false);
  assert.equal(ApplicationReviewSchema.safeParse({ history: [], notifications: [], recipientEmail: "private@example.invalid" }).success, false);
  for (const path of ["/applications", "/events/e/register", "/events/e/studio", "/events/e/studio?studio=s", "/admin/events/e/applications"]) assert.equal(safeReturnPath(path), path);
  for (const path of ["//evil.example", "/applications?redirect=https://evil.example", "/events/e/register/other"]) assert.equal(safeReturnPath(path), "/");
});
