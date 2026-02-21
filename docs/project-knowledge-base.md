# Wheels On Go Platform - Complete Knowledge Base

**Repository:** `d:\FREELANCE\Wheels-On-Go_Platform\Wheels_On_Go`
**Last Updated:** 2026-02-21
**Branch:** develop (main branch: main)

---

## Executive Summary

**Wheels On Go** (also branded as "Valet&Go") is a ride-hailing platform built with NestJS + Prisma/PostgreSQL (backend), Kotlin + Jetpack Compose (mobile), and React + Vite + Tailwind CSS (web admin). **Phase 1 is complete**, **Phase 2 (Weeks 4–5) is complete**, and **Phase 3 Week 7 (Admin Dashboard) is complete**: Firebase Phone Auth, driver KYC (Cloudflare R2), biometric login, RiderVehicle CRUD, surge pricing, promo codes, WebSocket dispatch, real-time tracking with geofencing, actual fare calculation, full driver booking flow, and the admin web dashboard are all implemented end-to-end. 122 backend tests pass across 13 suites. The complete database schema for remaining phases (40+ models) is ready.

---

## Project Timeline

| Date | Milestone | Status |
|------|-----------|--------|
| 2026-01-19 | Initial monorepo scaffold | ✅ Complete |
| 2026-01-28 | Complete database schema (40+ models) | ✅ Complete |
| 2026-01-29 | Data privacy setup (encryption, audit) | ✅ Complete |
| 2026-01-31 | Free maps migration (OSMDroid + Nominatim) | ✅ Replaced by Google Maps |
| 2026-01-31 | Week 3 mobile-backend integration | ✅ Complete |
| 2026-02-04 | Google Maps Platform migration | ✅ Complete |
| 2026-02-06 | FR-1.2 KYC upload (R2) + FR-1.3 Biometric screen | ✅ Complete |
| 2026-02-07 | Phase 1 bug fixes (403, ORCR, KYC persistence, biometric leniency, navigation, menu) | ✅ Complete |
| 2026-02-13 | Firebase Phone Auth integration (real phone OTP) | ✅ Complete |
| 2026-02-14 | Phase 2 Week 4 — Core Booking Engine (RiderVehicle, Surge, Promo, Dispatch, BookingConfirm, ActiveRide) | ✅ Complete |
| 2026-02-17 | Firebase App Check + resend OTP fix + vehicle 409 idempotency | ✅ Complete |
| 2026-02-20 | Phase 2 Week 5 — Driver Booking Flow (DriveRequests, DriverActiveRide, DriverTripCompletion, dispatch normalization) | ✅ Complete |
| 2026-02-20 | Phase 2 Week 5 — Real-time Tracking (TrackingSocketClient, geofencing, ETA, turn-by-turn nav, actual fare) | ✅ Complete |
| 2026-02-21 | Phase 3 Week 7 — Admin Web Dashboard (driver verification, bookings, stats, login) | ✅ Complete |
| Week 6 | Financial & communication features | 📅 Planned |
| Week 8–9 | QA, deployment, production hardening | 📅 Planned |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 18+, NestJS 10 |
| **Database** | PostgreSQL via Prisma ORM 5.15 |
| **Authentication** | JWT with OTP-first flow + admin email/password |
| **Encryption** | AES-256-GCM (at rest), TLS 1.3 (in transit) |
| **Biometrics** | AWS Rekognition (with mock mode) |
| **Storage** | Cloudflare R2 (S3-compatible, free tier: 10GB) |
| **SMS/OTP** | Firebase Phone Auth (real phones, 10K/month free), console SMS (emulators) |
| **Maps** | Google Maps SDK (Android), Geocoding, Places, Distance Matrix, Directions APIs |
| **Mobile** | Kotlin + Jetpack Compose, Retrofit, DataStore, Socket.IO client |
| **Web Admin** | React 18 + TypeScript + Vite 7 + Tailwind CSS 4 + React Router v7 + Axios |
| **WebSocket** | Socket.IO (NestJS gateway) — `/dispatch` and `/tracking` namespaces |
| **Testing** | Jest with ts-jest (backend) |
| **Deployment** | Render.com (API), Cloudflare R2 (storage) |

