-- CreateTable
CREATE TABLE "ScoringSetup" (
    "eventId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScoringSetup_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "ScoringTemplate" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ScoringTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringCriterion" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" JSONB NOT NULL,
    "instructions" JSONB NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "weightBps" INTEGER NOT NULL,

    CONSTRAINT "ScoringCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringBinding" (
    "categoryId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "templateId" UUID NOT NULL,

    CONSTRAINT "ScoringBinding_pkey" PRIMARY KEY ("categoryId")
);

-- CreateTable
CREATE TABLE "ScoringPanel" (
    "sessionId" UUID NOT NULL,
    "judgeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "ScoringPanel_pkey" PRIMARY KEY ("sessionId","judgeId")
);

-- CreateTable
CREATE TABLE "ScoringRecord" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "performanceId" TEXT NOT NULL,
    "sessionId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "penalty" INTEGER NOT NULL DEFAULT 0,
    "disqualified" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,

    CONSTRAINT "ScoringRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringSheet" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "ScoringSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringValue" (
    "sheetId" UUID NOT NULL,
    "criterionId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "value" INTEGER NOT NULL,
    "comment" TEXT,

    CONSTRAINT "ScoringValue_pkey" PRIMARY KEY ("sheetId","criterionId")
);

-- CreateTable
CREATE TABLE "ScoringSheetVersion" (
    "id" UUID NOT NULL,
    "sheetId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringSheetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringCalculation" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringOperation" (
    "operationId" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "reason" TEXT,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringOperation_pkey" PRIMARY KEY ("operationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoringTemplate_id_eventId_key" ON "ScoringTemplate"("id", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringCriterion_id_templateId_key" ON "ScoringCriterion"("id", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringCriterion_templateId_position_key" ON "ScoringCriterion"("templateId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringBinding_categoryId_eventId_key" ON "ScoringBinding"("categoryId", "eventId");

-- CreateIndex
CREATE INDEX "ScoringPanel_judgeId_eventId_idx" ON "ScoringPanel"("judgeId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringRecord_performanceId_key" ON "ScoringRecord"("performanceId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringRecord_id_templateId_eventId_key" ON "ScoringRecord"("id", "templateId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringRecord_performanceId_eventId_key" ON "ScoringRecord"("performanceId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringSheet_recordId_judgeId_key" ON "ScoringSheet"("recordId", "judgeId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringSheet_id_templateId_key" ON "ScoringSheet"("id", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringSheetVersion_sheetId_revision_key" ON "ScoringSheetVersion"("sheetId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringCalculation_recordId_source_key" ON "ScoringCalculation"("recordId", "source");

-- CreateIndex
CREATE INDEX "ScoringOperation_actorId_idx" ON "ScoringOperation"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringOperation_eventId_revision_key" ON "ScoringOperation"("eventId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Judge_id_eventId_key" ON "Judge"("id", "eventId");

-- AddForeignKey
ALTER TABLE "ScoringSetup" ADD CONSTRAINT "ScoringSetup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringTemplate" ADD CONSTRAINT "ScoringTemplate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringCriterion" ADD CONSTRAINT "ScoringCriterion_templateId_eventId_fkey" FOREIGN KEY ("templateId", "eventId") REFERENCES "ScoringTemplate"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringBinding" ADD CONSTRAINT "ScoringBinding_categoryId_eventId_fkey" FOREIGN KEY ("categoryId", "eventId") REFERENCES "DanceCategory"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringBinding" ADD CONSTRAINT "ScoringBinding_templateId_eventId_fkey" FOREIGN KEY ("templateId", "eventId") REFERENCES "ScoringTemplate"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringPanel" ADD CONSTRAINT "ScoringPanel_sessionId_eventId_fkey" FOREIGN KEY ("sessionId", "eventId") REFERENCES "CompetitionSession"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringPanel" ADD CONSTRAINT "ScoringPanel_judgeId_eventId_fkey" FOREIGN KEY ("judgeId", "eventId") REFERENCES "Judge"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringRecord" ADD CONSTRAINT "ScoringRecord_performanceId_eventId_fkey" FOREIGN KEY ("performanceId", "eventId") REFERENCES "Performance"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringRecord" ADD CONSTRAINT "ScoringRecord_sessionId_eventId_fkey" FOREIGN KEY ("sessionId", "eventId") REFERENCES "CompetitionSession"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringRecord" ADD CONSTRAINT "ScoringRecord_templateId_eventId_fkey" FOREIGN KEY ("templateId", "eventId") REFERENCES "ScoringTemplate"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringSheet" ADD CONSTRAINT "ScoringSheet_recordId_templateId_eventId_fkey" FOREIGN KEY ("recordId", "templateId", "eventId") REFERENCES "ScoringRecord"("id", "templateId", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringSheet" ADD CONSTRAINT "ScoringSheet_judgeId_eventId_fkey" FOREIGN KEY ("judgeId", "eventId") REFERENCES "Judge"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringValue" ADD CONSTRAINT "ScoringValue_sheetId_templateId_fkey" FOREIGN KEY ("sheetId", "templateId") REFERENCES "ScoringSheet"("id", "templateId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringValue" ADD CONSTRAINT "ScoringValue_criterionId_templateId_fkey" FOREIGN KEY ("criterionId", "templateId") REFERENCES "ScoringCriterion"("id", "templateId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ScoringSheetVersion" ADD CONSTRAINT "ScoringSheetVersion_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ScoringSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringSheetVersion" ADD CONSTRAINT "ScoringSheetVersion_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringCalculation" ADD CONSTRAINT "ScoringCalculation_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ScoringRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringOperation" ADD CONSTRAINT "ScoringOperation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ScoringSetup"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringOperation" ADD CONSTRAINT "ScoringOperation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SQL-only guards
ALTER TABLE "ScoringSetup" ADD CONSTRAINT "ScoringSetup_revision" CHECK (revision >= 0);
ALTER TABLE "ScoringTemplate" ADD CONSTRAINT "ScoringTemplate_name" CHECK (length(trim(name)) BETWEEN 1 AND 200);
ALTER TABLE "ScoringCriterion" ADD CONSTRAINT "ScoringCriterion_values" CHECK (position BETWEEN 1 AND 30 AND min BETWEEN 0 AND 1000000 AND max BETWEEN 0 AND 1000000 AND max > min AND step > 0 AND (max-min) % step = 0 AND "weightBps" BETWEEN 1 AND 10000);
ALTER TABLE "ScoringRecord" ADD CONSTRAINT "ScoringRecord_values" CHECK (penalty BETWEEN 0 AND 100000 AND ((penalty = 0 AND NOT disqualified) OR (reason IS NOT NULL AND length(trim(reason)) BETWEEN 1 AND 500)));
ALTER TABLE "ScoringSheet" ADD CONSTRAINT "ScoringSheet_values" CHECK (revision > 0 AND ((state = 'DRAFT' AND "submittedAt" IS NULL) OR (state = 'LOCKED' AND "submittedAt" IS NOT NULL)));
ALTER TABLE "ScoringValue" ADD CONSTRAINT "ScoringValue_values" CHECK (value BETWEEN 0 AND 1000000 AND (comment IS NULL OR length(comment) <= 1000));
ALTER TABLE "ScoringSheetVersion" ADD CONSTRAINT "ScoringSheetVersion_values" CHECK (revision > 0 AND (reason IS NULL OR length(trim(reason)) BETWEEN 1 AND 500));
ALTER TABLE "ScoringCalculation" ADD CONSTRAINT "ScoringCalculation_source" CHECK (source ~ '^[a-f0-9]{64}$');
ALTER TABLE "ScoringOperation" ADD CONSTRAINT "ScoringOperation_values" CHECK (revision > 0 AND digest ~ '^[a-f0-9]{64}$' AND action IN ('CONFIGURE','DRAFT','SUBMIT','REOPEN','ADJUST','CALCULATE') AND ((action IN ('REOPEN','ADJUST') AND reason IS NOT NULL AND length(trim(reason)) BETWEEN 1 AND 500) OR (action NOT IN ('REOPEN','ADJUST') AND reason IS NULL)));

CREATE FUNCTION reject_scoring_history_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Scoring history is immutable'; END $$;
CREATE TRIGGER "ScoringTemplate_immutable" BEFORE UPDATE OR DELETE ON "ScoringTemplate" FOR EACH ROW EXECUTE FUNCTION reject_scoring_history_change();
CREATE TRIGGER "ScoringCriterion_immutable" BEFORE UPDATE OR DELETE ON "ScoringCriterion" FOR EACH ROW EXECUTE FUNCTION reject_scoring_history_change();
CREATE TRIGGER "ScoringSheetVersion_immutable" BEFORE UPDATE OR DELETE ON "ScoringSheetVersion" FOR EACH ROW EXECUTE FUNCTION reject_scoring_history_change();
CREATE TRIGGER "ScoringCalculation_immutable" BEFORE UPDATE OR DELETE ON "ScoringCalculation" FOR EACH ROW EXECUTE FUNCTION reject_scoring_history_change();
CREATE TRIGGER "ScoringOperation_immutable" BEFORE UPDATE OR DELETE ON "ScoringOperation" FOR EACH ROW EXECUTE FUNCTION reject_scoring_history_change();
CREATE TRIGGER "ScoringSheet_retained" BEFORE DELETE ON "ScoringSheet" FOR EACH ROW EXECUTE FUNCTION reject_scoring_history_change();
CREATE TRIGGER "ScoringRecord_retained" BEFORE DELETE ON "ScoringRecord" FOR EACH ROW EXECUTE FUNCTION reject_scoring_history_change();
CREATE FUNCTION validate_scoring_weights() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target UUID; total INTEGER; BEGIN
 IF TG_TABLE_NAME = 'ScoringTemplate' THEN target := NEW.id; ELSE target := NEW."templateId"; END IF;
 SELECT sum("weightBps") INTO total FROM "ScoringCriterion" WHERE "templateId" = target;
 IF total IS DISTINCT FROM 10000 THEN RAISE EXCEPTION 'Criterion weights must total 100 percent'; END IF;
 RETURN NEW;
END $$;
ALTER TABLE "ScheduleOperation" DROP CONSTRAINT "ScheduleOperation_values";
ALTER TABLE "ScheduleOperation" ADD CONSTRAINT "ScheduleOperation_values" CHECK (revision > 0 AND digest ~ '^[a-f0-9]{64}$' AND action IN ('CREATE_STAGE','CREATE_SESSION','UPDATE_SESSION','SAVE','START','PAUSE','ADVANCE','ADVANCE_OVERRIDE','SKIP','REQUEUE','REOPEN') AND ((action IN ('SKIP','REQUEUE','REOPEN','ADVANCE_OVERRIDE') AND reason IS NOT NULL AND length(trim(reason)) BETWEEN 1 AND 500) OR (action NOT IN ('SKIP','REQUEUE','REOPEN','ADVANCE_OVERRIDE') AND reason IS NULL)));
CREATE CONSTRAINT TRIGGER "ScoringTemplate_weights" AFTER INSERT ON "ScoringTemplate" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_scoring_weights();
CREATE CONSTRAINT TRIGGER "ScoringCriterion_weights" AFTER INSERT ON "ScoringCriterion" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_scoring_weights();
CREATE FUNCTION protect_scoring_value() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sid UUID; cid UUID; tid UUID; current_state TEXT; c "ScoringCriterion"; BEGIN
 sid := CASE WHEN TG_OP = 'DELETE' THEN OLD."sheetId" ELSE NEW."sheetId" END;
 SELECT "state" INTO current_state FROM "ScoringSheet" WHERE id = sid;
 IF current_state IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Submitted sheet values are locked'; END IF;
 IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM "ScoringSheet" WHERE id = OLD."sheetId" AND state <> 'DRAFT') THEN RAISE EXCEPTION 'Submitted sheet values cannot be moved'; END IF;
 IF TG_OP <> 'DELETE' THEN
  SELECT * INTO c FROM "ScoringCriterion" WHERE id = NEW."criterionId";
  IF NEW.value < c.min OR NEW.value > c.max OR (NEW.value - c.min) % c.step <> 0 THEN RAISE EXCEPTION 'Invalid exact criterion value'; END IF;
  RETURN NEW;
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER "ScoringValue_guard" BEFORE INSERT OR UPDATE OR DELETE ON "ScoringValue" FOR EACH ROW EXECUTE FUNCTION protect_scoring_value();
CREATE FUNCTION protect_scoring_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME = 'ScoringRecord' THEN
  IF (OLD.id,OLD."eventId",OLD."templateId",OLD."sessionId",OLD."performanceId") IS DISTINCT FROM (NEW.id,NEW."eventId",NEW."templateId",NEW."sessionId",NEW."performanceId") THEN RAISE EXCEPTION 'Scoring identity is immutable'; END IF;
 ELSE
  IF (OLD.id,OLD."eventId",OLD."templateId",OLD."recordId",OLD."judgeId") IS DISTINCT FROM (NEW.id,NEW."eventId",NEW."templateId",NEW."recordId",NEW."judgeId") THEN RAISE EXCEPTION 'Sheet identity is immutable'; END IF;
  IF NEW.state = 'LOCKED' AND (SELECT count(*) FROM "ScoringValue" WHERE "sheetId"=NEW.id) <> (SELECT count(*) FROM "ScoringCriterion" WHERE "templateId"=NEW."templateId") THEN RAISE EXCEPTION 'Submission requires every criterion'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER "ScoringRecord_identity" BEFORE UPDATE ON "ScoringRecord" FOR EACH ROW EXECUTE FUNCTION protect_scoring_identity();
CREATE TRIGGER "ScoringSheet_identity" BEFORE UPDATE ON "ScoringSheet" FOR EACH ROW EXECUTE FUNCTION protect_scoring_identity();

DO $$ DECLARE definition TEXT; BEGIN
 SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_action';
 EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_action"';
 EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR action = ''SCORING_CHANGED'')';
 SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_target_type';
 EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_target_type"';
 EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_target_type" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR "targetType" = ''SCORING'')';
 SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_safe_metadata';
 EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_safe_metadata"';
 EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_safe_metadata" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR (action = ''SCORING_CHANGED'' AND jsonb_typeof(metadata) = ''object'' AND metadata - ARRAY[''revision'',''operationId''] = ''{}''::jsonb AND COALESCE((metadata->>''revision'') ~ ''^[1-9][0-9]{0,9}$'', false) AND COALESCE((metadata->>''operationId'') ~ ''^[0-9a-f-]{36}$'', false)))';
END $$;
