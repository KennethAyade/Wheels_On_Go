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
| **AI Verification** | Claude Sonnet Vision (document + breathalyzer analysis via Anthropic SDK) |
| **Authentication** | JWT (OTP-first) + Firebase Phone Auth + admin email/password |
| **Encryption** | AES-256-GCM at rest, TLS 1.3 in transit |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Maps** | Google Maps Platform (Android SDK, Directions, Distance Matrix, Geocoding, Places) |
| **WebSocket** | Socket.IO — `/dispatch` (ride matching) + `/tracking` (GPS + geofencing) + `/chat` (in-app messaging) |
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

# 7. Run tests (267 passing, 28 suites)
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

# AI Document & Breathalyzer Verification (Anthropic Claude)
ANTHROPIC_API_KEY=your-anthropic-api-key

# CORS (includes web admin)
CORS_ORIGINS=http://localhost:3001
```

## Key API Endpoints

### Auth
- `POST /auth/admin/login` — Admin email/password login
- `POST /auth/request-otp` — Request OTP (emulators: console SMS)
- `POST /auth/verify-otp` — Verify OTP, receive JWT tokens
- `POST /auth/verify-firebase` — Verify Firebase ID token (real phones)
- `POST /auth/biometric/verify` — Driver face verification
- `POST /auth/refresh` — Refresh access token
- `POST /auth/logout` — Revoke refresh token
- `GET /auth/me` — Current user
- `PATCH /auth/profile` — Update rider profile
- `POST /auth/profile-photo` — Upload profile photo (base64)
- `DELETE /auth/me` — Delete account

### Admin (require admin JWT)
- `GET /admin/stats` — Dashboard stats (incl. fatigue metrics)
- `GET /admin/bookings` — Paginated bookings with filters
- `GET /admin/drivers` — All drivers (paginated, searchable)
- `GET /admin/drivers/:driverId` — Driver detail with document presigned URLs
- `POST /admin/drivers/:driverId/approve` — Approve driver
- `POST /admin/drivers/:driverId/reject` — Reject with reason

### Drivers
- `GET /drivers/available` — Find nearby available drivers
- `GET /drivers/:id/public-profile` — Driver public profile
- `PATCH /drivers/profile-setup` — Setup driver profile
- `PATCH /drivers/me/status` — Toggle online/offline
- `POST /drivers/kyc/presign` — Get presigned upload URL
- `POST /drivers/kyc/confirm` — Confirm upload
- `GET /drivers/kyc` — Get KYC status

### Rides
- `POST /rides` — Create ride (instant or scheduled; triggers WebSocket dispatch for instant, cron dispatch for scheduled)
- `POST /rides/estimate` — Fare estimate with surge + optional promo
- `GET /rides/scheduled` — List rider's upcoming scheduled rides
- `GET /rides/active` — Get current active ride
- `GET /rides/:id` — Get ride details
- `PATCH /rides/:id/status` — Update status (DRIVER_ARRIVED / STARTED / COMPLETED)
- `POST /rides/:id/sos` — Trigger SOS emergency
- `POST /rides/:id/cancel` — Cancel ride (notifies other party)

### Vehicles
- `POST /rider-vehicles` / `GET` / `GET /:id` / `PATCH /:id` / `DELETE /:id`
- `PATCH /rider-vehicles/:id/default` — Set default vehicle
- `POST /rider-vehicles/:id/documents?type=OR|CR` — Upload document

### Fatigue Detection
- `POST /fatigue/enroll-face` — Enroll driver face
- `POST /fatigue/check` — Run fatigue check (Gemini Vision AI)
- `GET /fatigue/status` — Go-online eligibility

### Safety Checklists
- `GET /checklist/breathalyzer/status` — Check breathalyzer cooldown
- `POST /checklist/breathalyzer/presign` — Get presigned URL for breathalyzer image
- `POST /checklist/breathalyzer/confirm` — Upload + AI verify (PASS/FAIL/INVALID_IMAGE)
- `POST /checklist/blowbagets/submit` — Submit 10-item vehicle safety checklist
- `GET /checklist/blowbagets/:rideId` — Get checklist for ride

### Ratings
- `POST /ratings` — Rate a completed ride

### Payments
- `POST /rides/:id/confirm-cash-payment` — Driver confirms cash received

### Subscriptions
- `GET /subscriptions/plans` — List subscription plans
- `GET /subscriptions/me` — Get current subscription
- `POST /subscriptions/subscribe` — Subscribe to a plan
- `DELETE /subscriptions/me` — Cancel subscription

### Driver Earnings
- `GET /drivers/me/earnings` — Earnings summary (today/week/month/total)
- `GET /drivers/me/earnings/transactions` — Paginated transaction history
- `GET /drivers/me/wallet` — Wallet balance

### Chat (In-App Messaging)
- `GET /chat/:rideId/messages` — Get chat history (REST fallback)

### Admin — Transactions
- `GET /admin/transactions` — Paginated transactions with filters (type, status, method, date range)

## WebSocket Namespaces

| Namespace | Purpose |
|-----------|---------|
| `/dispatch` | Ride matching — new requests, accept/decline, timeout/expire |
| `/tracking` | Real-time GPS + geofence events (APPROACHING/ARRIVED at PICKUP/DROPOFF) |
| `/chat` | In-app rider-driver messaging during active rides (JWT auth, read receipts) |

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
- Dashboard stat cards (live data incl. fatigue metrics)
- Driver verification UI (document viewer with zoom, approve/reject)
- Bookings table (status/date/fare filters, pagination)
- React + Vite + Tailwind CSS 4 at `apps/web/`, port 3001

### ✅ Safety & Profile Features (Feb 22–28)
- Fatigue detection via Gemini Vision AI (4 levels with cooldowns)
- Face enrollment for fatigue checks
- SOS emergency triggers (`POST /rides/:id/sos`)
- Ride ratings (`POST /ratings`)
- User profile management (update, photo upload, account deletion)
- Driver profile setup + online/offline status
- Ride cancellation notifications via WebSocket
- Settings screen with biometric preferences

### ✅ Week 8 — Financial Module + In-App Chat
- Static payment gateway (simulated GCash/Card auto-completion, driver cash confirmation)
- Subscription plans (Basic 5%, Premium 10%, VIP 20% fare discount)
- Driver earnings dashboard (wallet balance, summary, transaction history)
- In-App real-time chat (Socket.IO `/chat` namespace, JWT auth, read receipts)
- Admin payments page with filters and CSV export
- 150 new unit tests (100 backend + 50 mobile)

### ✅ Week 9 — AI Verification, Breathalyzer Gate, BLOWBAGETS Checklist
- AI-powered document verification (Claude Sonnet vision) — auto-verifies LICENSE and GOVERNMENT_ID uploads, auto-rejects invalid docs
- Breathalyzer safety gate — per-ride breathalyzer upload + AI BAC analysis before ride acceptance (fail-closed, 8h cooldown on FAIL)
- BLOWBAGETS 10-item vehicle safety inspection at pickup — gates "Start Ride" behind completion
- Chat enhancement — actual driver/rider names + tappable phone numbers
- New VerificationModule + ChecklistModule (5 REST endpoints)

### ✅ Week 10 — Advanced Booking / Schedule a Trip
- Scheduled rides: riders can book rides up to 7 days in advance (30 min minimum lead time)
- Cron-based dispatch triggers 15 min before scheduled pickup (`@nestjs/schedule`)
- Up to 3 concurrent scheduled rides alongside instant rides
- BookingConfirmScreen: "Ride Now" / "Schedule" toggle with Material3 DatePicker + TimePicker
- ScheduledRidesScreen: view upcoming rides, cancel pending rides, pull-to-refresh
- WebSocket events: `scheduled_ride:dispatching`, `scheduled_ride:expired`
- Drawer menu: "Scheduled Rides" entry for riders

### 📅 Remaining — Weeks 11+
- Communication (masked calls, push notifications)
- Integration + E2E tests
- Production hardening + load testing

## Testing

```bash
# Backend (267 passing, 28 suites)
cd apps/api && npm test

# Web admin TypeScript check
cd apps/web && npx tsc -b

# Web admin build
cd apps/web && npx vite build
```

Mobile tests: 137+ across 20 files — all passing.

## Deployment

Render config: `render.yaml`. Set all env vars (DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, Firebase credentials, R2 credentials, GOOGLE_MAPS_API_KEY) in the Render dashboard. Build command: `npm install && npm run prisma:generate && npm run build:api`. Start command: `npm run start:api`.
