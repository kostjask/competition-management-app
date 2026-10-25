# User flows and state transitions

Reviewed: 2026-10-25. This implements documentation detail for the product intent
in [USER_JOURNEYS](USER_JOURNEYS.md), not application behavior. Screen IDs and
proposed routes are maintained only in [UI_UX](UI_UX.md); visual/interaction rules
are in [DESIGN_SYSTEM](DESIGN_SYSTEM.md). Implemented contracts belong to
[API](API.md), not this document. The [plan](../DEVELOPMENT_PLAN.md) owns delivery gates.

## Shared flow contract and state vocabulary

All flows below require backend identity, scope, ownership, active-record and
stage checks for each operation; frontend gates only explain availability.
Each inherits UI_UX's loading/empty/error/offline/reconnect/success/locked/denied
patterns, ET/EN/RU and accessibility rules. Failed requests retain permitted
visible work. No navigation or translated label grants permission. Confirmation
names the target and consequences; cancellation of a dialog performs no mutation.
After lost mutation response, reconcile server outcome before retry; current
application creation is not idempotent. Never display success from local state.

Current event enum is PRE_REGISTRATION, REGISTRATION_OPEN, DATA_REVIEW, FINALIZED,
ENDED, CANCELLED. It has no SCHEDULED or LIVE stage. Those proposed names require
ADR-003 and migration. Existing organization approval is PENDING/APPROVED/REJECTED;
event registration additionally has LOCKED. Neither registration LOCKED nor event
FINALIZED is a score lock, entry submission or public publication state. Draft,
submitted, score-sheet lock, queue and publication vocabulary below is a target
model awaiting its owning decisions; do not persist it as arbitrary strings.

## Flow index

Read the selected flow only; all inherit the shared contract above.

<a id="f01--account-registration-verification-login-logout-and-recovery"></a>

- [F01: Account registration, verification, login, logout and recovery](flows/F01.md)

<a id="f02--browse-events-and-inspect-details"></a>

- [F02: Browse events and inspect details](flows/F02.md)

<a id="f03--apply-as-a-studio-and-track-independent-approvals"></a>

- [F03: Apply as a studio and track independent approvals](flows/F03.md)

<a id="f04--manage-representatives-dancers-performances-and-music"></a>

- [F04: Manage representatives, dancers, performances and music](flows/F04.md)

<a id="f05--admin-event-setup-and-lifecycle"></a>

- [F05: Admin event setup and lifecycle](flows/F05.md)

<a id="f06--invite-onboard-and-remove-judgesmoderators"></a>

- [F06: Invite, onboard and remove judges/moderators](flows/F06.md)

<a id="f07--entry-data-review-and-performance-scheduling"></a>

- [F07: Entry data review and performance scheduling](flows/F07.md)

<a id="f08--moderator-live-stage-operation"></a>

- [F08: Moderator live-stage operation](flows/F08.md)

<a id="f09--judge-scoring-autosave-submit-lock-and-correction"></a>

- [F09: Judge scoring, autosave, submit, lock and correction](flows/F09.md)

<a id="f10--final-entry-submission-and-results-finalizationpublication"></a>

- [F10: Final entry submission and results finalization/publication](flows/F10.md)

## Evidence matrix for each delivered flow

Use stable F/S identifiers in issues and tests. Record happy path plus invalid
input, authenticated denial, cross-event/studio substitution, inactive record,
stage/deadline change mid-edit, repeated action, lost response, expired session,
network recovery and stale revision where applicable. Exercise ET/EN/RU; phone,
portrait tablet and desktop; keyboard, touch and screen reader. Record explicit
non-applicable cases with reasons. Use synthetic users/data for browser screenshots
and visual baselines. A screenshot is layout evidence, not authorization evidence.
Milestone gates and test infrastructure status remain in the plan and TESTING.
