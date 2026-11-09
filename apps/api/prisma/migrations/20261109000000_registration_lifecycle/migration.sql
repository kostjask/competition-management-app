BEGIN;
ALTER TYPE "EventRegistrationStatus" ADD VALUE 'CANCELLED';
ALTER TABLE "Event" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC', ADD COLUMN "registrationDeadline" TIMESTAMP(3);
ALTER TABLE "StudioEventRegistration" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "decisionReason" TEXT, ADD COLUMN "operationId" TEXT, ADD COLUMN "requestDigest" TEXT, ADD COLUMN "createdBy" TEXT;
CREATE UNIQUE INDEX "StudioEventRegistration_operationId_key" ON "StudioEventRegistration"("operationId");
-- SQL-only guards
ALTER TABLE "Event" ADD CONSTRAINT "Event_registration_deadline" CHECK ("registrationDeadline" IS NULL OR "registrationDeadline" <= "startsAt");
ALTER TABLE "StudioEventRegistration" ADD CONSTRAINT "Registration_revision" CHECK (revision > 0);
ALTER TABLE "StudioEventRegistration" ADD CONSTRAINT "Registration_reason" CHECK ("decisionReason" IS NULL OR "decisionReason" IN ('CONTACT_ORGANIZER','INCOMPLETE_DETAILS','INELIGIBLE','CAPACITY'));
ALTER TABLE "StudioEventRegistration" ADD CONSTRAINT "Registration_operation" CHECK (("operationId" IS NULL AND "requestDigest" IS NULL) OR ("operationId" IS NOT NULL AND "requestDigest" IS NOT NULL AND "requestDigest" ~ '^[a-f0-9]{64}$' AND "createdBy" IS NOT NULL));
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_action";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" CHECK (action IN ('ACCOUNT_REGISTERED','EMAIL_VERIFIED','EMAIL_CORRECTED','PASSWORD_RESET','TOKEN_ROTATED','INVITATION_CREATED','INVITATION_ACCEPTED','INVITATION_REVOKED','INVITATION_ROTATED','ACCESS_GRANTED','ACCESS_RECONCILED','ACCESS_REMOVED','STUDIO_APPROVAL_CHANGED','REGISTRATION_APPROVAL_CHANGED','IMAGE_REPLACED','SESSION_REVOKED','ONBOARDING_SAVED','ONBOARDING_CANCELLED','EVENT_UPDATED','REGISTRATION_CREATED','REGISTRATION_CORRECTED','REGISTRATION_CANCELLED','REGISTRATION_REAPPLIED'));
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_safe_metadata";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_safe_metadata" CHECK (
  jsonb_typeof(metadata) = 'object' AND metadata - ARRAY['roleKey','purpose','fromStatus','toStatus','revision','reasonCode','reviewAllowed','fromStage','toStage'] = '{}'::jsonb
  AND (NOT metadata ? 'roleKey' OR COALESCE(metadata->>'roleKey' IN ('admin','representative','judge','moderator'),false))
  AND (NOT metadata ? 'purpose' OR COALESCE(metadata->>'purpose' IN ('VERIFY_EMAIL','PASSWORD_RECOVERY'),false))
  AND (NOT metadata ? 'fromStatus' OR COALESCE(metadata->>'fromStatus' IN ('PENDING','APPROVED','REJECTED','LOCKED','CANCELLED'),false))
  AND (NOT metadata ? 'toStatus' OR COALESCE(metadata->>'toStatus' IN ('PENDING','APPROVED','REJECTED','LOCKED','CANCELLED'),false))
  AND (NOT metadata ? 'revision' OR (jsonb_typeof(metadata->'revision') = 'number' AND COALESCE(metadata->>'revision' ~ '^[1-9][0-9]*$',false)))
  AND (NOT metadata ? 'reasonCode' OR metadata->'reasonCode' = 'null'::jsonb OR COALESCE(metadata->>'reasonCode' IN ('CONTACT_ORGANIZER','INCOMPLETE_DETAILS','INELIGIBLE','CAPACITY'),false))
  AND (NOT metadata ? 'reviewAllowed' OR jsonb_typeof(metadata->'reviewAllowed') = 'boolean')
  AND (NOT metadata ? 'fromStage' OR COALESCE(metadata->>'fromStage' IN ('PRE_REGISTRATION','REGISTRATION_OPEN','DATA_REVIEW','FINALIZED','ENDED','CANCELLED'),false))
  AND (NOT metadata ? 'toStage' OR COALESCE(metadata->>'toStage' IN ('PRE_REGISTRATION','REGISTRATION_OPEN','DATA_REVIEW','FINALIZED','ENDED','CANCELLED'),false))
);
COMMIT;
