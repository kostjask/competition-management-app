# Domain rules and model boundaries

## Distinct concepts

| Concept | Current behavior | Accepted target / pending work |
| --- | --- | --- |
| Account | Studio-intent signup retains an owner-proven draft and creates a roleless unverified user; active/verified login required | Application completion/approval remains separate; no spectator signup (ADR-006/017) |
| Studio | Event-owned organization; active names globally case-sensitive unique | Reusable identity (ADR-001); name policy decision before index changes |
| Organization approval | PENDING / APPROVED / REJECTED | Separate from every event application |
| Event registration | Unique studio/event pair with revisioned retained M2 transitions under ADR-003; PENDING / APPROVED / REJECTED / LOCKED / CANCELLED | Application/review UI remains P4/P5 |
| Representative | Active membership grants studio relationship; both approvals derive event access | Additional members need studio-bound invitations; contact email never grants ownership |
| Performance | Durable incomplete unscheduled drafts (ADR-024); immutable owner/event keys (ADR-022), optimistic revisions and saved snapshots (ADR-023) | Submit-time eligibility, receipts and correction lifecycle remain P3-ENTRIES |
| Judge | Event-specific record separate from UserRole; invitation acceptance reconciles both atomically; offboarding retains Judge/Score history | Scoring assignment/readiness remains separate; staff management implemented locally (ADR-018) |
| Score | Free-text criterion and Float value | Versioned rubric, assignments, exact values and sheet lifecycle; not implemented |

Current event stages: PRE_REGISTRATION, REGISTRATION_OPEN, DATA_REVIEW, FINALIZED,
ENDED, CANCELLED. M2 transitions are enforced by ADR-003; live/final transitions remain P6-LIVE-MODEL.
FINALIZED is not score-sheet lock, entry submission or public result publication.

All new applications are allowed in PRE_REGISTRATION/REGISTRATION_OPEN.
A configured deadline closes new applications and pending-owner corrections.
Studio profile writes use those stages; dancer/performance writes use
REGISTRATION_OPEN or DATA_REVIEW with explicit review allowance. Individual
operations retain distinct permission/approval rules; read [resource contracts](API.md).

Application creation atomically saves studio, pending registration and applicable
membership. Account creation, organization approval, event approval and final
entry submission are separate actions. Pending cancellation retains studio/member.
Cancellation retains the registration as CANCELLED with revision/audit history.
Same-studio reapplication resets the event decision without replacing identity or
memberships. Organization/event decisions are independent; both are required for
derived representative access. See [ADR-003](adr/003-registration-lifecycle.md).
There is no final-entry-submission API today. [Registration workflow](REGISTRATION_API.md).

Dancer birth dates now use native DATE with calendar-only HTTP strings. Age is
completed years on the event-local start date; February 29 advances on March 1
in a non-leap year. Shared calculation and organizer reference-date display are
implemented; submit-time eligibility remains P3-ENTRIES. Saved revisions freeze
then-current studio/participant/configuration values. They establish history,
not proof of submission. [ADR-023](adr/023-entry-history-and-calendar-dates.md).

## Pending model decisions

**ADR-003 lifecycle:** [M2 application/review policy accepted and implemented](adr/003-registration-lifecycle.md).
Live rules remain P6-LIVE-MODEL.
Candidate sequence: DRAFT → PRE_REGISTRATION → REGISTRATION_OPEN → DATA_REVIEW →
SCHEDULED → LIVE → FINALIZED → ENDED, with CANCELLED from pre-ended states.
DRAFT/SCHEDULED/LIVE are proposals, not current enum values. Decide correction
after finalization and audit behavior before implementation.

**ADR-004 scoring (not accepted/filed):** define event/category template, ordered
criteria and min/max/step/weight, judge assignments, draft/submitted/locked sheets,
values/comments, penalties/disqualification, dropped scores, rounding/ties,
versioned aggregation and independent publication/correction states. Choose
scaled integer or Decimal precision and explicit legacy conversion; no silent
Float rounding or historical rewrite. P6-SCORING-MODEL precedes dependent UI.

History/calendar decisions are accepted in [ADR-023](adr/023-entry-history-and-calendar-dates.md).
Older domain findings and migration-safety evidence: [database review](DATABASE_REVIEW.md).
Draft representation is accepted in [ADR-024](adr/024-incomplete-entry-drafts.md);
submission and reuse retain their roadmap gates. Account/token/staff scope decisions:
[foundation roadmap](roadmap/foundation.md). Product outcomes:
[journeys](USER_JOURNEYS.md). No proposed schema or label creates a runtime feature.
