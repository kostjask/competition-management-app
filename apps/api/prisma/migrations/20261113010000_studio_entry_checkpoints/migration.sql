BEGIN;
ALTER TABLE "Performance" ADD COLUMN teacher TEXT, ADD COLUMN author TEXT;
CREATE TABLE "EntryConfiguration" (
  "eventId" TEXT NOT NULL PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 1, settings JSONB NOT NULL,
  CONSTRAINT "EntryConfiguration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE TABLE "EntryCheckpoint" (
  id TEXT NOT NULL PRIMARY KEY, "registrationId" TEXT NOT NULL, kind TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'DRAFT',
  "earlyLocked" BOOLEAN NOT NULL DEFAULT false, "grant" JSONB,
  CONSTRAINT "EntryCheckpoint_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "StudioEventRegistration"(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "EntryCheckpoint_registrationId_kind_key" ON "EntryCheckpoint"("registrationId",kind);
CREATE TABLE "EntryReceipt" (
  id TEXT NOT NULL PRIMARY KEY, "checkpointId" TEXT NOT NULL, revision INTEGER NOT NULL,
  action TEXT NOT NULL, "actorId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "operationId" UUID NOT NULL, digest TEXT NOT NULL, reason TEXT, visible BOOLEAN NOT NULL DEFAULT false, manifest JSONB NOT NULL,
  CONSTRAINT "EntryReceipt_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "EntryCheckpoint"(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "EntryReceipt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "EntryReceipt_operationId_key" ON "EntryReceipt"("operationId");
CREATE UNIQUE INDEX "EntryReceipt_checkpointId_revision_key" ON "EntryReceipt"("checkpointId",revision);
CREATE INDEX "EntryReceipt_actorId_idx" ON "EntryReceipt"("actorId");
-- SQL-only guards
ALTER TABLE "EntryConfiguration" ADD CONSTRAINT "EntryConfiguration_valid" CHECK (revision > 0 AND jsonb_typeof(settings) = 'object');
ALTER TABLE "EntryCheckpoint" ADD CONSTRAINT "EntryCheckpoint_valid" CHECK (revision > 0 AND kind IN ('BASIC','FINAL') AND status IN ('DRAFT','REVIEW_PENDING','ACCEPTED','REQUIRES_CHANGES') AND ("grant" IS NULL OR jsonb_typeof("grant") = 'object'));
ALTER TABLE "EntryReceipt" ADD CONSTRAINT "EntryReceipt_valid" CHECK (revision > 0 AND action IN ('SUBMIT','ACCEPT','REOPEN') AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(manifest) = 'object' AND (action <> 'REOPEN' OR coalesce(length(trim(reason)) > 0,false)));
CREATE FUNCTION preserve_entry_checkpoint_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.id,NEW."registrationId",NEW.kind) IS DISTINCT FROM (OLD.id,OLD."registrationId",OLD.kind) THEN
   RAISE EXCEPTION 'Studio checkpoint identity is immutable' USING ERRCODE = '23514';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER "EntryCheckpoint_identity" BEFORE UPDATE ON "EntryCheckpoint" FOR EACH ROW EXECUTE FUNCTION preserve_entry_checkpoint_identity();
CREATE TRIGGER "EntryReceipt_immutable" BEFORE UPDATE OR DELETE ON "EntryReceipt" FOR EACH ROW EXECUTE FUNCTION prevent_performance_revision_change();
CREATE FUNCTION validate_entry_receipt_versions() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item JSONB; saved_snapshot JSONB; registration_id TEXT; BEGIN
 SELECT "registrationId" INTO registration_id FROM "EntryCheckpoint" WHERE id = NEW."checkpointId";
 IF jsonb_typeof(NEW.manifest->'entries') IS DISTINCT FROM 'array'
    OR jsonb_typeof(NEW.manifest->'roster') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Receipt requires entry and roster manifests' USING ERRCODE = '23514';
 END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.manifest->'entries') entry GROUP BY entry->>'id' HAVING count(*) > 1) THEN
   RAISE EXCEPTION 'Receipt entries must be unique' USING ERRCODE = '23514';
 END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(NEW.manifest->'entries') LOOP
   SELECT r.snapshot INTO saved_snapshot FROM "PerformanceRevision" r JOIN "Performance" p ON p.id = r."performanceId"
    WHERE p."registrationId" = registration_id AND r."performanceId" = item->>'id' AND r.revision = (item->>'revision')::integer;
   IF saved_snapshot IS NULL OR saved_snapshot IS DISTINCT FROM item->'snapshot' THEN
     RAISE EXCEPTION 'Receipt must pin exact immutable revisions of its studio' USING ERRCODE = '23514';
   END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER "EntryReceipt_versions" BEFORE INSERT ON "EntryReceipt" FOR EACH ROW EXECUTE FUNCTION validate_entry_receipt_versions();
