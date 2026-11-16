# User journey outcomes

Target product behavior; use the [checkpoint](../DEVELOPMENT_PLAN.md) for actual
delivery. [Domain](DOMAIN.md) owns terminology/current model, accepted ADRs own
decisions, [flows](USER_FLOWS.md) own detailed steps/recovery/acceptance,
[UI_UX](UI_UX.md) owns screens/navigation, and [DESIGN_SYSTEM](DESIGN_SYSTEM.md)
owns components. Do not duplicate those inventories here.

## Account eligibility and terminology

[Product scope](PRODUCT_SCOPE.md) covers the new studio website, festival portal
and shared content administration. Studio visitors/parents and festival spectators
read published pages without accounts. Only the developer/director need content
administration, through controlled provisioning; a teacher biography grants no
account. There is no student/guardian login, enrolment, attendance or CRM journey.
Existing participating-studio onboarding below remains the festival workflow.

[ADR-006](adr/006-account-eligibility-and-staff-onboarding.md): self-service is for
studio applicants; event judges/moderators and additional studio representatives
join by scoped invitation; administrators use controlled provisioning; spectators
need no account. Pending roleless applicants must recover their own progress.
Signup now validates studio intent and atomically retains an owner draft under
ADR-017. It grants no studio, membership or application; owner-proven recovery
and active/verified access are enforced separately by the backend.

| Label | Meaning |
| --- | --- |
| Register your studio | Start studio onboarding and personal account access; no approval implied |
| Apply to competition | Request studio participation in one event |
| Add performance | Prepare one entry and participants/music |
| Submit entries | Confirm studio-wide BASIC/FINAL checkpoints under ADR-025; backend delivered, representative UI pending |
| Cancel application | Cancel pending event application, retaining studio/account |

## Journey map

| Outcome | Detailed flows | Essential invariant |
| --- | --- | --- |
| Discover Neposedõ classes and joining information | F11 / S18 | Public ET/EN/RU pages; direct contact/social links, no student registry or booking promise |
| Discover festival editions and archives | F02 / S19 | Explicitly published content; correct edition/rules and truthful registration handoff |
| Edit and publish studio/festival content | F12 / S20 | Controlled developer/director access; private drafts/preview, explicit published revision and retained edition history |
| Establish/recover account and verify email | F01 | Safe internal return through email tabs/devices; truthful delivery; no staff self-selection or lost authorized progress |
| Find event, apply, track independent approvals | F02/F03 | Roleless applicant sees own status/next action; organization approval differs from event approval; reconcile uncertain creates |
| Prepare roster, entries and music; submit/correct | F04/F07/F10 | Implemented draft/checkpoint backend; representative/media consumers pending; eligibility, retained history and scoped corrections |
| Configure event and review applications | F05/F03 | Actionable checklist/queues; correct studio/event decisions; scoring setup does not block application opening |
| Accept invitation and remove access | F06 | Intended-account authentication; atomic Judge/role/consume; pending revoke differs from removal; retain scores/history |
| Moderate, score and publish | F08/F09/F10 | Correct stage/performance, acknowledged versions, no duplicate actions, explicit privacy-safe publication and recovery rehearsal |

Always show active event/studio and who acts next. Separate application, entry,
music deadlines and event date where configured; show exact event-timezone times,
not invented deadlines or turnaround promises. Studio/contact edits never change
login identity. Never merge identities by name/email. Entry identity/submission
must remain independent of schedule position.

## Delivery and acceptance

WEB-STUDIO releases the new studio pages; WEB-FESTIVAL releases the migrated
festival portal after its own cutover gates. Neither requires complete M3/M5;
unfinished application flows use the approved existing registration/contact path.
The public content model/CMS precede their consumers. Studio content is new;
festival archive migration does not require importing historical scores.

First usable operational onboarding milestone is M2: verify via real email → apply to one
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
