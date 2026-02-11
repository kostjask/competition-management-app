/*
  Warnings:

  - Made the column `city` on table `Studio` required. This step will fail if there are existing NULL values in that column.
  - Made the column `country` on table `Studio` required. This step will fail if there are existing NULL values in that column.
  - Made the column `directorName` on table `Studio` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `StudioRepresentative` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `StudioRepresentative` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EventStage" AS ENUM ('PRE_REGISTRATION', 'REGISTRATION_OPEN', 'DATA_REVIEW', 'FINALIZED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "stage" "EventStage" NOT NULL DEFAULT 'PRE_REGISTRATION';

-- AlterTable
ALTER TABLE "Studio" ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "directorName" SET NOT NULL;

-- AlterTable
ALTER TABLE "StudioEventRegistration" ADD COLUMN     "canEditDuringReview" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StudioRepresentative" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL;
