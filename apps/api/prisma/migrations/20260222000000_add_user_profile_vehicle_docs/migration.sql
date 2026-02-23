-- AddColumn: User.age, User.address, RiderVehicle.orStorageKey, RiderVehicle.crStorageKey
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "age" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "RiderVehicle" ADD COLUMN IF NOT EXISTS "orStorageKey" TEXT;
ALTER TABLE "RiderVehicle" ADD COLUMN IF NOT EXISTS "crStorageKey" TEXT;
