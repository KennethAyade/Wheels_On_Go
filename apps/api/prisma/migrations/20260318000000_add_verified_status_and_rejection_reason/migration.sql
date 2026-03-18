-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'VERIFIED';

-- AlterTable
ALTER TABLE "DriverDocument" ADD COLUMN "rejectionReason" TEXT;
