# ADR-025: Staged entry registration and organizer review

Status: **Accepted for local implementation**, 2026-11-13.
Owners: P3-ENTRIES and the remaining P3-HISTORY consumers, coordinated with
P4-ENTRY-CONFIG and later P5/media workflows. Implementation status and evidence are recorded in the roadmap/checkpoint. The earlier unaccepted per-entry/strict-age
recommendation is superseded by the supplied answers below.

## Sources and authority

The user returned the completed [director questionnaire](../ENTRY_POLICY_QUESTIONNAIRE.md)
and six festival-rule images. Preserve the questionnaire's answers unchanged.
[Dance Express source rules](../DANCE_EXPRESS_RULES.md) records the image content,
source differences and rules belonging to later scoring/billing work. These
sources describe one festival and a configurable product, not immutable global
Dance Express rules for every event.

The user explicitly requires each festival/competition to be adjustable without
making event creation complicated. This record distinguishes supplied decisions,
implementation recommendations and remaining questions; blank questionnaire
subfields are not approval of the earlier defaults.

## Stakeholder decisions

| Area | Supplied decision | Source |
| --- | --- | --- |
| Registration | Three checkpoints: studio application, basic performance details, final details/roster | Answers 1–2 |
| Basic details | Dance name, category, declared age group and format | Answers 1–2 |
| Final details | Duration, teacher and author, studio dancers with birth dates and dancer-to-performance selections | Answers 1–2; image 6 requires choreographer credit |
| Concurrency of preparation | Basic and final details may be completed together but have distinct deadlines | Answer 1 |
| Initial application | Studio/director/email/phone and expected dances for day 1/day 2 in this two-day festival | Answer 1 |
| Configuration | Organizers can enable/disable relevant checkpoints/requirements and configure their deadlines for each event | Answer 6; user's accompanying message |
| Age | Completed years on first event day; younger dancers unrestricted; at most 20% older dancers for Dance Express | Answers 3–4; image 6 |
| Limits | Category/age/format-dependent combinations and durations; kids dance differs from standard categories | Answer 5; image 2 |
| Locking | Studio can lock a form early; otherwise its applicable part locks at its deadline | Answer 9 |
| Review | Review pending → checked and accepted, or requires changes | Answer 15 |
| Corrections | Organizer can reopen a whole form or named parts; studio requests reopening by email, not an in-app request workflow | Answer 10 |
| Extensions | Organizer may grant a late exception and may enter information on a studio's behalf | Answer 7 |
| Organizer authority | Submit, correct, withdraw, grant extensions and approve eligibility exceptions; real actor and history retained | Answer 14 |
| Withdrawal | Studio may withdraw before entry deadline; afterward contact organizer | Answer 12 |
| Rules freeze | Category/age rules must not change after registration starts; editable unsubmitted information is distinct | Answer 11 |
| Later corrections | Organizer can change entry information at any time, including after normal participant windows | Answer 13 |
| Music | Independent timing; studio confirms the uploaded version and loses replacement access; organizer accepts separately; missing music gets a reminder | Answers 1, 8 |
| Change visibility | Organizer chooses whether a correction is shown to the representative; not mandatory | Answer 14 |

Application organization/event approvals remain distinct under ADR-003/021. An
entry checkpoint's review state does not grant account access or silently replace
application approval. Likewise music acceptance and payment/participation status
are separate from receiving entry details.

## Confirmed checkpoint and age policy

The user explicitly confirmed on 2026-11-13:

1. Basic and final details submit/lock **for the whole studio**, not for each
   performance independently. Each receipt therefore pins a studio manifest.
2. The configured older-dancer percentage covers **older dancers generally**.
   There is no next-age-group or absolute older-age cap. Younger dancers remain
   unrestricted in the Dance Express preset. The 20% ceiling uses exact integer
   comparison without rounding up.

These explicit answers supersede both the earlier per-entry/strict-age proposal
and the image's next-older-group restriction. They resolve the two policy forks;
no further stakeholder answer is required for this checkpoint implementation.

## Simple per-event setup: implementation recommendation

