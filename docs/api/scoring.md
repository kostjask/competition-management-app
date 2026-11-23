# Exact scoring and organizer setup

[API index](../API.md). All paths are relative to `/api/v1`; responses are
private/no-store. [ADR-004](../adr/004-exact-scoring.md) owns the accepted policy.
The strict [shared schemas](../../packages/schemas/src/scoring.schema.ts) own
payloads and inferred transport types. Migration 47 is additive; legacy `Score`
Float rows are unchanged and excluded from new calculations.

| Operation | Endpoint | Authority |
| --- | --- | --- |
| Current scoring workspace | GET `/events/:eventId/scoring` | Global admin, current assigned event judge, or assigned moderator |
| Own judge sheets and optional operation acknowledgement | GET `/events/:eventId/scoring/judge` | Active event judge with matching Judge identity and `score.submit` |
| Validate proposed rubric/category/panel setup | POST `/events/:eventId/scoring/preview` | Global admin |
| Acknowledged configuration/sheet/correction/calculation command | POST `/events/:eventId/scoring/commands` | Current operation-specific authority below |

All commands include UUID `operationId` and `expectedRevision`. CONFIGURE, ADJUST
and CALCULATE consume the scoring workspace revision; DRAFT, SUBMIT and REOPEN
consume the named sheet revision. Event setup and queue revisions are separate.
Commands increment the scoring workspace revision and return
`operationId/revision/action/workspace/calculation`; calculation is null except
for a successful private CALCULATE. The workspace includes the latest 20 receipt
summaries visible to the actor, not a complete operation archive.

Current verified/active account, session revision, event role, Judge identity,
assignment and operation scope are checked in the serializable transaction,
including before exact replay. Role alone never assigns a sheet. Global/scoped
judge or scoped-admin substitutions do not grant authority. Moderator reads show
only assigned-session completion counts, not values/comments. Judges see their
own sheets and required frozen rubrics, no peer values or roster/contact data.
Global administrators have private review access to sheets. No anonymous scoring
endpoint or public result DTO is added.

Judge-write receipts contain only the caller's assigned sheets even when that
account also has administrator/moderator authority. Later loss of an additional
role therefore cannot expose peer data through historical receipt replay.

The judge-specific read is always own-sheet-only, including for accounts with
an additional administrator/moderator role. It returns event name, own sheets
with their session and stage names, current/editable flags, frozen rubric and
values, latest saved revision time and any reason for reopening the draft. A
strict optional `operationId` UUID query returns a matching DRAFT/SUBMIT
acknowledgement with operation ID, sheet ID, action, sheet revision and receipt
time, or `null`. This lookup is scoped to the event/actor and current judge
identity. It does not return peer data or depend on the workspace's recent 20
receipts. Unknown, foreign or uncommitted operations have the same empty lookup.

## Configuration and readiness

`setup` contains `templates`, `bindings` and `panels`. A template has UUID `id`,
trimmed `name` and 1–30 ordered criteria. A criterion has UUID `id`, `label` and
`instructions` objects keyed by `et/en/ru`, decimal-string `min/max/step` and
integer `weightBps`. Labels are required in every language (1–200 characters);
instructions may be empty (at most 1,000 each). Names are 1–200 characters.

Inputs are nonnegative decimal strings up to 1,000, with at most three fractional
digits and no exponent, NaN, Infinity or implicit coercion. Minimum is below
maximum, step is positive and reaches maximum exactly from minimum. Positive
weights total 10,000 basis points. The organizer UI accepts a decimal comma and
converts it to the canonical decimal string; HTTP accepts a point only. Invalid
values are never clamped or silently rounded. Empty/missing values differ from
explicit zero. Values are persisted as integer thousandths.

Each binding names a same-event `categoryId` and existing/new `templateId`.
Each panel names a same-event UUID `sessionId` and 1–30 unique active judge IDs.
Limits are 100 retained template versions, 200 bindings and 100 session panels.
Every saved template remains in future setup payloads unchanged; edits create a
new UUID version with new criterion UUIDs. Existing started records retain their
template and assigned sheets when a paused session's future panel changes.

