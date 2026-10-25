-- ADR-010: deliberately invalidate legacy links; never retain raw secrets.
BEGIN;
LOCK TABLE "User", "Invitation" IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE "User" DROP COLUMN "verificationToken";
ALTER TABLE "Invitation" DROP COLUMN "token";
ALTER TABLE "Invitation" ADD COLUMN "tokenDigest" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "revokedAt" TIMESTAMP(3);
UPDATE "Invitation" SET "revokedAt" = CURRENT_TIMESTAMP, "supersededAt" = CURRENT_TIMESTAMP WHERE "usedAt" IS NULL AND "supersededAt" IS NULL;
CREATE UNIQUE INDEX "Invitation_tokenDigest_key" ON "Invitation"("tokenDigest");
CREATE TYPE "AccountTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'PASSWORD_RECOVERY');
CREATE TABLE "AccountToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" "AccountTokenPurpose" NOT NULL,
  "digest" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountToken_digest_key" ON "AccountToken"("digest");
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "AccountToken_outstanding_unique" ON "AccountToken" ("userId", "purpose") WHERE "consumedAt" IS NULL AND "revokedAt" IS NULL;
COMMIT;
