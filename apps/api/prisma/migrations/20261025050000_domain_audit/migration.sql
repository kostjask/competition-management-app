BEGIN;
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL, "action" TEXT NOT NULL, "actorKind" TEXT NOT NULL, "actorId" TEXT,
  "targetType" TEXT NOT NULL, "targetId" TEXT NOT NULL, "eventId" TEXT, "studioId" TEXT,
  "metadata" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_targetType_targetId_createdAt_id_idx" ON "AuditLog"("targetType","targetId","createdAt","id");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_eventId_createdAt_idx" ON "AuditLog"("eventId","createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- SQL-only guards
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_kind" CHECK (("actorKind" = 'USER' AND "actorId" IS NOT NULL) OR ("actorKind" IN ('SYSTEM','ANONYMOUS') AND "actorId" IS NULL));
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" CHECK (action IN ('ACCOUNT_REGISTERED','EMAIL_VERIFIED','EMAIL_CORRECTED','PASSWORD_RESET','TOKEN_ROTATED','INVITATION_CREATED','INVITATION_ACCEPTED','INVITATION_REVOKED','INVITATION_ROTATED','ACCESS_GRANTED','ACCESS_RECONCILED','ACCESS_REMOVED','STUDIO_APPROVAL_CHANGED','REGISTRATION_APPROVAL_CHANGED'));
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_target_type" CHECK ("targetType" IN ('USER','INVITATION','USER_ROLE','STUDIO','REGISTRATION'));
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_safe_metadata" CHECK (jsonb_typeof(metadata) = 'object' AND metadata - ARRAY['roleKey','purpose','fromStatus','toStatus'] = '{}'::jsonb AND (NOT metadata ? 'roleKey' OR COALESCE(metadata->>'roleKey' IN ('admin','representative','judge','moderator'),false)) AND (NOT metadata ? 'purpose' OR COALESCE(metadata->>'purpose' IN ('VERIFY_EMAIL','PASSWORD_RECOVERY'),false)) AND (NOT metadata ? 'fromStatus' OR COALESCE(metadata->>'fromStatus' IN ('PENDING','APPROVED','REJECTED','LOCKED'),false)) AND (NOT metadata ? 'toStatus' OR COALESCE(metadata->>'toStatus' IN ('PENDING','APPROVED','REJECTED','LOCKED'),false)));
CREATE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit records are immutable' USING ERRCODE='55000'; END $$;
CREATE TRIGGER "AuditLog_immutable" BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
COMMIT;
