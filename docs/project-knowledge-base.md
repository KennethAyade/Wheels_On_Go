# Wheels On Go Platform - Complete Knowledge Base

**Repository:** `g:\WORK\Freelance\Wheels_On_Go`
**Last Updated:** 2026-03-25
**Branch:** develop (main branch: main)

---

## Executive Summary

**Wheels On Go** (also branded as "Valet&Go") is a ride-hailing platform where **the rider owns the car** and hires only a driver. Built with NestJS + Prisma/PostgreSQL (backend), Kotlin + Jetpack Compose (mobile), and React + Vite + Tailwind CSS (web admin). **Phases 1–3 complete**, **Week 8 financial + chat complete**, **Week 9 safety verification complete**, and **Week 10 advanced booking complete**: Firebase Phone Auth, driver KYC (Cloudflare R2) with AI document verification (Claude Sonnet vision), biometric login, RiderVehicle CRUD, surge pricing, promo codes, WebSocket dispatch, real-time tracking with geofencing, actual fare calculation, full driver booking flow, admin web dashboard, fatigue detection via Gemini Vision AI, SOS emergency triggers, ride ratings, user profile management, ride cancellation notifications, static payment gateway (GCash/Card/Cash), subscription plans with fare discounts, driver earnings dashboard, in-app real-time chat, per-ride breathalyzer safety gate (AI-verified, fail-closed), BLOWBAGETS 10-item vehicle safety inspection at pickup, admin reports dashboard (aggregated financial, operational, safety, subscription, and driver insights with date range filtering and CSV export), admin-to-user direct messaging (CommentsDrawer slide-over panel for private admin-driver/rider communication), scheduled ride booking (advance booking up to 7 days with cron-based dispatch, ScheduledRidesScreen, and concurrent ride support), and UX polish (scroll-wheel time picker, pinned location reverse geocoding, PlaceSearch "Use current location" option, admin logo rebrand) are all implemented end-to-end.

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
| 2026-02-22 | Driver/rider profile setup, driver approval response, ride pricing fix | ✅ Complete |
| 2026-02-23 | CORS env config, admin login enhancements, admin seed fix in Render build | ✅ Complete |
| 2026-02-27 | Fatigue detection (Gemini Vision AI), face enrollment, admin fatigue metrics, settings screen | ✅ Complete |
| 2026-02-28 | SOS functionality, ride cancellation notifications, rating system, error handling | ✅ Complete |
| 2026-03-06 | Week 7 Enhanced — Admin analytics, customers, incidents, audit logs, ratings, booking detail, dashboard charts | ✅ Complete |
| 2026-03-13 | Week 8 — Payment gateway, subscriptions, driver earnings, in-app chat, 150 new tests | ✅ Complete |
| 2026-03-18 | Week 9 — AI document verification (Claude Sonnet), breathalyzer safety gate, BLOWBAGETS checklist, chat enhancement | ✅ Complete |
| 2026-03-21 | Week 9b — Admin Reports dashboard (aggregated financial/operations/safety/subscription/driver reports with date range + CSV export) | ✅ Complete |
| 2026-03-21 | Week 9c — Admin-to-user direct messaging (CommentsDrawer, private admin-driver/rider chat from DriverDetail + Customers pages, mobile API endpoints) | ✅ Complete |
| 2026-03-24 | Week 10 — Advanced Booking / Schedule a Trip (scheduled rides up to 7 days, cron dispatch 15 min before, ScheduledRidesScreen, up to 3 concurrent) | ✅ Complete |
| 2026-03-25 | Week 10 Polish — Scroll-wheel time picker, schedule button bug fix, pinned location reverse geocoding, PlaceSearch improvements, admin logo update | ✅ Complete |
| Week 11+ | Communication (masked calls, push notifications), integration + E2E tests, production hardening | 📅 Planned |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 18+, NestJS 10 |
| **Database** | PostgreSQL via Prisma ORM 5.15 |
| **Authentication** | JWT with OTP-first flow + admin email/password |
| **Encryption** | AES-256-GCM (at rest), TLS 1.3 (in transit) |
| **AI Verification** | Claude Sonnet Vision (document + breathalyzer analysis via Anthropic SDK) |
| **Biometrics** | AWS Rekognition (with mock mode) |
| **Storage** | Cloudflare R2 (S3-compatible, free tier: 10GB) |
| **SMS/OTP** | Firebase Phone Auth (real phones, 10K/month free), console SMS (emulators) |
| **Maps** | Google Maps SDK (Android), Geocoding, Places, Distance Matrix, Directions APIs |
| **Mobile** | Kotlin + Jetpack Compose, Retrofit, DataStore, Socket.IO client |
| **Web Admin** | React 18 + TypeScript + Vite 7 + Tailwind CSS 4 + React Router v7 + Axios |
| **WebSocket** | Socket.IO (NestJS gateway) — `/dispatch`, `/tracking`, and `/chat` namespaces |
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
│   │   │   ├── ride/                   # Ride creation, status, fare estimation, SOS, scheduled ride dispatch
│   │   │   ├── dispatch/              # WebSocket dispatch + routing engine
│   │   │   ├── tracking/              # Real-time location + geofencing
│   │   │   ├── rider-vehicle/         # Rider vehicle CRUD + document uploads
│   │   │   ├── fatigue/               # Fatigue detection (Gemini Vision AI) + face enrollment
│   │   │   ├── rating/                # Ride ratings
│   │   │   ├── geofence/              # Geofence event tracking
│   │   │   ├── location/              # Geocoding, autocomplete, distance, place details
│   │   │   ├── biometric/             # Face recognition (AWS Rekognition/mock)
│   │   │   ├── storage/               # S3-compatible storage for uploads
│   │   │   ├── encryption/            # AES-256-GCM PII encryption
│   │   │   ├── audit/                 # Comprehensive audit logging
│   │   │   ├── payment/               # Static payment gateway (GCash/Card/Cash)
│   │   │   ├── subscription/          # Premium subscription plans
│   │   │   ├── earnings/              # Driver earnings + wallet
│   │   │   ├── chat/                  # In-app messaging (Socket.IO /chat)
│   │   │   ├── verification/          # AI document verification (Claude Sonnet vision)
│   │   │   ├── checklist/             # Breathalyzer + BLOWBAGETS safety checklist
│   │   │   ├── admin-messaging/       # Admin-to-user direct messaging (separate from ride chat)
│   │   │   ├── common/                # Guards, decorators, types
│   │   │   ├── health/                # Health check endpoint
│   │   │   ├── prisma/                # Prisma service & middleware
│   │   │   └── main.ts                # Application bootstrap
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # 40+ data models
│   │   │   ├── seed-admin.ts          # Admin user seed script
│   │   │   └── migrations/            # Database migrations
│   │   ├── scripts/                   # Database utilities
│   │   └── test/                      # Unit tests (267 passing, 28 suites)
│   ├── mobile/                        # Android app (Kotlin/Compose)
│   └── web/                           # React admin dashboard
│       ├── src/
│       │   ├── api/                   # Axios API clients
│       │   ├── context/               # AuthContext (JWT)
│       │   ├── components/            # Layout, Sidebar, StatusBadge, etc.
│       │   ├── pages/                 # Login, Dashboard, Drivers, Bookings, Analytics, Customers, Incidents, AuditLogs, Payments, Reports (+ CommentsDrawer on DriverDetail/Customers)
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
| POST | `/auth/admin/login` | Public | Admin email + password login (throttled 5/60s) |
| POST | `/auth/request-otp` | Public | Request OTP code (throttled 3/60s) |
| POST | `/auth/verify-otp` | Public | Verify OTP, receive tokens |
| POST | `/auth/verify-firebase` | Public | Verify Firebase ID token (real phones) |
| POST | `/auth/biometric/verify` | Biometric token | Face recognition verification |
| POST | `/auth/refresh` | Refresh token | Refresh access token (with token rotation) |
| POST | `/auth/logout` | Public | Revoke refresh token |
| GET | `/auth/me` | JWT | Get current user profile |
| PATCH | `/auth/profile` | JWT | Update rider profile (firstName, lastName, age, address) |
| POST | `/auth/profile-photo` | JWT | Upload profile photo (base64) |
| DELETE | `/auth/me` | JWT | Soft-delete user account |

