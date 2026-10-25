BEGIN;
CREATE TYPE "RecipientLocale" AS ENUM ('et', 'en', 'ru');
CREATE TYPE "OnboardingStatus" AS ENUM ('DRAFT', 'CANCELLED', 'COMPLETED');
ALTER TABLE "User" ADD COLUMN "preferredLocale" "RecipientLocale";
ALTER TABLE "UserRole" ADD COLUMN "removedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Role_id_key_key" ON "Role"(id, key);
CREATE UNIQUE INDEX "Studio_id_eventId_key" ON "Studio"(id, "eventId");
ALTER TABLE "Invitation" ADD COLUMN "roleId" TEXT, ADD COLUMN "studioId" TEXT,
  ADD COLUMN locale "RecipientLocale" NOT NULL DEFAULT 'et';
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_roleId_roleKey_fkey" FOREIGN KEY ("roleId", "roleKey") REFERENCES "Role"(id, key) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_studioId_eventId_fkey" FOREIGN KEY ("studioId", "eventId") REFERENCES "Studio"(id, "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "OnboardingDraft" (
  id TEXT NOT NULL, "userId" TEXT NOT NULL, "intendedEventId" TEXT,
  status "OnboardingStatus" NOT NULL DEFAULT 'DRAFT', revision INTEGER NOT NULL DEFAULT 1,
  "operationId" UUID NOT NULL, details JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingDraft_pkey" PRIMARY KEY (id),
  CONSTRAINT "OnboardingDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OnboardingDraft_intendedEventId_fkey" FOREIGN KEY ("intendedEventId") REFERENCES "Event"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OnboardingDraft_userId_key" ON "OnboardingDraft"("userId");
-- Correct only the built-in moderator policy; preserve users/assignments/custom roles.
INSERT INTO "Permission" (id, key, name, description) VALUES ('foundation-stage-manage', 'stage.manage', 'Manage Stage', 'Control stage flow without submitting scores') ON CONFLICT (key) DO NOTHING;
DELETE FROM "RolePermission" rp USING "Role" r, "Permission" p WHERE rp."roleId" = r.id AND rp."permissionId" = p.id AND r.key = 'moderator' AND p.key = 'score.submit';
INSERT INTO "RolePermission" ("roleId", "permissionId") SELECT r.id, p.id FROM "Role" r, "Permission" p WHERE r.key IN ('moderator','admin') AND p.key = 'stage.manage' ON CONFLICT DO NOTHING;
-- SQL-only guards
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_bound_scope_check" CHECK (
  ("roleId" IS NULL AND "studioId" IS NULL) OR
  ("roleId" IS NOT NULL AND "eventId" IS NOT NULL AND
    (("roleKey" IN ('judge','moderator') AND "studioId" IS NULL) OR
     ("roleKey" = 'representative' AND "studioId" IS NOT NULL)))
);
ALTER TABLE "OnboardingDraft" ADD CONSTRAINT "OnboardingDraft_revision_check" CHECK (revision > 0);
ALTER TABLE "OnboardingDraft" ADD CONSTRAINT "OnboardingDraft_details_check" CHECK (
  jsonb_typeof(details) = 'object' AND
  details ?& ARRAY['studioName','country','city','directorName','directorPhone'] AND
  details - ARRAY['studioName','country','city','directorName','directorPhone'] = '{}'::jsonb AND
  jsonb_typeof(details->'studioName') = 'string' AND length(details->>'studioName') <= 160 AND
  jsonb_typeof(details->'country') = 'string' AND length(details->>'country') <= 100 AND
  jsonb_typeof(details->'city') = 'string' AND length(details->>'city') <= 100 AND
  jsonb_typeof(details->'directorName') = 'string' AND length(details->>'directorName') <= 160 AND
  jsonb_typeof(details->'directorPhone') = 'string' AND length(details->>'directorPhone') <= 40
);
COMMIT;
