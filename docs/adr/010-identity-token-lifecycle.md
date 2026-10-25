# ADR-010: Purpose-bound single-use identity secrets

Date: 2026-10-25

Status: Accepted for P2-IDENTITY-TOKENS-LIFECYCLE.

Use 32 cryptographically random bytes encoded as hex for verification, password
recovery and invitations. Store only SHA-256 of a versioned purpose prefix plus
the raw secret. High-entropy random secrets do not need password hashing; purpose
prefixes prevent the same raw input crossing purposes. Never expose digests in
DTOs, and never log delivery arguments or token URLs. Raw secrets exist only in
the issuing call and delivery adapter. Passwords continue to use bcrypt.

AccountToken records bind a purpose to an immutable user ID, issuance email,
expiry, consumedAt and revokedAt. Verification expires in 24 hours; recovery in
one hour. Rotation locks the active account, revokes earlier outstanding tokens
of the same purpose and creates one replacement in a serializable transaction.
A partial unique index prevents multiple outstanding tokens per user/purpose,
including expired tokens until revoked. Consumption locks the account and claims
the still-live token with a conditional update in the same transaction as the
account change. Reject changed email, inactive account, wrong purpose, expiry,
revocation and replay. Recovery requires an already-verified active account,
changes only its password, revokes other outstanding account tokens and returns
no session. Public recovery requests must never return the internal issuance
result; generic responses, throttling and endpoint/UI work belong to P2-AUTH.

Invitation retains its existing scope/history/expiry/usedAt/supersededAt fields,
replaces plaintext token with nullable unique tokenDigest and adds revokedAt.
Null digest denotes invalidated legacy links, never a usable secret. Invitation
rotation locks the pending unexpired row and replaces its digest atomically;
old raw links immediately cease matching. Revocation also supersedes the row to
free the existing outstanding uniqueness slot. Acceptance conditionally claims
the same digest, expiry and pending state in its serializable access transaction.
Existing inactive invitees are rejected without account/token/access writes.
Intended-account authentication and allowed staff scope remain P2-INVITE-IDENTITY.
Rotation/revocation helpers are internal; callers must enforce management policy
before using them. This task adds no public management endpoint.

Invalidate existing verification and invitation links during migration, dropping
their plaintext columns. Mark outstanding invitations revoked/superseded, retaining
IDs, scope, recipient and history. Do not migrate raw secrets or support an old
plaintext fallback. Current development data is disposable; this deliberately
avoids compatibility machinery. Existing unverified accounts retain credentials
and ownership, awaiting future safe resend. Used/superseded invitations retain
their existing lifecycle timestamps. Rollout requires stopped old writers,
backup and a coordinated new API; rollback cannot recover links without a
reviewed restore. No automatic account merge, activation or deletion is allowed.

The email stub becomes a silent development fake; production throws unavailable
instead of silently accepting a delivery it cannot perform. P2-EMAIL still owns
real providers, truthful delivery/retry contracts and localized templates.
ADR-011 subsequently implements session-version invalidation after password
change. Broader session storage/return handling remains P2-SESSION;
recovery does not mint a session or reactivate an account.

Schema-audit amendment (2026-10-25): enforce the existing storage rules with
row CHECK constraints. AccountToken requires a lowercase 64-character hex digest,
expiresAt after createdAt, and mutually exclusive consumed/revoked states.
Invitation requires the same digest format when nonnull; a null digest is allowed
only on used/superseded/revoked history. Revocation must also supersede the row,
as required to release the outstanding slot. These checks do not infer staff
eligibility or query other tables. General event/entry bounds remain P3-CONSTRAINTS.

Use a new migration that validates existing rows without changing them; invalid
rows refuse the entire migration and require reviewed repair or a verified
disposable reset. Do not silently fill digests or rewrite lifecycle history.
Rolling back these checks relaxes protection but does not require converting
data; use a reviewed forward migration if rollback is needed. No HTTP DTO shape
changes or new client workflow are implied by this database guard addition.
