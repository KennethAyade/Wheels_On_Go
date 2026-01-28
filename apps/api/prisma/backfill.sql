-- ============================================
-- BACKFILL SCRIPT FOR EXISTING DATA
-- ============================================
-- This script updates existing records with default values
-- for new fields added in the complete ride-sharing schema.
-- Run this AFTER applying the migration.

-- ============================================
-- USER MODEL - Add default values for new fields
-- ============================================

-- Set isActive to true for all existing users
UPDATE "User"
SET "isActive" = true
WHERE "isActive" IS NULL;

-- Set isSuspended to false for all existing users
UPDATE "User"
SET "isSuspended" = false
WHERE "isSuspended" IS NULL;

-- Set averageRating to 0 for all existing users
UPDATE "User"
SET "averageRating" = 0
WHERE "averageRating" IS NULL;

-- Set totalRatings to 0 for all existing users
UPDATE "User"
SET "totalRatings" = 0
WHERE "totalRatings" IS NULL;

-- ============================================
-- DRIVER PROFILE MODEL - Add default values for new fields
-- ============================================

-- Set isOnline to false for all existing drivers
UPDATE "DriverProfile"
SET "isOnline" = false
WHERE "isOnline" IS NULL;

-- Set acceptanceRate to 0 for all existing drivers
UPDATE "DriverProfile"
SET "acceptanceRate" = 0
WHERE "acceptanceRate" IS NULL;

-- Set completionRate to 0 for all existing drivers
UPDATE "DriverProfile"
SET "completionRate" = 0
WHERE "completionRate" IS NULL;

-- Set cancellationRate to 0 for all existing drivers
UPDATE "DriverProfile"
SET "cancellationRate" = 0
WHERE "cancellationRate" IS NULL;

-- Set totalRides to 0 for all existing drivers
UPDATE "DriverProfile"
SET "totalRides" = 0
WHERE "totalRides" IS NULL;

-- Set totalEarnings to 0 for all existing drivers
UPDATE "DriverProfile"
SET "totalEarnings" = 0
WHERE "totalEarnings" IS NULL;

-- Set walletBalance to 0 for all existing drivers
UPDATE "DriverProfile"
SET "walletBalance" = 0
WHERE "walletBalance" IS NULL;

-- Set commissionRate to 0.20 (20%) for all existing drivers
UPDATE "DriverProfile"
SET "commissionRate" = 0.20
WHERE "commissionRate" IS NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify User backfill
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE "isActive" = true) AS active_users,
  COUNT(*) FILTER (WHERE "isSuspended" = false) AS non_suspended_users,
  COUNT(*) FILTER (WHERE "averageRating" = 0) AS users_with_zero_rating
FROM "User";

-- Verify DriverProfile backfill
SELECT
  COUNT(*) AS total_drivers,
  COUNT(*) FILTER (WHERE "isOnline" = false) AS offline_drivers,
  COUNT(*) FILTER (WHERE "commissionRate" = 0.20) AS drivers_with_default_commission
FROM "DriverProfile";

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- 1. Existing User records:
--    - All users now have isActive=true, isSuspended=false
--    - All users start with averageRating=0, totalRatings=0
--    - These values will update as rides are completed and rated

-- 2. Existing DriverProfile records:
--    - All drivers start offline (isOnline=false)
--    - All drivers have default 20% commission rate
--    - Location fields (currentLatitude, currentLongitude) remain NULL until driver goes online
--    - Metrics (acceptanceRate, completionRate, etc.) start at 0 and update over time

-- 3. New Relations:
--    - No backfill needed for new relations (Ride, Vehicle, RiderProfile, etc.)
--    - These will be created as users interact with the new features

-- 4. Unique Constraints:
--    - User.email: No backfill needed (NULL values allowed)
--    - DriverProfile.licenseNumber: No backfill needed (NULL values allowed)
--    - These will be filled in as drivers complete their profiles

-- ============================================
-- POST-BACKFILL ACTIONS
-- ============================================

-- 1. Generate Prisma client
--    cd apps/api && npx prisma generate

-- 2. Restart API server
--    npm run dev:api  (development)
--    npm run start:api (production)

-- 3. Verify API health
--    curl http://localhost:3000/health

-- 4. Test existing auth flow
--    POST /auth/request-otp
--    POST /auth/verify-otp
--    GET /auth/me

-- 5. Monitor logs for any migration-related errors
