-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "directorName" TEXT,
ADD COLUMN     "directorPhone" TEXT,
ADD COLUMN     "invoiceDetails" JSONB;

-- AlterTable
ALTER TABLE "StudioRepresentative" ADD COLUMN     "email" TEXT,
ADD COLUMN     "name" TEXT;
