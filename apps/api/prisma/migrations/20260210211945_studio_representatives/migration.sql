/*
  Warnings:

  - The primary key for the `UserRole` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[eventId,orderOnStage]` on the table `Performance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,roleId,eventId]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `UserRole` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Dancer" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "StudioRepresentative" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioRepresentative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioEventRegistration" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioEventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioRepresentative_studioId_userId_key" ON "StudioRepresentative"("studioId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioEventRegistration_studioId_eventId_key" ON "StudioEventRegistration"("studioId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Performance_eventId_orderOnStage_key" ON "Performance"("eventId", "orderOnStage");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_eventId_key" ON "UserRole"("userId", "roleId", "eventId");

-- AddForeignKey
ALTER TABLE "StudioRepresentative" ADD CONSTRAINT "StudioRepresentative_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioRepresentative" ADD CONSTRAINT "StudioRepresentative_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioEventRegistration" ADD CONSTRAINT "StudioEventRegistration_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioEventRegistration" ADD CONSTRAINT "StudioEventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
