# ADR-013: Foundation models for onboarding, staff and recipient language

Status: accepted, 2026-10-25. Scope: P2-ONBOARDING-MODEL, P2-STAFF-MODEL
and the persistence/policy part of I18N-PREFERENCES.

An account may own one recoverable studio onboarding draft. The draft stores a
studio name, country, city, director name/phone and optional intended event. Empty
details are valid while drafting; submission requires all details except phone.
Billing, dancer and media data do not belong in this draft. Verification keeps the
draft; intent confers no role, membership, studio or application. Existing accounts
remain intact without invented drafts. Pending users must prove account ownership;
unverified users cannot use ordinary protected APIs. P2-SIGNUP will supply its
password/token-proven pending-account journey using these internal operations.

Draft saves use a revision and operation UUID. A repeated identical operation
returns the saved version; reuse with different content or a stale revision
conflicts. Cancellation is a retained terminal state, not account deletion.
Completion occurs atomically with the later application workflow. Return paths
are derived from a verified Event ID, never arbitrary URLs. Closed/cancelled events
may remain a return context, but application eligibility is checked at submission.
Review abandoned drafts after 90 inactive days; no automatic cleanup is enabled.

Invitations retain role-key snapshots and gain a restrictive Role reference and
explicit studio scope. A bound invitation must be judge/moderator with an event
and no studio, or representative with a studio and that studio's event. Composite
foreign keys prevent role-key or studio/event mismatches. Historical invitations
without a Role reference are preserved but cannot be accepted or rotated. New
staff creation supports judge/moderator only; studio member creation remains gated
by P5-MEMBERS. Admin is controlled global provisioning, never an invitational role.
There is no implicit organizer role: organizer powers need a separate least
privilege decision. Unclassified historical access needs operational provenance
review; no migration infers global intent or removes historical assignments.

Invitation state is derived in order: accepted, superseded, revoked, expired,
pending. Pending revocation does not remove accepted access. UserRole.removedAt
retains assignments for offboarding; restoration must reuse the unique assignment
and audit its transition. Middleware ignores removed assignments, scoped admin and
global judge/moderator assignments. Only an active global admin bypasses scope.
Acceptance must reconcile role/access and consumption in one serializable
transaction. Intended existing-account authentication and Judge reconciliation
remain P2-INVITE-IDENTITY/P2-JUDGE-ACCEPT; these models do not close those journeys.
Moderator stage control uses stage.manage, separate from judge score.submit;
score viewing needs its own later permission, never score submission as a proxy.

Recipient locales are et/en/ru, default et. User.preferredLocale is nullable for
existing accounts; browser inference is never silently written to the account.
Explicit recipient language wins, then an existing recipient account preference,
then et. Invitation locale is frozen at creation and never inferred from the
inviter's UI. Verification/recovery use the recipient's stored account preference.
UI precedence is explicit current-session choice, account preference, saved browser
choice, browser language, et. Cross-device account preference editing and UI
reconciliation belong to I18N-PREFERENCES before delivered onboarding UI release.

Migrations add nullable references without classifying historical records. New
drafts have restrictive account/event FKs, unique owner and nonnegative revision.
No rows are deleted, credentials changed or privileges granted by the migration.
