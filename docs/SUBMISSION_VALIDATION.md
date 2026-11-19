# Representative submission validation

Local P5-SUBMISSION with owning S12/P5-UI-ENTRIES, 2026-11-19.
No external M3 release, deployment or human approval is claimed.

## Outcome and decisions

The representative entry index and S08 application link to the studio-wide
basic/final checklist. Field-linked blockers precede explicit lock confirmation;
music is an independent notice under ADR-025. The same review panel serves global
admin acceptance and reasoned entry/field/window correction. Neither operation
changes application decisions or music confirmation/acceptance.

The existing canonical API and immutable checkpoint/receipt schema are reused.
No database model, migration, dependency or application-database change is needed.
`reviewToken`/`expectedReview` pin the current entry/roster sources and configuration
revision, closing policy-change races that do not increment a checkpoint head.
The server recomputes the fingerprint within the serializable command transaction;
it is not an authorization token. Receipt replays remain actor/body-bound and
recheck active ownership before returning a saved result.

The shared submission guard supplies permission/window/scope availability as
`canSubmit` on reads and enforces it on writes; blockers are checked separately.
Basic correction grants cannot bypass final locks. A final grant can reopen basic
editing while final resubmission remains the owning confirmation. Terminal-event
grants cannot enable representative submission. Correction scopes must name
distinct nonempty active exact-owner entries. Admin correction remains explicit.

Acknowledged receipt headings receive focus and retain server identity/time,
revision and count if readback fails. History survives reload. Uncertain commands
retain their exact operation across same-account session recovery; an explicit
saved-state comparison precedes starting a different operation. Failed readback,
stale and denied writes require fresh review/confirmation. Query navigation and
departure warn about retained confirmation work. Correction field links return
to the same checkpoint, including creation from an empty checklist. Sign-in
returns accept only typed review parameters. Uncertain writes suppress cached
empty-history/all-clear claims until receipt reconciliation.

## Checks

| Command / scope | Actual result |
| --- | --- |
| `pnpm build`, `pnpm typecheck`, `pnpm lint` | Passed after the final behavior changes; typecheck includes browser fixtures |
| `pnpm test` | Passed: 3 tooling, 8 public-site, 137 API and 34 web tests, including 2 new submission contract/return-path cases |
| `pnpm test:entry-foundations` | Passed against the rebuilt API; source-fingerprint, scope/permission, lock, retry, history, concurrency and audit/rollback regressions included |
| `pnpm test:baseline` | Final rebuilt run passed in 376.01 seconds: fresh deployment of all 45 migrations, retained-data upgrades, seed idempotency/refusal, redeployment and all API/domain/auth/media suites |
| `pnpm test:browser` | Full run: 392 passed, 2 failed because its already-loaded organizer worker retained the old retry label during the final copy change; both exact failures passed on immediate rerun |
| Final affected browser command below | 40 passed after all behavior fixes, including new language and empty-checklist cases |
| `pnpm db:generate`, `pnpm db:validate` | Passed; no database schema or migration change |
| Prisma formatting | Raw check has the CRLF limitation below; normalized temporary-copy check passed with no non-EOL content difference |
| Documentation / diff | Checker syntax passed; repository check has only the preserved scratch-link failure below; final `git diff --check` passed |

```text
node node_modules/@playwright/test/cli.js test entries.spec.ts performances.spec.ts --grep "submission|checkpoint|reopens"
```

The final 40-case run includes ET/EN/RU at 320, 390, 768, 1440 and 1920px;
representative/organizer authority, field focus/return, first-entry creation,
independent music notices, receipt focus/reload, scoped correction/resubmission,
keyboard confirmation, nonwrapping actions, pending/empty/error/denied/stale states,
same-account session recovery, language changes and exact-operation comparison.

The empty-checklist navigation regression failed before its fix: the first-entry
link dropped `entry=review&checkpoint=BASIC`. It passed after preserving that query
through create, edit and close. The stricter scope regression also failed against
the prior compiled API (200 instead of 400 for an empty scope); focused and full
rebuilt baselines then passed. Unchanged Turbo tasks may reuse local cache; the
final HTTP/PostgreSQL baseline uses a fresh owned disposable database.

## Hallmark and changed files

Static `sloplint --scope app --genre modern-minimal --render` over the shared
panel, composition and representative workspace reports 0 FAIL, 0 REFLEX, 0 WARN.
Its own render tier did not run without an authenticated URL; actual browser
captures come from Playwright. No Hallmark render-tier pass is claimed.

The Codex in-thread finish review resolved five findings: music notices moved
before confirmation; repeated locked-state explanation removed; long phone action
labels shortened and kept unwrapped; uncertain writes stopped showing cached
all-clear/empty-history claims; first-entry navigation retained its checkpoint.
Localized phone/desktop and retry/empty-state recaptures plus the final regression
run confirm the changes. No imagery slots, external fonts or material are needed.
Human visual/language/assistive acceptance remains separate.

| Scope | Main files |
| --- | --- |
| Shared contracts / safe returns | [Entry](../packages/schemas/src/entry.schema.ts), [return paths](../packages/schemas/src/return-path.ts) |
| Server checks / DTOs | [Controller](../apps/api/src/controllers/EntryWorkflowController.ts), [workflow service](../apps/api/src/services/entryWorkflow.ts) |
| Representative / organizer UI | [Workspace](../apps/web/src/pages/entries/EntryWorkspace.tsx), [shared review](../apps/web/src/pages/performances/EntryReviewPanel.tsx), [S08 links](../apps/web/src/pages/applications/ApplicationDetail.tsx), [translations](../apps/web/src/i18n/entryTranslations.ts) |
| Regressions | [HTTP/database](../scripts/check-entry-workflow.cjs), [representative browser](../tests/browser/entries.spec.ts), [organizer browser](../tests/browser/performances.spec.ts), [contracts](../apps/web/tests/submission.test.tsx) |

## Existing check limitations

The repository documentation checker reports one unchanged broken relative link
in ignored `.hallmark/pr-body.md`. This scratch file is outside the delivered
task and was preserved. Task-owned links are checked with the same checker.

Prisma generation and validation passed. The raw `prisma format --check` command
rejects CRLF checkout line endings in the unchanged schema. Formatting a temporary
copy produces no content difference with `git diff --no-index --ignore-space-at-eol`.
The normalized copy's format check passed. No unrelated schema
reformatting is included.

## Release and next work

Human fluent ET/EN/RU, assistive/touch and visual approval; hosted CI/ingress,
storage/backup/restore and real email evidence remain release gates. This local
slice does not close M3 or any external milestone. No deployment, commit, push,
branch/history mutation or application-database migration was performed.

The old implementation branch was patch-equivalent to merged PR #10 with an
empty content diff; GitHub had no open PRs. Initial and final fetched main matched
`6ee1bfa` with zero divergence and no open PR overlap. No integration or Git
publication action was needed.

Next: [P6 live-model decisions](LIVE_MODEL_DECISIONS.md), then its accepted ADR,
model/migration and owning organizer screens. The decision brief is preparatory;
no second roadmap implementation is claimed by writing it.
