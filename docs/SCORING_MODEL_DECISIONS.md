# Scoring policy before P6 implementation

Prepared and accepted 2026-11-21 when the user selected the recommended first
implementation. [ADR-004](adr/004-exact-scoring.md) now owns the accepted decision;
the alternatives below retain its context. [The checkpoint](../DEVELOPMENT_PLAN.md) selected P6-SCORING-MODEL followed
by P6-TEMPLATES and its owning organizer UI. [The competition roadmap](roadmap/competition.md)
owns completion. No scoring task is completed by this brief.

## Verified starting point before implementation

The working tree was clean before this continuation. Fetched `origin/main`
6515dfd contains schedule PR #12; its tree matches current branch HEAD f06194f.
`git cherry` also identifies the two older implementation tips 2181c10 and
9f97e20 as patch-equivalent to merged work. The authenticated open-PR inventory
was empty. No merge or branch/history mutation is needed to obtain their code.

[The schema before implementation](../apps/api/prisma/schema.prisma) had an event-specific
`Judge` linked to a user and a legacy `Score` with a free-text criterion and
`Float` value. It had no rubric, assignment, score-sheet lifecycle or versioned
calculation model. [Judge checks](../scripts/check-judges.cjs) prove retained score
history prevents judge deletion; they do not implement scoring. Invitation/access
and Judge identity remain separate from a scoring assignment.

