# Database Schema Overview

This document tracks the database design across phases. Phase 1 is fully defined below; later phases should append new entities and migrations while keeping this file updated.

## Phase 1 (Auth, Driver KYC, Biometric Logging)

- **Core Users & Auth**
  - `User` — phone-based identity with role (`RIDER` | `DRIVER` | `ADMIN`), last login timestamp.
  - `OtpCode` — hashed OTPs with TTL, attempt counter, purpose (`LOGIN` | `REGISTER`).
- **Driver KYC**
  - `DriverProfile` — driver status (`PENDING` | `APPROVED` | `REJECTED`), rejection reason, profile photo key, biometric verification timestamp.
  - `DriverDocument` — one per doc type (`LICENSE` | `ORCR` | `GOVERNMENT_ID` | `PROFILE_PHOTO`), upload metadata and status (`PENDING_UPLOAD` | `UPLOADED` | `REJECTED`).
- **Observability**
  - `AuditLog` — actor, action, target type/id, arbitrary metadata (JSON).
  - `BiometricVerification` — result of selfie vs stored photo, success flag, confidence, reason.

### Prisma Definition (Phase 1)
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum UserRole { RIDER DRIVER ADMIN }
enum OtpPurpose { LOGIN REGISTER }
enum DriverStatus { PENDING APPROVED REJECTED }
enum DriverDocumentType { LICENSE ORCR GOVERNMENT_ID PROFILE_PHOTO }
enum DocumentStatus { PENDING_UPLOAD UPLOADED REJECTED }

model User {
  id           String   @id @default(uuid())
  phoneNumber  String   @unique
  countryCode  String?
  role         UserRole
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastLoginAt  DateTime?
  driverProfile DriverProfile?
  otpCodes     OtpCode[]
  auditLogs    AuditLog[]
}

model OtpCode {
  id             String     @id @default(uuid())
  phoneNumber    String
  role           UserRole
  codeHash       String
  expiresAt      DateTime
  consumedAt     DateTime?
  failedAttempts Int        @default(0)
  purpose        OtpPurpose
  createdAt      DateTime   @default(now())
  userId         String?
  user           User?      @relation(fields: [userId], references: [id])

  @@index([phoneNumber])
  @@index([expiresAt])
}

model DriverProfile {
  id                     String     @id @default(uuid())
  userId                 String     @unique
  user                   User       @relation(fields: [userId], references: [id])
  status                 DriverStatus @default(PENDING)
  rejectionReason        String?
  profilePhotoKey        String?
  profilePhotoUploadedAt DateTime?
  biometricVerifiedAt    DateTime?
  createdAt              DateTime   @default(now())
  updatedAt              DateTime   @updatedAt
  documents              DriverDocument[]
  biometricVerifications BiometricVerification[]
}

model DriverDocument {
  id              String            @id @default(uuid())
  driverProfileId String
  driverProfile   DriverProfile     @relation(fields: [driverProfileId], references: [id])
  type            DriverDocumentType
  storageKey      String
  fileName        String
  mimeType        String
  status          DocumentStatus    @default(PENDING_UPLOAD)
  size            Int?
  uploadedAt      DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@unique([driverProfileId, type])
}

model AuditLog {
  id          String   @id @default(uuid())
  actorUserId String?
  actor       User?    @relation(fields: [actorUserId], references: [id])
  action      String
  targetType  String
  targetId    String?
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([targetType, targetId])
}

model BiometricVerification {
  id              String        @id @default(uuid())
  driverProfileId String
  driverProfile   DriverProfile @relation(fields: [driverProfileId], references: [id])
  success         Boolean
  reason          String?
  confidence      Float?
  createdAt       DateTime      @default(now())
}
```

### Notes & Conventions
- Phone numbers stored in E.164 format (backend validation enforces this).
- OTP codes are salted/hashed; plain codes never stored.
- Driver documents are unique per type; storage keys follow `drivers/{driverId}/{documentType}/...`.
- Biometric verification records are append-only for auditability.
- All timestamps are UTC.

## Future Phases (placeholders)
- **Rider/Driver Profiles:** richer demographics, vehicle details, availability.
- **Ride Domain:** trips, locations, pricing, payments, ratings.
- **Operations:** support tickets, notifications, webhooks.
- **Analytics:** aggregation tables/materialized views for dashboards.

When adding new models/enums in later phases, append them here and include migration references (file name and date).***
