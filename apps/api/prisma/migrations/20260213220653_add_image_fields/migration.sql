-- AlterEnum
ALTER TYPE "EventStage" ADD VALUE 'ENDED';

-- AlterTable
ALTER TABLE "Dancer" ADD COLUMN     "photoPath" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "imagePath" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "maxStudios" INTEGER;

-- AlterTable
ALTER TABLE "Judge" ADD COLUMN     "photoPath" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "logoPath" TEXT,
ADD COLUMN     "logoUrl" TEXT;
