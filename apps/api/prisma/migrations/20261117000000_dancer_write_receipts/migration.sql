BEGIN;
ALTER TABLE "Dancer" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "DancerOperation" (
  "operationId" UUID NOT NULL PRIMARY KEY,
  "dancerId" TEXT NOT NULL,
  "studioId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DancerOperation_dancerId_studioId_fkey" FOREIGN KEY ("dancerId","studioId") REFERENCES "Dancer"("id","studioId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "DancerOperation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "DancerOperation_dancerId_revision_key" ON "DancerOperation"("dancerId","revision");
CREATE INDEX "DancerOperation_actorId_idx" ON "DancerOperation"("actorId");
-- SQL-only guards
ALTER TABLE "Dancer" ADD CONSTRAINT "Dancer_revision_positive" CHECK (revision > 0);
ALTER TABLE "DancerOperation" ADD CONSTRAINT "DancerOperation_revision_positive" CHECK (revision > 0);
ALTER TABLE "DancerOperation" ADD CONSTRAINT "DancerOperation_action" CHECK (action IN ('CREATE','UPDATE','ARCHIVE'));
CREATE FUNCTION prevent_dancer_operation_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Dancer receipts are immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER "DancerOperation_immutable" BEFORE UPDATE OR DELETE ON "DancerOperation" FOR EACH ROW EXECUTE FUNCTION prevent_dancer_operation_change();
DO $$ DECLARE definition TEXT; BEGIN
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_action';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_action"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR action IN (''DANCER_CREATED'',''DANCER_UPDATED'',''DANCER_ARCHIVED''))';
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_safe_metadata';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_safe_metadata"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_safe_metadata" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR ("targetType" = ''DANCER'' AND action IN (''DANCER_CREATED'',''DANCER_UPDATED'',''DANCER_ARCHIVED'') AND jsonb_typeof(metadata) = ''object'' AND metadata ?& ARRAY[''revision'',''operationId''] AND metadata - ARRAY[''revision'',''operationId''] = ''{}''::jsonb AND jsonb_typeof(metadata->''revision'') = ''number'' AND (metadata->>''revision'') ~ ''^[1-9][0-9]{0,9}$'' AND jsonb_typeof(metadata->''operationId'') = ''string'' AND (metadata->>''operationId'') ~ ''^[0-9a-f-]{36}$''))';
END $$;
COMMIT;
