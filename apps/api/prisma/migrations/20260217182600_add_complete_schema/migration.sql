-- Migration: Add Complete Phase 2-7 Schema
-- This migration adds all missing tables, columns, and enums to the existing Phase 1 database

-- ============================================
-- 1. CREATE NEW ENUMS
-- ============================================

CREATE TYPE "RideType" AS ENUM ('INSTANT', 'SCHEDULED');
CREATE TYPE "RideStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED_BY_RIDER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_SYSTEM', 'EXPIRED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'GCASH', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE "TransactionType" AS ENUM ('RIDE_PAYMENT', 'DRIVER_EARNING', 'DRIVER_PAYOUT', 'REFUND', 'COMMISSION', 'SUBSCRIPTION_FEE', 'PROMO_CREDIT', 'WALLET_TOPUP');
CREATE TYPE "ReportPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "FatigueLevel" AS ENUM ('NORMAL', 'MILD', 'MODERATE', 'SEVERE');
CREATE TYPE "SosIncidentType" AS ENUM ('EMERGENCY', 'ACCIDENT', 'HARASSMENT', 'VEHICLE_BREAKDOWN', 'OTHER');
CREATE TYPE "SosIncidentStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'FALSE_ALARM');
CREATE TYPE "GeofenceEventType" AS ENUM ('DRIVER_APPROACHING_PICKUP', 'DRIVER_ARRIVED_PICKUP', 'DRIVER_LEFT_PICKUP', 'DRIVER_APPROACHING_DROPOFF', 'DRIVER_ARRIVED_DROPOFF');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'SYSTEM', 'AUTOMATED');
CREATE TYPE "NotificationType" AS ENUM ('DRIVER_FOUND', 'DRIVER_ARRIVED', 'RIDE_STARTED', 'RIDE_COMPLETED', 'PAYMENT_RECEIVED', 'RATING_REQUEST', 'PROMO_AVAILABLE', 'SUBSCRIPTION_EXPIRING', 'SOS_ALERT', 'SYSTEM_ANNOUNCEMENT');
CREATE TYPE "TicketCategory" AS ENUM ('RIDE_ISSUE', 'PAYMENT_ISSUE', 'DRIVER_BEHAVIOR', 'APP_BUG', 'ACCOUNT_ISSUE', 'SAFETY_CONCERN', 'OTHER');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');
CREATE TYPE "ConfigValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');
CREATE TYPE "VehicleType" AS ENUM ('SEDAN', 'SUV', 'HATCHBACK', 'VAN', 'MOTORCYCLE');

-- ============================================
-- 2. MODIFY EXISTING ENUMS
-- ============================================

-- Add SUSPENDED to DriverStatus
ALTER TYPE "DriverStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- Remove ORCR from DriverDocumentType (PostgreSQL doesn't support removing enum values directly,
-- but we can ignore this as the code no longer uses ORCR)

-- ============================================
-- 3. ALTER USER TABLE - Add new columns
-- ============================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalRatings" INTEGER NOT NULL DEFAULT 0;

-- Add unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Add indexes
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_isActive_isSuspended_idx" ON "User"("isActive", "isSuspended");

-- ============================================
-- 4. ALTER DRIVERPROFILE TABLE - Add new columns
-- ============================================

ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "licenseExpiryDate" TIMESTAMP(3);
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "lastOnlineAt" TIMESTAMP(3);
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "currentLatitude" DOUBLE PRECISION;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "currentLongitude" DOUBLE PRECISION;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "currentLocationUpdatedAt" TIMESTAMP(3);
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "acceptanceRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "completionRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "cancellationRate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "totalRides" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "totalEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "walletBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "DriverProfile" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20;

-- Add unique constraint and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "DriverProfile_licenseNumber_key" ON "DriverProfile"("licenseNumber");
CREATE INDEX IF NOT EXISTS "DriverProfile_status_isOnline_idx" ON "DriverProfile"("status", "isOnline");
CREATE INDEX IF NOT EXISTS "DriverProfile_currentLatitude_currentLongitude_idx" ON "DriverProfile"("currentLatitude", "currentLongitude");
CREATE INDEX IF NOT EXISTS "DriverProfile_licenseNumber_idx" ON "DriverProfile"("licenseNumber");

-- ============================================
-- 5. CREATE NEW TABLES
-- ============================================

