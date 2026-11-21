# Schedule and queue contract

[API index](../API.md). Paths are relative to `/api/v1`.
[ADR-030](../adr/030-session-queues.md) owns policy and migration/recovery.
Shared strict Zod schemas own exact payloads; no public or unversioned aliases.

| Operation | Endpoint | Authority |
| --- | --- | --- |
| Current schedule | GET `/events/:eventId/schedule` | Global admin; current event `stage.manage` staff see assigned sessions only |
| Assigned live console and receipt check | GET `/events/:eventId/schedule/live` | Global admin or current event `stage.manage` staff with access limited to their assigned sessions |
| Validate proposed queues | POST `/events/:eventId/schedule/preview` | Global admin |
| Save setup/queue or acknowledged operation | POST `/events/:eventId/schedule/commands` | Global admin for setup/save; current assigned staff for bounded live actions |

Responses are private/no-store. Workspace names event, timezone, revision, stages,
sessions, stable slots, performances and eligibility. Admin gets assignable staff
and latest 20 receipt summaries. Staff see assigned-session performance identities,
no roster, unscheduled entries, administrative receipt history or peer scores.
Receipt snapshots select performance/studio identities and omit roster records,
source digests and credentials. Operator-authored reasons remain private history.

Schedule revision starts at zero, separately from event setup revision. All
commands supply expectedRevision and client-generated UUID operationId.
CREATE_STAGE supplies UUID id and trimmed name (1–200 characters).
CREATE_SESSION/UPDATE_SESSION supply UUID id/stageId, name, explicit-offset ISO
startsAt, bufferSec (0–3600), restSec (0–86400), moderatorId (eligible staff ID or
null). No implicit defaults. Limit: 100 stages and 100 sessions per event. Instants
must be inside the event window. Event start/end/timezone edits are refused while
sessions exist. Started session timing is fixed; paused moderator reassignment is
explicit. Judge assignments remain separate.

GET performance order is legacy order (nulls last), title, then ID. S13 generation
appends eligible unscheduled entries in this order; no optimality claim.
Eligibility requires active approved studio/application, current FINAL
REVIEW_PENDING or ACCEPTED checkpoint and exact current saved entry snapshot and
revision, with valid final data. Unconfigured, withdrawn, changed or incomplete
entries remain visible to admin as ineligible. Music remains independent.
Scheduling never edits legacy orderOnStage or submits entry data.

Preview supplies expectedRevision and complete queues, one row for every session:

```json
{
  "expectedRevision": 4,
  "queues": [
    { "sessionId": "00000000-0000-4000-8000-000000000002", "performanceIds": ["saved-performance-id"] }
  ]
}
```

Each queue has at most 2000 performance IDs. Response gives revision, queues,
previewToken (SHA-256 source fingerprint), projected starts/ends and conflicts:
ENTRY (duplicate/ineligible), DANCER (overlap/rest), STAGE (session overlap), WINDOW
or LOCKED. Conflicts name performances and sessions, never dancers. Rest uses the
greater session requirement; equality at the exact boundary is allowed. Durations
and buffers accumulate from each session start. Parallel stages still share dancer
checks. Conflicting previews can be inspected but cannot save.

SAVE supplies action, expectedRevision, operationId, the complete queues and actual
previewToken from the server. It repeats source/eligibility/conflict checks in a
serializable transaction. Cross-session moves/swaps release waiting positions
before replacement. Removed slots retain IDs with null positions and REMOVED
state; reuse reactivates the original slot. Current/performed/skipped prefix cannot
move. Running/finished queues cannot be edited. Ordinary setup/save runs in
DATA_REVIEW; paused LIVE editing is available to the future owning live slice.
SCHEDULED freezes entry sources and schedule writes; explicitly return to
DATA_REVIEW for correction before live use.

Live commands name sessionId and expectedSlotId (current UUID or null). PAUSE
retains current identity. SKIP requires reason, retains its slot and pauses before
selecting another performance. Admin REQUEUE requires reason and targetSlotId;
only the named skipped eligible slot returns to the waiting tail. Admin REOPEN
requires reason and FINISHED queue; it restores PAUSED, never scores. Reason is
retained in immutable operation history. START requires configured category rubrics
and active session panels, freezes the selected template/panel into the performance
and resumes/selects the current slot. ADVANCE requires every assigned sheet locked
before marking the current slot DONE and selecting the next waiting slot (or
finishing the queue). Global-admin ADVANCE_OVERRIDE also requires a nonblank reason;
it records the exception but leaves missing sheets incomplete and blocks finalization.
Current source eligibility is checked before selecting a new current slot. All
live commands require LIVE; event LIVE entry rechecks current entry eligibility,
queue conflicts and configuration readiness, and
FINALIZED requires all active slots DONE with complete sheets under
[ADR-004](../adr/004-exact-scoring.md). Missing prerequisites return 409
invalidConfiguration.
There is no automatic advancement, sheet unlock or publication.

Success is 200 with operationId/revision/action/workspace. Live command receipts
also store sessionId, expectedSlotId and targetSlotId when supplied. Staff command
responses and replays contain only the requested session. Exact actor/event/body
replay returns the historical receipt after current account/session/role/assignment
checks. Removed/replaced staff cannot replay. A changed body under an old UUID,
stale revision/fingerprint or transaction race cannot silently overwrite data.
Validation is 400, denied 403, missing parent 404, conflicts/configuration 409.
Audit and immutable receipt commit atomically. Audit metadata is limited to
revision and operationId.

## Assigned live console

The private `/live` read accepts optional UUID query parameters `sessionId` and
`operationId`. Omitted session selects the first available session by start time
and ID. An explicit unassigned or foreign session gets 403. The response returns
choices with stage/session names and scheduled starts, event timezone and stage,
the event schedule revision and the selected session's state. The current and
first four waiting slots include position, title and studio. The current slot uses the
frozen panel's required, locked and unavailable-outstanding counts. A missing
frozen panel is explicit. The event-wide scoring-readiness boolean shares the
command gate. Participant details, score values, comments and private totals
are excluded. Only global admins receive skipped-slot and sheet-correction
choices for a paused live session. Correction choices carry sheet identity,
revision, performance position/title/studio, judge name and state.

An optional acknowledgement answers only for the exact operation UUID, actor,
event and currently permitted selected session. It returns its historical
revision, action, target and timestamp beside a fresh queue projection. Earlier
schedule operations without saved live target metadata remain replayable through
the command path. Score-sheet correction uses the existing scoring REOPEN command
and returns a sheet-specific acknowledgement through this read for global admins.
No new command or migration is required.

S13 is `/app/admin/events/:eventId/schedule`, linked from event details. Stage and
session filters stay in the URL. Draft, preview and acknowledgement are distinct.
Exact uncertain requests and forms survive session restoration; authoritative
comparison never replaces local queues automatically. Browser reload does not
persist unsaved drafts. Print uses all saved sessions and acknowledged revision,
regardless of filter; it is a manual reference.

S14 is available at `/app/moderator/events/:eventId/live` from the moderator's
event list, and at `/app/admin/events/:eventId/live` from organizer event setup
and details. The selected session is in the URL. The console gates actions by
the current snapshot, sends pinned revisions, and reconciles receipts before
resending. A print handoff labels the last acknowledged read and its stage,
queue and sheet counts. See [ADR-031](../adr/031-live-scoring-reconnect.md) for
polling, read-only fallback and the open venue rehearsal.