### Driver Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/drivers/available` | JWT (any role) | Find available drivers near location (?lat, lng, radiusKm) |
| GET | `/drivers/:id/public-profile` | JWT (any role) | Get driver public profile |
| GET | `/drivers/me` | Driver JWT | Get own driver profile |
| POST | `/drivers/kyc/presign` | Driver JWT | Request presigned upload URL for KYC doc |
| POST | `/drivers/kyc/confirm` | Driver JWT | Confirm document upload |
| PATCH | `/drivers/profile-setup` | Driver JWT | Setup/update driver profile (license, expiry, etc.) |
| PATCH | `/drivers/me/status` | Driver JWT | Update online/offline status |
| GET | `/drivers/kyc` | Driver JWT | Get KYC documents + upload status |

### Admin — Driver Verification
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/drivers` | Admin JWT | List all drivers (paginated, filterable by status/search) |
| GET | `/admin/drivers/pending` | Admin JWT | List pending driver approvals |
| GET | `/admin/drivers/:driverId` | Admin JWT | Get driver detail with presigned document URLs |
| POST | `/admin/drivers/:driverId/approve` | Admin JWT | Approve driver |
| POST | `/admin/drivers/:driverId/reject` | Admin JWT | Reject driver with reason |

### Admin — Dashboard & Bookings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/stats` | Admin JWT | Dashboard stats (activeRides, onlineDrivers, totalRiders, pendingVerifications, todayRevenue, driversFaceEnrolled, driversOnCooldown) |
| GET | `/admin/bookings` | Admin JWT | List bookings (paginated, status/date/fare/search filters) |
| GET | `/admin/bookings/:id` | Admin JWT | Full booking detail with rider, driver, driverProfile, vehicle, rating, sosIncident, dispatch attempts, route |
| PATCH | `/admin/bookings/:id/status` | Admin JWT | Cancel booking (CANCELLED_BY_SYSTEM). Validates cancellable status |

