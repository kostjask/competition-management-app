-- Enforce ADR-010 storage invariants; refuse invalid rows without repairing them.
BEGIN;
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_digest_format" CHECK (digest ~ '^[0-9a-f]{64}$');
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_lifetime" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_terminal_state" CHECK ("consumedAt" IS NULL OR "revokedAt" IS NULL);
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_digest_format" CHECK ("tokenDigest" IS NULL OR "tokenDigest" ~ '^[0-9a-f]{64}$');
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_legacy_token_state" CHECK ("tokenDigest" IS NOT NULL OR "usedAt" IS NOT NULL OR "supersededAt" IS NOT NULL OR "revokedAt" IS NOT NULL);
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_revocation_state" CHECK ("revokedAt" IS NULL OR "supersededAt" IS NOT NULL);
COMMIT;
