# ADR-009: Canonical email identity without account merging

Date: 2026-10-25

Status: Accepted; email slice of P2-IDENTITY-TOKENS.

Accounts and invitations use one ASCII email identity: remove leading/trailing
U+0020 spaces and lowercase ASCII letters. Shared EmailSchema applies this before
validation to registration, login and invitation input. Other whitespace and
non-ASCII addresses remain invalid under the existing email validator. Dots and
plus tags remain significant; no provider alias inference is permitted. Contact
fields using EmailSchema follow the same input formatting but never prove ownership.

Case-sensitive local parts could instead remain distinct; this application chooses
case-insensitive identity so login and invitation targeting have predictable
behavior. This does not authorize merging existing accounts.

Run scripts/audit-email-identity.sql against the intended deployment before the
migration. It emits aggregate counts only. Any account collision, or outstanding
invitation collision for the same canonical email/role/null-safe event, refuses
the entire migration. Expired outstanding invitations also require review;
consumed/superseded history does not occupy an outstanding slot. Resolve collisions
only through authorized provenance review; never automatically merge users,
delete invitations, or change memberships/ownership.

The migration locks account/invitation writers, checks collisions before updates,
canonicalizes their email fields and adds database checks to reject noncanonical
direct writes. All rows, IDs and non-email fields remain unchanged, including
inactive accounts and invitation history. Existing unique indexes then enforce
canonical identity even under concurrency. SQL-only checks are included in the
migration parity test. Coordinate stopped writers, backup, migration and API rollout;
old API writers may fail database checks during mixed-version operation.

Rollback needs a reviewed backup/restore or forward repair: original casing is
not retained, and removing checks cannot reconstruct it. Do not roll back to
case-sensitive identity while canonical accounts exist.

This slice does not change existing link validity, plaintext tokens, recovery,
verification eligibility, invitation acceptance authorization or email delivery.
The subsequent lifecycle slice is delivered under
[ADR-010](010-identity-token-lifecycle.md); public auth/email/session work retains
its own gates. This ADR describes the email slice's implementation boundary.
