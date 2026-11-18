BEGIN;
CREATE TABLE "ApplicationEstimateRevision" (
  "id" UUID NOT NULL PRIMARY KEY,
  "registrationId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "eventRevision" INTEGER NOT NULL,
  "timeZone" TEXT NOT NULL,
  "counts" JSONB NOT NULL,
  "source" TEXT NOT NULL,
  "reason" TEXT,
  "operationId" UUID NOT NULL,
  "actorId" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationEstimateRevision_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "StudioEventRegistration"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "ApplicationEstimateRevision_operationId_key" ON "ApplicationEstimateRevision"("operationId");
CREATE UNIQUE INDEX "ApplicationEstimateRevision_registrationId_revision_key" ON "ApplicationEstimateRevision"("registrationId", "revision");
-- SQL-only guards
ALTER TABLE "ApplicationEstimateRevision" ADD CONSTRAINT "ApplicationEstimateRevision_values" CHECK (revision > 0 AND "eventRevision" > 0 AND source IN ('APPLICANT','ORGANIZER') AND jsonb_typeof(counts) = 'array' AND jsonb_array_length(counts) BETWEEN 1 AND 366 AND (reason IS NULL OR length(trim(reason)) BETWEEN 1 AND 500));
CREATE FUNCTION prevent_application_estimate_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Application estimates are immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER "ApplicationEstimateRevision_immutable" BEFORE UPDATE OR DELETE ON "ApplicationEstimateRevision" FOR EACH ROW EXECUTE FUNCTION prevent_application_estimate_change();
COMMIT;
