# Private competition results

[ADR-032](../adr/032-private-results.md) owns grouping, completeness and event
finalization. The S16 organizer workspace is at
`/app/admin/events/:eventId/results`, linked from event setup.

All paths are under `/api/v1/events/:eventId/results`. They require a current
verified global admin session and use `Cache-Control: no-store`.

| Method and suffix | Contract |
| --- | --- |
| GET (collection) | Current LIVE source preview, latest saved snapshot, revision summaries and finalization acknowledgement. Optional `revision` selects an existing event-local history revision. Optional `operationId` adds an acknowledgement only for this admin's operation in this event. |
| `POST /commands` | Strict JSON with `action` (`CALCULATE` or `FINALIZE`), UUID `operationId`, `expectedRevision` and the current 64-character hex `source`. Returns only action, operation ID, result revision and acknowledgement time. |

Use expected revision 0 for the first calculation. The current preview identifies
category, age group and format by event-owned IDs and shows the outstanding queue,
grouping, sheet or scoring checks. A blocked group withholds rank. Withdrawals
and disqualifications have no rank, and zero remains a scored result. Review uses
frozen score sheets and emits totals, deductions and progress counts without
individual worksheet data or personal participant records.

`CALCULATE` verifies a complete current source and saves its grouped snapshot
with links by performance and digest to immutable per-performance calculations.
`FINALIZE` verifies the same complete source and latest saved revision, records
the acknowledgement and changes the event from LIVE to FINALIZED in one
transaction. A changed source requires a fresh preview and saved calculation.
The generic event PATCH refuses this transition. Ending a finalized event
continues through event setup. Terminal events that predate this feature can
have no results revision.

Each write checks current authority before replay and binds its UUID to actor,
event and body. After a lost response, read the operation ID and latest state.
An exact retry uses the same body and UUID. A change conflict requires a fresh
review before a new command. Audit and effects commit together.

Result revisions and acknowledgements remain private. A public projection,
publication, corrections after finalization and CSV/PDF exports require their
own Phase 7 decisions and delivery.
