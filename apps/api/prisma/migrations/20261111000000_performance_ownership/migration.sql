BEGIN;
LOCK TABLE "Event", "Studio", "StudioEventRegistration", "Dancer", "Performance", "PerformanceParticipant", "DanceCategory", "AgeGroup", "DanceFormat" IN SHARE ROW EXCLUSIVE MODE;
-- Audit all retained rows before changing identity. No first-participant inference.
DO $$ BEGIN
  IF EXISTS (
    SELECT p.id FROM "Performance" p
    LEFT JOIN "PerformanceParticipant" pp ON pp."performanceId" = p.id
    LEFT JOIN "Dancer" d ON d.id = pp."dancerId"
    LEFT JOIN "Studio" s ON s.id = d."studioId" AND s."eventId" = p."eventId"
    LEFT JOIN "StudioEventRegistration" r ON r."studioId" = s.id AND r."eventId" = p."eventId"
    GROUP BY p.id
    HAVING count(pp."dancerId") = 0 OR count(DISTINCT d."studioId") <> 1
       OR count(r.id) <> count(pp."dancerId")
  ) THEN RAISE EXCEPTION 'Performance ownership requires reviewed repair: empty, mixed, missing registration or inconsistent event'; END IF;
END $$;
-- DropForeignKey
ALTER TABLE "Performance" DROP CONSTRAINT "Performance_ageGroupId_fkey";

-- DropForeignKey
ALTER TABLE "Performance" DROP CONSTRAINT "Performance_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Performance" DROP CONSTRAINT "Performance_formatId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceParticipant" DROP CONSTRAINT "PerformanceParticipant_dancerId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceParticipant" DROP CONSTRAINT "PerformanceParticipant_performanceId_fkey";

-- AlterTable
ALTER TABLE "Performance" ADD COLUMN     "registrationId" TEXT,
ADD COLUMN     "studioId" TEXT;

-- AlterTable
ALTER TABLE "PerformanceParticipant" ADD COLUMN     "studioId" TEXT;

-- Every candidate was proven unique above; preserve IDs, participants and scores.
UPDATE "Performance" p SET "studioId" = owners."studioId", "registrationId" = owners."registrationId"
FROM (SELECT pp."performanceId", min(d."studioId") AS "studioId", min(r.id) AS "registrationId"
      FROM "PerformanceParticipant" pp JOIN "Dancer" d ON d.id = pp."dancerId"
      JOIN "Performance" p ON p.id = pp."performanceId"
      JOIN "StudioEventRegistration" r ON r."studioId" = d."studioId" AND r."eventId" = p."eventId"
      GROUP BY pp."performanceId") owners WHERE owners."performanceId" = p.id;
UPDATE "PerformanceParticipant" pp SET "studioId" = p."studioId" FROM "Performance" p WHERE p.id = pp."performanceId";
ALTER TABLE "Performance" ALTER COLUMN "studioId" SET NOT NULL, ALTER COLUMN "registrationId" SET NOT NULL;
ALTER TABLE "PerformanceParticipant" ALTER COLUMN "studioId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DanceCategory_id_eventId_key" ON "DanceCategory"("id", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "AgeGroup_id_eventId_key" ON "AgeGroup"("id", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "DanceFormat_id_eventId_key" ON "DanceFormat"("id", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioEventRegistration_id_studioId_eventId_key" ON "StudioEventRegistration"("id", "studioId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Dancer_id_studioId_key" ON "Dancer"("id", "studioId");

-- CreateIndex
CREATE UNIQUE INDEX "Performance_id_studioId_key" ON "Performance"("id", "studioId");

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_studioId_eventId_fkey" FOREIGN KEY ("studioId", "eventId") REFERENCES "Studio"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_registrationId_studioId_eventId_fkey" FOREIGN KEY ("registrationId", "studioId", "eventId") REFERENCES "StudioEventRegistration"("id", "studioId", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_ageGroupId_eventId_fkey" FOREIGN KEY ("ageGroupId", "eventId") REFERENCES "AgeGroup"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_categoryId_eventId_fkey" FOREIGN KEY ("categoryId", "eventId") REFERENCES "DanceCategory"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_formatId_eventId_fkey" FOREIGN KEY ("formatId", "eventId") REFERENCES "DanceFormat"("id", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PerformanceParticipant" ADD CONSTRAINT "PerformanceParticipant_dancerId_studioId_fkey" FOREIGN KEY ("dancerId", "studioId") REFERENCES "Dancer"("id", "studioId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PerformanceParticipant" ADD CONSTRAINT "PerformanceParticipant_performanceId_studioId_fkey" FOREIGN KEY ("performanceId", "studioId") REFERENCES "Performance"("id", "studioId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- SQL-only guards
ALTER TABLE "Event" ADD CONSTRAINT "Event_date_order" CHECK ("startsAt" <= "endsAt");
ALTER TABLE "Event" ADD CONSTRAINT "Event_limits_positive" CHECK (("maxStudios" IS NULL OR "maxStudios" > 0) AND ("maxPerformances" IS NULL OR "maxPerformances" > 0));
ALTER TABLE "AgeGroup" ADD CONSTRAINT "AgeGroup_bounds" CHECK ("minAge" >= 0 AND ("maxAge" IS NULL OR "maxAge" >= "minAge"));
ALTER TABLE "DanceFormat" ADD CONSTRAINT "DanceFormat_bounds" CHECK ("minParticipants" > 0 AND "maxParticipants" >= "minParticipants" AND "maxDurationSeconds" > 0);
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_positive" CHECK ("durationSec" > 0 AND "orderOnStage" > 0);
CREATE FUNCTION prevent_performance_owner_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."studioId", NEW."registrationId", NEW."eventId") IS DISTINCT FROM (OLD."studioId", OLD."registrationId", OLD."eventId") THEN
    RAISE EXCEPTION 'Performance ownership is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Performance_owner_immutable" BEFORE UPDATE ON "Performance" FOR EACH ROW EXECUTE FUNCTION prevent_performance_owner_change();
COMMIT;
