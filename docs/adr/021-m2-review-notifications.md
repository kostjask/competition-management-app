# ADR-021: Revisioned M2 review and notification intent

Accepted 2026-11-10 within P4-REVIEW/P5-APPLICATION. Extends ADR-003 without
changing its independent approval, stage, ownership or correction policy.

Organization decisions consume and increment the canonical same-event application
revision, just like event decisions. Pending profile corrections invalidate either
reviewer's receipt and clear the organization reason. Matching decision retries
return the saved state without a second audit or notification. A stale, differing
decision conflicts. Organization rejection uses the same semantic reason codes as
event rejection. No authored review prose is added.

Each changed decision commits a retained ReviewNotice and the existing
encrypted EmailDelivery records in the same serializable transaction as access and
audit. Notices identify decision axis and application revision. Recipients are
active, verified membership accounts, using their saved locale (ET default), never
the editable representative contact address. Mail states describe provider
acceptance, not inbox delivery. Fake mode records SIMULATED; no eligible account
records NO_RECIPIENT. Pending provider failures retry through the existing worker;
expired mail remains visible separately from the saved decision. No resend of a
decision or duplicate transition is needed to retry dispatch. The email requests
an authoritative account read, because either decision may since have changed.

Authorized owner/admin history exposes only semantic actions/status/revision/time,
not audit actor identities, internal queue bodies, provider IDs or recipient lists.
The event/studio pair is checked before history or notification reads. Review
reads do not grant entry access. No migration rewrites historical audit/decisions.

Verified draft continuation optionally supplies onboardingRevision on canonical
application creation. The server requires the caller's DRAFT, exact revision and
matching intended event (or no intended event), then marks it COMPLETED atomically
with studio/membership/application/audit. Operation-ID reconciliation runs first,
so retries recover a saved application even after its window closes. UI input and
the exact frozen command stay mounted through uncertain responses/session recovery;
private form data is not persisted in browser storage.

The additive migration retains existing records. Rollback requires restoring an
application version that understands these contracts or a coordinated export of
notice/history data; do not drop notice tables after use. Disposable development
fixtures may be replaced only under the repository's verified-target policy.