ALTER TABLE "PerformanceRevision" DROP CONSTRAINT "PerformanceRevision_provenance";
ALTER TABLE "PerformanceRevision" ADD CONSTRAINT "PerformanceRevision_provenance" CHECK (
 revision > 0 AND ((origin = 'LEGACY_BASELINE' AND "actorId" IS NULL) OR (origin IN ('CREATE','EDIT','ARCHIVE','CHECKPOINT') AND "actorId" IS NOT NULL))
 AND jsonb_typeof(snapshot) = 'object' AND coalesce(snapshot->>'policyVersion' IN ('1','2','3'),false)
);
-- Retained snapshots are untouched; only subsequent captures include artistic credits.
DO $$ DECLARE definition TEXT; BEGIN
 SELECT pg_get_functiondef('capture_performance_revision(text,text,text)'::regprocedure) INTO definition;
 definition := replace(definition, '''policyVersion'', 2', '''policyVersion'', 3');
 definition := replace(definition, '''studioName'', s.name', '''teacher'', p.teacher, ''author'', p.author, ''studioName'', s.name');
 EXECUTE definition;
END $$;
-- Serialize policy publication and application creation on the event row.
CREATE FUNCTION guard_entry_rules() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_id TEXT; BEGIN
 IF TG_TABLE_NAME = 'EntryConfiguration' THEN
   IF TG_OP = 'UPDATE' AND NEW."eventId" IS DISTINCT FROM OLD."eventId" THEN
     RAISE EXCEPTION 'Entry policy event is immutable' USING ERRCODE = '23514';
   END IF;
   IF TG_OP = 'DELETE' THEN event_id := OLD."eventId"; ELSE event_id := NEW."eventId"; END IF;
 ELSE
   IF TG_OP = 'DELETE' THEN event_id := OLD."eventId"; ELSE event_id := NEW."eventId"; END IF;
 END IF;
 PERFORM 1 FROM "Event" WHERE id = event_id FOR UPDATE;
 IF TG_TABLE_NAME <> 'StudioEventRegistration' AND (TG_TABLE_NAME = 'EntryConfiguration' OR EXISTS (SELECT 1 FROM "EntryConfiguration" WHERE "eventId" = event_id))
    AND EXISTS (SELECT 1 FROM "StudioEventRegistration" WHERE "eventId" = event_id) THEN
   IF TG_TABLE_NAME = 'EntryConfiguration' AND TG_OP = 'UPDATE' THEN
     IF (OLD.settings - ARRAY['basic','final']) = (NEW.settings - ARRAY['basic','final'])
       AND ((OLD.settings->'basic') - 'deadline') = ((NEW.settings->'basic') - 'deadline')
       AND ((OLD.settings->'final') - 'deadline') = ((NEW.settings->'final') - 'deadline') THEN RETURN NEW; END IF;
   END IF;
   RAISE EXCEPTION 'Competition rules are frozen after registration starts' USING ERRCODE = '23514';
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER "EntryConfiguration_freeze" BEFORE INSERT OR UPDATE OR DELETE ON "EntryConfiguration" FOR EACH ROW EXECUTE FUNCTION guard_entry_rules();
CREATE TRIGGER "StudioEventRegistration_entry_policy" BEFORE INSERT ON "StudioEventRegistration" FOR EACH ROW EXECUTE FUNCTION guard_entry_rules();
CREATE TRIGGER "DanceCategory_entry_freeze" BEFORE INSERT OR UPDATE OR DELETE ON "DanceCategory" FOR EACH ROW EXECUTE FUNCTION guard_entry_rules();
CREATE TRIGGER "AgeGroup_entry_freeze" BEFORE INSERT OR UPDATE OR DELETE ON "AgeGroup" FOR EACH ROW EXECUTE FUNCTION guard_entry_rules();
CREATE TRIGGER "DanceFormat_entry_freeze" BEFORE INSERT OR UPDATE OR DELETE ON "DanceFormat" FOR EACH ROW EXECUTE FUNCTION guard_entry_rules();
CREATE FUNCTION guard_entry_age_date() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW."startsAt",NEW."timeZone") IS DISTINCT FROM (OLD."startsAt",OLD."timeZone")
  AND EXISTS (SELECT 1 FROM "EntryConfiguration" WHERE "eventId" = OLD.id)
  AND EXISTS (SELECT 1 FROM "StudioEventRegistration" WHERE "eventId" = OLD.id) THEN
   RAISE EXCEPTION 'Entry age reference is frozen after registration starts' USING ERRCODE = '23514';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER "Event_entry_age_date" BEFORE UPDATE ON "Event" FOR EACH ROW EXECUTE FUNCTION guard_entry_age_date();
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_action";
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_target_type";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_target_type" CHECK ("targetType" IN ('USER','INVITATION','USER_ROLE','STUDIO','REGISTRATION','EVENT','DANCER','PERFORMANCE','ENTRY_CHECKPOINT'));
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" CHECK (action IN ('ACCOUNT_REGISTERED','EMAIL_VERIFIED','EMAIL_CORRECTED','PASSWORD_RESET','TOKEN_ROTATED','INVITATION_CREATED','INVITATION_ACCEPTED','INVITATION_REVOKED','INVITATION_ROTATED','ACCESS_GRANTED','ACCESS_RECONCILED','ACCESS_REMOVED','STUDIO_APPROVAL_CHANGED','REGISTRATION_APPROVAL_CHANGED','IMAGE_REPLACED','SESSION_REVOKED','ONBOARDING_SAVED','ONBOARDING_CANCELLED','EVENT_UPDATED','REGISTRATION_CREATED','REGISTRATION_CORRECTED','REGISTRATION_CANCELLED','REGISTRATION_REAPPLIED','PERFORMANCE_CREATED','PERFORMANCE_UPDATED','PERFORMANCE_ARCHIVED','ENTRY_CONFIGURED','ENTRY_SUBMITTED','ENTRY_ACCEPTED','ENTRY_REOPENED'));
COMMIT;