[The schedule service](../apps/api/src/services/schedule.ts) initially rejected
START/ADVANCE and LIVE/finalization pending scoring readiness. [ADR-030](adr/030-session-queues.md)
does not authorize inventing completion, unlocking sheets or publishing results.
[S15](ui/competition.md#s15--judge-scoring) and [F09](flows/F09.md) are targets,
not implemented contracts. No existing event rubric or accepted tie policy was
found in these maintained sources.

## Accepted first policy and alternatives

| Decision | Recommended first implementation | Alternative and consequence |
| --- | --- | --- |
| Rubric | Organizer-authored ordered criteria, ET/EN/RU labels/instructions, explicit min/max/step and positive weights totaling 100%; no fabricated default criteria | An actual festival rubric can replace this proposal before implementation; importing one requires its real rules |
| Applicability | Each event/category selects one immutable template version; all age/format groups in that category use it initially | Age/format-specific rubrics need explicit selection precedence and comparability rules |
| Exact inputs | Decimal strings with at most three fractional digits; persist scaled integers in thousandths, validate range and step relative to minimum, and reject rather than round invalid input | More precision or Decimal storage changes bounds and transport; unspecified Float behavior is unsuitable |
| Criterion aggregation | Normalize each criterion from its configured range to 0–100, then take its weighted mean | Raw weighted sums make different ranges contribute differently; select this instead if that is the festival rule |
| Judge aggregation | Equal arithmetic mean of every assigned judge's complete sheet; no dropped scores in the first calculation version | Dropping extremes or weighting judges needs panel-size, tie-selection and missing-judge rules before use |
| Rounding and ties | Round the final adjusted total once to three decimals, half up; descending rank within category/age/format, with shared competition ranks such as 1,1,3 for equal rounded totals | A criterion tie-break, jury vote or award bands changes outcomes and needs an explicit policy |
| Penalties and disqualification | Reasoned global-admin deductions in 0–100 total-point units, to three decimals; subtract after panel aggregation, floor at zero; disqualified entries retain evidence but receive no rank | Judge-entered penalties or automatic timing deductions require separate authority, scope and combination rules |
| Assignments | Explicit panel per session, frozen as per-performance assignment snapshots when the slot starts; at least one active verified event judge required | Per-performance panels or replacements after start require reasoned assignment revisions; a staff role alone never assigns a sheet |
| Submission and lock | A draft may omit criteria; explicit submission requires every criterion and atomically locks the acknowledged sheet version | A separate later lock leaves a period in which a submitted result can change; it needs an agreed cutoff |
| Visibility | Judges see their own assigned sheets; moderators see completion and blockers without peer values; global admin has private review access | Exposing peer scores/comments needs an explicit purpose and privacy decision |
| Corrections | Reasoned admin reopen of a named sheet while its queue is paused; preserve earlier submitted versions and invalidate dependent private calculations | Unrestricted editing or automatic reopening on queue changes loses the submitted-version boundary |
| Missing sheets | Block normal advance and finalization; a reasoned global-admin advance override records missing sheets and leaves results incomplete | Treating missing as zero or finalizing over an override changes rankings and is not recommended |
| Publication | New calculations remain private; later P7 finalization/publication pins a complete calculation revision and explicit public DTO; corrections never auto-republish | Event FINALIZED, CMS publication and sheet submission cannot imply public result publication |
| Legacy scores | Retain existing Float rows unchanged, outside new authoritative sheets/calculations; new scoring starts explicitly | Conversion would need a reviewed criterion/template mapping and exact representability checks; no silent historical conversion |

The accepted recommendation is a configurable scoring system, not a claim that these are
the festival's current rules. In particular normalization, three-decimal ranking,
shared ties and no dropped scores are now accepted under ADR-004. No actual
festival scoring range, criterion, panel or weight is inferred.

## Exact calculation and preservation contract to implement

For each submitted sheet and criterion, calculate
`100 * (value - min) / (max - min)` and multiply by its weight divided by 100.
Sum the criterion contributions, then average the assigned sheets. Subtract the
current reasoned total-point deduction, floor at zero, and round once as above.
Use exact integer/rational arithmetic through intermediate divisions; binary
floating-point arithmetic or premature per-criterion rounding must not decide
ties. Define bounded input ranges, panel sizes and criterion counts in the shared
contract before selecting database integer widths. Weights use integer basis
points totaling 10,000; `max > min`, positive step/weight and an exactly reachable
maximum are configuration prerequisites.

For illustration only, a 0–10 criterion at value 8 and weight 60%, plus a 0–20
criterion at value 10 and weight 40%, yields 68 points for that sheet. A second
sheet at 72 makes a 70-point panel mean; a 1.125-point deduction yields 68.875.
These are synthetic acceptance fixtures, not event facts or default criteria.
Exactly 68.8745 rounds to 68.875; equal rounded totals share rank.

Immutable template, assignment, sheet and calculation versions must identify their
sources. Changes to criteria, panel or penalties cannot silently reinterpret prior
submissions. Template edits create a new version; a started performance retains
its selected version. A correction records actor, reason, prior revision, new
revision and server acknowledgement time. Existing publications, when P7 exists,
continue to point at their old revision until explicitly replaced.

Every mutation and exact retry must recheck current active/verified account,
session revision, event role, assignment, event/queue state and expected revision
inside the committing transaction. Composite ownership keys should enforce
same-event performance/judge and criterion/template associations. Actor/event/body
bound operation receipts and durable audit commit atomically; lost responses
reconcile the exact operation, never blindly create another. Offboarding denies
draft writes, submission and receipt replay without deleting prior evidence.

## Two-task boundary and owning UI

ADR-004 was recorded before dependent changes:

1. **P6-SCORING-MODEL:** additive schema/migration, strict shared contracts,
   exact calculation policy/versioning, assignment and sheet state invariants,
   authorized API/client boundaries and immutable audit/retry semantics. Implement
   tests for zero versus missing, step/range/precision, all rounding/tie cases,
   cross-event/criterion/assignment denial, stale/concurrent/repeated writes,
   offboarding, rollback, retained legacy rows and corrections.
2. **P6-TEMPLATES:** global-admin organizer setup in the existing event workspace,
   with a criterion ledger, explicit ranges/steps/weights, applicability/version
   selection, panel setup and a readiness checklist. Native keyboard/touch controls,
   preview/confirmation, retained invalid/local drafts, stale/server comparison,
   uncertain-operation receipts, session restoration and ET/EN/RU states belong to
   this task. Use the established [Cobalt system](../DESIGN.md) and required
   [design/accessibility direction](DESIGN_SYSTEM.md); no imagery is needed.

S14 moderator completion and S15 judge autosave/submit/correction screens remain
P6-MODERATOR/P6-JUDGE. START/ADVANCE and LIVE/finalization remain fail-closed until
their actual readiness and completeness checks exist and pass. Template setup
alone does not complete P6-UI-LIVE, P6-RECOVERY, Phase 6 or M5. Result review,
ranking delivery, publication and exports remain their P7 tasks; the model must
support them without claiming those workflows are delivered.

Required implementation evidence is affected unit/component tests, real disposable
PostgreSQL/API scope/history/concurrency checks, fresh/upgrade migration parity,
workspace tests/typecheck/lint/build and Prisma checks. Template UI additionally
needs ET/EN/RU browser/recovery/accessibility checks and Hallmark static/rendered
review at the prescribed viewport sizes. [TESTING](TESTING.md) owns commands and
isolation. Hosted, human/assistive and venue acceptance remain separate gates.

## Follow-through

Acceptance authorizes P6-SCORING-MODEL followed by P6-TEMPLATES with its organizer
UI. [The scoring contract](api/scoring.md) owns implemented payloads and boundaries;
the roadmap/checkpoint retain validation and completion status. S14/S15 and P7
remain downstream. No deployment, application-database mutation or Git publication
is part of this local implementation.

## Proposal validation

Before acceptance, documentation-only checks on 2026-11-21: checker syntax and `git diff --check`
passed. The canonical documentation checker exits 1 for the previously recorded
relative-link error in ignored `.hallmark/pr-body.md`. Running the same checker
in memory with only `.hallmark` added to its excluded directories passes all 159
Markdown files and 1,279 local links, including this brief. The checker source and
scratch files were not modified. No runtime, browser or database checks were run
for that proposal. Those results are historical proposal checks, not implementation
validation; current delivery status belongs to the checkpoint/roadmap.
