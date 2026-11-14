# Domain rules and model boundaries

## Current product scope

Confirmed by the user on 2026-11-14: the project currently serves one organizer,
the director of Tantsuansambel Neposedõ, who runs one or two festivals/competitions
per year. Prioritize completing those event workflows and keeping operation
practical for that scale.

The intended product also replaces the existing public Wix festival website at
fest.neposedo.ee. Public announcements, rules in ET/EN/RU, registration access,
judges, results archives and contact/social links belong to current product scope.
Each festival edition needs its own branding and retained content, with organizer
editing and draft/preview/publish rather than annual developer rebuilds.
[Website delivery tasks](roadmap/website.md) own implementation and cutover;
these capabilities are targets, not existing runtime behavior. The user's reported
Wix cost is EUR 372/year (2026-11-14); net savings depend on replacement operating
costs and the services actually cancelled.

Onboarding additional organizers or offering the project to other festivals is
a future possibility, outside the current delivery scope. Do not introduce an
organizer tenancy model, organizer self-service onboarding, subscriptions or
cross-organizer administration solely for that possibility. Revisit those
requirements when expansion is selected; current event scoping is not a claim
of multi-organizer isolation.

One organizer can run multiple events and involve multiple staff accounts.
Existing event-scoped authorization, studio/application ownership, retained
history and ET/EN/RU requirements still apply. In the application workflow,
"organization approval" refers to a participating studio, not onboarding another
festival organizer. This clarification changes planning scope, not runtime
contracts or the database model.

## Distinct concepts

| Concept | Current behavior | Accepted target / pending work |
| --- | --- | --- |
| Account | Studio-intent signup retains an owner-proven draft and creates a roleless unverified user; active/verified login required | Application completion/approval remains separate; no spectator signup (ADR-006/017) |
| Studio | Event-owned organization; active names globally case-sensitive unique | Reusable identity (ADR-001); name policy decision before index changes |
| Organization approval | PENDING / APPROVED / REJECTED | Separate from every event application |
| Event registration | Unique studio/event pair with revisioned retained M2 transitions under ADR-003; PENDING / APPROVED / REJECTED / LOCKED / CANCELLED | Application/review UI remains P4/P5 |
| Representative | Active membership grants studio relationship; both approvals derive event access | Additional members need studio-bound invitations; contact email never grants ownership |
| Performance | Durable incomplete drafts, immutable owners/revisions and same-identity withdrawal/restore; opt-in checkpoints retain exact submission/review/correction receipts (ADR-022/023/024/025) | Organizer recovery/configuration is implemented; representative UI remains P5 |
| Judge | Event-specific record separate from UserRole; invitation acceptance reconciles both atomically; offboarding retains Judge/Score history | Scoring assignment/readiness remains separate; staff management implemented locally (ADR-018) |
| Score | Free-text criterion and Float value | Versioned rubric, assignments, exact values and sheet lifecycle; not implemented |

Current event stages: PRE_REGISTRATION, REGISTRATION_OPEN, DATA_REVIEW, FINALIZED,
ENDED, CANCELLED. M2 transitions are enforced by ADR-003; live/final transitions remain P6-LIVE-MODEL.
FINALIZED is not score-sheet lock, entry submission or public result publication.

All new applications are allowed in PRE_REGISTRATION/REGISTRATION_OPEN.
A configured deadline closes new applications and pending-owner corrections.
Studio profile writes use those stages; legacy unconfigured dancer/performance
writes use REGISTRATION_OPEN or DATA_REVIEW with explicit review allowance.
Configured entry/roster writes use ADR-025 checkpoint windows, locks and scoped
grants. Individual
operations retain distinct permission/approval rules; read [resource contracts](API.md).

Application creation atomically saves studio, pending registration and applicable
membership. Account creation, organization approval, event approval and final
entry submission are separate actions. Pending cancellation retains studio/member.
Cancellation retains the registration as CANCELLED with revision/audit history.
Same-studio reapplication resets the event decision without replacing identity or
memberships. Organization/event decisions are independent; both are required for
derived representative access. See [ADR-003](adr/003-registration-lifecycle.md).
The opt-in [studio checkpoint API](api/entry-workflow.md) implements BASIC/FINAL
studio-wide data confirmation, review receipts and scoped reopening under ADR-025.
Representative submission/music UI and the complete M3 journey remain unfinished.
[Registration workflow](REGISTRATION_API.md).

Dancer birth dates now use native DATE with calendar-only HTTP strings. Age is
completed years on the event-local start date; February 29 advances on March 1
in a non-leap year. Shared calculation and organizer reference-date display are
implemented and used by checkpoint eligibility. Saved revisions freeze then-current
studio/participant/configuration values; ordinary saves establish history, while
ADR-025 checkpoint receipts identify exact submitted snapshots.
[ADR-023](adr/023-entry-history-and-calendar-dates.md).

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
