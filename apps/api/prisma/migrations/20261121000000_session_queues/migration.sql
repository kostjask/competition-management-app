ALTER TYPE "EventStage" ADD VALUE 'SCHEDULED';
ALTER TYPE "EventStage" ADD VALUE 'LIVE';

CREATE TABLE "EventSchedule" ("eventId" TEXT NOT NULL PRIMARY KEY, "revision" INTEGER NOT NULL DEFAULT 0);
CREATE TABLE "CompetitionStage" ("id" UUID NOT NULL PRIMARY KEY, "eventId" TEXT NOT NULL, "name" TEXT NOT NULL);
CREATE TABLE "CompetitionSession" (
  "id" UUID NOT NULL PRIMARY KEY, "eventId" TEXT NOT NULL, "stageId" UUID NOT NULL,
  "name" TEXT NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL, "bufferSec" INTEGER NOT NULL DEFAULT 0,
  "restSec" INTEGER NOT NULL DEFAULT 0, "moderatorId" TEXT, "state" TEXT NOT NULL DEFAULT 'PAUSED'
);
CREATE TABLE "ScheduleSlot" (
  "id" UUID NOT NULL PRIMARY KEY, "eventId" TEXT NOT NULL, "sessionId" UUID NOT NULL,
  "performanceId" TEXT NOT NULL, "position" INTEGER, "state" TEXT NOT NULL DEFAULT 'WAITING', "reason" TEXT
);
CREATE TABLE "ScheduleOperation" (
  "operationId" UUID NOT NULL PRIMARY KEY, "eventId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL, "action" TEXT NOT NULL, "digest" TEXT NOT NULL, "reason" TEXT, "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Performance_id_eventId_key" ON "Performance"("id", "eventId");
CREATE UNIQUE INDEX "CompetitionStage_id_eventId_key" ON "CompetitionStage"("id", "eventId");
CREATE UNIQUE INDEX "CompetitionSession_id_eventId_key" ON "CompetitionSession"("id", "eventId");
CREATE INDEX "CompetitionSession_moderatorId_idx" ON "CompetitionSession"("moderatorId");
CREATE INDEX "CompetitionSession_eventId_stageId_startsAt_idx" ON "CompetitionSession"("eventId", "stageId", "startsAt");
CREATE UNIQUE INDEX "ScheduleSlot_eventId_performanceId_key" ON "ScheduleSlot"("eventId", "performanceId");
CREATE UNIQUE INDEX "ScheduleSlot_sessionId_position_key" ON "ScheduleSlot"("sessionId", "position");
CREATE UNIQUE INDEX "ScheduleOperation_eventId_revision_key" ON "ScheduleOperation"("eventId", "revision");
CREATE INDEX "ScheduleOperation_actorId_idx" ON "ScheduleOperation"("actorId");
ALTER TABLE "EventSchedule" ADD FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompetitionStage" ADD FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompetitionSession" ADD FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompetitionSession" ADD FOREIGN KEY ("stageId", "eventId") REFERENCES "CompetitionStage"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "CompetitionSession" ADD FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleSlot" ADD FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleSlot" ADD FOREIGN KEY ("sessionId", "eventId") REFERENCES "CompetitionSession"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ScheduleSlot" ADD FOREIGN KEY ("performanceId", "eventId") REFERENCES "Performance"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ScheduleOperation" ADD FOREIGN KEY ("eventId") REFERENCES "EventSchedule"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleOperation" ADD FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SQL-only guards
CREATE UNIQUE INDEX "ScheduleSlot_one_current" ON "ScheduleSlot"("sessionId") WHERE "state" = 'CURRENT';
ALTER TABLE "EventSchedule" ADD CONSTRAINT "EventSchedule_revision" CHECK (revision >= 0);
ALTER TABLE "CompetitionStage" ADD CONSTRAINT "CompetitionStage_name" CHECK (length(trim(name)) BETWEEN 1 AND 200);
ALTER TABLE "CompetitionSession" ADD CONSTRAINT "CompetitionSession_values" CHECK (length(trim(name)) BETWEEN 1 AND 200 AND "bufferSec" BETWEEN 0 AND 3600 AND "restSec" BETWEEN 0 AND 86400 AND state IN ('PAUSED','RUNNING','FINISHED'));
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_values" CHECK (state IN ('WAITING','CURRENT','DONE','SKIPPED','REMOVED') AND ((state = 'REMOVED' AND position IS NULL) OR (state <> 'REMOVED' AND position > 0 AND position IS NOT NULL)) AND (state <> 'SKIPPED' OR (reason IS NOT NULL AND length(trim(reason)) BETWEEN 1 AND 500)));
ALTER TABLE "ScheduleOperation" ADD CONSTRAINT "ScheduleOperation_values" CHECK (revision > 0 AND digest ~ '^[a-f0-9]{64}$' AND action IN ('CREATE_STAGE','CREATE_SESSION','UPDATE_SESSION','SAVE','START','PAUSE','ADVANCE','SKIP','REQUEUE','REOPEN') AND ((action IN ('SKIP','REQUEUE','REOPEN') AND reason IS NOT NULL AND length(trim(reason)) BETWEEN 1 AND 500) OR (action NOT IN ('SKIP','REQUEUE','REOPEN') AND reason IS NULL)));
CREATE FUNCTION reject_schedule_history_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Schedule acknowledgement history is immutable'; END $$;
CREATE TRIGGER "ScheduleOperation_immutable" BEFORE UPDATE OR DELETE ON "ScheduleOperation" FOR EACH ROW EXECUTE FUNCTION reject_schedule_history_change();
DO $$ DECLARE definition TEXT; BEGIN
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_action';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_action"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR action = ''SCHEDULE_CHANGED'')';
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_target_type';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_target_type"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_target_type" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR "targetType" = ''SCHEDULE'')';
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_safe_metadata';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_safe_metadata"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_safe_metadata" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR (action = ''SCHEDULE_CHANGED'' AND jsonb_typeof(metadata) = ''object'' AND metadata - ARRAY[''revision'',''operationId''] = ''{}''::jsonb AND COALESCE((metadata->>''revision'') ~ ''^[1-9][0-9]{0,9}$'', false) AND COALESCE((metadata->>''operationId'') ~ ''^[0-9a-f-]{36}$'', false)))';
END $$;
-- Keep the canonical lifecycle audit allowlist in sync without relaxing other metadata.
DO $$ DECLARE definition TEXT; BEGIN
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_safe_metadata';
  definition := replace(definition, '''DATA_REVIEW''::text', '''DATA_REVIEW''::text, ''SCHEDULED''::text, ''LIVE''::text');
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_safe_metadata"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_safe_metadata" ' || definition;
END $$;
CREATE FUNCTION protect_schedule_slot_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF (OLD.id,OLD."eventId",OLD."performanceId") IS DISTINCT FROM (NEW.id,NEW."eventId",NEW."performanceId") THEN RAISE EXCEPTION 'Schedule slot identity is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ScheduleSlot_identity" BEFORE UPDATE ON "ScheduleSlot" FOR EACH ROW EXECUTE FUNCTION protect_schedule_slot_identity();
