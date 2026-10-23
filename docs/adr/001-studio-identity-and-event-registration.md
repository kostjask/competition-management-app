# ADR-001: Reusable studio identity and event registration

Date: 2026-10-23

Status: Accepted direction; Phase 1 canonical registration/atomic creation is
implemented (2026-10-24). Identity migration and multi-event reuse remain Phase 3.

## Context and alternatives

`Studio` currently has a required `eventId` and a separate many-to-many
`StudioEventRegistration` relation. Access helpers in `StudiosController`,
`EventsController`, and the dancer/performance routers select registration and
stage through `studio.eventId`. This makes a second event registration unsafe.
At decision time, `EventsController.registerStudio` created a studio without a registration, despite
its comment describing a pending registration. The admin branch did so too. The
replacement registration controller now creates the related records atomically.

Event-owned studios would simplify the current helpers but duplicate studio,
representative, and dancer identities for every event. Reusable studios require
explicit event context and a careful migration, but support returning studios.
Choose reusable studios, as recommended in the development plan.

## Decision

- Studio is a global organization. Representatives and dancers belong to that
  organization; performances belong to an event.
- `StudioEventRegistration` is the sole event membership and event approval
  record, unique by `(studioId, eventId)`. Its status and
  `canEditDuringReview` apply only to that event.
- Preserve organization-level `Studio.approvalStatus` as a distinct moderation
  gate, because the schema and approval handler already implement it. Organization
  approval does not approve an event registration; event approval requires an
  active, approved organization. No approval is inferred from a role alone.
- Active representative membership authorizes organization access. Event writes
  additionally require permission for the requested event, the matching
  registration, permitted status/stage, and verified resource relationships.
  Organization ownership alone must never authorize a different event's records.
- Retain existing status values, including `LOCKED`; lifecycle redesign and
  automatic role revocation are separate work. Existing roles must never bypass
  registration/ownership checks after rejection, cancellation, or deactivation.
- Do not automatically merge studios by name or contact details. Similar names
  are not proof of identity or permission to access historical dancers.

## Implementation sequence and data safety

1. Phase 1 fixes the registration operation and contracts using the existing
   schema. Creating a studio for an event must atomically create its `PENDING`
   registration and the applicable representative membership. Preserve explicit
   admin ownership behavior; never silently make the admin a representative.
   Reject event/studio mismatches while `Studio.eventId` remains required.
2. Phase 3 audits existing data before migration: missing registrations,
   registrations for other events, approval/lock/review values, and participant
   relationships. Preserve every existing registration and its status. Backfill a
   missing `(studioId, Studio.eventId)` registration as `PENDING`, never approved.
   Flag contradictory relationships for explicit resolution instead of deleting
   data or guessing their intended event.
3. Replace all authorization/query/seed dependencies on `Studio.eventId` with
   explicit registration/event scope. Before enabling multi-event reuse, define
   how global profile and dancer edits interact with multiple event locks and
   historical performance data. This is a migration prerequisite, not permission
   to remove current stage checks in Phase 1.
4. Add a new reviewed migration removing `Studio.eventId` and its relation only
   after the replacement paths and preservation tests are ready. Keep studio IDs,
   representatives, dancers, registrations, performances, and scores intact.
   Do not edit applied migrations.
5. Enable registration of an existing owned studio in another event only after
   the schema/access migration. Duplicate registration is a conflict, not an
   implicit approval reset.

Dropping the event column is not safely reversible once a studio has multiple
registrations. Rehearse on an isolated representative database, take a backup,
and prefer a forward repair; rollback to event-owned studios would require an
explicit duplication/mapping strategy.

## Verification and consequences

Required implementation checks cover atomic creation, repeated registration,
cross-event and cross-studio substitution, inactive representatives/deleted
studios, independent organization/event approvals, and preservation of existing
approval/lock/review values. The migration must pass fresh and existing-data
checks. The ADR originally changed no runtime behavior. See
[current registration contracts and checks](../API.md#studio-registration-contract)
for the completed Phase 1 slice; no schema migration has been applied.

Related: [API paths](002-canonical-api-paths.md),
[shared contracts](005-shared-api-contracts.md).
