# ADR-031 — Live scoring reconnect

Date: 2026-11-21. Implemented for the local judge workspace. The moderator and
venue rehearsal remain in [Phase 6](../roadmap/competition.md#phase-6--scheduling-live-operations-and-judging).

## Decision

Use acknowledged online HTTP as the first live workflow under
[ADR-030](030-session-queues.md) and [ADR-004](004-exact-scoring.md). Keep
unsaved scores and one outstanding score command in memory within the signed-in
tab. The user sees what is unsaved and is warned before navigation. Reload
restores acknowledged server data. No persistent queue, browser storage, public
cache or new transport carries private score data.

The visible judge tab polls its own workspace every five seconds. Browser
connectivity changes, return to the visible tab and restored sessions trigger
a fresh read. A failed read or browser offline event immediately makes the cached
sheet read-only. The freshness window is 15 seconds from the last successful
read, and read/write requests time out after eight seconds. These are initial
local operating parameters. The proposed two-second venue freshness target and
real load/latency still need rehearsal. Polling alone never authorizes a write.

The judge edits a pinned sheet and revision. Valid edits autosave after a
900 ms pause. Submission has its own explicit confirmation and uses the same
sheet/revision. Both operations send a UUID and complete value snapshot.
In-flight writes block further edits briefly while confirmation is checked.
The server enforces current performance or reasoned paused correction, event
scope, active assignment, expected revision and valid exact scores. Current
slots remain scoreable during a pause, as in the existing command contract.
If another assigned stage starts, an automatically selected sheet stays visible
while it is current or editable. An explicitly chosen sheet stays visible while
the judge can read it, including after submission.

After a timeout, disconnect or session expiry, the client first reconciles
the original operation against a fresh own-sheet read. An exact match on actor,
event, operation, sheet, action and revision confirms the write, including if
the queue has since advanced. If the receipt is absent and the same sheet is
still writable at the original revision, the judge may retry the identical
command. The server revalidates access before replay. If the sheet changed or
became nonwritable, the judge can compare the retained fields with the current
server values. Reapplying the whole draft is explicit and may create a new
operation only for the same writable sheet based on its new revision. A pending
score is never moved to another performance automatically.

## Alternatives and follow-up

Durable offline scoring would require device/account isolation, recovery across
browser restarts, data retention controls and rules for reconciling queue changes.
Push transport requires reconnect and ordering guarantees of its own. Both can
be evaluated after the acknowledged workflow is exercised under venue conditions.

When a judge sees a prolonged outage, retain the tab and contact the stage lead.
The stage lead should stop the queue and verify the acknowledged sheet before
continuing. Any manual continuation or historical reopen must use the authorized
reasoned actions under ADR-004/030. P6-MODERATOR owns the console, and the remaining
P6-RECOVERY work owns operational health, approved fallback record/export and a
rehearsal with judge and moderator devices on the intended venue network.
