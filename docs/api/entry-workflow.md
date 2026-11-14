# Studio entry checkpoints

[API index](../API.md) · [ADR-025](../adr/025-entry-submission-lifecycle.md)

These authenticated canonical routes are relative to `/api/v1`:

| Method/path | Authority / result |
| --- | --- |
| GET `/events/:eventId/entry-configuration` | Global administrator; settings, revision and whether competition rules are frozen |
| PUT `/events/:eventId/entry-configuration` | Global administrator; full validated settings with expectedRevision; stale writes conflict |
| GET `/events/:eventId/studios/:studioId/entry-review` | Global administrator or approved active owning representative with event/global performance.manage; current studio checkpoints and authorized receipts |
| POST `/events/:eventId/studios/:studioId/entry-review/:kind` | Same exact owner/event checks; SUBMIT for representative or administrator, ACCEPT/REOPEN/eligibility exception for global administrator only |

`kind` is BASIC or FINAL. Checkpoints cover the **whole studio**. They are not
EventStage values, studio approval or music acceptance. Events opt in by saving
their configuration; absence returns an empty checkpoint collection and preserves
existing draft behavior. No preset is automatically imposed on existing events.

## Configuration

PUT accepts `{ expectedRevision, settings }`. The shared EntrySettingsSchema owns
the exact contract: basic/final enabled flags and independent nullable explicit-
offset deadline instants; allowYounger; olderPercent (0–100); requireTeacher and
requireAuthor; and an optional nomination-combination list. Each combination has
same-event category/ageGroup/format IDs, maxDurationSeconds and nullable
maxParticipants (null means no upper eligibility bound). Minimum count still comes
from the selected format. A nonempty list restricts submissions to listed
combinations. An empty list uses existing event combinations/base format limits.

The organizer form can apply the supplied Dance Express age/credit settings;
that button does not create a complete category/age/format preset. The nomination
editor uses existing event options. Full option creation, reusable complete
presets, application per-day estimates and representative screens retain their
owning follow-up scope. There is no arbitrary form/workflow engine.

Once registration exists, nomination policy and referenced category/age/format
records are frozen. Only basic/final deadline instants can be adjusted. Event
start/timezone changes that would change age reference are frozen too. Retained
cancelled registrations do not silently unfreeze rules. API checks and SQL
triggers enforce this; event-row locking serializes rules publication/application
creation. First configuration must precede the first application; it cannot
introduce new competition rules into an event whose registration has already
started. Existing unconfigured events retain legacy draft behavior.

Deadline null means no automatic cutoff. At the exact configured instant normal
representative writes close. Explicit future correction grants can extend that
window. Organizer entry correction/exception authority remains independent of
event stage; frozen competition rules cannot be bypassed by that authority.

## Completeness and eligibility

BASIC requires title/category/age group/format on every active studio entry.
FINAL also requires positive duration, an active same-studio participant set and
the enabled teacher/author credits. Both reject an empty studio manifest.
Scheduling order is not required. Supplied relationship checks also apply to
incomplete draft writes. Presence is separate from passing submission checks.

Final checks use completed age on the event-local first day and the existing
March 1 non-leap birthday policy. With allowYounger, ages below the band's minimum
are allowed. **Every dancer above its maximum counts toward olderPercent,
regardless of how much older they are.** Use olderCount × 100 ≤ count × percent;
never round an allowance up. Format count and category-specific duration maxima
are inclusive. Dance Express kids groups can use 210 seconds while standard
groups use 240 through separate nomination combinations.

An administrator may explicitly waive age/count/duration blockers with
`exception: true` and a reason. Required data, active participants and parent
relationships and invalid/future birth dates cannot be waived. Corrections
invalidate current acceptance.

## Commands, receipts and reopening

Every POST carries `expectedRevision`, UUID `operationId` and action
SUBMIT/ACCEPT/REOPEN. Optional `reason`, `visible` and `exception` have strict shared
validation. REOPEN additionally requires:

```json
{
  "fields": ["durationSec"],
  "performanceIds": ["current-entry-id"],
  "until": "2026-12-02T18:00:00+02:00"
}
```

This is the command's `grant` value. Null performanceIds selects the whole studio;
a scoped ID list selects existing entries only. The roster and structural entries
fields require studio-wide scope. FINAL can reopen classification fields too;
BASIC cannot reopen final/roster fields. Grant expiry is explicit and must be in
the future; replacement/resubmission consumes the prior scope. Entry and dancer
CRUD both enforce studio locks, including attempts to alter a locked submission
indirectly through the roster. A final lock covers its basic fields as well.

SUBMIT checks the current manifest, captures fresh immutable CHECKPOINT
performance revisions, pins their exact snapshots and settings, consumes the
grant, and marks REVIEW_PENDING. FINAL also retains the active studio roster;
BASIC omits that unrelated full roster. ACCEPT requires the
current REVIEW_PENDING state and records ACCEPTED; an earlier receipt cannot
accept subsequently reopened/edited data. REOPEN records REQUIRES_CHANGES with
its reason/scope/window. Deadline closure without participant confirmation is a
lock, not a fabricated submission or acceptance.

Receipts include ID, checkpoint revision/kind/action, server time, actorKind,
reason visibility and the pinned manifest. Actual actor account identity remains
in restrictive database relations/audit, not public response fields. The visibility
flag controls correction reason/history disclosure, not secret mutations of the
representative's current data or rewriting their old receipt. Unmarked reopening
records/reasons are omitted from representative history; their permitted field
scope remains visible so they can correct the form.

Same actor/route/body operation retries return the same receipt after current
access checks, even after deadline closure. Changed reuse, stale revisions and
concurrent attempts return 409 with no partial receipt/revision/audit. All writes
use serializable transactions. SQL prevents receipt edits/deletion and checks
that every manifest snapshot equals an immutable saved revision of its studio.
Source changes cannot silently change an older receipt. Save/capture/audit failure
rolls everything back.

## Owning UI and remaining work

The global-admin organizer register uses `?entry=rules`, or
`?studio=:studioId&entry=review&checkpoint=BASIC|FINAL`. `?edit=:performanceId`
opens the organizer details/participants editor, including teacher and author.
Blocker links open the exact editor field. Local form state survives language and
same-account session recovery. Uncertain commands freeze the exact operation for
explicit retry; acknowledged receipts remain shown if readback fails. Settings
and details saves reconcile their authoritative values before replaying uncertain
writes. No client-only gate substitutes for backend checks.

Current DELETE remains retained archival/withdrawal: before the basic deadline
for representatives in nonterminal stages, or authorized administrator correction.
It preserves snapshots/receipts, invalidates acceptance and does not unlock other
entries. A dedicated reversible withdrawal/resubmission editor is still required;
there is no restore endpoint. Representative entry/roster screens, per-day initial
application estimates, complete nomination presets and media/music deadlines,
confirmation/acceptance/reminders retain their own tasks. No ready/accepted music
state is fabricated by this data-checkpoint implementation.