### Admin — Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/analytics/overview` | Admin JWT | Time-series: rides/day, revenue/day, newUsers/day. Query: `?days=30` (default 30, max 90) |
| GET | `/admin/analytics/drivers` | Admin JWT | Driver approval rate, counts by status, top 10 drivers by totalRides |

### Admin — Customer Management
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | Admin JWT | Paginated rider list. Filters: search, suspended |
| PATCH | `/admin/users/:id/suspend` | Admin JWT | Suspend user with reason (min 5 chars). Cannot suspend admins |
| PATCH | `/admin/users/:id/reactivate` | Admin JWT | Reactivate suspended user |

### Admin — SOS Incidents
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/incidents` | Admin JWT | Paginated SOS incidents. Filters: status, type, dateFrom, dateTo |
| PATCH | `/admin/incidents/:id` | Admin JWT | Update status (ACKNOWLEDGED/RESPONDING/RESOLVED/FALSE_ALARM) |

### Admin — Audit Logs & Ratings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/audit-logs` | Admin JWT | Paginated audit logs. Filters: action, targetType, actorUserId, dates |
| GET | `/admin/ratings` | Admin JWT | Aggregate rating stats + paginated recent ratings |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/rides/:id/confirm-cash-payment` | Driver JWT | Confirm cash payment received (CASH rides only) |

### Subscriptions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/subscriptions/plans` | JWT | List available subscription plans |
| GET | `/subscriptions/me` | JWT | Get current subscription status |
| POST | `/subscriptions/subscribe` | JWT | Subscribe to a plan (30-day duration, simulated payment) |
| DELETE | `/subscriptions/me` | JWT | Cancel active subscription |

### Driver Earnings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/drivers/me/earnings` | Driver JWT | Earnings summary (today/week/month/total) |
| GET | `/drivers/me/earnings/transactions` | Driver JWT | Paginated transaction history with commission breakdown |
| GET | `/drivers/me/wallet` | Driver JWT | Wallet balance |

### Chat (In-App Messaging)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/chat/:rideId/messages` | JWT | Get chat history (REST fallback) |

### Admin — Transactions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/transactions` | Admin JWT | Paginated transactions with type/status/paymentMethod/date filters |

### Admin — Reports
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/reports/summary` | Admin JWT | Aggregated reports: financial (gross/commission/net/byMethod/byType), operations (rides/completion rate/byStatus), safety (breathalyzer/BLOWBAGETS/fatigue/SOS), subscriptions (active/new/cancelled/byPlan), drivers (approved/online/wallets/topEarners). Query: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` (defaults to last 30 days) |

### Admin — Direct Messaging
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/messaging/threads` | Admin JWT | List conversation threads (users with last message, unread count) |
| GET | `/admin/users/:userId/messages` | Admin JWT | Get messages between admin and user |
| POST | `/admin/users/:userId/messages` | Admin JWT | Send message to user `{ content }` |
| PATCH | `/admin/users/:userId/messages/read` | Admin JWT | Mark user's messages as read |
| GET | `/messages/admin` | JWT | Mobile: get messages from admin |
| POST | `/messages/admin` | JWT | Mobile: reply to admin `{ content }` |
| PATCH | `/messages/admin/read` | JWT | Mobile: mark admin messages as read |
| GET | `/messages/admin/unread-count` | JWT | Mobile: unread admin message count |

### Safety Checklists
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/checklist/breathalyzer/status` | Driver JWT | Check breathalyzer cooldown status |
| POST | `/checklist/breathalyzer/presign` | Driver JWT | Get R2 presigned URL for breathalyzer image |
| POST | `/checklist/breathalyzer/confirm` | Driver JWT | Confirm upload + AI verification (PASS/FAIL/INVALID_IMAGE) |
| POST | `/checklist/blowbagets/submit` | Driver JWT | Submit 10-item vehicle safety checklist |
| GET | `/checklist/blowbagets/:rideId` | Driver JWT | Get BLOWBAGETS checklist for a ride |

### Rides & Booking
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/rides` | Rider JWT | Create ride (triggers dispatch for INSTANT, or notifies selected driver) |
| POST | `/rides/estimate` | JWT | Get fare estimate with surge pricing and optional promo code |
| GET | `/rides/active` | JWT | Get current active ride for user |
| GET | `/rides/:id` | JWT | Get ride details |
| PATCH | `/rides/:id/status` | Driver/Admin JWT | Update ride status (DRIVER_ARRIVED, STARTED, COMPLETED) |
| POST | `/rides/:id/sos` | JWT | Trigger SOS emergency (creates SosIncident) |
| POST | `/rides/:id/cancel` | JWT | Cancel ride (notifies other party via WebSocket) |

### Rider Vehicles
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/rider-vehicles` | Rider JWT | Register vehicle (idempotent by plate) |
| GET | `/rider-vehicles` | Rider JWT | List rider vehicles |
| GET | `/rider-vehicles/:id` | Rider JWT | Get vehicle by ID |
| PATCH | `/rider-vehicles/:id` | Rider JWT | Update vehicle details |
| DELETE | `/rider-vehicles/:id` | Rider JWT | Delete vehicle |
| PATCH | `/rider-vehicles/:id/default` | Rider JWT | Set default vehicle |
| POST | `/rider-vehicles/:id/documents` | Rider JWT | Upload OR/CR document (?type=OR or ?type=CR) |

