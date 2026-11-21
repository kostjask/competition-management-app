# Session scheduling validation

2026-11-21. Scope: P6-LIVE-MODEL and P6-SCHEDULE with owning S13 and event-stage
controls. [ADR-030](adr/030-session-queues.md) records the explicit accepted policy;
[the contract](api/schedule.md) describes implemented HTTP/recovery behavior.
This is local technical evidence, not a competition-operation release claim.

## Implementation

Migration 46 adds SCHEDULED/LIVE without reclassifying existing events, plus
event-owned stages, timed sessions, assigned moderators, stable slots, immutable
actor/body-bound operation receipts, ownership keys and current/position indexes.
Legacy performance order/revisions remain unchanged. One event schedule revision
coordinates atomic moves/swaps across queues. Removed slots retain identity.

Admin preview binds current entry snapshots, participants, approvals, checkpoints,
event/session configuration and proposed queues. Save repeats eligibility and
interval/conflict validation. Same-dancer rest uses the greater configured gap;
overlapping stage sessions and event-window violations block save. Source changes,
stale revisions and concurrent commands cannot silently overwrite saved queues.
Current account/session/role and exact queue assignment precede privileged replay.
Audit failure rolls back state and receipt together. Schedule DTOs, conflicts and
receipt snapshots omit source roster fields, participant names and birth dates.
Operator-authored exception reasons remain in private operation history.

S13 extends locked Cobalt with URL filters, explicit stage/session forms, native
move/destination controls, append-generation, timing preview and confirmation.
It retains local work and exact operation identity through uncertain responses,
comparison, session restoration and cancelled navigation. All saved sessions are
printable with their acknowledged revision. SCHEDULED freezes entry sources;
return to DATA_REVIEW is explicit and limited to paused, unstarted queues.
New lifecycle actions have distinct localized labels and truthful effects.
Historical receipt replay performs a separate current-state read; a newer server
revision requires explicit comparison before further editing. A failed current
read never converts an acknowledged mutation into an uncertain mutation. Rebasing
onto compared server state retains local configuration fields for explicit resave.

START/ADVANCE, entry into LIVE and finalization fail closed until scoring readiness
and completeness are implemented. PAUSE/SKIP and admin reasoned REQUEUE/REOPEN are
model commands tested with directly constructed live fixtures; this does not
deliver S14, judging, scores, results or a venue/offline rehearsal.

## Validation evidence

Completed during implementation:

- `pnpm test:focus api schedule.test.cjs`: 3 passed, covering interval/rest
  boundaries, cross-stage shared dancers, stage/window conflicts, locked prefixes,
  strict command input, explicit offsets and bounded return paths.
- `pnpm test:focus api routes.test.cjs`: 77 passed after extending existing fakes
  for the new lifecycle read. LIVE is now a valid enum value, so the old invalid-
  enum fixture uses UNKNOWN; live readiness remains denied in database tests.
- `pnpm test:entry-foundations`: passed, including the final source-lock,
  unchanged-date setup, moderator replacement/offboarding/replay, session revocation,
  skip/requeue/reopen, duplicate/stale/concurrent, withdrawal and audit-rollback cases.
- `powershell -NoProfile -File scripts/test-migrations.ps1`: fresh/upgrade
  preservation and exact catalog parity passed for all 46 migrations. Initial
  enum-order failures were corrected in the new unpublished migration/schema;
  no existing migration was rewritten.
- `pnpm db:generate`, `pnpm db:validate` and direct Prisma format `--check`: passed.
- Full `pnpm test`: passed (140 API tests, plus workspace/localization suites).
- Initial S13 browser suite: 20 passed across ET/EN/RU and 320/390/768/1440/1920px,
  including session/response recovery, loading, empty, denied, conflict, retained
  form validation and navigation. A preview-focus race was fixed by focusing
  after the preview commit; the loading test now targets the actual skeleton.
- Final full API/PostgreSQL baseline passed in 346.06 seconds, including seed
  idempotency, migration redeployment and every API/database workflow.
- Final build/typecheck/lint passed. Full unit rerun passed: 140 API, 34 web,
  8 public-site and 3 tooling tests, with localization checks.
- The first full browser run passed 415/416; its one lifecycle-label regression
  was corrected with distinct actions. That case and the new scheduling-transition
  regression both pass. The clean full rerun passed 417/417 in 16.5 minutes.
  A final focused run verifies the expanded historical-receipt/configuration-rebase
  assertions collected after that run started passed 20/20 in 43.5 seconds. Its
  stage-filter locator was scoped to the visible combobox after initially also
  matching the two selects inside closed setup disclosures. No application change
  was needed for that test-only correction.

All database work uses runner-created random dance_baseline_* or dance_migrations_*
databases in the verified Compose PostgreSQL fixture. The application database was
not inspected, reset or migrated. No deployment, commit, push or branch change.

## Hallmark and documentation

Static `sloplint --scope app --genre modern-minimal --render` reports 0 FAIL,
0 REFLEX and 0 WARN on the schedule files and owning lifecycle component. Its render
tier cannot authenticate and did not run; Playwright supplies actual product captures. No render-tier pass
is claimed. The independent finish review identified inconsistent synthetic
session times, preview-column alignment and a misleading destination prompt.
All three are resolved in confirming 390px English and 1440px Russian captures:
session/preview time agrees, desktop columns align, phone rows have consistent
labels and destination choice is explicit. No images/material
slots, new palette/font or shell replacement are needed. Human fluent-language,
assistive and visual approval remain release gates.

The canonical documentation checker retains the pre-existing ignored
`.hallmark/pr-body.md` relative-link failure. The same checks with only ignored
Hallmark scratch excluded pass for repository documentation. Final diff/whitespace
review is clean. Initial and final fetched origin/main match HEAD cd5c7a5; no open
PR overlaps. Both apparently unmerged implementation branches are patch-equivalent
to merged PRs #10/#11 and require no merge. No Git history/publication action occurred.

## Remaining work

Both selected task checkboxes are locally complete. Next product task is
P6-SCORING-MODEL: settle ADR-004 rubric/precision, assignments, submitted/
locked sheets, completeness/override, calculation/ties and correction semantics.
P6-UI-LIVE, P6-RECOVERY, M3/M4 external release and M5 remain open. Real event
policy/volume, hosted CI/ingress, human ET/EN/RU/assistive review and venue rehearsal
are not established by synthetic local tests. Keep Wix and public release gates.
