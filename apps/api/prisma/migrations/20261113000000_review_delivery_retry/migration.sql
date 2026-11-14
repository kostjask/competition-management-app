BEGIN;
ALTER TABLE "EmailDelivery"
  ADD COLUMN "reviewRecipientId" TEXT,
  ADD COLUMN "supersededAt" TIMESTAMP(3);
CREATE INDEX "EmailDelivery_reviewRecipientId_idx" ON "EmailDelivery"("reviewRecipientId");
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_reviewRecipientId_fkey"
  FOREIGN KEY ("reviewRecipientId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
-- SQL-only guards
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_review_retry_binding"
  CHECK (("reviewRecipientId" IS NULL OR "reviewNoticeId" IS NOT NULL)
    AND ("supersededAt" IS NULL OR ("reviewNoticeId" IS NOT NULL AND state = 'CANCELLED' AND ciphertext IS NULL)));
COMMIT;
