# Domain rules and model boundaries

## Application estimates and private music

[ADR-027](adr/027-application-estimates.md) defines revisioned expected counts for
each actual event-local calendar day. Planning estimates never create entries,
reserve capacity or change independent organization/event approvals. Earlier
snapshots retain their dates and timezone; adjustments share the application
revision and current owner/review rules.

[ADR-028](adr/028-private-music-model.md) defines registration-owned tracks before
complete entries, optional exact-owner performance attachment, immutable validated
version metadata and independent confirmation/acceptance/reopening. Bytes stay
outside PostgreSQL. The model/contracts are implemented; P8-MEDIA transport/private
delivery and P5-MUSIC UI remain prerequisites for actual upload/playback. No public
CMS asset access or broad roster permission is implied by music ownership.

## Current product scope

[Product scope](PRODUCT_SCOPE.md) is canonical: one Neposedõ organization, a new
public studio site, a replacement festival portal and shared developer/director
administration. Public studio pages are not a student-management or CRM system.
The studio currently has social accounts only; useful festival Wix material and
archives need migration. [ADR-026](adr/026-studio-and-festival-platform.md) records
the concrete publication design; its model prerequisite is complete while the
[website implementation tasks](roadmap/website.md) remain open.

The `Studio`/`Dancer` entities below represent participating festival organizations
and rosters, not internal Neposedõ student records. "Organization approval" is
approval of a participating studio; studio-wide checkpoints concern that studio's
event submission. Website publication, event lifecycle, application approval,
entry submission and calculated result publication remain distinct operations.
Event scoping is not a claim of multi-organizer isolation.

## Distinct concepts

| Concept | Current behavior | Accepted target / pending work |
| --- | --- | --- |
| Account | Studio-intent signup retains an owner-proven draft and creates a roleless unverified user; active/verified login required | Application completion/approval remains separate; no spectator signup (ADR-006/017) |
| Studio | Event-owned organization; active names globally case-sensitive unique | Reusable identity (ADR-001); name policy decision before index changes |
| Organization approval | PENDING / APPROVED / REJECTED | Separate from every event application |
| Event registration | Unique studio/event pair with revisioned retained M2 transitions under ADR-003; PENDING / APPROVED / REJECTED / LOCKED / CANCELLED; application/review UI delivered locally | External M2 release evidence remains open |
| Representative | Active membership grants studio relationship; both approvals derive event access | Additional members need studio-bound invitations; contact email never grants ownership |
| Performance | Durable incomplete drafts, immutable owners/revisions and same-identity withdrawal/restore; opt-in checkpoints retain exact submission/review/correction receipts (ADR-022/023/024/025) | Organizer recovery/configuration and representative S09/S10 are delivered; music/submission UI retain their P5 gates |
| Judge | Event-specific record separate from UserRole; invitation acceptance reconciles both atomically; offboarding retains Judge/Score history | Scoring assignment/readiness remains separate; staff management implemented locally (ADR-018) |
| Score | Legacy Float rows retained; ADR-004 exact integer values, immutable rubric/assignment/sheet versions and private calculations | P6 judge/moderator screens and P7 grouped results/publication remain downstream |
| Public studio content | Structured singleton revisions, profiles/classes/timetable, explicit publication and document-owned assets | Public-page composition/release remains open; no enrolment or student registry |
| Festival edition publication | Stable Festival/Edition identities, optional unique Event linkage, immutable revisions/receipts, private preview and published-only APIs | Public pages/Wix transition remain open; public profiles grant no assignments |

Current event stages: PRE_REGISTRATION, REGISTRATION_OPEN, DATA_REVIEW, SCHEDULED,
LIVE, FINALIZED, ENDED, CANCELLED. ADR-003/030 enforce lifecycle and queue mappings;
entry into LIVE/finalization requires ADR-004 readiness and submitted-sheet completeness.
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
[ADR-030](adr/030-session-queues.md) accepts event-owned stages/sessions, stable
queue slots, admin scheduling, explicit moderator assignments, pause/skip/requeue/
reopen and source-bound transactional receipts. SCHEDULED/LIVE enum values and
S13 scheduling are implemented locally. DATA_REVIEW → SCHEDULED requires complete
eligible scheduling; SCHEDULED may return to review before a queue starts.
START/ADVANCE and entry into LIVE/finalization now enforce ADR-004 readiness and
sheet completeness. Missing configuration/sheets fails closed; a reasoned admin
advance override never makes incomplete results finalizable.
DRAFT is not an event stage. Score corrections/publication remain separate.

**[ADR-004 scoring](adr/004-exact-scoring.md), accepted 2026-11-21:** immutable
event/category rubric versions, per-performance panel snapshots, exact integer
thousandths, draft/submission lock and reasoned paused-queue corrections are
implemented under [the scoring contract](api/scoring.md). Normalize criteria to
0–100, weight in basis points, average all assigned sheets, deduct admin penalty
and round once (half up, three decimals). No dropped scores; equal totals share
competition rank. Disqualification retains evidence without ranking. Legacy Float
rows remain unchanged outside new calculations. New calculations stay private;
P7 owns grouped results, final/public versions, corrections and exports. The
[decision brief](SCORING_MODEL_DECISIONS.md) retains alternatives. S14/S15 and
venue/human/hosted acceptance still gate operational release.

History/calendar decisions are accepted in [ADR-023](adr/023-entry-history-and-calendar-dates.md).
Older domain findings and migration-safety evidence: [database review](DATABASE_REVIEW.md).
Draft representation is accepted in [ADR-024](adr/024-incomplete-entry-drafts.md);
submission and reuse retain their roadmap gates. Account/token/staff scope decisions:
[foundation roadmap](roadmap/foundation.md). Product outcomes:
[journeys](USER_JOURNEYS.md). No proposed schema or label creates a runtime feature.
