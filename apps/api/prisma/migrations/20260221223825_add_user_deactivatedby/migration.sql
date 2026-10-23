-- Rename the enum in place so existing registration statuses and the column's
-- PENDING default are preserved. This migration is unpublished and disposable.
ALTER TYPE "RegistrationStatus" RENAME TO "EventRegistrationStatus";

-- AlterEnum
ALTER TYPE "EventStage" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Performance" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT;

-- AlterTable
ALTER TABLE "StudioRepresentative" ADD COLUMN     "deactivatedBy" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deactivatedBy" TEXT;
