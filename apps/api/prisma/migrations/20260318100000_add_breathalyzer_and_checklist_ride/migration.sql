-- AlterTable: Add breathalyzer cooldown to DriverProfile
ALTER TABLE "DriverProfile" ADD COLUMN "breathalyzerCooldownUntil" TIMESTAMP(3);

-- AlterTable: Add breathalyzer fields and rideId to BlowbagetsChecklist
ALTER TABLE "BlowbagetsChecklist" ADD COLUMN "rideId" TEXT;
ALTER TABLE "BlowbagetsChecklist" ADD COLUMN "breathalyzerImageKey" TEXT;
ALTER TABLE "BlowbagetsChecklist" ADD COLUMN "breathalyzerMimeType" TEXT;
ALTER TABLE "BlowbagetsChecklist" ADD COLUMN "breathalyzerVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BlowbagetsChecklist" ADD COLUMN "breathalyzerBacReading" DOUBLE PRECISION;
ALTER TABLE "BlowbagetsChecklist" ADD COLUMN "breathalyzerResult" TEXT;
ALTER TABLE "BlowbagetsChecklist" ADD COLUMN "breathalyzerAiDetails" TEXT;

-- CreateIndex
CREATE INDEX "BlowbagetsChecklist_rideId_idx" ON "BlowbagetsChecklist"("rideId");
