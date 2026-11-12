ALTER TABLE "Event"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "organizerEmail" TEXT,
  ADD COLUMN "organizerPhone" TEXT,
  ADD COLUMN "authoredDescription" JSONB;

-- Existing description is deliberately retained with unspecified language.
CREATE TABLE "ReviewNotification" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "revision" INTEGER NOT NULL,
  "deliveryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReviewNotification_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "StudioEventRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReviewNotification_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "EmailDelivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReviewNotification_registrationId_kind_revision_recipientId_key" ON "ReviewNotification"("registrationId", "kind", "revision", "recipientId");
CREATE INDEX "ReviewNotification_registrationId_createdAt_idx" ON "ReviewNotification"("registrationId", "createdAt");
