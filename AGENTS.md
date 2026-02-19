# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Wheels On Go (Valet&Go) is a ride-hailing platform with:
- **Backend**: NestJS 10 + Prisma + PostgreSQL REST API (`apps/api`)
- **Mobile**: Kotlin + Jetpack Compose Android app (`apps/mobile`)

Current status: Phase 2 complete (Firebase Phone Auth, KYC via Cloudflare R2, biometric login, booking engine with surge pricing, promo codes, and WebSocket dispatch).

## Build & Run Commands

```bash
# Install dependencies (from repo root)
npm install

# Backend development
npm run dev:api              # Start NestJS dev server (port 3000)
npm run build:api            # Production build
npm run start:api            # Start production server

# Database
npm run prisma:generate      # Generate Prisma client (required after schema changes)
npm run prisma:migrate       # Apply migrations (production)
npm run prisma:studio        # Open Prisma Studio GUI

# Testing
npm run test:api             # Run all backend tests (121 tests, 13 suites)
npm run test:api -- --watch  # Watch mode
npm run test:api -- --testNamePattern="pattern"  # Run specific tests

# Mobile (from apps/mobile directory, requires JAVA_HOME set to Android Studio JBR)
./gradlew assembleDebug      # Build debug APK
./gradlew testDebugUnitTest  # Run mobile unit tests
```

## Architecture

### Backend (`apps/api/src/`)

NestJS modular architecture with these domains:

| Module | Purpose |
|--------|---------|
| `auth/` | OTP flow, JWT tokens, Firebase Phone Auth, biometric verification |
| `driver/` | Driver profiles, KYC document management, admin approval |
| `ride/` | Ride creation, fare estimation with surge pricing + promo codes |
| `rider-vehicle/` | Rider vehicle CRUD |
| `dispatch/` | WebSocket gateway for real-time driver matching |
| `tracking/` | WebSocket gateway for driver location updates |
| `storage/` | S3-compatible storage (Cloudflare R2) for KYC uploads |
| `encryption/` | AES-256-GCM encryption for PII fields |
| `audit/` | 51 audit actions for GDPR compliance logging |

**Key patterns:**
- Controllers use `@Roles()` decorator + `JwtAuthGuard` for auth
- Services inject `PrismaService` for database access
- PII fields auto-encrypted via Prisma middleware in `prisma.service.ts`
- DTOs use `class-validator` decorators for validation

### Mobile (`apps/mobile/app/src/main/java/com/wheelsongo/app/`)

MVVM architecture with Jetpack Compose:

| Layer | Location | Purpose |
|-------|----------|---------|
| Data | `data/network/` | Retrofit API interfaces (`AuthApi`, `RideApi`, etc.) |
| Data | `data/repository/` | Repository pattern wrapping API calls |
| Data | `data/auth/` | `TokenManager` (DataStore), `FirebasePhoneAuthHelper` |
| UI | `ui/screens/` | Compose screens organized by feature |
| UI | `ui/navigation/Routes.kt` | Navigation graph definitions |
| Entry | `AppNav.kt` | Main navigation host (26KB, core routing logic) |

**Key patterns:**
- `AuthInterceptor` auto-injects JWT from `TokenManager`
- Firebase Phone Auth on real devices, backend console SMS on emulators (detected via `DeviceUtils`)
- WebSocket clients in `data/network/` for dispatch and tracking

### Database (`apps/api/prisma/schema.prisma`)

40+ models, key ones:
- `User` (RIDER/DRIVER/ADMIN roles)
- `DriverProfile`, `DriverDocument` (KYC)
- `Ride`, `DispatchAttempt`, `SurgePricingLog`, `PromoCode`
- `RiderVehicle` (vehicles registered by riders)

Encrypted fields: `User.phoneNumber`, `User.email` (with hash columns for search).

## Testing

Backend tests live in `apps/api/test/` using Jest with ts-jest:
- Unit tests mock `PrismaService` and external services
- Test files follow pattern `*.spec.ts`

Run a single test file:
```bash
npm run test:api -- --testPathPattern="auth.service"
```

## Environment Setup

Copy `apps/api/.env.example` to `apps/api/.env`. Critical variables:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Token signing
- `ENCRYPTION_KEY` - 64 hex chars for AES-256-GCM
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` - Phone auth
- `STORAGE_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - R2 storage

## Key Business Logic

**Fare calculation:**
```
totalFare = baseFare + (distance × costPerKm) + (duration × costPerMin) + surge - promoDiscount
```

**Driver matching:** Haversine distance within 5km radius, dispatch to closest, expand radius on decline.

**Surge pricing:** 5 tiers (1.0x–2.0x) based on demand/supply ratio in area.

## Deployment

Render.com via `render.yaml`. Build command:
```bash
npm install && npm run prisma:generate && npm run build:api
```

## Documentation

- `docs/project-knowledge-base.md` - Comprehensive project reference
- `docs/database-schema.md` - Full schema documentation
- `docs/data-privacy-policy.md` - GDPR/CCPA compliance details
- `CHANGELOG.md` - Detailed change history
