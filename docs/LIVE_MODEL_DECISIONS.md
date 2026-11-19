# Live-operation decisions before P6 implementation

Prepared 2026-11-19 for the next queued P6-LIVE-MODEL task. **Proposal, not an
accepted architecture or implemented behavior.** Extend
[ADR-003](adr/003-registration-lifecycle.md) after these choices are settled.
[The competition roadmap](roadmap/competition.md) retains ownership of model,
scheduling, moderation, scoring and recovery work.

## Current implementation

The database supports PRE_REGISTRATION, REGISTRATION_OPEN, DATA_REVIEW,
FINALIZED, ENDED and CANCELLED. The current lifecycle deliberately refuses
transitions into live/final states. There is no stage/session/queue model.
`Performance.orderOnStage` is nullable and unique within an event; it is not a
stage/session slot identity. Existing performance revisions retain its history.
Staff permissions already distinguish `stage.manage` for moderators from judging.
No new permission or queue authority follows from a public CMS teacher profile.

The locally delivered M3 entry/music/submission and M4 staff workflows are
technical prerequisites. Their human/hosted release gates remain independent.
Scoring still needs P6-SCORING-MODEL; a live model must not invent judge completion
or imply that unimplemented scores are safely finalized.

## Choices and recommendation

| Decision | Recommended first implementation | Alternative / implication |
| --- | --- | --- |
| Queue identity | Explicit event-owned stages and sessions, one ordered queue per session; create a default stage/session only through organizer setup | One event-wide queue is simpler, but cannot represent parallel stages without a later ownership migration |
| Authority | Global admin configures/schedules; active event-scoped `stage.manage` staff advance/pause/skip their assigned queue; judge assignments remain separate | Admin-only live control reduces initial scope but does not deliver the intended moderator workflow |
| Skip and withdrawal | Skip keeps the same slot/history and requires a reason; requeue is an explicit audited command. Entry withdrawal and slot removal stay separate | Treating skip as completion or deletion loses the distinction needed for later judging/recovery |
| Advance and completion | Explicit acknowledged operator action; no automatic advance. Once scoring exists, require current submitted-sheet completeness or a reasoned admin override | Allowing normal moderator advance over missing sheets needs an agreed venue policy; this cannot be inferred from the current data model |
| Live editing | Pause the affected queue before order changes; use expected queue revision and immutable actor/body-bound receipts | Editing a running queue needs additional rules for current/next identity and judge drafts |
| Reopen | Reasoned admin correction preserves prior slots/actions; score/result consequences must be defined with the scoring model | Implicitly unlocking submitted sheets would cross the unaccepted scoring/publication boundary |

These choices materially change domain behavior and storage. Confirm queue
topology, moderator authority and skip/advance policy before accepting the ADR
and adding dependent migrations or S13/S14 controls. The recommendation uses
transactional HTTP first, not real-time delivery or offline mutation promises.

## Implementation and acceptance after the decision

Add explicit SCHEDULED/LIVE lifecycle mappings with a safe additive migration.
Preserve existing terminal events and nullable performance drafts; retained
legacy order values need provenance, not silent reassignment. Separate immutable
performance identity from queue slot identity and active-slot uniqueness.

Every move/swap/advance/pause/skip/reopen must validate current actor, event,
assignment, session, active slot and expected revision in a transaction. Exact
retries return their receipt after current access checks. Replaced or removed
staff cannot replay privileged work. Audit failure rolls back both state and
receipt. Define pause/current/next/reconnect behavior before the UI claims it.

S13/S14 must show current identity, saved queue revision and acknowledged state,
with accessible move controls alongside any drag interaction. Use the locked
Cobalt system and ET/EN/RU; add concurrent/repeated/stale/cross-event/removed-staff
and manual-recovery checks. This brief does not close P6-LIVE-MODEL,
P6-RECOVERY, P6-UI-LIVE or any M5 gate.
