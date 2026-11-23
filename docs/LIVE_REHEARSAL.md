# Live competition rehearsal

Use this runbook for the venue acceptance of [S13–S15](ui/competition.md#s13--schedule-editor) and
[P6-RECOVERY](roadmap/competition.md#phase-6--scheduling-live-operations-and-judging).
The [connection decision](adr/031-live-scoring-reconnect.md) and
[live model](adr/030-session-queues.md) govern the current workflow.

## Before the rehearsal

1. In a restricted rehearsal record, name the stage lead, organizer, moderators,
   judges and timekeeper. Record the application revision, date, intended venue
   network, rehearsal event alias, stage/session, and each device’s role, browser,
   locale and input method. Agree on a way to contact the stage lead if the
   venue network becomes unavailable.
2. Use an approved rehearsal environment, synthetic entries, and separate
   accounts for the organizer, moderator and each judge. Set up two scheduled
   performances, at least two assigned judges, and a spare authorized moderator
   for the reassignment exercise. Confirm each participant can open their own
   workspace from the intended device. Use the organizer setup to confirm LIVE
   after the schedule, rubrics and panels pass readiness checks.
3. From the intended network, verify that the configured API `/health` returns
   HTTP 200 with `status: ok` if the route is reachable there. It checks the API’s
   database connection. Confirm authenticated stage and sheet reads separately
   from all assigned devices. Record failed requests, timeouts and reconnection
   time along with the workflow measurements below.

## Measure propagation

Keep the role views visible and let them update through normal polling. Use the
same clock for both observations. Repeat at different points in the polling
cycle and with the expected concurrent judge devices active. Wait for all prior
actions to settle before starting each sample.

| Measurement | Start | End |
| --- | --- | --- |
| Queue to judge | Server acknowledges Start or Advance on the moderator console | Each assigned judge device shows the new current performance and its sheet is available, including in the selector when a different sheet is pinned |
| Judge to queue | The judge sees a submitted and locked acknowledgement | Moderator sees that sheet reflected in the locked count for the same performance |

Record each elapsed time and affected device. Include the slowest observed time,
any ordering anomalies and the conditions where they occurred. Compare with the
proposed two-second freshness target in ADR-031. The five-second visible-tab
poll interval can exceed that target. Record the organizer’s decision on
acceptable operation and any required follow-up before venue acceptance.

## Exercise recovery

Use separate observations for touch and keyboard. Check that focus stays usable,
the current session/performance remains identifiable, and connection and receipt
changes are announced by the intended assistive technology. Record fluent
ET/EN/RU review for the messages and controls seen during the exercises.

| Exercise | What to verify |
| --- | --- |
| F07 schedule edit | Preview and save an eligible synthetic schedule with the keyboard or touch controls. From a second organizer tab, create a competing change after preview. Check that the first confirmation is cleared after the server rejects it, that the first tab retains its draft for comparison, and that it needs a fresh preview and confirmation after accepting the current server schedule. |
| F08 interrupted Advance | Use a real disconnect for the outage exercise. Where the rehearsal setup can deliberately withhold a response, exercise both a request stopped before the server and a write committed before its acknowledgement is lost. Activate twice while a command is in flight. After a fresh read, check that a committed operation is acknowledged once and an uncommitted action can only offer its original retry while its source still matches. |
| F09 interrupted score entry and submission | Lose the connection during editing and keep the tab open. Verify read-only fields and retained in-tab entries. Reconnect after the stage changes and compare the draft with the original sheet. Separately withhold a committed submission’s response, verify the same sheet locks after receipt reconciliation and confirm that the moderator sees one increase in the count. |
| Assignment change | Have the organizer remove or reassign access during the interruption. Once the original tab receives the access denial, verify that it clears the protected workspace and pending work. If access is subsequently restored, verify that the tab starts from the current server read. Verify the incoming moderator uses their own account and authorized session. |
| Pause and verify | Use the procedure below. Compare the printed reference with the recovered current state, including a case where they differ. |

Record the observed revisions and outcomes for each exercise. Mark a scenario
unverified if the setup could not reproduce the failure mode. Keep scores,
comments, credentials, tokens and private response bodies out of rehearsal logs,
traces and screenshots.

## Pause and verify

1. Stop stage operations and inform the stage lead. Keep the affected tabs open.
   When connected, select **Pause** and verify the server acknowledgement and
   paused state. During an outage, tell the lead the queue state is unverified.
2. If useful, print the moderator’s handoff for the selected session. It carries
   the last-read revision/time, stage/session, current and next performances and
   locked-sheet count. Keep the printout with authorized staff and handle it
   under the event’s retention policy.
3. After connection returns, compare the latest server read with the reference.
   Verify stage/session, queue state and revision, current and next performances,
   and locked/required sheets. Ask each affected judge to confirm their own sheet
   state. Reconcile the exact pending operations before selecting any retry.
   Escalate discrepancies or revoked access to the organizer. Confirm the
   restored state with the stage lead before resuming stage operations.

The handoff is a reference to the last read. Keep the stage stopped during an
unverified outage. Any proposal for manual continuation requires the organizer
to approve the responsible operator, permitted actions, minimum record fields,
access and retention, and reconciliation procedure before use. Use the existing
authorized reasoned actions for corrections when connected. Until an alternate
procedure is approved, record the outage and use the stop-and-verify procedure.

## Record the decision

The stage lead and organizer record who exercised each role, the device and
network results, unresolved discrepancies, the approved procedure, and whether
the group is ready to proceed. Record the time and owner of any retest. Keep
P6-RECOVERY and P6-UI-LIVE open until venue, language and assistive acceptance is
recorded. The [checkpoint](../DEVELOPMENT_PLAN.md#milestone-gates) owns the
remaining M5 gates.