### Fatigue Detection
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/fatigue/enroll-face` | Driver JWT | Enroll driver face for fatigue checks (base64 image) |
| POST | `/fatigue/check` | Driver JWT | Run fatigue detection (Gemini Vision AI analysis) |
| GET | `/fatigue/status` | Driver JWT | Get fatigue status and go-online eligibility |

### Ratings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ratings` | Rider JWT | Rate a completed ride |

### Location
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/location/geocode` | JWT | Geocode address to coordinates |
| POST | `/location/reverse-geocode` | JWT | Reverse geocode coordinates to address |
| GET | `/location/autocomplete` | JWT | Place autocomplete suggestions |
| GET | `/location/place/:placeId` | JWT | Get place details by Google Place ID |
| POST | `/location/distance` | JWT | Calculate distance between two points (Google API) |
| GET | `/location/haversine-distance` | JWT | Calculate Haversine distance (no API call) |

### Tracking
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tracking/location` | Driver JWT | Update driver location (HTTP fallback for WebSocket) |
| GET | `/tracking/ride/:rideId/driver` | JWT | Get driver's current location for a ride |
| GET | `/tracking/driver/:driverProfileId/history` | Admin JWT | Get driver location history (last 24h) |

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

### `/chat` Namespace
| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:join` | Client → Server | Join ride chat room (JWT auth required) |
| `chat:send` | Client → Server | Send message to other participant |
| `chat:message` | Server → Client | New message received |
| `chat:read` | Client → Server | Mark messages as read |
| `chat:history` | Server → Client | Chat history on room join |

---

## Database Schema Summary

### Phase 1 Models (7 Implemented)
1. **User** — Core identity (RIDER/DRIVER/ADMIN roles), passwordHash for admin login
2. **OtpCode** — OTP management with TTL and attempts
3. **DriverProfile** — Driver status and metrics, `breathalyzerCooldownUntil` for breathalyzer failures
4. **DriverDocument** — KYC documents (LICENSE, GOVERNMENT_ID, PROFILE_PHOTO), `VERIFIED` status via AI, `rejectionReason` for AI rejections
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
| **Safety & Intelligence** | FatigueDetectionLog, SosIncident, BlowbagetsChecklist (with breathalyzer fields + rideId) |
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

### Current Coverage (as of Mar 18, 2026)
| Component | Unit | Integration | E2E |
|-----------|------|-------------|-----|
| Backend Tests | ✅ 267 passing (28 suites) | ⚠️ Pending | ⚠️ Pending |
| Mobile Tests | ✅ 137+ passing (20 files) | ⚠️ Pending | ⚠️ Pending |
| EncryptionService | ✅ 100% (22 tests) | ⚠️ Pending | ⚠️ Pending |
| FirebaseService | ✅ 100% (5 tests) | ⚠️ Pending | ⚠️ Pending |
| AuthService | ✅ Firebase + admin login flows | ⚠️ Pending | ⚠️ Pending |
| RiderVehicleService | ✅ 100% (10 tests incl. idempotency) | ⚠️ Pending | ⚠️ Pending |
| SurgePricingService | ✅ (5 tests) | ⚠️ Pending | ⚠️ Pending |
| FatigueService | ✅ (12 tests) | ⚠️ Pending | ⚠️ Pending |
| PaymentService | ✅ (17 tests) | ⚠️ Pending | ⚠️ Pending |
| SubscriptionService | ✅ (29 tests) | ⚠️ Pending | ⚠️ Pending |
| EarningsService | ✅ (17 tests) | ⚠️ Pending | ⚠️ Pending |
| ChatService + Gateway | ✅ (31 tests) | ⚠️ Pending | ⚠️ Pending |
| AdminTransactionsController | ✅ (6 tests) | ⚠️ Pending | ⚠️ Pending |
| Web Admin Build | ✅ TypeScript clean, Vite build | N/A | ⚠️ Pending |
| PrismaMiddleware | N/A | ⚠️ Pending | ⚠️ Pending |
| AdminBookingsController | ✅ (4 tests) | ⚠️ Pending | ⚠️ Pending |
| AdminAnalyticsController | ✅ (5 tests) | ⚠️ Pending | ⚠️ Pending |
| AdminUsersController | ✅ (7 tests) | ⚠️ Pending | ⚠️ Pending |
| AdminIncidentsController | ✅ (6 tests) | ⚠️ Pending | ⚠️ Pending |
| AuditService | ⚠️ 0% | ⚠️ Pending | ⚠️ Pending |

### Testing Roadmap
- **Current:** Backend tests passing (28 suites, 267 tests); mobile 137+ tests all passing (20 files); web build clean
- **Next (Week 10):** Integration tests, E2E tests (6-8 hours)
- **Weeks 10–11:** Security tests, performance tests, load tests

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
REFRESH_TOKEN_TTL=30d

# Encryption (CRITICAL — must be exactly 64 hex chars)
ENCRYPTION_KEY=64-hex-characters-here

# OTP/SMS (providers: console, textbelt, twilio)
OTP_CODE_TTL_SECONDS=300
OTP_REQUESTS_PER_HOUR=5
SMS_PROVIDER=console
ALLOW_DEBUG_SMS=true
TEXTBELT_API_KEY=textbelt

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
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Google Maps Platform
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Fatigue Detection (Gemini Vision AI)
FATIGUE_MODE=mock|live
GEMINI_API_KEY=your-gemini-api-key

# AI Document & Breathalyzer Verification (Anthropic Claude)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Server
PORT=3000
NODE_ENV=development
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

### 6. BLOWBAGETS Safety Checklist (Per-Ride at Pickup)
- Driver inspects rider's vehicle at pickup (DRIVER_ARRIVED phase) — 10-item checklist (Brakes, Lights, Oil, Water, Battery, Air, Gas, Engine, Tools, Self)
- All 10 items must be checked; backend gates `DRIVER_ARRIVED → STARTED` transition behind completed checklist
- Shown inline in DriverActiveRideScreen; "Start Ride" button appears only after completion
- Expires after 24 hours

### 6b. Breathalyzer Safety Gate (Per-Ride before Acceptance)
- When driver taps "Accept" on a ride request, they must first upload a breathalyzer photo
- AI (Claude Sonnet Vision) analyzes the photo for BAC reading
- **PASS** (BAC ≤ 0.05): Ride acceptance proceeds via WebSocket
- **FAIL** (BAC > 0.05): 8-hour cooldown, ride not accepted (auto-expires and re-dispatches)
- **INVALID_IMAGE** (not a breathalyzer): No cooldown, driver can retry immediately
- **Fail-CLOSED strategy** — if AI can't analyze, returns INVALID_IMAGE (driver must retry)

### 7. Fatigue Detection (Gemini Vision AI)
- Uses `gemini-2.0-flash` multimodal model to analyze driver face images
- Analyzes: eye openness (0–1), yawning, head tilt, blank stare, heavy eyelids
- **NORMAL** (eyes > 0.7) — No cooldown, can go online
- **MILD** (eyes 0.5–0.7) — 30 min cooldown before going online
- **MODERATE** (eyes 0.3–0.5) — 60 min cooldown
- **SEVERE** (eyes < 0.3) — 120 min cooldown
- Fatigue check required every 2 hours while online
- Face enrollment required before first fatigue check
- Fail-safe: if Gemini fails, returns NORMAL (allows driver to proceed)

### 8. Subscription Fare Discount
```
estimatedFare = (baseFare + distanceFare + timeFare) × surgeMultiplier - promoDiscount - subscriptionDiscount
subscriptionDiscount = fare × plan.discountPercentage / 100
```
Plans: Basic (₱99/mo, 5%), Premium (₱199/mo, 10%), VIP (₱499/mo, 20%)

### 9. Payment Processing
- **GCash/Card:** Auto-completes on ride COMPLETED via `processPayment()`, reference: `SIM-{timestamp}`
- **Cash:** Stays PENDING until driver calls `confirmCashPayment()`, reference: `CASH-{timestamp}`
- **Commission:** `grossAmount × commissionRate` (default 20%), net = gross − commission
- All payment completion runs in Prisma `$transaction` (atomic ride update + Transaction record + DriverWallet upsert)

### 10. Admin Driver Verification Flow
```
Driver registers → Uploads 3 docs (LICENSE, GOVERNMENT_ID, PROFILE_PHOTO)
→ AI auto-verifies LICENSE and GOVERNMENT_ID (Claude Sonnet Vision)
→ If AI rejects: document marked REJECTED with rejectionReason, driver can re-upload
→ If AI passes: document marked VERIFIED
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
| Ride controller (SOS, cancel) | `apps/api/src/ride/ride.controller.ts` |
| Ride service (actual fare) | `apps/api/src/ride/ride.service.ts` |
| Fatigue controller | `apps/api/src/fatigue/fatigue.controller.ts` |
| Fatigue service (Gemini AI) | `apps/api/src/fatigue/fatigue.service.ts` |
| Rating controller | `apps/api/src/rating/rating.controller.ts` |
| Payment service | `apps/api/src/payment/payment.service.ts` |
| Subscription service | `apps/api/src/subscription/subscription.service.ts` |
| Earnings service | `apps/api/src/earnings/earnings.service.ts` |
| Chat gateway (WebSocket) | `apps/api/src/chat/chat.gateway.ts` |
| Chat service | `apps/api/src/chat/chat.service.ts` |
| Verification service (Claude AI) | `apps/api/src/verification/verification.service.ts` |
| Checklist controller | `apps/api/src/checklist/checklist.controller.ts` |
| Checklist service | `apps/api/src/checklist/checklist.service.ts` |
| Admin transactions | `apps/api/src/admin/admin-transactions.controller.ts` |
| Admin reports controller | `apps/api/src/admin/admin-reports.controller.ts` |
| Admin reports service | `apps/api/src/admin/admin-reports.service.ts` |
| Admin messaging controller | `apps/api/src/admin-messaging/admin-messaging.controller.ts` |
| Admin messaging service | `apps/api/src/admin-messaging/admin-messaging.service.ts` |
| User messaging controller (mobile) | `apps/api/src/admin-messaging/user-messaging.controller.ts` |
| Encryption service | `apps/api/src/encryption/encryption.service.ts` |
| Firebase service | `apps/api/src/auth/firebase.service.ts` |

