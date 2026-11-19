BEGIN;
ALTER TABLE "MusicTrack" ADD COLUMN "correctionUntil" TIMESTAMP(3);
CREATE TABLE "MusicConfiguration" (
  "eventId" TEXT NOT NULL PRIMARY KEY, "revision" INTEGER NOT NULL DEFAULT 1, "policy" JSONB NOT NULL,
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "MusicUpload" ("id" UUID NOT NULL PRIMARY KEY, "expiresAt" TIMESTAMP(3) NOT NULL, "deleting" BOOLEAN NOT NULL DEFAULT false);
CREATE INDEX "MusicUpload_expiresAt_idx" ON "MusicUpload"("expiresAt");
-- SQL-only guards
ALTER TABLE "MusicConfiguration" ADD CONSTRAINT "MusicConfiguration_revision" CHECK (revision > 0);
ALTER TABLE "MusicOperation" DROP CONSTRAINT "MusicOperation_values";
ALTER TABLE "MusicOperation" ADD CONSTRAINT "MusicOperation_values" CHECK (revision > 0 AND action IN ('CREATE','ATTACH','REPLACE','CONFIRM','ACCEPT','REOPEN') AND ((action = 'REOPEN' AND reason IS NOT NULL AND length(trim(reason)) BETWEEN 1 AND 500) OR (action <> 'REOPEN' AND reason IS NULL)));
DO $$ DECLARE definition TEXT; BEGIN
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_action';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_action"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR action IN (''MUSIC_CONFIGURED'',''MUSIC_CREATED'',''MUSIC_REPLACED'',''MUSIC_CONFIRMED'',''MUSIC_ACCEPTED'',''MUSIC_REOPENED'',''MUSIC_ATTACHED''))';
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_target_type';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_target_type"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_target_type" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR "targetType" = ''MUSIC_TRACK'')';
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_safe_metadata';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_safe_metadata"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_safe_metadata" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR (action IN (''MUSIC_CONFIGURED'',''MUSIC_CREATED'',''MUSIC_REPLACED'',''MUSIC_CONFIRMED'',''MUSIC_ACCEPTED'',''MUSIC_REOPENED'',''MUSIC_ATTACHED'') AND jsonb_typeof(metadata) = ''object'' AND metadata - ARRAY[''revision'',''operationId''] = ''{}''::jsonb AND COALESCE((metadata->>''revision'') ~ ''^[1-9][0-9]{0,9}$'', false) AND (action = ''MUSIC_CONFIGURED'' OR COALESCE((metadata->>''operationId'') ~ ''^[0-9a-f-]{36}$'', false))))';
END $$;
COMMIT;
