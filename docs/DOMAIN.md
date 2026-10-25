# Domain rules and model boundaries

## Distinct concepts

| Concept | Current behavior | Accepted target / pending work |
| --- | --- | --- |
| Account | Public signup creates roleless unverified user | Studio-focused recoverable onboarding; staff invitation; controlled admins; no spectator signup (ADR-006) |
| Studio | Event-owned organization; active names globally case-sensitive unique | Reusable identity (ADR-001); name policy decision before index changes |
| Organization approval | PENDING / APPROVED / REJECTED | Separate from every event application |
| Event registration | Unique studio/event pair; PENDING / APPROVED / REJECTED / LOCKED | Explicit transition/deadline/reason/correction policy in P3-REGISTRATION |
| Representative | Active membership grants studio relationship; event approval assigns role | Additional members need studio-bound invitations; contact email never grants ownership |
| Performance | Complete fields/order required; owner inferred from one studio's participants | Explicit owner, incomplete unscheduled drafts, revision/submission snapshots before entry UI |
| Judge | Event-specific record separate from UserRole; scored records cannot be hard-deleted | Atomic invited acceptance and history-preserving removal |
| Score | Free-text criterion and Float value | Versioned rubric, assignments, exact values and sheet lifecycle; not implemented |

Current event stages: PRE_REGISTRATION, REGISTRATION_OPEN, DATA_REVIEW, FINALIZED,
ENDED, CANCELLED. An enum or raw PATCH does not implement a transition policy.
FINALIZED is not score-sheet lock, entry submission or public result publication.

Non-admin new applications are allowed in PRE_REGISTRATION/REGISTRATION_OPEN.
Studio profile writes use those stages; dancer/performance writes use
REGISTRATION_OPEN or DATA_REVIEW with explicit review allowance. Individual
operations retain distinct permission/approval rules; read [resource contracts](API.md).

Application creation atomically saves studio, pending registration and applicable
membership. Account creation, organization approval, event approval and final
entry submission are separate actions. Pending cancellation retains studio/member.
There is no final-entry-submission API today. [Registration workflow](REGISTRATION_API.md).

## Pending model decisions

**ADR-003 lifecycle (not accepted/filed):** define allowed transitions and actions,
application/review rules first (P3-REGISTRATION), live rules later (P6-LIVE-MODEL).
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

Other ownership/draft/history/date/index decisions and migration safety:
[database review](DATABASE_REVIEW.md). Account/token/staff scope decisions:
[foundation roadmap](roadmap/foundation.md). Product outcomes:
[journeys](USER_JOURNEYS.md). No proposed schema or label creates a runtime feature.
