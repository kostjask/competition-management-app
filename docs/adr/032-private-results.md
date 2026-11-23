# ADR-032: Private grouped results and event finalization

Accepted scope on 2026-11-23: keep results private. P7-PUBLISH stays open for an
explicit public DTO, release and correction policy.

Review uses the event's saved session slots. Removed slots are outside the
competition result set. A retained withdrawal is visible in private review and
excluded from ranking. A withdrawn slot still marked current must be cleared
from the stage queue. A skip is a queue decision and blocks finalization until
the entry is withdrawn or requeued and completed. Every remaining performance
must be done, have an event-owned category, age group and format, and have a
complete frozen panel. A disqualification retains its submitted evidence and
never receives a rank. Zero is a valid score. A group with unresolved entries
shows sheet progress and available totals while withholding ranks.

Current rubric bindings and judge availability are used for live setup and
operation. Result review consumes the templates and sheets actually frozen at
performance start. Offboarding a judge after valid submission does not invalidate
their locked sheet. Reopening or adjusting scores while LIVE changes the result
source and requires a new revision.

An admin saves a complete reviewed calculation as an immutable numbered event
revision. It pins the event/group labels, dispositions, ranks and sources for the
immutable ADR-004 calculations. A second explicit confirmation finalizes the
latest saved revision only if the current sources still match. Finalization
atomically records the selected revision, actor and time and transitions the
event from LIVE to FINALIZED. Generic event editing continues to handle other
lifecycle changes. Older terminal events remain readable without fabricated
result history. Both operations bind their UUID to the admin, event and full
command, recheck current authority and commit with audit in a serializable
transaction.

Alternatives considered were calculating during finalization and publishing
as a consequence of finalization. The separate private revision lets the
organizer verify exactly what will be locked and gives an explicit target for
recovery. Public publishing and post-finalization corrections need their own
accepted policy before they can change external or official results.

Migration 48 adds private history and preserves existing rows. If the feature
is rolled back after use, retain the new tables and prevent older code from
accepting the retired LIVE-to-FINALIZED event PATCH.
