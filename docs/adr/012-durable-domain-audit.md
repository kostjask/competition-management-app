# ADR-012: Minimal durable domain audit

Date: 2026-10-25. Status: Accepted for P2-AUDIT.

Append audit records inside the same Prisma transaction as account, invitation,
access and approval mutations. A failed audit write rolls back the mutation;
failure of the mutation leaves no success audit. Do not log failed authentication
attempts as successful domain changes. Broader security telemetry is separate.

AuditLog stores an action, target type/ID, optional event/studio IDs, actor kind
and optional persisted actor ID, timestamp and strict allowlisted metadata.
USER actors reference User with restrictive deletion; SYSTEM and ANONYMOUS have
no actor ID. Email/token request callers are anonymous unless credentials or a
purpose-bound link prove their account. The currently public invitation accept
handler must not attribute an unauthenticated existing-account acceptance to the
victim; it records ANONYMOUS until P2-INVITE-IDENTITY enforces intended identity.

Metadata contains only known role keys, token purpose and approval status changes.
Never include emails, names, passwords, token values/digests, URLs, private paths,
contact/billing data, request bodies or arbitrary exception details. Stable target
IDs are identifiers, not an authorization grant. There is no public audit API.
Authorized timeline/export tooling must apply event and subject scope separately.

PostgreSQL rejects audit UPDATE/DELETE. Retain records and provenance; no automatic
cleanup, account deactivation or account/role merging. A future authorized privacy
erasure/pseudonymization process must explicitly reconcile actor references and
retention, rather than disabling the trigger in ordinary application code.
Migration adds only storage/constraints/indexes; existing domain rows are unchanged.
Rollback needs reviewed removal of audit guards/storage and loses audit evidence;
prefer forward repair. No deployed audit history is assumed disposable.
