-- See ADR-008 and scripts/audit-scope-integrity.sql before deployment.
-- Preserve all rows; refuse ambiguous data rather than inferring lost scope.
BEGIN;
LOCK TABLE "UserRole", "Invitation" IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "UserRole" GROUP BY "userId", "roleId", "eventId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Scope integrity: duplicate role assignments require reviewed repair';
  END IF;
  IF EXISTS (SELECT 1 FROM "Invitation" WHERE "usedAt" IS NULL GROUP BY email, "roleKey", "eventId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Scope integrity: duplicate unconsumed invitations require reviewed repair';
  END IF;
END $$;

ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_eventId_fkey";
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_eventId_fkey";
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "UserRole_global_unique" ON "UserRole" ("userId", "roleId") WHERE "eventId" IS NULL;
ALTER TABLE "Invitation" ADD COLUMN "supersededAt" TIMESTAMP(3);
DROP INDEX "Invitation_email_roleKey_eventId_key";
CREATE UNIQUE INDEX "Invitation_outstanding_unique" ON "Invitation" (email, "roleKey", "eventId") NULLS NOT DISTINCT WHERE "usedAt" IS NULL AND "supersededAt" IS NULL;
COMMIT;
