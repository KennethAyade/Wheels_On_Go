# Wheels On Go Platform - Complete Knowledge Base

**Repository:** `d:\FREELANCE\Wheels-On-Go_Platform\Wheels_On_Go`
**Last Updated:** 2026-02-06
**Branch:** develop (main branch: main)

---

## Executive Summary

**Wheels On Go** (also branded as "Valet&Go") is a ride-hailing platform built with NestJS + Prisma/PostgreSQL (backend) and Kotlin + Jetpack Compose (mobile). **Phase 1** is complete: OTP authentication, driver KYC document upload (Cloudflare R2), and biometric face verification are fully implemented end-to-end. The complete database schema for Phases 2-7 (40+ models) is ready but not yet implemented.

---

## Project Timeline

| Date | Milestone | Status |
|------|-----------|--------|
| 2026-01-19 | Initial monorepo scaffold | ✅ Complete |
| 2026-01-28 | Complete database schema (40+ models) | ✅ Complete |
| 2026-01-29 | Data privacy setup (encryption, audit) | ✅ Complete |
| 2026-01-31 | Free maps migration (OSMDroid + Nominatim) | ✅ Replaced |
| 2026-01-31 | Week 3 mobile-backend integration | ✅ Complete |
| 2026-02-04 | Google Maps Platform migration | ✅ Complete |
| 2026-02-06 | FR-1.2 KYC upload (R2) + FR-1.3 Biometric screen | ✅ Complete |
| Week 4 | Integration testing | ⚠️ In Progress |
| Week 4-5 | Core ride functionality | 📅 Planned |
| Week 5-6 | Real-time tracking & safety | 📅 Planned |
| Week 6-7 | Financial & communication | 📅 Planned |
| Week 7-9 | Admin & operations | 📅 Planned |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 18+, NestJS 10 |
| **Database** | PostgreSQL via Prisma ORM 5.15 |
| **Authentication** | JWT with OTP-first flow |
| **Encryption** | AES-256-GCM (at rest), TLS 1.3 (in transit) |
| **Biometrics** | AWS Rekognition (with mock mode) |
| **Storage** | Cloudflare R2 (S3-compatible, free tier: 10GB) |
| **SMS** | Twilio (with console fallback for dev) |
| **Maps** | Google Maps SDK (Android), Geocoding, Places, Distance Matrix APIs |
| **Mobile** | Kotlin + Jetpack Compose, Retrofit, DataStore |
| **Testing** | Jest with ts-jest |
| **Deployment** | Render.com |

---

## Project Structure

```
Wheels_On_Go/
├── apps/
│   ├── api/                           # NestJS REST API (Phase 1)
│   │   ├── src/
│   │   │   ├── auth/                  # OTP, JWT, biometric flow
│   │   │   ├── driver/                # Driver profiles, KYC, admin approval
│   │   │   ├── biometric/             # Face recognition (AWS Rekognition/mock)
│   │   │   ├── storage/               # S3-compatible storage for uploads
│   │   │   ├── encryption/            # AES-256-GCM PII encryption
│   │   │   ├── audit/                 # Comprehensive audit logging
│   │   │   ├── common/                # Guards, decorators, types
│   │   │   ├── health/                # Health check endpoint
│   │   │   ├── prisma/                # Prisma service & middleware
│   │   │   └── main.ts                # Application bootstrap
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # 40+ data models (1029 lines)
│   │   │   └── migrations/            # Database migrations
│   │   ├── scripts/                   # Database utilities
│   │   └── test/                      # Unit tests
│   └── mobile/                        # Android app scaffold (Kotlin/Compose)
├── packages/
│   └── shared/                        # API contracts documentation
├── docs/                              # Project documentation
│   ├── data-privacy-policy.md         # GDPR/CCPA compliance
│   ├── database-schema.md             # Complete schema docs
│   ├── testing-status.md              # Week 2 testing status
│   ├── testing-roadmap.md             # 3-phase testing strategy
│   └── test-results-summary.md        # Test coverage summary
├── changes/                           # Detailed change logs
├── CHANGELOG.md                       # Living change log
├── render.yaml                        # Render deployment config
└── README.md                          # Quick start guide
```

---

## Phase 1 API Endpoints (12 Endpoints)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/request-otp` | Request OTP code (rate-limited: 5/hour) |
| POST | `/auth/verify-otp` | Verify OTP, receive tokens |
| POST | `/auth/biometric/verify` | Face recognition verification |
| GET | `/auth/me` | Get current user profile |