### Web Admin (`apps/web/`)
| Purpose | File Path |
|---------|-----------|
| App router | `apps/web/src/App.tsx` |
| Auth context | `apps/web/src/context/AuthContext.tsx` |
| API client (Axios) | `apps/web/src/api/client.ts` |
| Login page | `apps/web/src/pages/LoginPage.tsx` |
| Dashboard page (stat cards + 7-day charts) | `apps/web/src/pages/DashboardPage.tsx` |
| Drivers page | `apps/web/src/pages/DriversPage.tsx` |
| Driver detail + doc viewer | `apps/web/src/pages/DriverDetailPage.tsx` |
| Bookings page (clickable rows) | `apps/web/src/pages/BookingsPage.tsx` |
| Booking detail + cancel | `apps/web/src/pages/BookingDetailPage.tsx` |
| Analytics page (charts + driver metrics) | `apps/web/src/pages/AnalyticsPage.tsx` |
| Customers page (suspend/reactivate) | `apps/web/src/pages/CustomersPage.tsx` |
| SOS incidents page (status management) | `apps/web/src/pages/IncidentsPage.tsx` |
| Audit logs page (read-only viewer) | `apps/web/src/pages/AuditLogsPage.tsx` |
| Payments page (filters, CSV export) | `apps/web/src/pages/PaymentsPage.tsx` |
| Reports page (aggregated reports, CSV export) | `apps/web/src/pages/ReportsPage.tsx` |
| Comments drawer (admin-to-user messaging) | `apps/web/src/components/CommentsDrawer.tsx` |
| Sidebar layout | `apps/web/src/components/Sidebar.tsx` |
| Status badges (all statuses) | `apps/web/src/components/StatusBadge.tsx` |
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
| Subscription screen | `apps/mobile/.../ui/screens/subscription/SubscriptionScreen.kt` |
| Driver earnings screen | `apps/mobile/.../ui/screens/earnings/DriverEarningsScreen.kt` |
| Chat screen | `apps/mobile/.../ui/screens/chat/RideChatScreen.kt` |
| Chat socket client | `apps/mobile/.../data/network/ChatSocketClient.kt` |
| Breathalyzer upload | `apps/mobile/.../ui/screens/checklist/BreathalyzerUploadScreen.kt` |
| BLOWBAGETS checklist | `apps/mobile/.../ui/screens/checklist/BlowbagetsInlineChecklist.kt` |
| Checklist API | `apps/mobile/.../data/network/ChecklistApi.kt` |
| Token manager | `apps/mobile/.../data/auth/TokenManager.kt` |

