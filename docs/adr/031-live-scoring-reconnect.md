# ADR-031 — Live scoring reconnect

Date: 2026-11-21. Implemented for the local judge and moderator workspaces.
Venue rehearsal remains in [Phase 6](../roadmap/competition.md#phase-6--scheduling-live-operations-and-judging).

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

The moderator console uses the same visible-tab polling, timeout and freshness
limits. A stage action is pinned to the URL-selected session, current slot and
schedule revision. A sheet correction pins its own revision and target. One
in-tab operation can be outstanding. A fresh private read looks up its receipt
before offering the same UUID and body for retry. If the session, slot, revision
or action eligibility changed, the operator explicitly accepts the current state
before acting again. Access denial removes the cached session projection.

An authoritative 403 or 404 from either live read also clears local drafts,
pending operations, exception or submission review and previous acknowledgements.
If access is restored, the operator starts from the new authorized read. A 401
retains the tab's recovery state for same-account sign-in and fresh reconciliation.

For an interruption, retain the console tab and stop stage operations. If
connected, use Pause and verify the acknowledged state. If unavailable, tell the
stage lead the queue state is unverified. The selected-session print handoff shows
the last read time and revision, current/next performance and acknowledged sheet
counts. The printed state is a reference to that read. Once connected, compare
the queue and judge acknowledgements and reconcile any uncertain command before
resuming. The handoff carries no scores and authorizes no manual continuation.

## Alternatives and follow-up

Durable offline scoring would require device/account isolation, recovery across
browser restarts, data retention controls and rules for reconciling queue changes.
Push transport requires reconnect and ordering guarantees of its own. Both can
be evaluated after the acknowledged workflow is exercised under venue conditions.

When a judge sees a prolonged outage, retain the tab and contact the stage lead.
The moderator and judge connection status surfaces the role-specific next steps
on an outage, read failure or expired freshness. The instruction stays visible
through a reconnect until a successful read or an access/session failure.
Any approved manual continuation or historical reopen must use the authorized
reasoned actions under ADR-004/030. Remaining P6-RECOVERY work is the venue health
and latency check, approval of any manual continuation record/export and a
cross-device rehearsal on the intended venue network. Use the [rehearsal runbook](../LIVE_REHEARSAL.md).
