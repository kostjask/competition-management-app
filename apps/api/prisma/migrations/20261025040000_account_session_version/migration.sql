-- ADR-011: coordinated API rollout refuses legacy JWTs; preserve all user data.
BEGIN;
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD CONSTRAINT "User_session_version_nonnegative" CHECK ("sessionVersion" >= 0);
COMMIT;
