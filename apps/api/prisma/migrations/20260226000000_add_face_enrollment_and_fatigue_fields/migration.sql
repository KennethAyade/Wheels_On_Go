-- Face enrollment fields on DriverProfile
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "faceEnrolledAt" TIMESTAMP(3);
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "enrolledFaceKey" TEXT;

-- Fatigue detection gating fields on DriverProfile
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "lastFatigueCheckAt" TIMESTAMP(3);
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "lastFatigueLevel" "FatigueLevel";
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "fatigueCooldownUntil" TIMESTAMP(3);

-- Extended fields on FatigueDetectionLog
ALTER TABLE "FatigueDetectionLog" ADD COLUMN IF NOT EXISTS "geminiRawResponse" TEXT;
ALTER TABLE "FatigueDetectionLog" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
ALTER TABLE "FatigueDetectionLog" ADD COLUMN IF NOT EXISTS "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "FatigueDetectionLog" ADD COLUMN IF NOT EXISTS "cooldownMinutes" INTEGER;