Preview takes `{expectedRevision, setup}` and returns
`{revision, setup, previewToken, blockers}`. CONFIGURE repeats the complete setup
and returned token. The fingerprint binds current event, queues, categories,
roles, judges, setup and scoring records. Changes invalidate confirmation even
without a workspace revision change. All running queues must pause before
configuration. Terminal events reject setup writes. A valid partial setup can
save while readiness still reports missing templates/panels/eligible judges or
an empty queue; saving configuration is not a claim that judging can start.

## Sheets, corrections and exact private calculations

START freezes the category's immutable rubric and explicit session panel into
the performance record and creates DRAFT sheets plus immutable initial versions.
A record remains bound to its event, session, performance and template; every
sheet remains bound to its judge and template. Composite database keys enforce
event and criterion/template consistency. Template/criterion, sheet-version,
calculation and operation histories reject SQL updates/deletes; locked values
reject writes and submission requires every criterion.

DRAFT/SUBMIT supply `sheetId` and `values` (at most 30), each with `criterionId`,
decimal-string `value` and nullable comment of at most 1,000 characters. Only
the assigned judge may write. Ordinary edits require the current performance;
reasoned reopened corrections can be submitted while the queue is paused.
Incomplete DRAFT is valid. SUBMIT requires all criteria exactly once, records the
server time and atomically locks the sheet. A new write to a locked sheet is
denied; retrying the exact acknowledged operation returns its historical receipt.

Global-admin REOPEN names a sheet and a nonblank reason (1–500 characters), while
its queue is paused and the event is LIVE. It opens a new draft revision and
retains earlier versions; this also permits completing a missing draft after an
admin advance override. Global-admin ADJUST names `recordId`, decimal-string
`penalty` (0–100 points), boolean `disqualified` and a reason under the same
paused/LIVE gate. Prior calculations/receipts remain immutable; current sources
change, so they cannot masquerade as current calculations.

Global-admin CALCULATE names `recordId`, requires all assigned sheets locked, and
retains a private calculation with immutable source hash and `normalized-v1`
policy identifier. Its immutable inputs pin exact criterion ranges/steps/weights,
sheet IDs/revisions/values, penalty, disqualification and correction reason; stored
operation requests retain the normalized private command. Older calculations can
be reproduced after subsequent adjustments. Each criterion contributes
`100 * (value - min) / (max - min) * weightBps / 10000`. Sum criteria, average all
assigned judges equally, subtract the total-point penalty, floor at zero, and
round once to three decimal places, half up. BigInt rational intermediates avoid
binary rounding. No scores are dropped. Disqualification returns a null total
and no rank. The model's ranking policy uses descending rounded totals with
shared competition ranks (1,1,3) within category/age/format.
[Private grouped results](results.md) reuse those calculations and persist
reviewed revisions. Public publication and exports remain P7 work.

## Recovery and UI boundary

Audit, effects and receipt commit atomically. Exact retries bind actor/event/body;
changed bodies under a reused UUID, stale revisions/fingerprints and transaction
races return conflict. No automatic retry with a new UUID. Current access removal
denies replay without deleting evidence. Validation is 400, permission 403,
missing parent 404 and stale/configuration/relationship conflict 409.

The organizer editor is `/app/admin/events/:eventId/scoring`, linked from event
details/setup. Saved versions are inspectable, copies use new identities, native
controls provide criterion ordering and session-panel selection, and preview
requires explicit confirmation. Local edits and exact uncertain requests survive
network errors, session restoration and canceled navigation; browser reload does
not persist unsaved edits. Server comparison never replaces drafts automatically.
Receipts acknowledge their historical revision; a later current read is separate.

The judge consumer is `/app/judge/events/:eventId/score`, reached from the judge
event list. [ADR-031](../adr/031-live-scoring-reconnect.md) owns polling, stale
reads, in-tab drafts and server-first operation reconciliation. It uses the
existing DRAFT/SUBMIT command path. An exact receipt and the latest sheet state
are distinct, so a historical submission acknowledgement can coexist with a
newly reopened server sheet.

The backend enforces START/ADVANCE readiness under [the schedule contract](schedule.md)
and completeness under [the private results contract](results.md). S14 reads frozen-panel completion
without values. An admin uses the scoring REOPEN command from the live console
for a named sheet in a paused session, including an outstanding historical sheet.
Event setup initiates LIVE through its existing revisioned stage transition.
The organizer finalizes a reviewed private revision in S16. Venue/manual fallback
rehearsal remains P6-RECOVERY. Public result publication remains a separate workflow.
