BEGIN;
ALTER TABLE "Studio" ADD COLUMN "approvalReason" TEXT;
CREATE TABLE "ReviewNotice" (
  id TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  revision INTEGER NOT NULL,
  axis TEXT NOT NULL,
  mode TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewNotice_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "ReviewNotice_registrationId_revision_axis_key" ON "ReviewNotice"("registrationId", revision, axis);
ALTER TABLE "ReviewNotice" ADD CONSTRAINT "ReviewNotice_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "StudioEventRegistration"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD COLUMN "reviewNoticeId" TEXT;
CREATE INDEX "EmailDelivery_reviewNoticeId_idx" ON "EmailDelivery"("reviewNoticeId");
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_reviewNoticeId_fkey" FOREIGN KEY ("reviewNoticeId") REFERENCES "ReviewNotice"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
-- SQL-only guards
ALTER TABLE "Studio" ADD CONSTRAINT "Studio_approval_reason" CHECK ("approvalReason" IS NULL OR ("approvalStatus" = 'REJECTED' AND "approvalReason" IN ('CONTACT_ORGANIZER','INCOMPLETE_DETAILS','INELIGIBLE','CAPACITY')));
ALTER TABLE "ReviewNotice" ADD CONSTRAINT "ReviewNotice_revision" CHECK (revision > 0);
ALTER TABLE "ReviewNotice" ADD CONSTRAINT "ReviewNotice_axis" CHECK (axis IN ('ORGANIZATION','EVENT'));
ALTER TABLE "ReviewNotice" ADD CONSTRAINT "ReviewNotice_mode" CHECK (mode IN ('QUEUED','SIMULATED','NO_RECIPIENT'));
COMMIT;
