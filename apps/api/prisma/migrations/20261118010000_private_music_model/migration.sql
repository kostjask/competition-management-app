BEGIN;
CREATE UNIQUE INDEX "Performance_id_registrationId_studioId_eventId_key" ON "Performance"("id","registrationId","studioId","eventId");
CREATE TABLE "MusicTrack" (
  "id" UUID NOT NULL PRIMARY KEY, "registrationId" TEXT NOT NULL, "studioId" TEXT NOT NULL, "eventId" TEXT NOT NULL,
  "performanceId" TEXT, "revision" INTEGER NOT NULL DEFAULT 1, "state" TEXT NOT NULL DEFAULT 'DRAFT', "currentVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MusicTrack_registrationId_studioId_eventId_fkey" FOREIGN KEY ("registrationId","studioId","eventId") REFERENCES "StudioEventRegistration"("id","studioId","eventId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "MusicTrack_performanceId_registrationId_studioId_eventId_fkey" FOREIGN KEY ("performanceId","registrationId","studioId","eventId") REFERENCES "Performance"("id","registrationId","studioId","eventId") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "MusicTrack_performanceId_key" ON "MusicTrack"("performanceId");
CREATE UNIQUE INDEX "MusicTrack_performanceId_registrationId_studioId_eventId_key" ON "MusicTrack"("performanceId","registrationId","studioId","eventId");
CREATE INDEX "MusicTrack_registrationId_studioId_eventId_idx" ON "MusicTrack"("registrationId","studioId","eventId");
CREATE TABLE "MusicVersion" (
  "id" UUID NOT NULL PRIMARY KEY, "trackId" UUID NOT NULL, "objectKey" TEXT NOT NULL, "sha256" TEXT NOT NULL,
  "displayName" TEXT NOT NULL, "detectedMime" TEXT NOT NULL, "byteLength" INTEGER NOT NULL, "durationMs" INTEGER NOT NULL,
  "uploadedBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MusicVersion_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "MusicTrack"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "MusicVersion_objectKey_key" ON "MusicVersion"("objectKey");
CREATE UNIQUE INDEX "MusicVersion_id_trackId_key" ON "MusicVersion"("id","trackId");
CREATE INDEX "MusicVersion_trackId_idx" ON "MusicVersion"("trackId");
ALTER TABLE "MusicTrack" ADD CONSTRAINT "MusicTrack_currentVersionId_id_fkey" FOREIGN KEY ("currentVersionId","id") REFERENCES "MusicVersion"("id","trackId") ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE TABLE "MusicOperation" (
  "operationId" UUID NOT NULL PRIMARY KEY, "trackId" UUID NOT NULL, "actorId" TEXT NOT NULL, "revision" INTEGER NOT NULL,
  "action" TEXT NOT NULL, "reason" TEXT, "digest" TEXT NOT NULL, "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MusicOperation_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "MusicTrack"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "MusicOperation_trackId_revision_key" ON "MusicOperation"("trackId","revision");
-- SQL-only guards
ALTER TABLE "MusicTrack" ADD CONSTRAINT "MusicTrack_state" CHECK (revision > 0 AND state IN ('DRAFT','CONFIRMED','ACCEPTED') AND (state = 'DRAFT' OR "currentVersionId" IS NOT NULL));
ALTER TABLE "MusicVersion" ADD CONSTRAINT "MusicVersion_metadata" CHECK ("byteLength" > 0 AND "durationMs" > 0 AND sha256 ~ '^[a-f0-9]{64}$' AND length("objectKey") BETWEEN 1 AND 500 AND length("displayName") BETWEEN 1 AND 255 AND "displayName" !~ '[[:cntrl:]/\\]' AND "detectedMime" ~ '^audio/[a-z0-9.+-]+$');
ALTER TABLE "MusicOperation" ADD CONSTRAINT "MusicOperation_values" CHECK (revision > 0 AND action IN ('ATTACH','REPLACE','CONFIRM','ACCEPT','REOPEN') AND ((action = 'REOPEN' AND reason IS NOT NULL AND length(trim(reason)) BETWEEN 1 AND 500) OR (action <> 'REOPEN' AND reason IS NULL)));
CREATE FUNCTION prevent_music_history_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Music history is immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER "MusicVersion_immutable" BEFORE UPDATE OR DELETE ON "MusicVersion" FOR EACH ROW EXECUTE FUNCTION prevent_music_history_change();
CREATE TRIGGER "MusicOperation_immutable" BEFORE UPDATE OR DELETE ON "MusicOperation" FOR EACH ROW EXECUTE FUNCTION prevent_music_history_change();
CREATE FUNCTION protect_music_track_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF (OLD.id,OLD."registrationId",OLD."studioId",OLD."eventId") IS DISTINCT FROM (NEW.id,NEW."registrationId",NEW."studioId",NEW."eventId") THEN RAISE EXCEPTION 'Music ownership is immutable' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "MusicTrack_identity" BEFORE UPDATE ON "MusicTrack" FOR EACH ROW EXECUTE FUNCTION protect_music_track_identity();
COMMIT;