---

## Project Structure

```
Wheels_On_Go/
├── apps/
│   ├── api/                           # NestJS REST API
│   │   ├── src/
│   │   │   ├── auth/                  # OTP, JWT, biometric, admin login
│   │   │   ├── driver/                # Driver profiles, KYC, admin approval
│   │   │   ├── admin/                 # Admin stats + bookings endpoints
│   │   │   ├── rides/                 # Ride creation, status, fare calculation
│   │   │   ├── dispatch/              # WebSocket dispatch + routing engine
│   │   │   ├── tracking/              # Real-time location + geofencing
│   │   │   ├── rider-vehicle/         # Rider vehicle CRUD
│   │   │   ├── pricing/               # Surge pricing + promo codes
│   │   │   ├── location/              # Geocoding, autocomplete, distance
│   │   │   ├── biometric/             # Face recognition (AWS Rekognition/mock)
│   │   │   ├── storage/               # S3-compatible storage for uploads
│   │   │   ├── encryption/            # AES-256-GCM PII encryption
│   │   │   ├── audit/                 # Comprehensive audit logging
│   │   │   ├── common/                # Guards, decorators, types
│   │   │   ├── health/                # Health check endpoint
│   │   │   ├── prisma/                # Prisma service & middleware
│   │   │   └── main.ts                # Application bootstrap
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # 40+ data models
│   │   │   ├── seed-admin.ts          # Admin user seed script
│   │   │   └── migrations/            # Database migrations
│   │   ├── scripts/                   # Database utilities
│   │   └── test/                      # Unit tests (122 passing)
│   ├── mobile/                        # Android app (Kotlin/Compose)
│   └── web/                           # React admin dashboard
│       ├── src/
│       │   ├── api/                   # Axios API clients
│       │   ├── context/               # AuthContext (JWT)
│       │   ├── components/            # Layout, Sidebar, StatusBadge, etc.
│       │   ├── pages/                 # Login, Dashboard, Drivers, Bookings
│       │   └── types/                 # TypeScript interfaces
│       ├── vite.config.ts             # Port 3001, proxy /api → localhost:3000
│       └── package.json
├── packages/
│   └── shared/                        # API contracts documentation
├── docs/                              # Project documentation
│   ├── data-privacy-policy.md
│   ├── database-schema.md
│   ├── testing-status.md
│   ├── testing-roadmap.md
│   └── test-results-summary.md
├── changes/                           # Detailed change logs
├── CHANGELOG.md                       # Living change log
├── render.yaml                        # Render deployment config
└── README.md                          # Quick start guide
```

---

## Complete API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/request-otp` | Public | Request OTP code (emulators: console SMS) |
| POST | `/auth/verify-otp` | Public | Verify OTP, receive tokens |
| POST | `/auth/verify-firebase` | Public | Verify Firebase ID token (real phones) |
| POST | `/auth/biometric/verify` | Biometric token | Face recognition verification |
| POST | `/auth/admin/login` | Public | Admin email + password login |
| GET | `/auth/me` | JWT | Get current user profile |
| POST | `/auth/refresh` | Refresh token | Refresh access token |

### Driver Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/drivers/me` | JWT | Get driver profile |
| GET | `/drivers/kyc` | JWT | Get KYC documents + upload status |
| POST | `/drivers/kyc/presign` | JWT | Request presigned upload URL |
| POST | `/drivers/kyc/confirm` | JWT | Confirm document upload |

### Admin — Driver Verification
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/drivers` | Admin JWT | List all drivers (paginated, filterable by status/search) |
| GET | `/admin/drivers/pending` | Admin JWT | List pending driver approvals |
| GET | `/admin/drivers/:id` | Admin JWT | Get driver detail with presigned document URLs |
| POST | `/admin/drivers/:id/approve` | Admin JWT | Approve driver |
| POST | `/admin/drivers/:id/reject` | Admin JWT | Reject driver with reason |

### Admin — Dashboard & Bookings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/stats` | Admin JWT | Dashboard stats (activeRides, onlineDrivers, totalRiders, pendingVerifications, todayRevenue) |
| GET | `/admin/bookings` | Admin JWT | List bookings (paginated, status/date/fare/search filters) |