---

## Recent Changes Summary

### 2026-03-25 — Week 10 Polish: Schedule Picker UX, Bug Fixes, Admin Logo
- **Scroll-wheel time picker:** Replaced Material3 `TimeInput` (text-field digits) with custom `ScrollWheelTimePicker` — three `LazyColumn` columns (hour 1-12, minute 00-55 in 5-min steps, AM/PM) with `rememberSnapFlingBehavior` snap-scroll, selection highlight band, ViewModel-driven sync
- **Schedule button lock bug fix:** `rememberTimePickerState` only read initial values on creation, causing ViewModel/UI desync. New scroll-wheel picker syncs via `LaunchedEffect` + `animateScrollToItem()`. Added 29-min UI tolerance and 5-min-rounded hints.
- **Pinned location reverse geocoding:** `HomeViewModel.onUsePinnedAddress()` now calls `ApiClient.locationApi.reverseGeocode()` to resolve actual street address instead of literal "Pinned location" text
- **PlaceSearchScreen improvements:** Added "Use current location" row (pickup mode only) with `MyLocation` icon, empty states for blank query and no results
- **Scheduling success dialog:** Enhanced with `CheckCircle` icon, time card with `primaryContainer` background, `PrimaryButton` for "View Scheduled Rides"
- **ScheduledRidesScreen compat fix:** Replaced `PullToRefreshBox` (unavailable in Material3 1.2.0 / Compose BOM 2024.02.01) with plain `Box` + `when` block
- **Admin web logo:** Updated from `logo.jpg` to `Wheels_On_Go_Logo.png` across index.html, Sidebar, and LoginPage; login background changed to white

