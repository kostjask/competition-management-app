# User journey outcomes

Target product behavior; use the [checkpoint](../DEVELOPMENT_PLAN.md) for actual
delivery. [Domain](DOMAIN.md) owns terminology/current model, accepted ADRs own
decisions, [flows](USER_FLOWS.md) own detailed steps/recovery/acceptance,
[UI_UX](UI_UX.md) owns screens/navigation, and [DESIGN_SYSTEM](DESIGN_SYSTEM.md)
owns components. Do not duplicate those inventories here.

## Account eligibility and terminology

[ADR-006](adr/006-account-eligibility-and-staff-onboarding.md): self-service is for
studio applicants; event judges/moderators and additional studio representatives
join by scoped invitation; administrators use controlled provisioning; spectators
need no account. Pending roleless applicants must recover their own progress.
Current signup is still unrestricted. Backend context must enforce eligibility;
relabeling a button or trusting an intent flag is insufficient.

| Label | Meaning |
| --- | --- |
| Register your studio | Start studio onboarding and personal account access; no approval implied |
| Apply to competition | Request studio participation in one event |
| Add performance | Prepare one entry and participants/music |
| Submit entries | Confirm complete entries for review; future contract |
| Cancel application | Cancel pending event application, retaining studio/account |

## Journey map

| Outcome | Detailed flows | Essential invariant |
| --- | --- | --- |
| Establish/recover account and verify email | F01 | Safe internal return through email tabs/devices; truthful delivery; no staff self-selection or lost authorized progress |
| Find event, apply, track independent approvals | F02/F03 | Roleless applicant sees own status/next action; organization approval differs from event approval; reconcile uncertain creates |
| Prepare roster, entries and music; submit/correct | F04/F07/F10 | Authorized unscheduled drafts after model work; server eligibility checks; preserved old media/history; scoped audited corrections |
| Configure event and review applications | F05/F03 | Actionable checklist/queues; correct studio/event decisions; scoring setup does not block application opening |
| Accept invitation and remove access | F06 | Intended-account authentication; atomic Judge/role/consume; pending revoke differs from removal; retain scores/history |
| Moderate, score and publish | F08/F09/F10 | Correct stage/performance, acknowledged versions, no duplicate actions, explicit privacy-safe publication and recovery rehearsal |

Always show active event/studio and who acts next. Separate application, entry,
music deadlines and event date where configured; show exact event-timezone times,
not invented deadlines or turnaround promises. Studio/contact edits never change
login identity. Never merge identities by name/email. Entry identity/submission
must remain independent of schedule position.

## Delivery and acceptance

First usable onboarding milestone is M2: verify via real email → apply to one
event → organizer decisions → returning applicant sees both statuses/next action.
M3 adds entries/music/corrections; M4 staff readiness can proceed independently
after its own prerequisites; M5 adds live operation/results. The checkpoint owns
the sole milestone dependency table. Reuse/member extensions, CSV import, copying
performances and admin view previews are optional separately gated backlog.

Each delivered journey needs complete loading/empty/error/success/disabled/denied
and recovery states, ET/EN/RU including emails, semantic keyboard/focus access,
phone/tablet/desktop layouts, and negative scope/session/stage/retry tests. Preserve
work under the agreed privacy/retention policy; do not promise drafts/offline
support before storage/conflict contracts exist. Public views/logs/URLs must exclude
private birth/contact/billing data. [TESTING](TESTING.md) owns evidence requirements.

Unresolved domain choices are in [database review](DATABASE_REVIEW.md),
[DOMAIN](DOMAIN.md#pending-model-decisions) and UI_UX's UX-D01–D10 register.
Resolve the owning choice before dependent code; product targets are not API guarantees.
