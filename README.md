# Wheels On Go Platform

A ride-hailing platform built as a monorepo — NestJS REST API (backend), Kotlin + Jetpack Compose (Android app), and React + Vite (web admin dashboard).

## Apps

| App | Path | Description |
|-----|------|-------------|
| **API** | `apps/api` | NestJS REST API + WebSocket gateways |
| **Mobile** | `apps/mobile` | Android app (Kotlin + Jetpack Compose) |
| **Web Admin** | `apps/web` | Admin dashboard (React + Vite + Tailwind) |

## Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 18+, NestJS 10, Prisma ORM, PostgreSQL |
| **Authentication** | JWT (OTP-first) + Firebase Phone Auth + admin email/password |
| **Encryption** | AES-256-GCM at rest, TLS 1.3 in transit |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Maps** | Google Maps Platform (Android SDK, Directions, Distance Matrix, Geocoding, Places) |
| **WebSocket** | Socket.IO — `/dispatch` (ride matching) + `/tracking` (GPS + geofencing) |
| **Mobile** | Kotlin + Jetpack Compose, Retrofit, DataStore, Socket.IO client |
| **Web Admin** | React 18, TypeScript, Vite 7, Tailwind CSS 4, React Router v7, Axios |
| **Deployment** | Render.com (API), port 3000 |

## Quick Start

### Backend API

```bash
# 1. Copy and fill env file
cp apps/api/.env.example apps/api/.env

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npm run prisma:generate

# 4. Apply migrations
cd apps/api && npx prisma migrate deploy

# 5. Seed admin user
npm run seed:admin   # admin@wheelsongo.com / Admin123!

# 6. Start dev server (port 3000)
npm run dev:api

# 7. Run tests (122 passing)
npm run test:api
```

### Web Admin Dashboard

```bash
# Start dev server (port 3001, proxies /api to localhost:3000)
npm run dev:web

# Open http://localhost:3001
# Login: admin@wheelsongo.com / Admin123!

# Production build
npm run build:web
```

### Android App (Mobile)

```bash
# Build APK (Windows — invoke java directly due to gradlew issues)
cd apps/mobile
"/c/Users/Kenneth Ayade/.jdks/jbr-21.0.10/bin/java" \
  -classpath gradle/wrapper/gradle-wrapper.jar \
  org.gradle.wrapper.GradleWrapperMain assembleDebug
```

## Environment Variables (apps/api/.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Auth
JWT_SECRET=your-jwt-secret
ACCESS_TOKEN_TTL=15m
BIOMETRIC_TOKEN_TTL=5m

# Encryption (CRITICAL — 64 hex chars)
ENCRYPTION_KEY=your-64-hex-char-key

# OTP/SMS (emulator: console, real phone: Firebase)
SMS_PROVIDER=console
ALLOW_DEBUG_SMS=true

# Firebase Phone Auth (real phones)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@....iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cloudflare R2 (S3-compatible)
STORAGE_BUCKET=your-bucket
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
STORAGE_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=auto

# Google Maps
GOOGLE_MAPS_API_KEY=your-api-key

# Biometric (mock for dev, rekognition for prod)
BIOMETRIC_MODE=mock

