-- CreateEnum
CREATE TYPE "StudioApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "Studio_name_key";

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "approvalStatus" "StudioApprovalStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Studio_name_active_unique" ON "Studio"("name") WHERE "deletedAt" IS NULL;
