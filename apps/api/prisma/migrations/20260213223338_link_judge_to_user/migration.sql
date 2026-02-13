/*
  Warnings:

  - You are about to drop the column `photoPath` on the `Judge` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `Judge` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,eventId]` on the table `Judge` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Judge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Judge" DROP COLUMN "photoPath",
DROP COLUMN "photoUrl",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photoPath" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Judge_userId_eventId_key" ON "Judge"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "Judge" ADD CONSTRAINT "Judge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
