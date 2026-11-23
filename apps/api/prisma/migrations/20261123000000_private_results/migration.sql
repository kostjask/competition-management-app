CREATE TABLE "ResultRevision" (
    "eventId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "operationId" UUID NOT NULL,
    "actorId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResultRevision_pkey" PRIMARY KEY ("eventId", "revision")
);

CREATE TABLE "ResultFinalization" (
    "eventId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "operationId" UUID NOT NULL,
    "actorId" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResultFinalization_pkey" PRIMARY KEY ("eventId")
);

CREATE UNIQUE INDEX "ResultRevision_operationId_key" ON "ResultRevision"("operationId");
CREATE UNIQUE INDEX "ResultFinalization_operationId_key" ON "ResultFinalization"("operationId");
CREATE UNIQUE INDEX "ResultFinalization_eventId_revision_key" ON "ResultFinalization"("eventId", "revision");

ALTER TABLE "ResultRevision" ADD CONSTRAINT "ResultRevision_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ResultRevision" ADD CONSTRAINT "ResultRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ResultFinalization" ADD CONSTRAINT "ResultFinalization_eventId_revision_fkey" FOREIGN KEY ("eventId", "revision") REFERENCES "ResultRevision"("eventId", "revision") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ResultFinalization" ADD CONSTRAINT "ResultFinalization_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- SQL-only guards
ALTER TABLE "ResultRevision" ADD CONSTRAINT "ResultRevision_values" CHECK (
    "revision" > 0 AND "source" ~ '^[a-f0-9]{64}$' AND "digest" ~ '^[a-f0-9]{64}$'
    AND jsonb_typeof("snapshot") = 'object'
);
ALTER TABLE "ResultFinalization" ADD CONSTRAINT "ResultFinalization_digest" CHECK ("digest" ~ '^[a-f0-9]{64}$');

CREATE TRIGGER "ResultRevision_immutable" BEFORE UPDATE OR DELETE ON "ResultRevision" FOR EACH ROW EXECUTE FUNCTION reject_scoring_history_change();
CREATE TRIGGER "ResultFinalization_immutable" BEFORE UPDATE OR DELETE ON "ResultFinalization" FOR EACH ROW EXECUTE FUNCTION reject_scoring_history_change();

DO $$ DECLARE definition TEXT; BEGIN
    SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_action';
    EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_action"';
    EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR action IN (''RESULTS_CALCULATED'',''RESULTS_FINALIZED''))';
    SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_target_type';
    EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_target_type"';
    EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_target_type" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR "targetType" = ''RESULTS'')';
    SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_safe_metadata';
    EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_safe_metadata"';
    EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_safe_metadata" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR (action IN (''RESULTS_CALCULATED'',''RESULTS_FINALIZED'') AND jsonb_typeof(metadata) = ''object'' AND metadata - ARRAY[''revision'',''operationId''] = ''{}''::jsonb AND COALESCE((metadata->>''revision'') ~ ''^[1-9][0-9]{0,9}$'', false) AND COALESCE((metadata->>''operationId'') ~ ''^[0-9a-f-]{36}$'', false)))';
END $$;