### 2026-03-24 — Week 10: Advanced Booking / Schedule a Trip
- Scheduled ride booking: riders can schedule rides 30 min to 7 days in advance via "Schedule for Later" toggle on BookingConfirmScreen
- Cron-based dispatch: `ScheduledRideService` with `@nestjs/schedule` triggers dispatch 15 min before pickup (every 60s check), expires stale rides 15 min past pickup (every 5 min check)
- Concurrent ride support: up to 3 pending scheduled rides alongside instant rides; refactored active ride check so PENDING scheduled rides don't block instant bookings or trigger HomeScreen auto-redirect
- Mobile UI: Inline day chips + scroll-wheel time picker (replaced original DatePickerDialog + TimePickerDialog), ScheduledRidesScreen with LazyColumn, cancel support, empty state
- WebSocket events: `scheduled_ride:dispatching` (rider notified when dispatch begins), `scheduled_ride:expired` (no driver found)
- Drawer navigation: "Scheduled Rides" menu item for riders
- New endpoint: `GET /rides/scheduled` (RIDER role) — lists upcoming scheduled rides ordered by pickup time
- No driver-side changes: DriveRequestCard already displays "Now" vs "Scheduled" tag; dispatch pipeline is identical
- No schema migration: all fields (`scheduledPickupTime`, `RideType.SCHEDULED`, indexes) already existed

### 2026-03-21 — Week 9c: Admin-to-User Direct Messaging
- New AdminMessagingModule (separate from ride-scoped ChatModule) — uses existing `Message` model with `rideId = null`, no schema migration needed
- Admin endpoints: `GET/POST /admin/users/:userId/messages`, `PATCH .../read`, `GET /admin/messaging/threads`
- Mobile endpoints (backend only, UI deferred): `GET/POST /messages/admin`, `PATCH .../read`, `GET .../unread-count`
- CommentsDrawer slide-over component: chat-style bubbles (blue=admin, gray=user), 10s polling, auto-scroll, read receipts
- Integrated into DriverDetailPage ("Message Driver" button) and CustomersPage (message icon in Actions column)
- Primary use case: admin asks driver for KYC clarification (e.g., blurry license) as backup to AI verification
- Web build: 742KB JS (gzipped: 216KB) + 30KB CSS — TypeScript clean

### 2026-03-21 — Week 9b: Admin Reports Dashboard
- New `GET /admin/reports/summary` endpoint with date range filtering (defaults to last 30 days)
- Aggregated data in 5 sections: Financial (gross/commission/net revenue, breakdown by payment method + transaction type), Operations (ride counts, completion rate, average distance/duration, rides by status), Safety (breathalyzer pass/fail rates, BLOWBAGETS completions, fatigue checks, SOS incidents), Subscriptions (active/new/cancelled subscribers, revenue by plan), Drivers (approved/online counts, wallet balances, top 5 earners)
- Backend: AdminReportsController + AdminReportsService using Prisma `groupBy`, `aggregate`, and `count` queries
- Frontend: Full ReportsPage with date pickers, color-coded KPI stat cards, breakdown tables, skeleton loading states, and multi-section CSV export
- Reports sidebar entry enabled (was "Coming Soon")
- Web build: 738KB JS (gzipped: 215KB) + 28KB CSS — TypeScript clean

### 2026-03-18 — Week 9: AI Verification, Breathalyzer Gate, BLOWBAGETS Checklist, Chat Enhancement
- AI-powered document verification: Claude Sonnet vision auto-verifies LICENSE and GOVERNMENT_ID during KYC (fail-open — passes through for manual admin review on AI error)
- Breathalyzer safety gate: per-ride breathalyzer photo upload + AI BAC analysis before ride acceptance (PASS ≤ 0.05 → accept, FAIL > 0.05 → 8h cooldown, INVALID_IMAGE → retry); fail-closed strategy
- BLOWBAGETS 10-item vehicle inspection at pickup (DRIVER_ARRIVED): gates "Start Ride" behind completion; driver inspects rider's car
- Chat enhancement: actual driver/rider names + tappable phone numbers in chat screen
- New modules: VerificationModule, ChecklistModule (5 REST endpoints)
- Prisma: `VERIFIED` DocumentStatus, `rejectionReason` on DriverDocument, breathalyzer fields on BlowbagetsChecklist, `breathalyzerCooldownUntil` on DriverProfile
- Mobile: BreathalyzerUploadScreen, BlowbagetsInlineChecklist, ChecklistApi, updated DriverHome accept flow
- 45 new backend tests (5 new suites); total: 267 backend tests (28 suites)

