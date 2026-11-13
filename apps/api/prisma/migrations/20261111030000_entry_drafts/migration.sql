BEGIN;
ALTER TABLE "Performance" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE "Performance" ALTER COLUMN "durationSec" DROP NOT NULL;
ALTER TABLE "Performance" ALTER COLUMN "orderOnStage" DROP NOT NULL;
ALTER TABLE "Performance" ALTER COLUMN "categoryId" DROP NOT NULL;
ALTER TABLE "Performance" ALTER COLUMN "ageGroupId" DROP NOT NULL;
ALTER TABLE "Performance" ALTER COLUMN "formatId" DROP NOT NULL;
ALTER TABLE "Performance" ADD COLUMN "creationOperationId" UUID, ADD COLUMN "creationDigest" TEXT;
CREATE UNIQUE INDEX "Performance_creationOperationId_key" ON "Performance"("creationOperationId");
-- SQL-only guards
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_creation_metadata" CHECK (("creationOperationId" IS NULL AND "creationDigest" IS NULL) OR ("creationOperationId" IS NOT NULL AND "creationDigest" IS NOT NULL AND "creationDigest" ~ '^[0-9a-f]{64}$'));
ALTER TABLE "PerformanceRevision" DROP CONSTRAINT "PerformanceRevision_provenance";
ALTER TABLE "PerformanceRevision" ADD CONSTRAINT "PerformanceRevision_provenance" CHECK (
  revision > 0 AND ((origin = 'LEGACY_BASELINE' AND "actorId" IS NULL) OR (origin IN ('CREATE', 'EDIT', 'ARCHIVE') AND "actorId" IS NOT NULL))
  AND jsonb_typeof(snapshot) = 'object' AND coalesce(snapshot->>'policyVersion' IN ('1', '2'), false)
);
CREATE OR REPLACE FUNCTION capture_performance_revision(performance_id text, provenance text, actor_id text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "PerformanceRevision" (id, "performanceId", revision, origin, "actorId", "capturedAt", snapshot)
  SELECT gen_random_uuid()::text, p.id, p.revision, provenance, actor_id, CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
    jsonb_build_object(
      'policyVersion', 2, 'eventId', p."eventId", 'studioId', p."studioId", 'registrationId', p."registrationId",
      'studioName', s.name, 'title', p.title, 'durationSec', p."durationSec", 'orderOnStage', p."orderOnStage",
      'timeZone', e."timeZone", 'ageDate', to_char((e."startsAt" AT TIME ZONE 'UTC') AT TIME ZONE e."timeZone", 'YYYY-MM-DD'),
      'configuration', jsonb_build_object(
        'category', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('id', c.id, 'name', c.name) END,
        'ageGroup', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object('id', a.id, 'name', a.name, 'minAge', a."minAge", 'maxAge', a."maxAge") END,
        'format', CASE WHEN f.id IS NULL THEN NULL ELSE jsonb_build_object('id', f.id, 'name', f.name, 'minParticipants', f."minParticipants", 'maxParticipants', f."maxParticipants", 'maxDurationSeconds', f."maxDurationSeconds") END),
      'participants', coalesce((SELECT jsonb_agg(jsonb_build_object('dancerId', d.id, 'firstName', d."firstName", 'lastName', d."lastName", 'birthDate', to_char(d."birthDate", 'YYYY-MM-DD')) ORDER BY d.id)
        FROM "PerformanceParticipant" pp JOIN "Dancer" d ON d.id = pp."dancerId" WHERE pp."performanceId" = p.id), '[]'::jsonb),
      'archived', p."deletedAt" IS NOT NULL)
  FROM "Performance" p JOIN "Studio" s ON s.id = p."studioId" JOIN "Event" e ON e.id = p."eventId"
    LEFT JOIN "DanceCategory" c ON c.id = p."categoryId" LEFT JOIN "AgeGroup" a ON a.id = p."ageGroupId" LEFT JOIN "DanceFormat" f ON f.id = p."formatId"
  WHERE p.id = performance_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing performance for revision capture'; END IF;
END $$;
COMMIT;
