-- ADR-009; run scripts/audit-email-identity.sql before deployment.
BEGIN;
LOCK TABLE "User", "Invitation" IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" GROUP BY lower(btrim(email, ' ') COLLATE "C") HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Email identity: account collisions require reviewed repair';
  END IF;
  IF EXISTS (SELECT 1 FROM "Invitation" WHERE "usedAt" IS NULL AND "supersededAt" IS NULL GROUP BY lower(btrim(email, ' ') COLLATE "C"), "roleKey", "eventId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Email identity: invitation collisions require reviewed repair';
  END IF;
END $$;
UPDATE "User" SET email = lower(btrim(email, ' ') COLLATE "C");
UPDATE "Invitation" SET email = lower(btrim(email, ' ') COLLATE "C");
ALTER TABLE "User" ADD CONSTRAINT "User_email_canonical" CHECK (email = lower(btrim(email, ' ') COLLATE "C"));
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_email_canonical" CHECK (email = lower(btrim(email, ' ') COLLATE "C"));
COMMIT;
