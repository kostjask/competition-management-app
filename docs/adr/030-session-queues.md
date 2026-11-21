# ADR-030: Event stages, session queues and schedule revisions

Accepted 2026-11-21 after the user selected the recommended first implementation
in the [live decision brief](../LIVE_MODEL_DECISIONS.md). Extends
[ADR-003](003-registration-lifecycle.md); scoring remains a separate decision.

Each event owns explicit named stages and timed sessions. Organizers create them;
there is no implicit default or conversion of `Performance.orderOnStage`.
Legacy orders and performance revisions remain unchanged. Each session owns a
queue of stable slot identities. Removed slots retain history and lose their
position; reusing an entry reactivates its original slot. One active slot per
performance per event, one position and at most one current slot per session.

Global administrators configure stages, sessions, moderator assignments and
schedules. A session has at most one assigned moderator; that account must also
have current event-scoped `stage.manage`. Assignment is not a permission grant.
Every command, including receipt replay, checks active verified account, session
revision and current role/assignment inside its serializable transaction.
Offboarding/replacement takes effect before privileged replay. Judges are separate.

One event schedule revision serializes cross-session moves, swaps and conflict
checks. Preview binds the complete proposed queues and current entry, participant,
approval, checkpoint and session sources. Save repeats eligibility/conflict checks
and requires that fingerprint and revision. Operation UUIDs bind actor, event and
normalized body; immutable receipts include the acknowledged schedule snapshot.
Audit failure rolls back effects and receipt. A stale receipt is historical:
read current state before another command. No automatic retry with a new UUID.

Scheduling requires active approved studio/application, a current final submitted
or accepted checkpoint, its exact saved performance revision and valid final entry
data. Music remains an independent notice/workflow. Initial generation sorts real
eligible unscheduled entries by retained legacy order, then title and ID. An
organizer previews it before save. No generation heuristic promises optimality.

Session starts use explicit-offset ISO instants inside the event window. Durations
and per-session buffers produce projected intervals; overlapping sessions on one
stage are conflicts. Shared active dancers require the greater of the two session
rest gaps between performance intervals, also across stages. Conflicts name the
performances, never dancers. A conflicting preview can be inspected but not saved.
Paused queues alone accept edits; running queues must pause first. Current,
performed and skipped slots form a fixed prefix and cannot be moved by scheduling.
Removing a slot does not withdraw its performance; withdrawal makes its slot
ineligible and must be reconciled explicitly. Moving between queues is atomic.

Lifecycle mapping: DATA_REVIEW → SCHEDULED requires a nonempty, complete,
eligible, conflict-free schedule. SCHEDULED → DATA_REVIEW is an explicit admin
return for correction, only with paused queues and no started slots. Cancellation
is allowed from scheduled/live states. SCHEDULED → LIVE and LIVE → FINALIZED
are defined but fail closed until P6-SCORING-MODEL/TEMPLATES supply readiness and
submitted-sheet completeness. FINALIZED → ENDED remains admin-only. Existing
terminal events stay readable; no migration reclassifies them.

Session state is PAUSED/RUNNING/FINISHED. When live readiness exists, START selects
the first waiting slot, PAUSE retains current identity, ADVANCE requires submitted
sheet completeness (or a reasoned admin override under the scoring decision),
and SKIP retains the current slot with a mandatory reason, then pauses before
another current slot can be selected.
Until scoring readiness exists, START/ADVANCE refuse with invalidConfiguration;
no unimplemented score is presented as complete. Admin REQUEUE of a named skipped
slot requires a reason and a paused queue. Admin REOPEN requires a reason and a
finished queue and restores PAUSED. They never
unlock sheets or republish results. Live end-to-end delivery remains P6-MODERATOR.

S13 uses the locked Cobalt app system, URL stage/session selection, native move
controls, projected times and preview/confirm. A request in doubt retains its exact
body/UUID; retry reconciles its receipt, and a separate current-state comparison
never replaces the local draft automatically. Session restoration retains edits.
No offline mutation, automatic advancement or real-time guarantee. Printable
acknowledged schedule supplies a manual reference, not an offline writable queue.
P6-RECOVERY still owns venue rehearsal with judging and the moderator console.

Follow-through on 2026-11-21: [ADR-004](004-exact-scoring.md) and
[the scoring contract](../api/scoring.md) now supply real backend rubric/panel
readiness, frozen sheet assignments, completeness and reasoned admin advance
override. The earlier constant START/ADVANCE/LIVE/finalization refusal has been
replaced by these checks. An override never makes missing sheets complete.
[ADR-031](031-live-scoring-reconnect.md) records the S14/S15 console and recovery
policies. Venue recovery and public result delivery remain downstream.

Migration is additive: enum values, explicit queue tables, relational ownership,
partial active-slot/current-slot indexes and immutable receipt triggers. No source
history is rewritten. Rollback after use retains/export tables and receipts;
deploying older binaries must not discard schedule/live enum values or history.
