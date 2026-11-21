# Moderator live console validation

Local P6-MODERATOR/S14 and moderator reconnect, 2026-11-21. Current priority
and release gates are in the [checkpoint](../DEVELOPMENT_PLAN.md) and
[competition roadmap](roadmap/competition.md#phase-6--scheduling-live-operations-and-judging).

## Delivered behavior

- Assigned moderators choose their event and session, see current and next
  performances, and see how many frozen judge sheets are locked or outstanding
  from judges without current access. Wider screens show three more queue
  positions when available. The live read carries no score values.
- Organizers start the event through the existing confirmed lifecycle transition.
  The backend repeats readiness and eligibility checks. Assigned moderators can
  start/resume, pause, advance and skip their queues. Organizers can review
  reasoned overrides, requeue skipped slots, reopen finished queues and reopen
  identified sheets during a pause. Finalization remains part of the P7 UI.
- A stage command is pinned to its session, current slot and revision. A sheet
  correction is pinned to the sheet and its revision. Reconciliation reads an
  actor-bound receipt, then offers an exact retry or accepts current server state.
  A request in doubt survives browser connection and same-account session
  recovery within the open tab. Lost access clears the cached session.
- Moderator and judge share the polling and freshness policy in
  [ADR-031](adr/031-live-scoring-reconnect.md). The localized Cobalt console
  also prints the selected session's last-read state with its time and revision.
  Existing schedule/scoring tables and immutable receipts support the workflow.

## Local checks

| Check | Result |
| --- | --- |
| Workspace | `pnpm build`, `pnpm test`, `pnpm typecheck` and `pnpm lint` pass. The workspace test includes the translation catalogue check and the protected route inventory. |
| PostgreSQL/API | Focused entry foundations and the full `pnpm test:baseline` pass against random Compose fixture databases. The live cases cover event and session scope, withdrawn authority, unavailable judges, actor-bound receipts, locked counts and paused correction. The full run finished in 588 seconds. |
| Migrations | Fresh/upgrade/catalog parity passes through migration 47. Prisma generation and validation pass. The direct format check reports the Windows CRLF checkout. An LF-only copy of the untouched source passes the formatter. |
| Full browser suite | All 466 Chromium cases passed in 19.8 minutes. The moderator cases ran before the final phone and correction layout adjustments. The separate 13-case rerun below covers those adjustments. |
| Affected browser checks | All 13 moderator cases passed on the final UI at 320–1920px across ET/EN/RU. They cover keyboard focus, 48px control targets, visible phone queue controls, repeat activation, dropped requests, competing revisions, restored sessions, privilege changes, corrections and print. |
| Hallmark | Static and rendered checks returned 0 failures, 0 reflexes and 0 warnings. In-thread review recaptured 15 screenshots across the moderator, organizer and selected correction states after compacting the phone view, removing the disabled action row from review and showing the identity of the selected sheet. |
| Documentation | The standard checker reports the pre-existing ignored `.hallmark/pr-body.md` link. The same checker passes with only that scratch file excluded. |
| Integration base | `main` and fetched `origin/main` matched at `e688a67` with zero open pull requests. The two older branches outside target ancestry carried no unique patches. |

## Venue acceptance still open

The venue lead should identify the moderator and judge devices and test the
intended network. Measure time from a server stage acknowledgement to the judge
devices seeing the corresponding performance, and time from judge lock to the
moderator seeing the completion count. Compare the results with ADR-031's
proposed two-second freshness target. The five-second local polling interval
does not guarantee that target.

Rehearse an interrupted advance, a lost judge submission response, role removal,
and the stop-and-verify handoff. Check the printed session, read time and revision
against the restored server state before resuming. Confirm the accepted operator,
record and later reconciliation steps before any manual continuation. Record
fluent ET/EN/RU and assistive-technology acceptance during the venue rehearsal.
