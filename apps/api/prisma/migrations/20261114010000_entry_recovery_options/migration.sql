BEGIN;
ALTER TABLE "DanceFormat" ALTER COLUMN "maxParticipants" DROP NOT NULL;
CREATE TABLE "PerformanceOperation" (
 "operationId" UUID PRIMARY KEY, "performanceId" TEXT NOT NULL, revision INTEGER NOT NULL,
 "actorId" TEXT NOT NULL, digest TEXT NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PerformanceOperation_performanceId_fkey" FOREIGN KEY ("performanceId") REFERENCES "Performance"(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "PerformanceOperation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "PerformanceOperation_performanceId_revision_key" ON "PerformanceOperation"("performanceId", revision);
CREATE INDEX "PerformanceOperation_actorId_idx" ON "PerformanceOperation"("actorId");
-- SQL-only guards
ALTER TABLE "DanceFormat" DROP CONSTRAINT "DanceFormat_bounds";
ALTER TABLE "DanceFormat" ADD CONSTRAINT "DanceFormat_bounds" CHECK ("minParticipants" > 0 AND ("maxParticipants" IS NULL OR "maxParticipants" >= "minParticipants") AND "maxDurationSeconds" > 0);
ALTER TABLE "PerformanceRevision" DROP CONSTRAINT "PerformanceRevision_provenance";
ALTER TABLE "PerformanceRevision" ADD CONSTRAINT "PerformanceRevision_provenance" CHECK (
 revision > 0 AND ((origin = 'LEGACY_BASELINE' AND "actorId" IS NULL) OR (origin IN ('CREATE','EDIT','ARCHIVE','RESTORE','CHECKPOINT') AND "actorId" IS NOT NULL))
 AND jsonb_typeof(snapshot) = 'object' AND coalesce(snapshot->>'policyVersion' IN ('1','2','3'),false)
);
ALTER TABLE "PerformanceOperation" ADD CONSTRAINT "PerformanceOperation_valid" CHECK (revision > 0 AND action IN ('WITHDRAW','RESTORE') AND digest ~ '^[0-9a-f]{64}$' AND length(trim(reason)) BETWEEN 1 AND 1000);
CREATE TRIGGER "PerformanceOperation_immutable" BEFORE UPDATE OR DELETE ON "PerformanceOperation" FOR EACH ROW EXECUTE FUNCTION prevent_performance_revision_change();
CREATE FUNCTION validate_performance_operation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM "PerformanceRevision" WHERE "performanceId" = NEW."performanceId" AND revision = NEW.revision
   AND "actorId" = NEW."actorId" AND origin = CASE WHEN NEW.action = 'RESTORE' THEN 'RESTORE' ELSE 'ARCHIVE' END
   AND (snapshot->>'archived')::boolean = (NEW.action = 'WITHDRAW')) THEN
   RAISE EXCEPTION 'Operation must pin its actor and lifecycle revision' USING ERRCODE = '23514';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER "PerformanceOperation_revision" BEFORE INSERT ON "PerformanceOperation" FOR EACH ROW EXECUTE FUNCTION validate_performance_operation();
DO $$ DECLARE definition TEXT; BEGIN
 SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conname = 'AuditLog_action';
 EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_action"';
 definition := replace(definition, '''PERFORMANCE_ARCHIVED''', '''PERFORMANCE_RESTORED''::text, ''PERFORMANCE_ARCHIVED''');
 EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" ' || definition;
END $$;
COMMIT;
