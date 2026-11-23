# ADR-004: Exact versioned scoring and organizer setup

Accepted 2026-11-21 when the user selected the recommended first implementation
in [the decision brief](../SCORING_MODEL_DECISIONS.md). Task completion remains in
[the competition roadmap](../roadmap/competition.md).

Each event/category explicitly selects an immutable template version. Ordered
criteria have ET/EN/RU labels/instructions, nonnegative min/max/step decimal
strings with at most three fractional digits and positive integer basis-point
weights totaling 10,000. At most 30 criteria, values up to 1,000, steps greater
than zero, exactly reachable maxima, and at most 30 judges bound the contract.
No festival rubric is fabricated. Storage uses integer thousandths; calculation
uses exact BigInt rational arithmetic and rounds only the adjusted final total,
half up to three decimals. Normalize each criterion to 0–100, weight its
contribution, average all assigned judges equally, subtract an admin deduction
(0–100 points) and floor at zero. No dropped scores. Equal rounded totals share
competition ranks (1,1,3), within category/age/format. Disqualification retains
evidence and excludes ranking. Calculation policy identifier is `normalized-v1`.

An explicit session panel is configuration, not access. Starting a performance
freezes its template and assigned judges in a performance scoring record. A
current verified account, current event role with score.submit and matching Judge
are required. Submission requires every criterion and locks that sheet atomically.
Draft, submission and reasoned admin reopening retain immutable sheet versions.
Reopening requires a paused queue and an event still in LIVE; it invalidates
current completeness and private calculation sources, never a historical receipt.
No peer scores are exposed to judges; moderators receive completion only.

Missing sheets block normal advance and finalization. A reasoned global-admin
advance override records the missing-sheet exception and does not supply zeroes
or make calculations complete. Admin deductions/disqualification require a
paused queue and reason. Snapshot sources include immutable template, sheet and
exception versions. [ADR-032](032-private-results.md) owns private grouped
calculations and revision-bound finalization. P7 still owns public revisions and
explicit correction republication. Event stage, CMS publication
and sheet submission never publish a result. Legacy Float Score rows remain
unchanged and excluded from new calculations.

All commands, including retries, validate current account/session, permission,
event/assignment and state in a serializable transaction. UUID receipts bind
actor/event/body and commit with audit and effects. Expected revisions prevent
silent overwrites; uncertain writes reconcile the same UUID. Rubric/panel setup
uses a source-bound preview and explicit confirmation. Relational keys enforce
event and criterion/template ownership; immutable history is protected in SQL.
P6-JUDGE/MODERATOR/RECOVERY still own their screens and venue rehearsal. This ADR
does not complete M5 or authorize deployment.

The additive migration retains existing scores and terminal events. Rollback
after use must retain/export new history and stop writes; do not drop scoring
tables or run an older binary against live scoring. The application development
database is not automatically migrated by local disposable validation.
