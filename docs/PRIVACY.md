# Privacy and data lifecycle policy

Updated: 2026-10-25. P2-PRIVACY technical policy. No automatic cleanup is enabled.
Current development rows are disposable under AGENTS; reassess before real data.

## Purpose and authorized viewers

Collect account identity and credentials for access; studio contact details only
for application management and billing; dancer name/calendar birth date only for
roster/eligibility; optional raster photos only where a documented workflow needs
them. No identity merging based on names, birth dates or editable contact email.

Account owners can inspect/update their own supported onboarding/profile context.
Active studio members see their authorized studio data subject to event scope,
approval and stage. Event staff access is limited to their assigned event/task;
judges need scoring/assignment data, not private billing/contact payloads or a
complete birth-date/photo export by default. Controlled global administrators
handle access and approved support/export requests. Contact email alone proves
no membership. Existing upload ownership/public serving and scoped-admin defects
remain release blockers; this document does not make those paths compliant.

Public output must use approved minimal publication DTOs. Birth dates, contact,
billing data, private upload paths, account details and audit records are never
implicitly public. Do not repurpose operational data for marketing or analytics.

## Storage, logs and delivery

Store password hashes and purpose-bound link digests only. Raw link secrets may
exist transiently in trusted delivery adapters, never ordinary DTOs/logs/audits.
ADR-014 permits encrypted transport payloads in the private email queue under a
separate AES-256-GCM key. Clear ciphertext after provider acceptance, token
invalidation or expiry on the next worker pass; stop dispatch attempts at the
23-hour deadline and retain only safe receipt metadata after finalization.
Worker downtime and backup retention can extend encrypted payload residence;
operators must review those periods before real data use.
Back up that key through secret management, restrict operational queue access and
disable provider link/open tracking for identity mail. This explicit transport
secret lifecycle does not authorize general account/draft/audit cleanup.
Audit metadata is allowlisted and excludes private payloads (ADR-012). Send only
the recipient's required localized template data. Do not infer their language
from the inviting administrator's UI. Provider credentials stay in managed
configuration; provider delivery failures must not leak recipient/token data.

Files stay outside PostgreSQL. Treat names/URLs as private unless the publication
policy explicitly authorizes public use; P2-BOUNDARIES-UPLOADS/P8-MEDIA must enforce
content, ownership, retrieval and replacement lifecycle. Strip unnecessary image
metadata in the delivered media workflow. Backups and exports inherit the source
access and retention policy; never commit private fixtures/uploads or dumps.

## Retention and removal

Operational defaults for owner review before introducing retained real data:
review abandoned unsubmitted onboarding drafts after 90 inactive days and audit
records after 365 days. These are review thresholds, not automatic deletion or a
claim that all records may legally be erased then. Approved applications, entries,
scores and published calculations need their event/history obligations and
privacy-minimal snapshots decided by their owning tasks. Active accounts and
legitimate roleless applicants retain access and recoverable work. Never delete
or deactivate roleless/unverified users merely because they lack an approved role.

Revoking a pending invitation, removing accepted access, archiving a studio/entry,
disabling an account and erasing personal data are separate operations. Retain
judge/score and approval history during access removal. Soft deletion is not
erasure. Expired/consumed link history can support security/audit needs without
retaining raw secrets. No scheduled cleanup or bulk repair is authorized by this
policy alone; review scope, retention, backup effects and actor/history references.

## Responsibilities and requests

The operating organization owns purpose/access/retention approval and appoints an
authorized privacy contact before external release. Event organizers review
event-scoped exports/corrections; studio representatives maintain accurate roster
and contact data; technical operators enforce access, protect backups/providers
and execute approved retention/erasure work with evidence. Verify requester
identity and authority before any export, correction or deletion. Limit exports
to that subject/authorized organization; exclude other users, secrets and private
audit/provider internals. Record the request/action with privacy-safe audit IDs.

No public export/delete endpoint is introduced here. Existing accounts, memberships,
credentials and ownership are preserved. Unresolved jurisdiction/organizational
retention obligations and human policy review remain operational release gates;
they are not resolved by technical fixtures or by this policy file.