### Driver Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/drivers/me` | Get driver profile |
| GET | `/drivers/kyc` | Get KYC documents status |
| POST | `/drivers/kyc/presign` | Request presigned upload URL |
| POST | `/drivers/kyc/confirm` | Confirm document upload |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/drivers/pending` | List pending driver approvals |
| POST | `/admin/drivers/:id/approve` | Approve driver |
| POST | `/admin/drivers/:id/reject` | Reject driver with reason |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

---

## Database Schema Summary

### Phase 1 Models (7 Implemented)
1. **User** - Core identity (RIDER/DRIVER/ADMIN roles)
2. **OtpCode** - OTP management with TTL and attempts
3. **DriverProfile** - Driver status and metrics
4. **DriverDocument** - KYC documents (LICENSE, ORCR, GOVERNMENT_ID, PROFILE_PHOTO)
5. **AuditLog** - Comprehensive audit trail
6. **BiometricVerification** - Face verification logs
7. **RiderProfile** - Rider preferences (partial)

### Phase 2-7 Models (40+ Total) - Schema Ready
| Domain | Models |
|--------|--------|
| **User Management** | User, RiderProfile, RiderPreference, EmergencyContact, SavedLocation |
| **Driver Management** | DriverProfile, DriverDocument, BiometricVerification, Vehicle, DriverWallet, DriverLocationHistory |
| **Booking & Ride** | Ride, DispatchAttempt, RideRoute, PromoCode, UserPromoUsage, SurgePricingLog, Rating |
| **Financial** | SubscriptionPlan, RiderPaymentMethod, Transaction, EarningsReport |
| **Real-Time Tracking** | DriverLocationHistory, GeofenceEvent |
| **Safety & Intelligence** | FatigueDetectionLog, SosIncident, BlowbagetsChecklist |
| **Communication** | MaskedCall, Message, Notification |
| **Admin & Support** | SupportTicket, TicketReply, SystemConfiguration |
| **Observability** | AuditLog |

### Key Enums (25+)
- **Roles:** UserRole (RIDER, DRIVER, ADMIN)
- **Driver:** DriverStatus, DriverDocumentType, DocumentStatus
- **Ride:** RideType, RideStatus
- **Payment:** PaymentMethod, PaymentStatus, TransactionType
- **Safety:** FatigueLevel, SosIncidentType, SosIncidentStatus
- **Communication:** NotificationType, MessageType
- **Support:** TicketCategory, TicketPriority, TicketStatus
- **Vehicle:** VehicleType

---

## Data Privacy & Encryption

### Encrypted PII Fields (AES-256-GCM)
| Model | Field | Searchable Hash |
|-------|-------|-----------------|
| User | phoneNumber | phoneNumberHash (HMAC-SHA256) |
| User | email | emailHash (HMAC-SHA256) |
| EmergencyContact | phoneNumber | No |
| DriverWallet | accountNumber | No |
| RiderPaymentMethod | cardToken | No |

### Encryption Implementation
- **Algorithm:** AES-256-GCM (256-bit key, 12-byte IV, 16-byte auth tag)
- **Format:** `iv:authTag:ciphertext` (all Base64-encoded)
- **Key:** Environment variable `ENCRYPTION_KEY` (64 hex chars)
- **Middleware:** Transparent encryption in Prisma service (auto encrypt on write, auto decrypt on read)

### Data Retention Policies
| Data Type | Retention | Deletion Method |
|-----------|-----------|-----------------|
| Active accounts | Duration of use | N/A |
| Inactive accounts | 3 years | Anonymization |
| Ride history | 7 years | Anonymization |
| Location data | 30 days | Hard delete |
| Financial records | 7 years | Archive (encrypted) |
| Audit logs | 7 years | Archive (encrypted) |
| OTP codes | 24 hours | Hard delete |
| Biometric data | 90 days | Hard delete |

### Compliance Framework
- GDPR (EU)
- CCPA (California)
- Philippine Data Privacy Act (RA 10173)
- PCI-DSS (payment data)

---

## Audit Logging

### 51 Audit Actions across 11 Categories
1. **Authentication:** OTP_REQUESTED, OTP_VERIFIED, LOGIN_SUCCESS, LOGIN_FAILED, etc.
2. **User Management:** USER_CREATED, USER_UPDATED, USER_SUSPENDED
3. **KYC & Driver:** DRIVER_APPROVED, DRIVER_REJECTED, BIOMETRIC_VERIFIED
4. **Ride Management:** RIDE_CREATED, RIDE_COMPLETED, RIDE_CANCELLED_BY_*
5. **Payment:** PAYMENT_INITIATED, PAYMENT_PROCESSED, PAYMENT_REFUNDED
6. **Payouts:** PAYOUT_REQUESTED, PAYOUT_COMPLETED
7. **Safety:** SOS_TRIGGERED, SOS_RESOLVED, FATIGUE_DETECTED
8. **GDPR:** PII_ACCESS, DATA_EXPORT_*, DATA_DELETION_*
9. **Admin:** ADMIN_CONFIG_CHANGED, ADMIN_MANUAL_OVERRIDE
10. **Support:** SUPPORT_TICKET_CREATED, SUPPORT_TICKET_RESOLVED
11. **Rating:** RATING_SUBMITTED

---

## Testing Status

### Current Coverage
| Component | Unit | Integration | E2E |
|-----------|------|-------------|-----|
| EncryptionService | ✅ 100% (22 tests) | ⚠️ Pending | ⚠️ Pending |
| PrismaMiddleware | N/A | ⚠️ Pending | ⚠️ Pending |
| AuditService | ⚠️ 0% | ⚠️ Pending | ⚠️ Pending |
| Auth endpoints | ✅ Basic | ⚠️ Pending | ⚠️ Pending |
| Driver endpoints | ✅ Basic | ⚠️ Pending | ⚠️ Pending |

### Testing Roadmap
- **Phase 1 (Weeks 2-3):** Integration tests, E2E tests (6-8 hours)
- **Phase 2 (Weeks 4-5):** Security tests, performance tests (9-12 hours)
- **Phase 3 (Weeks 6-7):** Load tests, GDPR compliance tests (6-8 hours)

---

## Environment Configuration

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
JWT_SECRET=your-jwt-secret
ACCESS_TOKEN_TTL=15m
BIOMETRIC_TOKEN_TTL=5m

# Encryption (CRITICAL)
ENCRYPTION_KEY=64-hex-characters-here

# OTP/SMS
OTP_CODE_TTL_SECONDS=300
SMS_PROVIDER=twilio|console
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...

# Storage (S3-compatible)
STORAGE_BUCKET=bucket-name
STORAGE_REGION=region
STORAGE_ENDPOINT=optional-custom-endpoint
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Biometric
BIOMETRIC_MODE=mock|rekognition
BIOMETRIC_MIN_CONFIDENCE=90

# CORS
CORS_ORIGINS=http://localhost:3000

# Google Maps Platform
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

## Key Business Rules

### 1. Ride Fare Calculation
```
totalFare = baseFare + (distance × costPerKm) + (duration × costPerMin) + surgePricing - promoDiscount
```

### 2. Commission Deduction (Default 20%)
```
netAmount = totalFare × (1 - commissionRate)
```

### 3. Driver Matching Algorithm
1. Find drivers within 5km radius (Haversine distance)
2. Sort by distance ascending
3. Dispatch to closest driver
4. If declined, dispatch to next (max 10 attempts)
5. If all decline, expand radius by 2km and retry

### 4. Rating-Based Suspension
- If averageRating < 3.0 AND totalRatings >= 10: isSuspended = true

### 5. Geofencing (50m Radius)
- Trigger DRIVER_ARRIVED when distance ≤ 50 meters
- Automatic status update and push notification

### 6. BLOWBAGETS Safety Checklist
- Driver must complete daily checklist (Brakes, Lights, Oil, Water, Battery, Air, Gas, Engine, Tools, Self)
- Expires after 24 hours
- Blocks driver from going online if expired

### 7. Fatigue Detection
- Google ML Kit monitors eye probability
- Alert if avgEyeProbability < 0.4 for > 2 seconds

---

## Recent Changes (from CHANGELOG.md)

### 2026-02-06 10:00 PHT - FR-1.2 KYC + FR-1.3 Biometric Complete
- Configured Cloudflare R2 storage for KYC document uploads
- Enabled KYC presign/confirm endpoints (removed 503 blocks)
- Fixed mobile DTO field name mismatches (KYC + biometric)
- Implemented real file upload pipeline: presign → R2 PUT → confirm
- Added file picker (ActivityResultContracts.GetContent) to document upload
- Created BiometricVerificationScreen with camera intent (TakePicturePreview)
- Updated AuthInterceptor to route biometric token for face verify endpoint
- Added camera permission to AndroidManifest
- Full navigation flow: OTP → biometric (if required) → LocationConfirm → Home

### 2026-02-04 12:00 PHT - Google Maps Platform Migration
- Replaced OSMDroid + Nominatim + Photon + OSRM with Google APIs
- Rewrote map composable (OSMDroid → maps-compose)
- Fixed AndroidManifest API key name (geo.API_KEY not gms.maps.API_KEY)

### 2026-01-29 00:30 PHT - Week 2 Data Privacy Setup
- AES-256-GCM encryption service
- Transparent Prisma encryption middleware
- 51 audit actions for GDPR compliance
- Helmet security headers (CSP, HSTS)
- Hash columns for searchable encryption
- Backfill script for existing data
- Comprehensive data privacy policy documentation
- 22 unit tests for encryption service

### 2026-01-28 14:00 PHT - Complete Database Schema
- Extended from 6 models to 40+ models
- 25+ enums for comprehensive type safety
- Strategic indexes for < 2s booking delivery
- Applied to production database
- Backfill script for existing User/DriverProfile records

### 2026-01-19 04:00 PHT - Initial Scaffold
- NestJS REST API with Prisma
- Android Compose app scaffold
- JWT authentication stubs
- Health endpoint
- Render deployment config

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Main entry | `apps/api/src/main.ts` |
| App module | `apps/api/src/app.module.ts` |
| Prisma schema | `apps/api/prisma/schema.prisma` |
| Prisma service | `apps/api/src/prisma/prisma.service.ts` |
| Encryption service | `apps/api/src/encryption/encryption.service.ts` |
| Encryption constants | `apps/api/src/encryption/encryption.constants.ts` |
| Audit service | `apps/api/src/audit/audit.service.ts` |
| Auth controller | `apps/api/src/auth/auth.controller.ts` |
| Driver controller | `apps/api/src/driver/driver.controller.ts` |
| Data privacy policy | `docs/data-privacy-policy.md` |
| Database schema docs | `docs/database-schema.md` |
| Testing status | `docs/testing-status.md` |
| Testing roadmap | `docs/testing-roadmap.md` |
| Environment example | `apps/api/.env.example` |
| Backfill script | `apps/api/scripts/backfill-encrypt-pii.ts` |

### Mobile App Key Files
| Purpose | File Path |
|---------|-----------|
| Application class | `apps/mobile/.../WheelsOnGoApplication.kt` |
| Navigation graph | `apps/mobile/.../AppNav.kt` |
| Route definitions | `apps/mobile/.../ui/navigation/Routes.kt` |
| API Client | `apps/mobile/.../data/network/ApiClient.kt` |
| Token Manager | `apps/mobile/.../data/auth/TokenManager.kt` |
| Auth Interceptor | `apps/mobile/.../data/network/AuthInterceptor.kt` |
| Auth Repository | `apps/mobile/.../data/repository/AuthRepository.kt` |
| Google Map View | `apps/mobile/.../ui/components/map/OpenStreetMap.kt` |
| Home Screen | `apps/mobile/.../ui/screens/home/HomeScreen.kt` |
| Phone Input | `apps/mobile/.../ui/screens/auth/PhoneInputScreen.kt` |
| OTP Verification | `apps/mobile/.../ui/screens/auth/OtpVerificationScreen.kt` |
| Biometric Verify | `apps/mobile/.../ui/screens/auth/BiometricVerificationScreen.kt` |
| Document Upload | `apps/mobile/.../ui/screens/driver/DocumentUploadScreen.kt` |

---

## Mobile App Integration (Week 3)

### Architecture
```
Mobile App (Kotlin/Compose)
├── data/
│   ├── auth/TokenManager.kt         # DataStore-based JWT storage
│   ├── network/
│   │   ├── ApiClient.kt             # Retrofit setup with interceptors
│   │   ├── AuthApi.kt               # Auth endpoints interface
│   │   ├── DriverApi.kt             # Driver endpoints interface
│   │   ├── LocationApi.kt           # Location endpoints interface
│   │   └── AuthInterceptor.kt       # JWT header injection
│   ├── repository/
│   │   └── AuthRepository.kt        # Auth business logic
│   └── models/
│       ├── auth/AuthModels.kt       # Auth DTOs (OTP, biometric)
│       ├── driver/DriverModels.kt   # Driver/KYC DTOs
│       └── location/LocationModels.kt
└── ui/screens/
    ├── auth/PhoneInputViewModel.kt   # OTP request
    ├── auth/OtpVerificationViewModel.kt  # OTP verify + biometric routing
    ├── auth/BiometricVerificationScreen.kt  # Face verification camera UI
    ├── auth/BiometricVerificationViewModel.kt  # Camera→Base64→API
    └── driver/DocumentUploadViewModel.kt # KYC presign→R2→confirm