Use a guided organizer setup with four ordinary sections: event facts,
nomination table, registration checkpoints, and review. Preserve the existing
Cobalt system in [DESIGN](../../DESIGN.md), the required
[design direction](../DESIGN_SYSTEM.md#required-full-redesign), ET/EN/RU and
accessible native controls. Event creation should still permit a minimal saved
configuration; registration readiness explains any missing setup before opening.

- Offer an optional reusable festival preset, such as the supplied Dance Express
  nomination table. Copy values into the event; never hardcode them for all
  festivals or silently insert this festival's values into unrelated events.
- Show supported checkpoints with enable/disable, required/optional and deadline
  controls. Basic and final details may share a deadline or be combined. Music
  has its own window and confirmation even when completed alongside other data.
- Use a fixed catalogue of supported data fields and safe dependencies; do not
  introduce arbitrary scripting, a visual workflow engine or an unrestricted
  custom-form builder. Additional supported questions can be added through the
  normal shared-contract workflow when an actual festival needs them.
- Keep category/age/format combinations in one editable nomination table. Simple
  format defaults may be reused, with explicit category-specific overrides.
  Represent an unbounded big-group maximum honestly; do not invent a numeric cap.
- Age controls expose the reference-date policy, younger-dancer allowance and
  older-dancer percentage, without an older-age cap. Dance Express's preset uses
  the explicitly confirmed rules. Do not add average/oldest-age
  engines merely because an earlier questionnaire listed them as alternatives.
- Collapse rare extension/correction/exception actions behind organizer review;
  ordinary creation should not require configuring every exceptional case.
- Keep deadline fields independent. The earlier proposal's rule that music cannot
  precede entry deadlines is withdrawn: the answers require event-adjustable
  checkpoints and early independent music preparation.
- Expected counts generalize to actual event calendar days; day 1/day 2 are this
  festival's example, not two permanent database fields for every event.

Freezing competition rules is separate from adjusting operational windows or
correcting entries. The implementation must define a single rules-publication
boundary consistent with existing M2 application access: PRE_REGISTRATION already
permits applications, so checking only REGISTRATION_OPEN is insufficient. The
recommended safeguard is freezing published nomination/age/format policy no later
than the first application, while permitting draft setup before publication.
Never silently recategorize saved/submitted entries after rule changes.

## Field completeness, eligibility and exceptional authority

Drafts remain durable, nullable and unscheduled under ADR-024. The basic checkpoint
requires its enabled basic fields, not final dancer data or a schedule position.
The final checkpoint requires its enabled final details and dancer selections.
The model must add teacher/author information and per-day application estimates;
current schemas do not provide them. Do not conflate artistic author/choreographer
with the user account who performed a save.

Use the existing event-local age calculation under ADR-023. A person aged 13 years
and 6 months has completed age 13. Under the supplied younger allowance, a dancer
below the declared group's minimum is not rejected for that reason. Use exact
integer percentage comparison: olderCount * 100 <= participantCount * percent.
At 20%, 1 older dancer among 5 is permitted; 1 among 4 is not. No rounding up and
no average-age calculation is implied. A future organizer exception is explicit
and retained, not a changed global formula.

Image 2 gives standard maxima of 240 seconds for small/big groups and 150 seconds
for solo/duet. Kids dance permits small/big groups up to 210 seconds. Big groups
start at 7, small groups are 3–6; source age bands include kids through 7 and
standard 7–10, so age 7 can appear in more than one allowed category combination.
Retain category-specific applicability instead of requiring globally disjoint
age bands. No timing tolerance or minimum duration is stated.

Organizers can make authorized late/post-final entry corrections and eligibility
exceptions. This supersedes the earlier proposal's blanket final-stage write ban
and no-exception rule. An exception must identify the exact entry/field, real
actor and reason; it does not bypass active/event/studio relationships or revision
checks. Rule-table edits remain frozen. Later scoring/results consumers must
explicitly handle affected accepted/published versions; entry corrections do not
automatically overwrite scores or republish results.

## Lock, review and correction behavior

Checkpoint locks are independent of the EventStage enum. The existing
registration.canEditDuringReview is not a submitted-form unlock. Apply field and
membership checks on the server, including roster edits that would otherwise
change a locked final submission indirectly.

- Early representative confirmation locks the applicable form and records a
  receipt of its exact submitted values. The organizer sees review pending.
- Deadline closure prevents later representative changes even without an early
  confirmation. If data is incomplete, show locked/incomplete and the next actor;
  do not fabricate a successful participant confirmation or acceptance.
- Organizer acceptance records the exact reviewed version. A correction or
  resubmission must not leave an old acceptance apparently covering new data.
- Organizer reopening names its whole-form or field/entry scope and an explicit
  access window. The studio sees what is editable; unrelated scope remains locked.
  A replaced/expired grant cannot authorize later edits or resubmission.
- The studio contacts the organizer by email to request reopening. Provide the
  contact/action explanation, not a second in-app request/approval workflow.
- Retain earlier submissions and their review/correction/withdrawal history.
  Withdrawal is a retained action, not deletion of a performance or fee evidence.
- Optional representative visibility must distinguish the organizer's correction
  notice/history from the underlying current field values and the studio's own
  receipts. Finalize this interpretation before exposing a visibility control;
  do not leak internal notes or silently alter a historical receipt.

The questionnaire does not specify exact deadline times, a general grace period,
correction default duration or whether corrections can close after the event.
Use explicit per-event/organizer-set windows; do not impose the old proposed
before-start-only policy. Ordinary deadline comparisons should close at the
configured instant unless an explicit extension applies, with event timezone
shown. Unknown actual dates/times remain unset until the organizer supplies them.

## Music boundary

A representative confirms an acknowledged uploaded version, which locks their
replacement access; organizer acceptance is a later distinct action. Reopening
must be explicit. Music can be prepared independently, including during initial
registration, so later media design must support a private studio/application-
bound draft association before basic/final completeness. Never create an
unowned attachment or grant broad roster/configuration access merely to upload.

The screenshot's email/USB process is the existing festival procedure; the
questionnaire requests the new upload/confirmation process. Missing-music reminders
require a real missing state and the existing transactional notification system.
Do not fake media presence, file validation or organizer acceptance before
P3-MUSIC-MODEL/P8-MEDIA/P5-MUSIC are implemented. Exact December 1 cutoff time,
file validation limits and replacement exception windows are not supplied by the
images. Their future configuration retains the media gate.

## Revision, receipt and access invariants

ADR-022/023/024 ownership and history protections remain canonical. Every receipt
must pin the exact version/manifest and source values actually validated. Never
validate live data and issue confirmation for an older, different snapshot.
Studio-wide checkpoints require atomic manifests of included
entry IDs/revisions and final roster values; a new/deleted dance cannot bypass a
locked manifest. Basic receipts omit the unrelated full roster; final receipts
retain the active studio roster.

Commands use expected revisions and actor/route-bound UUID retry operations.
Matching retries return the existing result after current read authorization;
changed reuse conflicts. Concurrent attempts commit one authoritative outcome.
Snapshots, receipt/manifest, review/lock changes and audit commit atomically.
No actor impersonation, unauthorized history read, cross-event/studio association
or automatic stale overwrite is permitted. Deadline lock and capture time must
be truthful; late materialization must not invent an earlier representative act.

## Implementation scope and validation

Implement P3-ENTRIES and P3-HISTORY consumers with their S12 organizer review,
version/receipt, field reopening and acknowledged outcome UI. Reconcile the
coordinated P4-ENTRY-CONFIG scope with the confirmed checkpoint design before
building dependent representative screens. Changes span shared Zod contracts,
additive Prisma migrations, established service/controller/router, API client,
organizer components, translations, database/API and browser checks. No route or
component tree is removed by this decision record.

Required cases include stage-specific completeness; category/age/format mapping;
percentage and duration boundaries; rule freeze; deadline/early locks; extensions;
organizer late writes/exceptions; whole/field corrections; roster lock bypasses;
source changes and manifest reproducibility; stale/concurrent/lost-response retry;
atomic audit failure rollback; immutable history and private/visible notes.
Run the applicable workspace, full database/migration and ET/EN/RU browser gates
from [TESTING](../TESTING.md), plus Hallmark review, target freshness and diff review.

The source images also describe fees/refunds, awards, scoring and terms. Preserve
those in the source record and route them to their owning later tasks; do not
implement billing, Grand Prix, penalties or publication in this entry slice.
P3-HISTORY consumers are delivered locally; P3-ENTRIES remains open for reversible
withdrawal/resubmission. [Validation](../ENTRY_CHECKPOINT_VALIDATION.md) records
implementation checks and the completed local database reset/reseed. No real-mail,
human language/assistive or hosted release gate is closed by this design record.
