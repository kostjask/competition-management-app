# Judge scoring validation

2026-11-21. This slice implements P6-JUDGE/S15 and the judge-side P6-RECOVERY
policy. [The competition roadmap](roadmap/competition.md#phase-6--scheduling-live-operations-and-judging)
owns remaining work. [ADR-031](adr/031-live-scoring-reconnect.md) owns initial
timing, tab-only storage and the exact-retry rules.

## Delivered scope

- `/app/judge` lists the user's event role assignments. The protected event
  score screen reads only its judge's frozen sheets, even for a dual-role
  account. The API checks current session and event assignment on every read and
  write. Existing scoring commands retain transactional audit, receipt and lock
  semantics. The migration catalog stays at 47.
- Numeric keyboard input distinguishes zero from missing, understands decimal
  commas, and checks the frozen range and step in ET, EN and RU. Valid in-tab
  edits autosave and show a saved revision after exact server acknowledgement.
  Final submission requires review and a separate confirmation.
- A stale or offline read makes the sheet read-only. Session restoration and
  connection recovery compare the exact operation with current data before
  enabling retry. A changed revision can be compared field by field, with an
  explicit choice to use the retained draft on that same writable sheet. Drafts
  stay pinned if a queue advances. Acknowledged locks survive reload.

## Local checks

| Check | Evidence |
| --- | --- |
| Focused Playwright | 12 cases, including 320/390/768/1440/1920px, keyboard review and cancellation, zero versus missing, lost committed/uncommitted responses, offline queue change, session restoration, corrections, waiting, revoked access and stable focus when another assigned stage starts. |
| Full Playwright | 452 cases passed. The two-stage focus regression was added after the run started and passed in the focused set. |
| Focused API / PostgreSQL | The entry-foundations run with health diagnostics passed. Coverage includes own-sheet data for a dual-role account, no-store, duplicate query rejection, revoked and foreign access, original receipt lookup after stage advance and reasoned historical corrections. |
| Full API / PostgreSQL | `node scripts/test-baseline.cjs` passed in 218 seconds against a randomly named Compose database. Earlier runs hit the migration wrapper timeout and then the API health startup limit. The completed rerun applied all 47 migrations, exercised scoring and the remaining baseline checks, and cleaned up its fixture. |
| Workspace | `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build` passed. Focused scoring and workspace-link checks passed, including safe return and built cohost support for the judge route. |
| Hallmark | Static and render checks returned zero failures, reflexes or warnings for judge source and captured synthetic browser content. Five rendered screenshots covered desktop and phone. A recapture confirmed that performance identity precedes the connection block on phones and the screen uses the shell's main landmark. |
| Prisma | Generation and validation pass. Format passes on an LF copy of the unchanged checked-out CRLF schema. All 47 migrations apply to a separate disposable fixture. Fresh/upgrade/catalog parity passes. |
| Documentation and diff | `git diff --check` passes. The standard Markdown checker still finds the pre-existing ignored `.hallmark/pr-body.md` relative link. The same checker passes with only that scratch file excluded. |

## Remaining gates

P6-MODERATOR owns the S14 stage console and its reasoned commands. P6-RECOVERY
still needs operational health and approved manual fallback/export, rehearsal
on the intended venue network and measured refresh/acknowledgement latency.
Fluent-language, assistive and human visual review remain external gates. Results
publication and deployment remain under their existing gates.
