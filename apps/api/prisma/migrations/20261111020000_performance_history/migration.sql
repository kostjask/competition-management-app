BEGIN;
ALTER TABLE "Performance" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "PerformanceRevision" (
  "id" TEXT NOT NULL,
  "performanceId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "origin" TEXT NOT NULL,
  "actorId" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "snapshot" JSONB NOT NULL,
  CONSTRAINT "PerformanceRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PerformanceRevision_performanceId_revision_key" ON "PerformanceRevision"("performanceId", "revision");
CREATE INDEX "PerformanceRevision_actorId_idx" ON "PerformanceRevision"("actorId");
ALTER TABLE "PerformanceRevision" ADD CONSTRAINT "PerformanceRevision_performanceId_fkey" FOREIGN KEY ("performanceId") REFERENCES "Performance"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PerformanceRevision" ADD CONSTRAINT "PerformanceRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- SQL-only guards
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_action";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" CHECK (action IN ('ACCOUNT_REGISTERED','EMAIL_VERIFIED','EMAIL_CORRECTED','PASSWORD_RESET','TOKEN_ROTATED','INVITATION_CREATED','INVITATION_ACCEPTED','INVITATION_REVOKED','INVITATION_ROTATED','ACCESS_GRANTED','ACCESS_RECONCILED','ACCESS_REMOVED','STUDIO_APPROVAL_CHANGED','REGISTRATION_APPROVAL_CHANGED','IMAGE_REPLACED','SESSION_REVOKED','ONBOARDING_SAVED','ONBOARDING_CANCELLED','EVENT_UPDATED','REGISTRATION_CREATED','REGISTRATION_CORRECTED','REGISTRATION_CANCELLED','REGISTRATION_REAPPLIED','PERFORMANCE_CREATED','PERFORMANCE_UPDATED','PERFORMANCE_ARCHIVED'));
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_target_type";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_target_type" CHECK ("targetType" IN ('USER','INVITATION','USER_ROLE','STUDIO','REGISTRATION','EVENT','DANCER','PERFORMANCE'));
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_revision_positive" CHECK (revision > 0);
ALTER TABLE "PerformanceRevision" ADD CONSTRAINT "PerformanceRevision_provenance" CHECK (
  revision > 0 AND ((origin = 'LEGACY_BASELINE' AND "actorId" IS NULL) OR (origin IN ('CREATE', 'EDIT', 'ARCHIVE') AND "actorId" IS NOT NULL))
  AND jsonb_typeof(snapshot) = 'object' AND coalesce(snapshot->>'policyVersion' = '1', false)
);
CREATE FUNCTION capture_performance_revision(performance_id text, provenance text, actor_id text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "PerformanceRevision" (id, "performanceId", revision, origin, "actorId", "capturedAt", snapshot)
  SELECT gen_random_uuid()::text, p.id, p.revision, provenance, actor_id, CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
    jsonb_build_object(
      'policyVersion', 1, 'eventId', p."eventId", 'studioId', p."studioId", 'registrationId', p."registrationId",
      'studioName', s.name, 'title', p.title, 'durationSec', p."durationSec", 'orderOnStage', p."orderOnStage",
      'timeZone', e."timeZone", 'ageDate', to_char((e."startsAt" AT TIME ZONE 'UTC') AT TIME ZONE e."timeZone", 'YYYY-MM-DD'),
      'configuration', jsonb_build_object(
        'category', jsonb_build_object('id', c.id, 'name', c.name),
        'ageGroup', jsonb_build_object('id', a.id, 'name', a.name, 'minAge', a."minAge", 'maxAge', a."maxAge"),
        'format', jsonb_build_object('id', f.id, 'name', f.name, 'minParticipants', f."minParticipants", 'maxParticipants', f."maxParticipants", 'maxDurationSeconds', f."maxDurationSeconds")),
      'participants', coalesce((SELECT jsonb_agg(jsonb_build_object('dancerId', d.id, 'firstName', d."firstName", 'lastName', d."lastName", 'birthDate', to_char(d."birthDate", 'YYYY-MM-DD')) ORDER BY d.id)
        FROM "PerformanceParticipant" pp JOIN "Dancer" d ON d.id = pp."dancerId" WHERE pp."performanceId" = p.id), '[]'::jsonb),
      'archived', p."deletedAt" IS NOT NULL)
  FROM "Performance" p JOIN "Studio" s ON s.id = p."studioId" JOIN "Event" e ON e.id = p."eventId"
    JOIN "DanceCategory" c ON c.id = p."categoryId" JOIN "AgeGroup" a ON a.id = p."ageGroupId" JOIN "DanceFormat" f ON f.id = p."formatId"
  WHERE p.id = performance_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing performance for revision capture'; END IF;
END $$;
CREATE FUNCTION prevent_performance_revision_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Performance revisions are immutable' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER "PerformanceRevision_immutable" BEFORE UPDATE OR DELETE ON "PerformanceRevision" FOR EACH ROW EXECUTE FUNCTION prevent_performance_revision_change();
SELECT capture_performance_revision(id, 'LEGACY_BASELINE', NULL) FROM "Performance";
COMMIT;