# CORS (includes web admin)
CORS_ORIGINS=http://localhost:3001
```

## Key API Endpoints

### Auth
- `POST /auth/request-otp` — Request OTP (emulators: console SMS)
- `POST /auth/verify-otp` — Verify OTP, receive JWT tokens
- `POST /auth/verify-firebase` — Verify Firebase ID token (real phones)
- `POST /auth/biometric/verify` — Driver face verification
- `POST /auth/admin/login` — Admin email/password login
- `GET /auth/me` — Current user

### Admin (require admin JWT)
- `GET /admin/stats` — Dashboard stats
- `GET /admin/bookings` — Paginated bookings with filters
- `GET /admin/drivers` — All drivers (paginated, searchable)
- `GET /admin/drivers/:id` — Driver detail with document presigned URLs
- `POST /admin/drivers/:id/approve` — Approve driver
- `POST /admin/drivers/:id/reject` — Reject with reason

### Driver KYC
- `POST /drivers/kyc/presign` — Get presigned upload URL
- `POST /drivers/kyc/confirm` — Confirm upload
- `GET /drivers/kyc` — Get KYC status

### Rides
- `POST /rides` — Create ride (triggers WebSocket dispatch)
- `GET /rides/:id` — Get ride details
- `POST /rides/:id/arrive` / `start` / `complete` / `cancel` — Status transitions

### Vehicles & Pricing
- `POST /rider-vehicles` / `GET` / `DELETE /:id` / `PATCH /:id/default`
- `GET /pricing/fare-estimate` — Surge-adjusted estimate
- `POST /pricing/promo/validate` — Validate promo code

## WebSocket Namespaces

| Namespace | Purpose |
|-----------|---------|
| `/dispatch` | Ride matching — new requests, accept/decline, timeout/expire |
| `/tracking` | Real-time GPS + geofence events (APPROACHING/ARRIVED at PICKUP/DROPOFF) |

## Repo Structure

```
Wheels_On_Go/
├── apps/
│   ├── api/          # NestJS backend
│   ├── mobile/       # Android app
│   └── web/          # React admin dashboard
├── packages/
│   └── shared/       # API contract docs
├── docs/             # Project documentation
├── changes/          # Detailed change logs
├── CHANGELOG.md      # Living change log
└── render.yaml       # Render deployment config
```

## Implementation Status

### ✅ Phase 1 — Authentication & KYC (Weeks 1–3)
- OTP login (Firebase for real phones, console SMS for emulators)
- Driver KYC upload (Cloudflare R2 presigned URLs)
- Biometric face verification (mock + AWS Rekognition)
- AES-256-GCM PII encryption + audit logging
- Session resume (token refresh)
- Hamburger menu (AppDrawer)

### ✅ Phase 2 — Core Booking Engine (Weeks 4–5)
- RiderVehicle CRUD
- Surge pricing (Haversine demand/supply, 1.0x–2.0x, 5 tiers)
- Promo codes (PERCENTAGE + FIXED_AMOUNT)
- WebSocket ride dispatch + matching engine
- Rider: BookingConfirmScreen + ActiveRideScreen (live map, ETA, geofencing)
- Driver: DriveRequestsScreen + DriverActiveRideScreen (map + phase CTAs) + DriverTripCompletionScreen
- Real-time GPS tracking (TrackingSocketClient, 3s interval)
- Geofence events (200m APPROACHING, 50m ARRIVED for pickup and dropoff)
- Turn-by-turn navigation (Google Maps intent)
- Actual fare calculation from GPS trail on COMPLETED

### ✅ Phase 3 Week 7 — Admin Web Dashboard
- Email/password admin login (admin@wheelsongo.com / Admin123!)
- Dashboard stat cards (live data)
- Driver verification UI (document viewer with zoom, approve/reject)
- Bookings table (status/date/fare filters, pagination)
- React + Vite + Tailwind CSS 4 at `apps/web/`, port 3001

### 📅 Remaining — Weeks 6, 8–9
- Financial features (payments, wallets, transactions)
- Communication (masked calls, notifications)
- Safety (BLOWBAGETS checklist, fatigue detection, SOS)
- Integration + E2E tests
- Production hardening + load testing

## Testing

```bash
# Backend (122 passing, 13 suites)
cd apps/api && npm test

# Web admin TypeScript check
cd apps/web && npx tsc -b

# Web admin build
cd apps/web && npx vite build
```

Mobile tests (87 across 12 files) compile correctly but are blocked from running by a JBR-21 JVM GC bug. APK builds and installs fine.

## Deployment

Render config: `render.yaml`. Set all env vars (DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, Firebase credentials, R2 credentials, GOOGLE_MAPS_API_KEY) in the Render dashboard. Build command: `npm install && npm run prisma:generate && npm run build:api`. Start command: `npm run start:api`.