-- RefreshToken
CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "deviceInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_revokedAt_idx" ON "RefreshToken"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- Vehicle (Driver's vehicle)
CREATE TABLE IF NOT EXISTS "Vehicle" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "registrationExpiry" TIMESTAMP(3) NOT NULL,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "seatingCapacity" INTEGER NOT NULL DEFAULT 4,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'SEDAN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_driverProfileId_key" ON "Vehicle"("driverProfileId");
CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_registrationNumber_key" ON "Vehicle"("registrationNumber");
CREATE INDEX IF NOT EXISTS "Vehicle_plateNumber_idx" ON "Vehicle"("plateNumber");
CREATE INDEX IF NOT EXISTS "Vehicle_driverProfileId_isActive_idx" ON "Vehicle"("driverProfileId", "isActive");

-- RiderProfile
CREATE TABLE IF NOT EXISTS "RiderProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT,
    "subscriptionStartDate" TIMESTAMP(3),
    "subscriptionEndDate" TIMESTAMP(3),
    "defaultPaymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RiderProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RiderProfile_userId_key" ON "RiderProfile"("userId");

-- EmergencyContact
CREATE TABLE IF NOT EXISTS "EmergencyContact" (
    "id" TEXT NOT NULL,
    "riderProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '+63',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmergencyContact_riderProfileId_isPrimary_idx" ON "EmergencyContact"("riderProfileId", "isPrimary");

-- SavedLocation
CREATE TABLE IF NOT EXISTS "SavedLocation" (
    "id" TEXT NOT NULL,
    "riderProfileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "placeId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedLocation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SavedLocation_riderProfileId_isDefault_idx" ON "SavedLocation"("riderProfileId", "isDefault");

-- RiderPreference
CREATE TABLE IF NOT EXISTS "RiderPreference" (
    "id" TEXT NOT NULL,
    "riderProfileId" TEXT NOT NULL,
    "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allowSharedRides" BOOLEAN NOT NULL DEFAULT false,
    "preferredVehicleTypes" TEXT[],
    "shareLocationWithDriver" BOOLEAN NOT NULL DEFAULT true,
    "allowDriverContact" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RiderPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RiderPreference_riderProfileId_key" ON "RiderPreference"("riderProfileId");

-- RiderVehicle
CREATE TABLE IF NOT EXISTS "RiderVehicle" (
    "id" TEXT NOT NULL,
    "riderProfileId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'SEDAN',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RiderVehicle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RiderVehicle_plateNumber_key" ON "RiderVehicle"("plateNumber");
CREATE INDEX IF NOT EXISTS "RiderVehicle_riderProfileId_isDefault_idx" ON "RiderVehicle"("riderProfileId", "isDefault");
CREATE INDEX IF NOT EXISTS "RiderVehicle_plateNumber_idx" ON "RiderVehicle"("plateNumber");

-- SubscriptionPlan (needed before RiderProfile FK)
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "discountPercentage" DOUBLE PRECISION NOT NULL,
    "maxRidesPerMonth" INTEGER,
    "priorityDispatch" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

-- PromoCode
CREATE TABLE IF NOT EXISTS "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "minRideFare" DECIMAL(10,2),
    "maxDiscount" DECIMAL(10,2),
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "maxUsageCount" INTEGER,
    "maxUsagePerUser" INTEGER NOT NULL DEFAULT 1,
    "currentUsageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicableToRideTypes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX IF NOT EXISTS "PromoCode_code_isActive_idx" ON "PromoCode"("code", "isActive");
CREATE INDEX IF NOT EXISTS "PromoCode_validFrom_validUntil_idx" ON "PromoCode"("validFrom", "validUntil");

-- Ride
CREATE TABLE IF NOT EXISTS "Ride" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "driverId" TEXT,
    "driverProfileId" TEXT,
    "rideType" "RideType" NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'PENDING',
    "pickupLatitude" DOUBLE PRECISION NOT NULL,
    "pickupLongitude" DOUBLE PRECISION NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupPlaceId" TEXT,
    "dropoffLatitude" DOUBLE PRECISION NOT NULL,
    "dropoffLongitude" DOUBLE PRECISION NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "dropoffPlaceId" TEXT,
    "scheduledPickupTime" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "driverArrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "estimatedDistance" DOUBLE PRECISION,
    "estimatedDuration" INTEGER,
    "estimatedFare" DECIMAL(10,2),
    "actualDistance" DOUBLE PRECISION,
    "actualDuration" INTEGER,
    "baseFare" DECIMAL(10,2) NOT NULL,
    "costPerKm" DECIMAL(10,2) NOT NULL,
    "costPerMin" DECIMAL(10,2) NOT NULL,
    "surgePricing" DECIMAL(10,2),
    "promoDiscount" DECIMAL(10,2),
    "totalFare" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "promoCodeId" TEXT,
    "vehicleId" TEXT,
    "riderVehicleId" TEXT,
    "driverSearchRadius" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "maxDriverSearchAttempts" INTEGER NOT NULL DEFAULT 10,
    "driverSearchAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Ride_riderId_status_createdAt_idx" ON "Ride"("riderId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Ride_driverId_status_createdAt_idx" ON "Ride"("driverId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Ride_status_createdAt_idx" ON "Ride"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Ride_scheduledPickupTime_idx" ON "Ride"("scheduledPickupTime");
CREATE INDEX IF NOT EXISTS "Ride_pickupLatitude_pickupLongitude_idx" ON "Ride"("pickupLatitude", "pickupLongitude");
CREATE INDEX IF NOT EXISTS "Ride_rideType_status_idx" ON "Ride"("rideType", "status");

-- DispatchAttempt
CREATE TABLE IF NOT EXISTS "DispatchAttempt" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "declineReason" TEXT,
    "driverLatitude" DOUBLE PRECISION NOT NULL,
    "driverLongitude" DOUBLE PRECISION NOT NULL,
    "distanceToPickup" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "DispatchAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DispatchAttempt_rideId_sentAt_idx" ON "DispatchAttempt"("rideId", "sentAt");
CREATE INDEX IF NOT EXISTS "DispatchAttempt_driverProfileId_sentAt_idx" ON "DispatchAttempt"("driverProfileId", "sentAt");

-- RideRoute
CREATE TABLE IF NOT EXISTS "RideRoute" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "encodedPolyline" TEXT NOT NULL,
    "distanceMeters" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "currentEta" INTEGER,
    "etaUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RideRoute_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RideRoute_rideId_key" ON "RideRoute"("rideId");

-- UserPromoUsage
CREATE TABLE IF NOT EXISTS "UserPromoUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "UserPromoUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserPromoUsage_userId_idx" ON "UserPromoUsage"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPromoUsage_userId_promoCodeId_key" ON "UserPromoUsage"("userId", "promoCodeId");

-- SurgePricingLog
CREATE TABLE IF NOT EXISTS "SurgePricingLog" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "surgeMultiplier" DOUBLE PRECISION NOT NULL,
    "activeRideCount" INTEGER NOT NULL,
    "availableDriverCount" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurgePricingLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurgePricingLog_latitude_longitude_calculatedAt_idx" ON "SurgePricingLog"("latitude", "longitude", "calculatedAt");

-- DriverLocationHistory
CREATE TABLE IF NOT EXISTS "DriverLocationHistory" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverLocationHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DriverLocationHistory_driverProfileId_recordedAt_idx" ON "DriverLocationHistory"("driverProfileId", "recordedAt");
CREATE INDEX IF NOT EXISTS "DriverLocationHistory_latitude_longitude_recordedAt_idx" ON "DriverLocationHistory"("latitude", "longitude", "recordedAt");

-- GeofenceEvent
CREATE TABLE IF NOT EXISTS "GeofenceEvent" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "eventType" "GeofenceEventType" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeofenceEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GeofenceEvent_rideId_triggeredAt_idx" ON "GeofenceEvent"("rideId", "triggeredAt");

-- FatigueDetectionLog
CREATE TABLE IF NOT EXISTS "FatigueDetectionLog" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "leftEyeProbability" DOUBLE PRECISION NOT NULL,
    "rightEyeProbability" DOUBLE PRECISION NOT NULL,
    "avgEyeProbability" DOUBLE PRECISION NOT NULL,
    "isFatigued" BOOLEAN NOT NULL DEFAULT false,
    "fatigueLevel" "FatigueLevel" NOT NULL,
    "isOnRide" BOOLEAN NOT NULL DEFAULT false,
    "currentRideId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FatigueDetectionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FatigueDetectionLog_driverProfileId_detectedAt_idx" ON "FatigueDetectionLog"("driverProfileId", "detectedAt");
CREATE INDEX IF NOT EXISTS "FatigueDetectionLog_isFatigued_detectedAt_idx" ON "FatigueDetectionLog"("isFatigued", "detectedAt");

-- SosIncident
CREATE TABLE IF NOT EXISTS "SosIncident" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rideId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "incidentType" "SosIncidentType" NOT NULL,
    "description" TEXT,
    "status" "SosIncidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "emergencyContactsNotified" TEXT[],
    "notifiedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "responderUserId" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SosIncident_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SosIncident_rideId_key" ON "SosIncident"("rideId");
CREATE INDEX IF NOT EXISTS "SosIncident_userId_createdAt_idx" ON "SosIncident"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SosIncident_status_createdAt_idx" ON "SosIncident"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SosIncident_rideId_idx" ON "SosIncident"("rideId");

-- BlowbagetsChecklist
CREATE TABLE IF NOT EXISTS "BlowbagetsChecklist" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "brakes" BOOLEAN NOT NULL DEFAULT false,
    "lights" BOOLEAN NOT NULL DEFAULT false,
    "oil" BOOLEAN NOT NULL DEFAULT false,
    "water" BOOLEAN NOT NULL DEFAULT false,
    "battery" BOOLEAN NOT NULL DEFAULT false,
    "air" BOOLEAN NOT NULL DEFAULT false,
    "gas" BOOLEAN NOT NULL DEFAULT false,
    "engine" BOOLEAN NOT NULL DEFAULT false,
    "tools" BOOLEAN NOT NULL DEFAULT false,
    "self" BOOLEAN NOT NULL DEFAULT false,
    "allItemsChecked" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BlowbagetsChecklist_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BlowbagetsChecklist_driverProfileId_completedAt_idx" ON "BlowbagetsChecklist"("driverProfileId", "completedAt");
CREATE INDEX IF NOT EXISTS "BlowbagetsChecklist_expiresAt_idx" ON "BlowbagetsChecklist"("expiresAt");

-- RiderPaymentMethod
CREATE TABLE IF NOT EXISTS "RiderPaymentMethod" (
    "id" TEXT NOT NULL,
    "riderProfileId" TEXT NOT NULL,
    "type" "PaymentMethod" NOT NULL,
    "cardLast4" TEXT,
    "cardBrand" TEXT,
    "cardToken" TEXT,
    "cardExpiryMonth" INTEGER,
    "cardExpiryYear" INTEGER,
    "walletProvider" TEXT,
    "walletAccountId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RiderPaymentMethod_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RiderPaymentMethod_riderProfileId_isDefault_idx" ON "RiderPaymentMethod"("riderProfileId", "isDefault");

-- DriverWallet
CREATE TABLE IF NOT EXISTS "DriverWallet" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "lastPayoutAt" TIMESTAMP(3),
    "lastPayoutAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DriverWallet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DriverWallet_driverProfileId_key" ON "DriverWallet"("driverProfileId");

-- Transaction
CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "driverProfileId" TEXT,
    "rideId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentReference" TEXT,
    "paymentGateway" TEXT,
    "grossAmount" DECIMAL(10,2),
    "commissionAmount" DECIMAL(10,2),
    "commissionRate" DOUBLE PRECISION,
    "netAmount" DECIMAL(10,2),
    "description" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_rideId_key" ON "Transaction"("rideId");
CREATE INDEX IF NOT EXISTS "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_driverProfileId_createdAt_idx" ON "Transaction"("driverProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_type_createdAt_idx" ON "Transaction"("type", "createdAt");

-- EarningsReport
CREATE TABLE IF NOT EXISTS "EarningsReport" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "reportType" "ReportPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalRides" INTEGER NOT NULL,
    "totalEarnings" DECIMAL(10,2) NOT NULL,
    "totalCommission" DECIMAL(10,2) NOT NULL,
    "netEarnings" DECIMAL(10,2) NOT NULL,
    "averageRideFare" DECIMAL(10,2) NOT NULL,
    "onlineHours" DOUBLE PRECISION NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EarningsReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EarningsReport_driverProfileId_periodStart_idx" ON "EarningsReport"("driverProfileId", "periodStart");
CREATE UNIQUE INDEX IF NOT EXISTS "EarningsReport_driverProfileId_reportType_periodStart_key" ON "EarningsReport"("driverProfileId", "reportType", "periodStart");

-- MaskedCall
CREATE TABLE IF NOT EXISTS "MaskedCall" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "maskedNumber" TEXT NOT NULL,
    "callProvider" TEXT NOT NULL,
    "callSid" TEXT,
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "MaskedCall_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MaskedCall_rideId_startedAt_idx" ON "MaskedCall"("rideId", "startedAt");
CREATE INDEX IF NOT EXISTS "MaskedCall_callerId_startedAt_idx" ON "MaskedCall"("callerId", "startedAt");

-- Message
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "rideId" TEXT,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Message_senderId_receiverId_sentAt_idx" ON "Message"("senderId", "receiverId", "sentAt");
CREATE INDEX IF NOT EXISTS "Message_rideId_sentAt_idx" ON "Message"("rideId", "sentAt");

-- Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "rideId" TEXT,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pushSent" BOOLEAN NOT NULL DEFAULT false,
    "pushSentAt" TIMESTAMP(3),
    "pushToken" TEXT,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_sentAt_idx" ON "Notification"("userId", "isRead", "sentAt");
CREATE INDEX IF NOT EXISTS "Notification_type_sentAt_idx" ON "Notification"("type", "sentAt");

-- SupportTicket
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rideId" TEXT,
    "category" "TicketCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_status_createdAt_idx" ON "SupportTicket"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_priority_createdAt_idx" ON "SupportTicket"("status", "priority", "createdAt");

-- TicketReply
CREATE TABLE IF NOT EXISTS "TicketReply" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT NOT NULL,
    "attachmentUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TicketReply_ticketId_createdAt_idx" ON "TicketReply"("ticketId", "createdAt");

-- Rating
CREATE TABLE IF NOT EXISTS "Rating" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "punctualityRating" INTEGER,
    "safetyRating" INTEGER,
    "cleanlinessRating" INTEGER,
    "communicationRating" INTEGER,
    "isRiderToDriver" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Rating_rideId_key" ON "Rating"("rideId");
CREATE INDEX IF NOT EXISTS "Rating_reviewerId_createdAt_idx" ON "Rating"("reviewerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Rating_revieweeId_createdAt_idx" ON "Rating"("revieweeId", "createdAt");
CREATE INDEX IF NOT EXISTS "Rating_rideId_idx" ON "Rating"("rideId");

-- SystemConfiguration
CREATE TABLE IF NOT EXISTS "SystemConfiguration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" "ConfigValueType" NOT NULL DEFAULT 'STRING',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemConfiguration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfiguration_key_key" ON "SystemConfiguration"("key");
CREATE INDEX IF NOT EXISTS "SystemConfiguration_key_isActive_idx" ON "SystemConfiguration"("key", "isActive");

-- ============================================
-- 6. ADD FOREIGN KEYS
-- ============================================

-- RefreshToken
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vehicle
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverProfileId_fkey" 
    FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RiderProfile
ALTER TABLE "RiderProfile" ADD CONSTRAINT "RiderProfile_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiderProfile" ADD CONSTRAINT "RiderProfile_subscriptionPlanId_fkey" 
    FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- EmergencyContact
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_riderProfileId_fkey" 
    FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SavedLocation
ALTER TABLE "SavedLocation" ADD CONSTRAINT "SavedLocation_riderProfileId_fkey" 
    FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RiderPreference
ALTER TABLE "RiderPreference" ADD CONSTRAINT "RiderPreference_riderProfileId_fkey" 
    FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RiderVehicle
ALTER TABLE "RiderVehicle" ADD CONSTRAINT "RiderVehicle_riderProfileId_fkey" 
    FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ride
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_riderId_fkey" 
    FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey" 
    FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverProfileId_fkey" 
    FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_promoCodeId_fkey" 
    FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_vehicleId_fkey" 
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_riderVehicleId_fkey" 
    FOREIGN KEY ("riderVehicleId") REFERENCES "RiderVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DispatchAttempt
ALTER TABLE "DispatchAttempt" ADD CONSTRAINT "DispatchAttempt_rideId_fkey" 
    FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RideRoute
ALTER TABLE "RideRoute" ADD CONSTRAINT "RideRoute_rideId_fkey" 
    FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserPromoUsage
ALTER TABLE "UserPromoUsage" ADD CONSTRAINT "UserPromoUsage_promoCodeId_fkey" 
    FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DriverLocationHistory
ALTER TABLE "DriverLocationHistory" ADD CONSTRAINT "DriverLocationHistory_driverProfileId_fkey" 
    FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FatigueDetectionLog
ALTER TABLE "FatigueDetectionLog" ADD CONSTRAINT "FatigueDetectionLog_driverProfileId_fkey" 
    FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SosIncident
ALTER TABLE "SosIncident" ADD CONSTRAINT "SosIncident_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SosIncident" ADD CONSTRAINT "SosIncident_rideId_fkey" 
    FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BlowbagetsChecklist
ALTER TABLE "BlowbagetsChecklist" ADD CONSTRAINT "BlowbagetsChecklist_driverProfileId_fkey" 
    FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RiderPaymentMethod
ALTER TABLE "RiderPaymentMethod" ADD CONSTRAINT "RiderPaymentMethod_riderProfileId_fkey" 
    FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DriverWallet
ALTER TABLE "DriverWallet" ADD CONSTRAINT "DriverWallet_driverProfileId_fkey" 
    FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Transaction
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_driverProfileId_fkey" 
    FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_rideId_fkey" 
    FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Message
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" 
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" 
    FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Notification
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SupportTicket
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TicketReply
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey" 
    FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rating
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_rideId_fkey" 
    FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_reviewerId_fkey" 
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_revieweeId_fkey" 
    FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
