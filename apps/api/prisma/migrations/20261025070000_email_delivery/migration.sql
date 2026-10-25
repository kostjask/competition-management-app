BEGIN;
CREATE TABLE "EmailDelivery" (
  id TEXT NOT NULL, ciphertext TEXT, "bindingDigest" TEXT, purpose TEXT,
  state TEXT NOT NULL DEFAULT 'PENDING', attempts INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3), "providerId" TEXT,
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY (id)
);
CREATE INDEX "EmailDelivery_state_nextAttemptAt_idx" ON "EmailDelivery"(state, "nextAttemptAt");
-- SQL-only guards
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_state_check" CHECK (
  (state = 'PENDING' AND ciphertext IS NOT NULL AND "acceptedAt" IS NULL AND "providerId" IS NULL) OR
  (state = 'ACCEPTED' AND ciphertext IS NULL AND "acceptedAt" IS NOT NULL AND "providerId" IS NOT NULL) OR
  (state = 'CANCELLED' AND ciphertext IS NULL AND "acceptedAt" IS NULL AND "providerId" IS NULL)
);
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_attempts_check" CHECK (attempts >= 0 AND "expiresAt" > "createdAt");
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_binding_check" CHECK (
  (purpose IS NULL AND "bindingDigest" IS NULL) OR
  (purpose IS NOT NULL AND "bindingDigest" IS NOT NULL AND purpose IN ('VERIFY_EMAIL','PASSWORD_RECOVERY','INVITATION') AND "bindingDigest" ~ '^[0-9a-f]{64}$')
);
COMMIT;