### 2026-03-13 — Week 8: Financial Module + In-App Chat
- 4 new backend modules: PaymentModule, SubscriptionModule, EarningsModule, ChatModule
- Static payment gateway: simulated GCash/Card auto-completion on ride completion, driver cash confirmation flow
- Subscription plans: Basic ₱99/5%, Premium ₱199/10%, VIP ₱499/20% fare discount, 30-day duration
- Driver earnings dashboard: today/week/month/total summary, wallet balance, paginated transaction history
- In-app chat: Socket.IO `/chat` namespace with JWT auth, message persistence, read receipts
- Admin payments page: `GET /admin/transactions` with filters + CSV export
- Mobile: PaymentMethodSelector, SubscriptionScreen, DriverEarningsScreen, RideChatScreen
- 150 new unit tests: 100 backend (10 new spec files) + 50 mobile (5 new + 1 updated)
- Total: 222 backend tests (23 suites), 137+ mobile tests (20 files) — all passing

### 2026-03-06 — Week 7 Enhanced: Admin Dashboard & Analytics
- 10 new admin API endpoints: analytics (overview + drivers), customer management (list/suspend/reactivate), SOS incidents (list/update), audit logs (list), ratings (aggregate + list), booking detail + cancel
- 5 new admin pages: AnalyticsPage (Recharts charts), BookingDetailPage, CustomersPage, IncidentsPage, AuditLogsPage
- DashboardPage enhanced with 7-day mini charts (rides + revenue AreaCharts)
- DriversPage fixed: hardcoded rating replaced with actual averageRating
- BookingsPage: row click navigates to booking detail
- Sidebar updated: all pages enabled (Payments added Week 8, Reports added Week 9b)
- StatusBadge: added colors for user statuses (Active/Suspended) and SOS statuses
- 7 new DTOs, AdminModule updated with AuditModule
- 26 new backend tests (4 new test files), total: 166 tests / 18 suites
- All admin write actions logged via AuditService

### 2026-02-28 — SOS, Ride Cancellation Notifications, Error Handling
- `POST /rides/:id/sos` — triggers SOS emergency, creates SosIncident record
- Ride cancellation now notifies the other party via WebSocket (`ride:cancelled`)
- JSON body size limit increased to 5MB for base64 image payloads (biometric + fatigue)
- Enhanced error handling in DriverActiveRideScreen for ride loading failures
- Removed redundant fatigue check timestamp from TokenManager

### 2026-02-27 — Fatigue Detection & Face Enrollment
- `apps/api/src/fatigue/` NEW module — FatigueController (3 endpoints), FatigueService
- Gemini Vision AI (`gemini-2.0-flash`) analyzes face for fatigue indicators
- Four fatigue levels: NORMAL, MILD (30m), MODERATE (60m), SEVERE (120m cooldown)
- Face enrollment via `POST /fatigue/enroll-face` (base64 image stored in R2)
- Admin stats enhanced: `driversFaceEnrolled`, `driversOnCooldown` metrics
- Settings screen with profile management and biometric preferences (mobile)
- `FATIGUE_MODE` and `GEMINI_API_KEY` env vars added to Render

### 2026-02-23 — CORS Config, Admin Login Enhancements, Seed Fix
- `CORS_ORIGINS` env variable properly configured
- `.env.example` and `vercel.json` files created for deployment
- Admin login page enhanced with loading state and timeout error handling
- `seed:admin` added to Render build command to fix admin login in production

### 2026-02-22 — Profile Setup, Driver Approval Response, Ride Pricing Fix
- `PATCH /auth/profile` — update rider profile (firstName, lastName, age, address)
- `POST /auth/profile-photo` — upload profile photo as base64
- `DELETE /auth/me` — soft-delete user account
- `POST /auth/logout` — revoke refresh token
- `GET /drivers/available`, `GET /drivers/:id/public-profile` — driver discovery
- `PATCH /drivers/profile-setup`, `PATCH /drivers/me/status` — driver profile management
- Driver approval/rejection now returns updated driver details
- Ride pricing uses estimated fare for minimum fare calculation

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
2. **Fatigue Mode:** Defaults to mock mode locally (always NORMAL). Set `FATIGUE_MODE=live` with valid `GEMINI_API_KEY` for real Gemini Vision AI analysis.
3. **Liveness Detection:** Camera captures static photo. No anti-spoofing. Consider ML Kit Face Detection for production.
4. **Payment Gateway:** Simulated only (no real GCash/Card integration). Digital payments auto-complete with `SIM-{timestamp}` references.
5. **Integration Tests:** Not yet implemented (significant gap for production).
6. **Key Rotation:** Procedure not yet documented.
7. **GDPR Endpoints:** Data export/deletion endpoints not yet implemented.
8. **Firebase Quota:** Free tier limited to 10K phone auth verifications/month.
9. **BLOWBAGETS Checklist:** Fully implemented as per-ride inspection at pickup (DRIVER_ARRIVED phase). Driver inspects rider's vehicle before starting ride.

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
npm run test:api                   # Run all backend tests (267 passing, 28 suites)
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