### Rides & Booking
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/rides` | JWT | Create ride (triggers dispatch) |
| GET | `/rides/:id` | JWT | Get ride details |
| POST | `/rides/:id/arrive` | Driver JWT | Mark arrived at pickup |
| POST | `/rides/:id/start` | Driver JWT | Start ride |
| POST | `/rides/:id/complete` | Driver JWT | Complete ride (calculates actual fare) |
| POST | `/rides/:id/cancel` | JWT | Cancel ride |

### Rider Vehicles
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/rider-vehicles` | JWT | Register vehicle |
| GET | `/rider-vehicles` | JWT | List rider vehicles |
| DELETE | `/rider-vehicles/:id` | JWT | Delete vehicle |
| PATCH | `/rider-vehicles/:id/default` | JWT | Set default vehicle |

### Pricing
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/pricing/fare-estimate` | JWT | Get fare estimate with surge |
| POST | `/pricing/promo/validate` | JWT | Validate promo code |

### Location
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/location/autocomplete` | JWT | Place autocomplete |
| GET | `/location/geocode` | JWT | Geocode address |
| GET | `/location/reverse-geocode` | JWT | Reverse geocode coordinates |

### Tracking
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tracking/location` | Driver JWT | Update driver location |

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | Public | Service health check |

---

## WebSocket Namespaces

### `/dispatch` Namespace
| Event | Direction | Description |
|-------|-----------|-------------|
| `dispatch:new_request` | Server → Driver | New ride request for driver |
| `dispatch:accepted` | Driver → Server | Driver accepts ride |
| `dispatch:declined` | Driver → Server | Driver declines ride |
| `dispatch:selected` | Server → Driver | Driver selected for ride (30s window) |
| `dispatch:expired` | Server → Driver | Selection window expired |
| `dispatch:ride_accepted` | Server → Rider | Ride confirmed with driver info |

### `/tracking` Namespace
| Event | Direction | Description |
|-------|-----------|-------------|
| `LOCATION_UPDATE` | Driver → Server | Driver GPS coordinates |
| `driver_location` | Server → Rider | Driver location forwarded |
| `APPROACHING_PICKUP` | Server → Rider | Driver within 200m of pickup |
| `ARRIVED_AT_PICKUP` | Server → Rider | Driver within 50m of pickup |
| `APPROACHING_DROPOFF` | Server → Rider | Driver within 200m of dropoff |
| `ARRIVED_AT_DROPOFF` | Server → Rider | Driver within 50m of dropoff |

---

## Database Schema Summary

### Phase 1 Models (7 Implemented)
1. **User** — Core identity (RIDER/DRIVER/ADMIN roles), passwordHash for admin login
2. **OtpCode** — OTP management with TTL and attempts
3. **DriverProfile** — Driver status and metrics
4. **DriverDocument** — KYC documents (LICENSE, GOVERNMENT_ID, PROFILE_PHOTO)
5. **AuditLog** — Comprehensive audit trail (51 actions)
6. **BiometricVerification** — Face verification logs
7. **RiderProfile** — Rider preferences

### Phase 2 Models (Active)
| Model | Purpose |
|-------|---------|
| **Ride** | Core ride entity (status, fare, locations, driver/rider) |
| **RideRoute** | Encoded polyline for route storage (Google Directions) |
| **DriverLocationHistory** | GPS trail for actual fare calculation |
| **GeofenceEvent** | Pickup/dropoff proximity events |
| **RiderVehicle** | Rider's registered vehicles |
| **PromoCode** | Discount codes (PERCENTAGE / FIXED_AMOUNT) |
| **UserPromoUsage** | Per-user promo tracking |
| **SurgePricingLog** | Surge multiplier audit trail |
| **DispatchAttempt** | Driver dispatch attempt tracking |

### Phase 2-7 Models (Schema Ready, 40+ Total)
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
1. **Authentication:** OTP_REQUESTED, OTP_VERIFIED, LOGIN_SUCCESS, LOGIN_FAILED, ADMIN_LOGIN, etc.
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

### Current Coverage (as of Feb 21, 2026)
| Component | Unit | Integration | E2E |
|-----------|------|-------------|-----|
| Backend Tests | ✅ 122 passing (13 suites) | ⚠️ Pending | ⚠️ Pending |
| Mobile Tests | ✅ 87 compiled (12 files) — JVM crash blocks runtime | ⚠️ Pending | ⚠️ Pending |
| EncryptionService | ✅ 100% (22 tests) | ⚠️ Pending | ⚠️ Pending |
| FirebaseService | ✅ 100% (5 tests) | ⚠️ Pending | ⚠️ Pending |
| AuthService | ✅ Firebase + admin login flows | ⚠️ Pending | ⚠️ Pending |
| RiderVehicleService | ✅ 100% (10 tests incl. idempotency) | ⚠️ Pending | ⚠️ Pending |
| SurgePricingService | ✅ (5 tests) | ⚠️ Pending | ⚠️ Pending |
| Web Admin Build | ✅ TypeScript clean, Vite build (302KB JS + 19KB CSS) | N/A | ⚠️ Pending |
| PrismaMiddleware | N/A | ⚠️ Pending | ⚠️ Pending |
| AuditService | ⚠️ 0% | ⚠️ Pending | ⚠️ Pending |

### Testing Roadmap
- **Current (Weeks 4–5 + Phase 3):** 122 backend tests passing; mobile 87 tests compile, JVM crash blocks runtime; web build clean
- **Next (Week 8):** Integration tests, E2E tests (6-8 hours)
- **Phase 3 (Weeks 8–9):** Security tests, performance tests, load tests

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
SMS_PROVIDER=textbelt|console
ALLOW_DEBUG_SMS=true

# Firebase Phone Auth (for real phone OTP delivery)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@...iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...-----END PRIVATE KEY-----\n"

# Storage (S3-compatible / Cloudflare R2)
STORAGE_BUCKET=bucket-name
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
STORAGE_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=auto

# Biometric
BIOMETRIC_MODE=mock|rekognition
BIOMETRIC_MIN_CONFIDENCE=90

# CORS
CORS_ORIGINS=http://localhost:3001,https://your-admin-domain.com

# Google Maps Platform
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

## Key Business Rules

### 1. Ride Fare Calculation
```
estimatedFare = baseFare + (distance × costPerKm) + (duration × costPerMin) × surgeMultiplier - promoDiscount
actualFare    = sum of Haversine distances across GPS trail (on COMPLETED) → falls back to estimatedFare
```

### 2. Commission Deduction (Default 20%)
```
netAmount = totalFare × (1 - commissionRate)
```

### 3. Driver Matching Algorithm
1. Find drivers within 5km radius (Haversine distance)
2. Sort by distance ascending
3. Dispatch to closest driver
4. If declined or 30s timeout, dispatch to next (max 10 attempts)
5. If all decline, expand radius by 2km and retry

### 4. Rating-Based Suspension
- If averageRating < 3.0 AND totalRatings >= 10: isSuspended = true

### 5. Geofencing (50m / 200m Radius)
- 200m from pickup → APPROACHING_PICKUP event to rider
- 50m from pickup → ARRIVED_AT_PICKUP event to rider
- 200m from dropoff → APPROACHING_DROPOFF event to rider
- 50m from dropoff → ARRIVED_AT_DROPOFF event to rider

### 6. BLOWBAGETS Safety Checklist
- Driver must complete daily checklist (Brakes, Lights, Oil, Water, Battery, Air, Gas, Engine, Tools, Self)
- Expires after 24 hours; blocks driver from going online if expired

### 7. Fatigue Detection
- Google ML Kit monitors eye probability
- Alert if avgEyeProbability < 0.4 for > 2 seconds

### 8. Admin Driver Verification Flow
```
Driver registers → Uploads 3 docs (LICENSE, GOVERNMENT_ID, PROFILE_PHOTO)
Admin reviews via web dashboard → Views presigned document images
Admin approves → DriverStatus = APPROVED, driver can go online
Admin rejects (with reason) → DriverStatus = REJECTED, driver notified
```

---

## Key Files Reference

### Backend
| Purpose | File Path |
|---------|-----------|
| Main entry | `apps/api/src/main.ts` |
| App module | `apps/api/src/app.module.ts` |
| Prisma schema | `apps/api/prisma/schema.prisma` |
| Admin seed | `apps/api/prisma/seed-admin.ts` |
| Admin auth | `apps/api/src/auth/auth.service.ts` (adminLogin method) |
| Admin driver controller | `apps/api/src/driver/admin-driver.controller.ts` |
| Admin stats controller | `apps/api/src/admin/admin-stats.controller.ts` |
| Admin bookings controller | `apps/api/src/admin/admin-bookings.controller.ts` |
| Dispatch gateway | `apps/api/src/dispatch/dispatch.gateway.ts` |
| Tracking gateway | `apps/api/src/tracking/tracking.gateway.ts` |
| Ride service (actual fare) | `apps/api/src/rides/ride.service.ts` |
| Encryption service | `apps/api/src/encryption/encryption.service.ts` |
| Firebase service | `apps/api/src/auth/firebase.service.ts` |

### Web Admin (`apps/web/`)
| Purpose | File Path |
|---------|-----------|
| App router | `apps/web/src/App.tsx` |
| Auth context | `apps/web/src/context/AuthContext.tsx` |
| API client (Axios) | `apps/web/src/api/client.ts` |
| Login page | `apps/web/src/pages/LoginPage.tsx` |
| Dashboard page | `apps/web/src/pages/DashboardPage.tsx` |
| Drivers page | `apps/web/src/pages/DriversPage.tsx` |
| Driver detail + doc viewer | `apps/web/src/pages/DriverDetailPage.tsx` |
| Bookings page | `apps/web/src/pages/BookingsPage.tsx` |
| Sidebar layout | `apps/web/src/components/Sidebar.tsx` |
| Vite config (proxy) | `apps/web/vite.config.ts` |

### Mobile App Key Files
| Purpose | File Path |
|---------|-----------|
| Navigation graph | `apps/mobile/.../AppNav.kt` |
| Dispatch socket | `apps/mobile/.../data/websocket/DispatchSocketClient.kt` |
| Tracking socket | `apps/mobile/.../data/websocket/TrackingSocketClient.kt` |
| Rider ActiveRide | `apps/mobile/.../ui/screens/ride/ActiveRideScreen.kt` |
| Driver ActiveRide | `apps/mobile/.../ui/screens/driver/DriverActiveRideScreen.kt` |
| Driver home | `apps/mobile/.../ui/screens/driver/DriverHomeScreen.kt` |
| Drive requests | `apps/mobile/.../ui/screens/driver/DriveRequestsScreen.kt` |
| Trip completion | `apps/mobile/.../ui/screens/driver/DriverTripCompletionScreen.kt` |
| Booking confirm | `apps/mobile/.../ui/screens/booking/BookingConfirmScreen.kt` |
| Firebase auth helper | `apps/mobile/.../data/auth/FirebasePhoneAuthHelper.kt` |
| Token manager | `apps/mobile/.../data/auth/TokenManager.kt` |

---

## Recent Changes Summary

### 2026-02-21 — Phase 3: Admin Web Dashboard
- `apps/web/` NEW — React 18 + Vite + Tailwind CSS admin dashboard
- Login page (email/password on green background, matches Figma)
- Dashboard with live stat cards from `GET /admin/stats`
- Drivers page with Applicants/Registered accordion sections + status mapping
- Driver detail page with document image viewer modal, approve/reject
- Bookings page with table, status/date/fare filters, pagination
- Backend: `POST /auth/admin/login`, `GET /admin/drivers` (all), `GET /admin/drivers/:id`, `GET /admin/stats`, `GET /admin/bookings`
- Admin seed: `admin@wheelsongo.com` / `Admin123!` via `npm run seed:admin`
- 122 backend tests unchanged

### 2026-02-20 — Phase 2 Week 5: Real-time Tracking & Navigation
- TrackingSocketClient (new Socket.IO client for `/tracking` namespace)
- Driver broadcasts GPS every 3s; rider receives live marker + route polyline
- ETA dual-strategy: Haversine instant + Directions API every 30s
- Geofence events: APPROACHING/ARRIVED at PICKUP/DROPOFF (200m/50m thresholds)
- Turn-by-turn navigation: "Navigate" FAB on DriverActiveRideScreen → Google Maps intent
- Backend: `storeRideRoute()` on ride acceptance, actual fare calculation on COMPLETED
- Dispatch fixes: 30s SELECTED timeout, EXPIRED event, normalized accepted payload

### 2026-02-20 — Phase 2 Week 5: Driver Booking Flow
- DriveRequestsScreen: waiting spinner + ride request cards
- DriverActiveRideScreen: full map + status banner + phase CTAs
- DriverTripCompletionScreen: post-trip summary
- Dispatch payload normalization (riderName, pickupLat/Lng)
- Bug fixes: activeRideId navigation loop, fare format (₱1500.0 → ₱1500)

### 2026-02-17 — Firebase App Check + Bug Fixes
- Firebase App Check SDK (DebugAppCheckProviderFactory + PlayIntegrity for release)
- Resend OTP device-aware (Firebase for real phones, backend for emulators)
- Vehicle 409 idempotency fix

### 2026-02-14 — Phase 2 Week 4: Core Booking Engine
- RiderVehicle CRUD (10 tests), surge pricing, promo codes
- BookingConfirmScreen + ActiveRide mobile screens (rider side)
- WebSocket dispatch integration

### 2026-02-13 — Firebase Phone Auth
- Real phone OTP via Firebase SDK (10K/month free)
- Emulator detection with fallback to backend console SMS

---

## Current Limitations

1. **Biometric Mode:** Defaults to mock mode (always match=true). Set `BIOMETRIC_MODE=rekognition` for production with AWS credentials.
2. **Liveness Detection:** Camera captures static photo. No anti-spoofing. Consider ML Kit Face Detection for production.
3. **Admin Dashboard Payments/Customers:** Sidebar items exist but show "Coming Soon". Features deferred to later phase.
4. **Integration Tests:** Not yet implemented (significant gap for production).
5. **Key Rotation:** Procedure not yet documented.
6. **GDPR Endpoints:** Data export/deletion endpoints not yet implemented.
7. **Logout:** Token cleared locally but no backend token invalidation endpoint.
8. **Firebase Quota:** Free tier limited to 10K phone auth verifications/month.

---

## Commands Reference

```bash
# Development
npm run dev:api                    # Start API dev server (port 3000)
npm run dev:web                    # Start web admin (port 3001, proxies /api)
npm run prisma:studio              # Open Prisma Studio

# Database
npm run prisma:generate            # Generate Prisma client
npm run prisma:migrate             # Run migrations (prisma migrate deploy)
npm run seed:admin                 # Seed admin user (admin@wheelsongo.com / Admin123!)

# Testing
npm run test:api                   # Run all backend tests (122 passing)
npm run test:api -- --watch        # Watch mode

# Build
npm run build:api                  # Production API build
npm run build:web                  # Production web build (302KB JS + 19KB CSS)
npm run start:api                  # Start production server

# Mobile (Windows — invoke java directly)
cd apps/mobile && "/c/Users/Kenneth Ayade/.jdks/jbr-21.0.10/bin/java" \
  -classpath gradle/wrapper/gradle-wrapper.jar \
  org.gradle.wrapper.GradleWrapperMain assembleDebug
```

---

This document serves as a comprehensive reference for the Wheels On Go platform. All critical information about the architecture, database schema, security implementation, business rules, and project status is captured here for future conversations.