```

### Integration Status
| Feature | Backend | Mobile | Integration | Notes |
|---------|---------|--------|-------------|-------|
| OTP Request | ✅ | ✅ | ✅ Connected | Rate-limited 3/min |
| OTP Verify | ✅ | ✅ | ✅ Connected | Response structure fixed (2026-01-31) |
| Token Storage | N/A | ✅ | ✅ DataStore | Handles biometric + access tokens |
| JWT Auth Header | N/A | ✅ | ✅ AuthInterceptor | Auto-injected; routes biometric token for face verify |
| Driver Profile | ✅ | ✅ | ✅ Connected | Biometric flow supported |
| KYC Upload | ✅ | ✅ | ✅ Connected | Cloudflare R2 via presigned URL (2026-02-06) |
| Biometric Verify | ✅ | ✅ | ✅ Connected | Camera selfie → Base64 → backend (2026-02-06) |
| URL Encoding | N/A | ✅ | ✅ Fixed | Phone number `+` preserved (2026-01-31) |

### Critical Fixes Applied (2026-01-31)
**Issue #1: API Response Structure Mismatch**
- **Problem:** Backend returned `{userId, role, accessToken}` but mobile expected `{accessToken, user: {...}}`
- **Fix:** Updated `apps/api/src/auth/auth.service.ts` to return correct structure
- **Impact:** OTP verification now succeeds, users can log in

**Issue #2: URL Encoding Bug**
- **Problem:** Phone number `+639...` became ` 639...` (space) in navigation URLs
- **Fix:** URL-encode phone numbers in `apps/mobile/.../ui/navigation/Routes.kt`
- **Impact:** Backend validation now passes, proper E.164 format preserved

**Issue #3: OTP Error UX**
- **Problem:** OTP cleared on error, preventing backspace corrections
- **Fix:** Preserve OTP value in `OtpVerificationViewModel.kt` error handler
- **Impact:** Users can fix typos instead of re-entering entire code

### Google Maps Platform
| Feature | Service | Notes |
|---------|---------|-------|
| Map Display | Google Maps Android SDK (`maps-compose:4.2.0`) | API key in AndroidManifest |
| Autocomplete | Google Places Autocomplete API | Does NOT return lat/lng; Place Details required |
| Place Details | Google Place Details API | Field-masked to cheapest billing tier |
| Geocoding | Google Geocoding API | Reverse geocoding included |
| Distance/ETA | Google Distance Matrix API | Falls back to Haversine on failure |
| Device GPS | FusedLocationProvider (`play-services-location`) | Unchanged — device hardware, not maps |

**Billing notes:**
- Session tokens group autocomplete + one Details call for optimised pricing
- Place Details restricted to `name,formatted_address,geometry/location,types` (Basic tier)
- Distance Matrix uses `duration` (static); switch to `duration_in_traffic` later by adding `departure_time=now`

---

## Current Limitations

1. **Biometric Mode:** Defaults to mock mode (always returns match=true). Switch to `BIOMETRIC_MODE=rekognition` for production with AWS credentials.
2. **Liveness Detection:** Camera captures static photo via `TakePicturePreview`. No anti-spoofing (could accept photos of photos). Consider ML Kit Face Detection for liveness in production.
3. **Admin Dashboard UI:** No web frontend for admin driver approval — admin endpoints exist but need a UI.
4. **Integration Tests:** Not yet implemented (significant gap for production)
5. **Key Rotation:** Procedure not yet documented
6. **GDPR Endpoints:** Data export/deletion endpoints not yet implemented

---

## Commands Reference

```bash
# Development
npm run dev:api                    # Start dev server
npm run prisma:studio              # Open Prisma Studio

# Database
npm run prisma:generate            # Generate Prisma client
npm run prisma:migrate             # Run migrations

# Testing
npm run test:api                   # Run all tests
npm run test:api -- --watch        # Watch mode

# Build & Deploy
npm run build:prod                 # Production build
npm run start:api                  # Start production server
```

---

This document serves as a comprehensive reference for the Wheels On Go platform. All critical information about the architecture, database schema, security implementation, business rules, and project status is captured here for future conversations.
