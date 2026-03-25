# Living Change Log

This file tracks repository changes over time. Add a new entry for each meaningful code change. Keep entries short and practical, and link to a detailed entry under `changes/`.

## Update Rules
- Use PHT time (Asia/Manila).
- One entry per change batch (commit-sized).
- Include what changed and where (paths).
- Add a detailed entry under `changes/` using the same timestamp.

## Entry Template
- Date: YYYY-MM-DD
- Time: HH:MM PHT
- Summary: 1-2 lines
- Changes:
  - Path: short description
- Details: `changes/YYYY-MM-DD-HHMM-pht.md`

---

## 2026-03-25 11:00 PHT
Summary: Schedule picker UX overhaul + bug fixes + admin logo update. Replaced Material3 TimeInput with custom scroll-wheel (roller) time picker. Fixed schedule button staying locked after following "Earliest pickup" hint (ViewModel/TimeInput state desync). Added reverse geocoding for pinned locations. Improved PlaceSearchScreen with "Use current location" option and empty states. Enhanced scheduling success dialog. Fixed ScheduledRidesScreen PullToRefreshBox build error. Updated admin web logo to Wheels_On_Go_Logo.png with white login background.
Changes:
- apps/mobile/.../booking/BookingConfirmScreen.kt: Replaced TimeInput with ScrollWheelTimePicker (3-column snap-scroll roller: hour/minute/AM-PM), improved success dialog
- apps/mobile/.../booking/BookingConfirmViewModel.kt: Added scheduleWarning, selectedDayIndex/Hour/Minute fields, 29-min UI tolerance, 5-min-rounded hints, auto-clamp on day switch
- apps/mobile/.../home/HomeViewModel.kt: Reverse geocode pinned location via LocationApi instead of literal "Pinned location" text
- apps/mobile/.../search/PlaceSearchScreen.kt: Added "Use current location" row (pickup only) + empty states
- apps/mobile/.../AppNav.kt: Wired onUseCurrentLocation callback for PlaceSearchScreen
- apps/mobile/.../booking/ScheduledRidesScreen.kt: Replaced PullToRefreshBox with plain Box (Compose BOM 2024.02.01 compat)
- apps/web/index.html: Favicon updated to Wheels_On_Go_Logo.png
- apps/web/src/components/Sidebar.tsx: Logo updated to Wheels_On_Go_Logo.png
- apps/web/src/pages/LoginPage.tsx: Logo updated + background changed to white
Details: `changes/2026-03-25-1100-pht.md`

## 2026-03-24 17:40 PHT
Summary: Advanced Booking / Schedule a Trip — riders can now schedule rides up to 7 days in advance (30 min minimum lead time). Cron-based dispatch triggers 15 min before pickup. Up to 3 concurrent scheduled rides alongside instant rides. Dedicated "Scheduled Rides" screen with cancel support. No driver-side or schema changes needed.
Changes:
- apps/api/src/ride/scheduled-ride.service.ts: NEW — Cron service for scheduled dispatch (every 60s) and expiration (every 5 min)
- apps/api/src/ride/ride.service.ts: Strengthened validation (30min–7day window), refactored active ride check for scheduled+instant coexistence, added getScheduledRides(), updated getActiveRide() to exclude pending scheduled rides
- apps/api/src/ride/ride.controller.ts: Added GET /rides/scheduled endpoint (RIDER role)
- apps/api/src/ride/ride.module.ts: Registered ScheduledRideService
- apps/api/src/app.module.ts: Imported ScheduleModule (@nestjs/schedule)
- apps/mobile/.../booking/BookingConfirmViewModel.kt: Added scheduling state, date/time selection, dual flow (instant vs scheduled)
- apps/mobile/.../booking/BookingConfirmScreen.kt: "Ride Now" / "Schedule" toggle, Material3 DatePicker + TimePicker, success dialog
- apps/mobile/.../booking/ScheduledRidesViewModel.kt: NEW — Fetch and cancel scheduled rides
- apps/mobile/.../booking/ScheduledRidesScreen.kt: NEW — Scheduled rides list with cancel, empty state, pull-to-refresh
- apps/mobile/.../data/network/RideApi.kt: Added getScheduledRides() endpoint
- apps/mobile/.../data/repository/RideRepository.kt: Added getScheduledRides() method
- apps/mobile/.../data/models/ride/RideModels.kt: Added scheduledPickupTime to RideResponse
- apps/mobile/.../data/network/DispatchSocketClient.kt: Added scheduled_ride:dispatching and scheduled_ride:expired listeners
- apps/mobile/.../ui/navigation/Routes.kt: Added ScheduledRides route
- apps/mobile/.../AppNav.kt: Wired ScheduledRides screen and drawer navigation
- apps/mobile/.../ui/components/AppDrawer.kt: Added "Scheduled Rides" drawer item for riders
Details: `changes/2026-03-24-1740-pht.md`

## 2026-03-21 12:00 PHT
Summary: Week 9c — Admin-to-user direct messaging. CommentsDrawer slide-over panel for private admin-driver/rider chat. Reuses existing Message model (rideId=null, no migration). Mobile API endpoints ready (UI deferred).
Changes:
- apps/api/src/admin-messaging/admin-messaging.service.ts: NEW — Messaging service (threads, messages, send, markAsRead, mobile-side methods)
- apps/api/src/admin-messaging/admin-messaging.controller.ts: NEW — Admin endpoints (GET/POST /admin/users/:userId/messages, PATCH .../read, GET /admin/messaging/threads)
- apps/api/src/admin-messaging/user-messaging.controller.ts: NEW — Mobile endpoints (GET/POST /messages/admin, PATCH .../read, GET .../unread-count)
- apps/api/src/admin-messaging/dto/send-message.dto.ts: NEW — SendMessageDto
- apps/api/src/admin-messaging/admin-messaging.module.ts: NEW — Module definition
- apps/api/src/app.module.ts: Registered AdminMessagingModule
- apps/web/src/components/CommentsDrawer.tsx: NEW — Slide-over chat panel (blue/gray bubbles, 10s polling, auto-scroll, read receipts)
- apps/web/src/api/messaging.ts: NEW — API client (getThreads, getMessages, sendMessage, markAsRead)
- apps/web/src/types/index.ts: Added AdminThread, AdminMessage types
- apps/web/src/pages/DriverDetailPage.tsx: Added "Message Driver" button + CommentsDrawer integration
- apps/web/src/pages/CustomersPage.tsx: Added message icon in Actions column + CommentsDrawer integration
- docs/: Updated project-knowledge-base.md, test-results-summary.md, testing-status.md
- Backend: 267/268 tests passing (28 suites), TypeScript clean
- Web: Vite build success — 742KB JS + 30KB CSS
Details: `changes/2026-03-21-1200-pht.md`

## 2026-03-21 10:30 PHT
Summary: Week 9b — Admin Reports dashboard with aggregated financial, operational, safety, subscription, and driver insights. Date range filtering and CSV export.
Changes:
- apps/api/src/admin/admin-reports.controller.ts: NEW — GET /admin/reports/summary endpoint (Admin JWT, date range query params)
- apps/api/src/admin/admin-reports.service.ts: NEW — Aggregation service with 5 parallel query sections (financial, operations, safety, subscriptions, drivers) using Prisma groupBy/aggregate/count
- apps/api/src/admin/dto/admin-reports-query.dto.ts: NEW — Query DTO with optional dateFrom/dateTo
- apps/api/src/admin/admin.module.ts: Registered AdminReportsController + AdminReportsService
- apps/web/src/pages/ReportsPage.tsx: NEW — Full reports page with date pickers, KPI stat cards (emerald/purple/blue/orange), breakdown tables (payment method, transaction type, rides by status, subscription plans, top earners), skeleton loading, CSV export
- apps/web/src/api/reports.ts: NEW — API client for reports endpoint
- apps/web/src/types/index.ts: Added ReportSummary interface (5 sections: financial, operations, safety, subscriptions, drivers)
- apps/web/src/components/Sidebar.tsx: Reports link enabled (was disabled "Coming Soon")
- apps/web/src/App.tsx: Added /reports route
- docs/: Updated project-knowledge-base.md, test-results-summary.md, testing-status.md, database-schema.md
- Backend: 267/268 tests passing (28 suites), TypeScript clean
- Web: Vite build success — 738KB JS + 28KB CSS
Details: `changes/2026-03-21-1030-pht.md`

## 2026-03-18 11:40 PHT
Summary: Week 9 — AI-powered document verification (Claude Sonnet vision), breathalyzer safety gate (per-ride, fail-closed), BLOWBAGETS vehicle inspection checklist at pickup, chat name/phone enhancement.
Changes:
- apps/api/src/verification/: NEW module — VerificationService with `verifyIdDocument()` (fail-open) and `verifyBreathalyzerResult()` (fail-closed) using Claude Sonnet vision API. Analyzes uploaded images for document authenticity and breathalyzer BAC readings.
- apps/api/src/checklist/: NEW module — ChecklistService + ChecklistController with 5 REST endpoints. Breathalyzer: presign → R2 upload → AI confirm (PASS/FAIL/INVALID_IMAGE, 8h cooldown on FAIL). BLOWBAGETS: 10-item vehicle safety checklist submission + ride gate.
- apps/api/src/driver/driver.service.ts: `confirmKycUpload()` now runs AI verification for LICENSE/GOVERNMENT_ID. Auto-rejects invalid docs with `rejectionReason`, auto-verifies valid docs to `VERIFIED` status.
- apps/api/src/ride/ride.service.ts: `updateRideStatus()` gates DRIVER_ARRIVED→STARTED transition behind completed BLOWBAGETS checklist. Added firstName/lastName to ride query selects and response mapping.
- apps/api/prisma/schema.prisma: Added `VERIFIED` to DocumentStatus, `rejectionReason` to DriverDocument, `breathalyzerCooldownUntil` to DriverProfile, breathalyzer fields + `rideId` to BlowbagetsChecklist.
- apps/api/prisma/migrations/20260318000000_*: VERIFIED status + rejectionReason
- apps/api/prisma/migrations/20260318100000_*: Breathalyzer fields + checklist rideId
- apps/mobile/.../ui/screens/checklist/BreathalyzerUploadScreen.kt: NEW — Breathalyzer upload UI with camera/gallery, AI verification, PASS/FAIL/INVALID_IMAGE result cards
- apps/mobile/.../ui/screens/checklist/BreathalyzerUploadViewModel.kt: NEW — 3-step R2 upload flow (presign → PUT → confirm)
- apps/mobile/.../ui/screens/checklist/BlowbagetsInlineChecklist.kt: NEW — 10-item checkbox composable shown inline at AT_PICKUP phase
- apps/mobile/.../ui/screens/driver/DriverHomeViewModel.kt: `acceptRide()` now gates through breathalyzer (sets pendingBreathalyzerAccept instead of immediate accept)
- apps/mobile/.../ui/screens/driver/DriverActiveRideScreen.kt: AT_PICKUP shows BLOWBAGETS checklist, "Start Ride" appears after completion
- apps/mobile/.../ui/screens/chat/RideChatScreen.kt: Shows actual names + tappable phone numbers in chat
- apps/mobile/.../data/network/ChecklistApi.kt: NEW — Retrofit interface for 5 checklist endpoints
- apps/mobile/.../data/models/checklist/ChecklistModels.kt: NEW — Request/response models
- Backend: 267 tests passing (28 suites), TypeScript clean compile
Details: `changes/2026-03-18-1140-pht.md`

## 2026-03-13 02:20 PHT
Summary: Week 8 — Financial Module (payment gateway, subscriptions, driver earnings), In-App Real-Time Chat, and 150 new unit tests (100 backend + 50 mobile).
Changes:
- apps/api/src/payment/: NEW module — PaymentService (processPayment, confirmCashPayment, completePayment), PaymentController (POST /rides/:id/confirm-cash-payment DRIVER only). Simulated GCash/Card auto-completion, cash confirmation flow, commission calculation (default 20%), Prisma $transaction for atomicity
- apps/api/src/subscription/: NEW module — SubscriptionService (listPlans, getMySubscription, subscribe 30-day, cancelSubscription, getSubscriptionDiscount), SubscriptionController (4 endpoints). Plans: Basic ₱99/5%, Premium ₱199/10%, VIP ₱499/20%
- apps/api/src/earnings/: NEW module — EarningsService (getEarningsSummary today/week/month/total, getTransactionHistory paginated, getWalletBalance), EarningsController (3 DRIVER-only endpoints)
- apps/api/src/chat/: NEW module — ChatService (saveMessage, getHistory, markAsRead, getOtherParticipant, isParticipant), ChatGateway (Socket.IO /chat namespace with JWT auth), ChatController (REST fallback GET /chat/:rideId/messages)
- apps/api/src/ride/ride.service.ts: Integrated PaymentService (processPayment on ride COMPLETED) + SubscriptionService (subscription discount in fare estimation)
- apps/api/src/admin/admin-transactions.controller.ts: NEW — GET /admin/transactions with type/status/paymentMethod/date filters, pagination, CSV export support
- apps/api/prisma/seed-subscriptions.ts: NEW — Seeds 3 subscription plans
- apps/mobile/.../ui/screens/booking/BookingConfirmScreen.kt: Payment method selector (Cash/GCash/Card) + subscription discount row in fare breakdown
- apps/mobile/.../ui/screens/driver/DriverTripCompletionScreen.kt: Conditional "Confirm Cash Received" button vs "Payment Complete" badge
- apps/mobile/.../ui/screens/ride/RideCompletionScreen.kt: Payment summary card with fare + method badge
- apps/mobile/.../ui/screens/subscription/: NEW — SubscriptionScreen + SubscriptionViewModel (plan cards, subscribe/cancel)
- apps/mobile/.../ui/screens/earnings/: NEW — DriverEarningsScreen + DriverEarningsViewModel (wallet balance, summary, transaction history)
- apps/mobile/.../data/network/ChatSocketClient.kt: NEW — Socket.IO client with SharedFlow events, auto-reconnect
- apps/mobile/.../ui/screens/chat/: NEW — RideChatScreen + RideChatViewModel (reversed LazyColumn, chat bubbles)
- apps/web/src/pages/PaymentsPage.tsx: NEW — Full payments page with filters, table, CSV export
- apps/web/src/api/payments.ts: NEW — API client for admin transactions
- apps/api/test/: 10 new test files — payment.service.spec.ts (15), payment.controller.spec.ts (2), subscription.service.spec.ts (25), subscription.controller.spec.ts (4), earnings.service.spec.ts (13), earnings.controller.spec.ts (4), chat.service.spec.ts (15), chat.gateway.spec.ts (14), chat.controller.spec.ts (2), admin-transactions.controller.spec.ts (6)
- apps/mobile/.../test/: 5 new + 1 updated — SubscriptionRepositoryTest (9), EarningsRepositoryTest (8), RideRepositoryTest (+2), DriverTripCompletionViewModelTest (8), SubscriptionViewModelTest (8), DriverEarningsViewModelTest (5)
- Backend: 222 tests (23 suites) — all passing
- Mobile: 137+ tests (20 files) — all passing
Details: `changes/2026-03-13-0220-pht.md`

## 2026-02-28 19:11 PHT
Summary: SOS functionality, ride cancellation notifications, fatigue timestamp cleanup, JSON body size limit, error handling improvements.
Changes:
- apps/api/src/ride/ride.controller.ts: Added `POST /rides/:id/sos` endpoint — triggers SOS emergency, creates SosIncident record
- apps/api/src/ride/ride.service.ts: Added `triggerSos()` method with latitude, longitude, description, incidentType
- apps/api/src/ride/dto/trigger-sos.dto.ts: NEW — TriggerSosDto validation
- apps/api/src/ride/ride.controller.ts: Cancel ride now notifies other party via WebSocket (`ride:cancelled` event to driver/rider)
- apps/api/src/main.ts: Increased JSON body size limit to 5MB for base64 image payloads (biometric + fatigue endpoints)
- apps/mobile/.../ui/screens/driver/DriverActiveRideScreen.kt: Enhanced error handling for ride loading failures
- apps/mobile/.../ui/screens/driver/DriverActiveRideViewModel.kt: Added error state and retry logic
- apps/mobile/.../data/auth/TokenManager.kt: Removed last fatigue check timestamp handling (simplified)
- apps/mobile/.../ui/screens/driver/FatigueCheckViewModel.kt: Removed timestamp tracking
- apps/api/src/rating/: NEW module — RatingController (`POST /ratings`), RatingService (creates Rating record, updates driver average)

## 2026-02-27 22:15 PHT
Summary: Settings screen with profile management and biometric preferences.
Changes:
- apps/mobile/.../ui/screens/settings/SettingsScreen.kt: NEW — logout, profile info, biometric toggle, account deletion
- apps/mobile/.../ui/screens/settings/SettingsViewModel.kt: NEW — profile management with auth repository integration
- apps/mobile/.../AppNav.kt: Added Settings route to navigation graph

## 2026-02-27 11:47 PHT
Summary: Enhanced admin stats and driver detail pages with fatigue detection metrics; network error handling in session resume.
Changes:
- apps/api/src/admin/admin-stats.controller.ts: Added `driversFaceEnrolled` and `driversOnCooldown` to dashboard stats
- apps/web/src/pages/DashboardPage.tsx: Display fatigue metrics in stat cards
- apps/web/src/pages/DriverDetailPage.tsx: Show fatigue detection logs and face enrollment status
- apps/web/src/types/: Updated TypeScript interfaces for fatigue data
- apps/mobile/.../ui/screens/auth/SessionResumeScreen.kt: Added network error handling

## 2026-02-27 00:35 PHT
Summary: Implement fatigue detection and face enrollment features with Gemini Vision AI.
Changes:
- apps/api/src/fatigue/fatigue.controller.ts: NEW — 3 endpoints (enroll-face, check, status)
- apps/api/src/fatigue/fatigue.service.ts: NEW — Gemini Vision AI analysis (gemini-2.0-flash), mock mode, cooldown logic, face enrollment via R2 storage
- apps/api/src/fatigue/fatigue.module.ts: NEW — FatigueModule with dependencies
- apps/api/src/fatigue/dto/fatigue-check.dto.ts: NEW — FatigueCheckDto (imageBase64, isOnRide, currentRideId)
- apps/api/src/fatigue/dto/face-enroll.dto.ts: NEW — FaceEnrollDto (imageBase64)
- apps/api/src/app.module.ts: Registered FatigueModule
- apps/api/test/fatigue.service.spec.ts: NEW — 12 tests for fatigue service
- apps/mobile/.../ui/screens/driver/FaceEnrollmentScreen.kt: NEW — camera capture for face enrollment
- apps/mobile/.../ui/screens/driver/FatigueCheckScreen.kt: NEW — fatigue check flow with camera
- apps/mobile/.../ui/screens/driver/FatigueCheckViewModel.kt: NEW — Gemini analysis integration
- render.yaml: Added FATIGUE_MODE and GEMINI_API_KEY env vars

## 2026-02-23 11:01 PHT
Summary: Admin seed fix in Render build command, login page UX enhancements, CORS/env configuration.
Changes:
- render.yaml: Added `npm run seed:admin` to build command chain for production admin user creation
- apps/web/src/pages/LoginPage.tsx: Added loading spinner, timeout error handling, better error messages
- apps/web/src/api/client.ts: Improved error messages for network failures
- apps/api/.env.example: Created comprehensive .env.example with all environment variables documented
- apps/web/.env.example: Created with VITE_API_URL template
- apps/web/vercel.json: Created for Vercel deployment

## 2026-02-22 20:39 PHT
Summary: User profile setup for drivers and riders, driver approval/rejection response enhancement, ride pricing fix, endpoint additions.
Changes:
- apps/api/src/auth/auth.controller.ts: Added `PATCH /auth/profile`, `POST /auth/profile-photo`, `DELETE /auth/me`, `POST /auth/logout`
- apps/api/src/auth/auth.service.ts: Added updateRiderProfile(), uploadProfilePhoto(), deleteAccount(), revokeRefreshToken()
- apps/api/src/auth/dto/update-rider-profile.dto.ts: NEW — UpdateRiderProfileDto
- apps/api/src/driver/driver.controller.ts: Added `GET /drivers/available`, `GET /drivers/:id/public-profile`, `PATCH /drivers/profile-setup`, `PATCH /drivers/me/status`
- apps/api/src/driver/driver.service.ts: Added findAvailableDrivers(), getPublicProfile(), setupDriverProfile(), updateOnlineStatus()
- apps/api/src/driver/dto/driver-profile-setup.dto.ts: NEW — DriverProfileSetupDto
- apps/api/src/driver/dto/update-driver-status.dto.ts: NEW — UpdateDriverStatusDto
- apps/api/src/driver/dto/available-drivers.dto.ts: NEW — AvailableDriversQueryDto
- apps/api/src/driver/admin-driver.controller.ts: Approval/rejection now returns updated driver details
- apps/api/src/ride/ride.service.ts: Fixed minimum fare to use estimated fare
- apps/mobile/.../ui/screens/auth/RiderProfileSetupScreen.kt: NEW — rider profile onboarding
- apps/mobile/.../ui/screens/driver/DriverProfileSetupScreen.kt: NEW — driver profile onboarding
- package.json: Removed redundant @types/multer dependency

## 2026-02-21 12:00 PHT
Summary: Phase 3 Week 7 — Admin web dashboard complete. Vite + React + Tailwind web app (`apps/web`) added to monorepo. Admin email/password auth, driver verification UI, bookings table, dashboard stats. 122 backend tests still passing.
Changes:
- apps/api/prisma/schema.prisma: Added `passwordHash String?` to User model for admin email/password login
- apps/api/prisma/migrations/20260221120000_add_admin_password_hash/migration.sql: NEW — `ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT`
- apps/api/src/auth/dto/admin-login.dto.ts: NEW — AdminLoginDto with @IsEmail() + @IsString() @MinLength(8)
- apps/api/src/auth/auth.service.ts: Added adminLogin() — finds ADMIN user by email, bcrypt.compare(), reuses buildAccessToken/buildRefreshToken, audit logs ADMIN_LOGIN
- apps/api/src/auth/auth.controller.ts: Added POST /auth/admin/login with @Throttle({ default: { limit: 5, ttl: 60 } })
- apps/api/prisma/seed-admin.ts: NEW — seeds admin user (admin@wheelsongo.com / Admin123! / role ADMIN) via prisma.user.upsert
- apps/api/package.json: Added "seed:admin" script
- apps/api/src/driver/dto/admin-driver-list.dto.ts: NEW — AdminDriverListQueryDto (status, search, page, limit)
- apps/api/src/driver/driver.service.ts: Added listAllDrivers(query), getDriverDetailForAdmin(driverId), enrichDocumentsWithUrls(); enhanced listPendingDrivers() with presigned download URLs
- apps/api/src/driver/admin-driver.controller.ts: Added GET /admin/drivers (all, paginated, filterable) + GET /admin/drivers/:driverId; kept existing pending/approve/reject
- apps/api/src/admin/admin-stats.controller.ts: NEW — GET /admin/stats (activeRides, onlineDrivers, totalRiders, pendingVerifications, todayRevenue via Promise.all)
- apps/api/src/admin/dto/admin-bookings-query.dto.ts: NEW — AdminBookingsQueryDto (status, dateFrom, dateTo, fareMin, fareMax, search, page, limit)
- apps/api/src/admin/admin-bookings.controller.ts: NEW — GET /admin/bookings with pagination, filters, rider/driver relations
- apps/api/src/admin/admin.module.ts: NEW — AdminModule registering stats + bookings controllers, imports PrismaModule
- apps/api/src/app.module.ts: Registered AdminModule
- apps/web/: NEW — Complete Vite + React + TypeScript + Tailwind CSS 4 web admin app
- apps/web/src/api/client.ts: Axios instance with JWT interceptors (auto-refresh on 401, redirect on failure)
- apps/web/src/api/{auth,drivers,bookings,dashboard}.ts: API layer for all admin endpoints
- apps/web/src/context/AuthContext.tsx: AuthProvider (JWT localStorage, login/logout, ADMIN role guard on init)
- apps/web/src/components/{Sidebar,TopBar,Layout,ProtectedRoute,StatusBadge}.tsx: Layout shell matching Figma wireframes
- apps/web/src/pages/LoginPage.tsx: Email + password form on emerald-700 green background
- apps/web/src/pages/DashboardPage.tsx: Stat cards grid fetching GET /admin/stats
- apps/web/src/pages/DriversPage.tsx: Applicants accordion (status mapping: For Admin Approval / Uploading Documents / Lacking Documents / Denied) + Registered section
- apps/web/src/pages/DriverDetailPage.tsx: Document gallery with presigned image viewer modal (zoom), approve/reject with reason dialog
- apps/web/src/pages/BookingsPage.tsx: Paginated table with status/date filters, search, color-coded status badges
- package.json (root): Added apps/web to workspaces; added dev:web + build:web scripts
- Tests: 122 backend tests (13 suites) passing unchanged
Details: `changes/2026-02-21-1200-pht.md`

## 2026-02-20 20:00 PHT
Summary: Week 5 (Tracking & Navigation) — TrackingSocketClient, driver real-time location broadcast, full rider ActiveRideScreen (live driver marker + route polyline), ETA dual-strategy (Haversine + Directions API), geofence events, turn-by-turn navigation, backend RideRoute storage, actual ride data calculation on COMPLETED. Dispatch fixes: normalized accepted payload, 30s selected-driver timeout, EXPIRED handling.
Changes:
- apps/mobile/.../data/websocket/TrackingSocketClient.kt: NEW — Socket.IO client for /tracking namespace; broadcasts LOCATION_UPDATE every 3s; receives APPROACHING_PICKUP, ARRIVED_AT_PICKUP, APPROACHING_DROPOFF, ARRIVED_AT_DROPOFF geofence events
- apps/mobile/.../ui/screens/driver/DriverActiveRideViewModel.kt: Added TrackingSocketClient; broadcasts driver location every 3s during active ride via LocationService
- apps/mobile/.../ui/screens/ride/ActiveRideScreen.kt: REWRITTEN — full-screen GoogleMapView with live driver Marker, route PolylineOptions, overlay cards (status, ETA, pickup/dropoff addresses, geofence message banner)
- apps/mobile/.../ui/screens/ride/ActiveRideViewModel.kt: Upgraded to AndroidViewModel; added TrackingSocketClient for geofence events; dual ETA (Haversine instant + Directions API every 30s); geofence message → user-facing string mapping
- apps/mobile/.../data/network/DirectionsApi.kt: Added DirectionsLeg + DirectionsValue models for ETA parsing
- apps/mobile/.../ui/screens/driver/DriverActiveRideScreen.kt: Added "Navigate" FAB — launches Google Maps turn-by-turn intent; browser deeplink fallback
- apps/api/src/dispatch/dispatch.service.ts: Added storeRideRoute() — calls Google Directions API on ride acceptance, stores encoded polyline in RideRoute table
- apps/api/src/rides/ride.service.ts: On COMPLETED, sums Haversine distances across DriverLocationHistory GPS trail for actual distance/duration/fare; falls back to estimated values
- apps/api/src/dispatch/dispatch.gateway.ts: Normalized dispatch:accepted payload (rideId, driverId, full ride data); added 30s timeout for SELECTED state → auto-decline + re-dispatch; emits EXPIRED to driver on timeout
- apps/api/src/tracking/tracking.gateway.ts: Receives LOCATION_UPDATE from driver; emits to rider room; triggers geofence checks (200m APPROACHING, 50m ARRIVED) for pickup and dropoff
- Tests: 122 backend tests (13 suites) passing; APK BUILD SUCCESSFUL
Details: `changes/2026-02-20-2000-pht.md`

## 2026-02-20 14:00 PHT
Summary: Week 5 driver-side booking flow complete — DriveRequestsScreen, DriverActiveRideScreen overhaul, DriverTripCompletionScreen, dispatch payload normalization, DispatchSocketClient nested-JSON fix; two bug fixes (activeRideId navigation loop, fare format ₱1500.0→₱1500); deprecated icon warning cleanup.
Changes:
- apps/mobile/.../ui/screens/driver/DriveRequestsScreen.kt: NEW — waiting spinner, ride-request cards (rider name, fare, pickup/dropoff, distance-to-pickup, walk time, payment method), Apply/Dismiss buttons, CurrentLocationBar
- apps/mobile/.../ui/screens/driver/DriverActiveRideScreen.kt: OVERHAULED — map-centered layout with route polyline, status banner (en-route/arrived/riding), I've Arrived/Start Ride/Complete Ride CTAs, message stub; Icons.Default.Chat → Icons.AutoMirrored.Filled.Chat
- apps/mobile/.../ui/screens/driver/DriverActiveRideViewModel.kt: NEW — ride fetch, status progression (PENDING→ARRIVED_AT_PICKUP→IN_PROGRESS→COMPLETED), continuous location-tracking loop, REST calls (arriveAtPickup, startRide, completeRide)
- apps/mobile/.../ui/screens/driver/DriverTripCompletionScreen.kt: NEW — post-trip summary (route, duration/distance banner, rider avatar, fare, payment method, Go to Home CTA); unused imports removed; Icons.AutoMirrored fix applied
- apps/mobile/.../ui/screens/driver/DriverTripCompletionViewModel.kt: NEW — loads ride details via RideRepository.getRideById
- apps/mobile/.../ui/screens/driver/DriverHomeScreen.kt: BUG FIX — call viewModel.clearActiveRideState() in LaunchedEffect(activeRideId) before navigating to prevent re-navigation loop after trip completion
- apps/mobile/.../ui/screens/driver/DriverHomeViewModel.kt: Added clearActiveRideState() method; fixed fare format (%.0f.format) so ₱1500.0 → ₱1500
- apps/mobile/app/src/main/java/com/wheelsongo/app/AppNav.kt: Added DriverTripCompletion route; get shared DriverHomeViewModel from Home back-stack entry; call clearActiveRideState() on Go to Home; removed unused backStackEntry param in Home composable
- apps/api/src/dispatch/dispatch.gateway.ts: Added fetchFullRide() + buildRideData() to normalize dispatch payload (riderName, pickupLat/Lng, estimatedFare, estimatedDistance, estimatedDuration, paymentMethod, rideType); applied to initiateDispatch, handleDispatchDecline, handleConnection, notifySelectedDriver paths
- apps/mobile/.../data/network/DispatchSocketClient.kt: Fixed nested-JSON parsing — reads ride fields from event.ride object instead of flat top-level keys
- Tests: 122 backend tests (13 suites) passing — 1 new test vs previous 121
Details: `changes/2026-02-20-1400-pht.md`

## 2026-02-17 13:00 PHT
Summary: Firebase App Check integration to fix "missing valid app identifier" error; resend OTP device-aware fix; vehicle 409 idempotency fix with error parsing and lifecycle refresh.
Changes:
- apps/mobile/app/build.gradle.kts: Added firebase-appcheck-debug:19.0.2 and firebase-appcheck-playintegrity:19.0.2 dependencies
- apps/mobile/.../WheelsOnGoApplication.kt: Initialize Firebase App Check — DebugAppCheckProviderFactory for debug builds, PlayIntegrityAppCheckProviderFactory for release
- apps/mobile/.../data/auth/FirebasePhoneAuthHelper.kt: Increased timeout 60s→120s; added RateLimited and RecaptchaRequired sealed result types; onVerificationFailed now detects FirebaseTooManyRequestsException vs FirebaseAuthInvalidCredentialsException
- apps/mobile/.../ui/screens/auth/PhoneInputViewModel.kt: Handle RateLimited and RecaptchaRequired result types with user-friendly messages
- apps/mobile/.../ui/screens/auth/OtpVerificationViewModel.kt: Handle RateLimited and RecaptchaRequired result types; resendOtp now device-aware (Firebase on real phones, backend on emulators)
- apps/mobile/.../ui/screens/auth/OtpVerificationScreen.kt: resend button passes activity and verificationId to resendOtp()
- apps/api/src/rider-vehicle/rider-vehicle.service.ts: Idempotent vehicle creation — returns existing vehicle if same rider, throws ConflictException only if different rider owns the plate
- apps/api/test/rider-vehicle.service.spec.ts: Added idempotency test and updated conflict test
- apps/mobile/.../data/models/ErrorResponse.kt: NEW — Moshi model for NestJS error response body
- apps/mobile/.../data/repository/VehicleRepository.kt: Added Moshi error body parsing (parseErrorMessage) across all 4 methods
- apps/mobile/.../ui/screens/vehicle/VehicleListScreen.kt: Added DisposableEffect lifecycle observer to auto-refresh on ON_RESUME
- apps/mobile/.../ui/screens/booking/BookingConfirmScreen.kt: Added DisposableEffect lifecycle observer to auto-refresh vehicles on ON_RESUME
- apps/mobile/.../ui/screens/booking/BookingConfirmViewModel.kt: Changed fetchVehicles() from private to public
- Firebase Console: SHA-256 fingerprint added (C1:5D:...), test phone +639761337834 whitelisted (code 123456), App Check debug token registered
- Tests: 121 backend tests (13 suites) passing
Details: `changes/2026-02-17-1300-pht.md`

## 2026-02-14 10:00 PHT
Summary: Phase 2 Week 4 — Core Booking Engine complete. RiderVehicle CRUD, surge pricing, promo codes, dispatch integration, mobile booking flow (BookingConfirm + ActiveRide), and 5 new mobile test files.
Changes:
- apps/api/src/rider-vehicle/*: NEW module — RiderVehicle CRUD (create, list, delete, set-default) with 10 unit tests
- apps/api/src/pricing/surge-pricing.service.ts: Haversine-based demand/supply surge (1.0x–2.0x, 5 tiers)
- apps/api/src/pricing/promo-code.service.ts: PERCENTAGE + FIXED_AMOUNT promo validation with expiry and usage limits
- apps/api/src/rides/rides.service.ts: Ride creation triggers WebSocket dispatch event
- apps/api/src/rides/rides.controller.ts: POST /rides creates ride with fare estimate, surge, promo
- apps/api/src/dispatch/dispatch.service.ts: WebSocket-based driver dispatch on ride creation
- apps/mobile/.../data/models/booking/BookingModels.kt: NEW — FareEstimate, RideRequest, RideResponse, PromoCode models
- apps/mobile/.../data/models/vehicle/VehicleModels.kt: NEW — RiderVehicle, CreateVehicleRequest models
- apps/mobile/.../data/network/RidesApi.kt: NEW — Retrofit interface for rides endpoints
- apps/mobile/.../data/network/VehicleApi.kt: NEW — Retrofit interface for vehicle endpoints
- apps/mobile/.../data/repository/RidesRepository.kt: NEW — ride creation, fare estimate, promo validation
- apps/mobile/.../data/repository/VehicleRepository.kt: NEW — CRUD for rider vehicles
- apps/mobile/.../data/websocket/RideWebSocketClient.kt: NEW — Socket.IO client for real-time ride events
- apps/mobile/.../ui/screens/vehicle/VehicleRegistrationScreen.kt: NEW — plate, make, model, color form
- apps/mobile/.../ui/screens/vehicle/VehicleListScreen.kt: NEW — list with delete and set-default actions
- apps/mobile/.../ui/screens/booking/BookingConfirmScreen.kt: NEW — fare estimate, vehicle selector, promo code input, confirm button
- apps/mobile/.../ui/screens/booking/BookingConfirmViewModel.kt: NEW — fare estimate fetch, promo validation, vehicle loading
- apps/mobile/.../ui/screens/ride/ActiveRideScreen.kt: NEW — real-time map tracking, driver ETA, cancel button
- apps/mobile/.../ui/screens/ride/ActiveRideViewModel.kt: NEW — WebSocket event handling (driver_assigned, ride_started, ride_completed)
- apps/mobile/.../AppNav.kt: Added BookingConfirm → ActiveRide navigation; VehicleRegistration from drawer
- apps/mobile/.../data/network/ApiClient.kt: Added ridesApi, vehicleApi
- apps/mobile/test/*: 5 new test files (BookingConfirmViewModelTest, ActiveRideViewModelTest, RidesRepositoryTest, VehicleRepositoryTest, VehicleRegistrationViewModelTest) — 27 tests
- Tests: 121 backend tests (13 suites) passing; mobile tests compile but blocked by JBR-21 JVM crash
Details: `changes/2026-02-14-1000-pht.md`

## 2026-02-13 12:00 PHT
Summary: Firebase Phone Auth integration for real phone OTP delivery. Emulators use backend console SMS, real phones use Firebase SDK. Free tier: 10K verifications/month.
Changes:
- apps/api/src/auth/firebase.service.ts: NEW — Firebase Admin SDK service for verifying Firebase ID tokens
- apps/api/src/auth/dto/verify-firebase.dto.ts: NEW — DTO for Firebase token verification
- apps/api/src/auth/auth.service.ts: Added verifyFirebaseToken() method, refactored buildLoginResponse() to avoid duplication
- apps/api/src/auth/auth.controller.ts: Added POST /auth/verify-firebase endpoint
- apps/api/src/auth/auth.module.ts: Added FirebaseService to providers
- apps/api/.env: Added FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
- apps/api/.env.example: Documented Firebase env vars
- apps/api/test/firebase.service.spec.ts: NEW — 5 tests for Firebase service
- apps/api/test/auth.service.spec.ts: Added 5 tests for Firebase auth flow
- apps/api/package.json: Added firebase-admin dependency
- apps/mobile/build.gradle.kts: Added google-services plugin
- apps/mobile/app/build.gradle.kts: Added Firebase BOM and firebase-auth dependencies
- apps/mobile/app/google-services.json: NEW — Firebase config (in .gitignore)
- apps/mobile/.../data/auth/FirebasePhoneAuthHelper.kt: NEW — Firebase Phone Auth wrapper with suspendable methods
- apps/mobile/.../data/models/auth/AuthModels.kt: Added VerifyFirebaseRequest model
- apps/mobile/.../data/network/ApiClient.kt: Added verifyFirebase endpoint
- apps/mobile/.../data/repository/AuthRepository.kt: Added verifyFirebaseToken() method
- apps/mobile/.../ui/screens/auth/PhoneInputViewModel.kt: Rewritten with conditional Firebase/backend flow based on DeviceUtils.isEmulator()
- apps/mobile/.../ui/screens/auth/PhoneInputScreen.kt: Updated onNext callback to pass verificationId
- apps/mobile/.../ui/screens/auth/OtpVerificationViewModel.kt: Rewritten with conditional Firebase/backend verify
- apps/mobile/.../ui/screens/auth/OtpVerificationScreen.kt: Added verificationId parameter
- apps/mobile/.../ui/navigation/Routes.kt: Updated OTP route to include optional verificationId query param
- apps/mobile/.../AppNav.kt: Updated navigation to handle Firebase auto-verify (skip OTP screen)
- .gitignore: Added apps/mobile/app/google-services.json
- Tests: 101 backend tests (11 suites), 60 mobile tests (7 files) — all passing

## 2026-02-07 20:00 PHT
Summary: Fix KYC upload persistence — DocumentUploadViewModel now fetches existing KYC status on init; backend GET /drivers/kyc returns proper { documents, allUploaded, allVerified } response.
Changes:
- apps/api/src/driver/driver.service.ts: Added getKycStatus() method returning { documents, allUploaded, allVerified }
- apps/api/src/driver/driver.controller.ts: GET /drivers/kyc now calls getKycStatus() instead of getMine()
- apps/mobile/.../ui/screens/driver/DocumentUploadViewModel.kt: Added init block with fetchExistingKycStatus() to load already-uploaded documents
- apps/mobile/.../data/models/driver/DriverModels.kt: Added default values to KycDocumentsResponse fields

## 2026-02-07 19:00 PHT
Summary: Fix 403 "Missing user context" on KYC upload + remove ORCR document type. Only 3 document types remain: LICENSE, GOVERNMENT_ID, PROFILE_PHOTO.
Changes:
- apps/api/src/app.module.ts: Removed global RolesGuard APP_GUARD (was running before JwtAuthGuard, causing 403)
- apps/api/prisma/schema.prisma: Removed ORCR from DriverDocumentType enum
- apps/mobile/.../ui/screens/driver/DocumentUploadViewModel.kt: Removed ORCR from DocumentType enum
- apps/mobile/.../data/models/driver/DriverModels.kt: Removed ORCR from DriverDocumentType enum
- apps/mobile/.../DocumentUploadViewModelTest.kt: Updated doc count 4→3, removed ORCR assertion

## 2026-02-07 18:00 PHT
Summary: Multiple UX and crash fixes — biometric leniency, DocumentUploadViewModel crash, driver navigation fix, hamburger menu drawer.
Changes:
- apps/mobile/.../data/auth/BiometricPromptHelper.kt: Accept BIOMETRIC_WEAK as fallback for older phones
- apps/mobile/.../ui/screens/auth/OtpVerificationScreen.kt: Check BiometricPromptHelper.canAuthenticate() before requiring biometric; pass needsKyc to onVerified
- apps/mobile/.../ui/screens/auth/OtpVerificationViewModel.kt: Added biometricEnrolled field to UI state
- apps/mobile/.../ui/screens/driver/DocumentUploadViewModel.kt: Added @JvmOverloads to fix NoSuchMethodException crash
- apps/mobile/.../ui/screens/auth/BiometricVerificationViewModel.kt: Added @JvmOverloads
- apps/mobile/.../ui/screens/auth/SessionResumeViewModel.kt: Added @JvmOverloads
- apps/mobile/.../ui/navigation/Routes.kt: LocationConfirm route now includes {role}/{needsKyc} args
- apps/mobile/.../AppNav.kt: Wired needsKyc routing for drivers; DocumentUpload only shown when needsKyc=true
- apps/mobile/.../ui/components/AppDrawer.kt: NEW — ModalDrawerSheet with phone, role chip, "My Documents" (driver), logout
- apps/mobile/.../ui/screens/home/HomeScreen.kt: Added ModalNavigationDrawer with AppDrawer

## 2026-02-07 23:00 PHT
Summary: Add comprehensive test coverage for Week 3 Phase 1 features — 146 tests total (86 backend + 60 mobile).
Changes:
- apps/api/test/otp.service.spec.ts: NEW — 12 tests for OTP generation, hashing, rate limiting, verification
- apps/api/test/auth.service.spec.ts: EXPANDED — 12 tests (+10 new) for OTP/biometric flows, user creation
- apps/api/test/biometric.service.spec.ts: NEW — 7 tests for mock + rekognition modes
- apps/api/test/jwt.strategy.spec.ts: NEW — 4 tests for token type validation
- apps/api/test/biometric.guard.spec.ts: NEW — 5 tests for biometric token guard
- apps/api/test/storage.service.spec.ts: NEW — 5 tests for S3 presigned URLs
- apps/api/test/driver.service.spec.ts: EXPANDED — 14 tests (+8 new) for KYC presign/confirm
- apps/api/test/sms.service.spec.ts: NEW — 4 tests for SMS console + Twilio modes
- apps/mobile/app/build.gradle.kts: Added test deps (mockk, coroutines-test, turbine, robolectric)
- apps/mobile/.../PhoneInputViewModelTest.kt: NEW — 8 tests
- apps/mobile/.../OtpVerificationViewModelTest.kt: NEW — 12 tests
- apps/mobile/.../BiometricVerificationViewModelTest.kt: NEW — 6 tests
- apps/mobile/.../DocumentUploadViewModelTest.kt: NEW — 8 tests
- apps/mobile/.../AuthRepositoryTest.kt: NEW — 10 tests
- apps/mobile/.../TokenManagerTest.kt: NEW — 9 tests
- apps/mobile/.../AuthInterceptorTest.kt: NEW — 7 tests
- docs/testing-status.md: Updated with comprehensive test results

## 2026-02-06 10:00 PHT
Summary: Complete FR-1.2 Driver KYC (Cloudflare R2 storage + mobile file picker) and FR-1.3 Biometric Verification Screen.
Changes:
- apps/api/.env: Configured Cloudflare R2 storage credentials (STORAGE_BUCKET, STORAGE_ENDPOINT, AWS keys)
- apps/api/.env.example: Updated storage section with R2 configuration template
- apps/api/src/driver/driver.controller.ts: Enabled KYC presign/confirm endpoints (removed 503 ServiceUnavailableException blocks)
- apps/mobile/.../data/models/driver/DriverModels.kt: Fixed DTO field name mismatches (documentType→type, contentType→mimeType, s3Key→key, added size field)
- apps/mobile/.../data/models/auth/AuthModels.kt: Fixed biometric DTOs (imageBase64→liveImageBase64, verified→match, added userId/accessToken to response)
- apps/mobile/.../data/network/ApiClient.kt: Added verifyBiometric() to AuthApi interface
- apps/mobile/.../data/network/DriverApi.kt: Removed disabled endpoint comments
- apps/mobile/.../data/auth/TokenManager.kt: Added biometric token save/get/clear methods
- apps/mobile/.../data/network/AuthInterceptor.kt: Route biometric token for /auth/biometric/verify endpoint
- apps/mobile/.../data/repository/AuthRepository.kt: Added verifyBiometric() method, save biometric token on OTP
- apps/mobile/.../ui/screens/driver/DocumentUploadViewModel.kt: Full rewrite — AndroidViewModel with real presign→R2 upload→confirm flow
- apps/mobile/.../ui/screens/driver/DocumentUploadScreen.kt: Added ActivityResultContracts.GetContent() file picker
- apps/mobile/.../ui/screens/auth/OtpVerificationViewModel.kt: Added biometricRequired state tracking
- apps/mobile/.../ui/screens/auth/OtpVerificationScreen.kt: Added onBiometricRequired callback
- apps/mobile/.../ui/screens/auth/BiometricVerificationViewModel.kt: NEW — Camera capture, Base64 encode, API verification
- apps/mobile/.../ui/screens/auth/BiometricVerificationScreen.kt: NEW — Face verification UI with camera intent
- apps/mobile/.../ui/navigation/Routes.kt: Added BiometricVerification route
- apps/mobile/app/src/main/java/com/wheelsongo/app/AppNav.kt: Wired biometric screen into navigation graph
- apps/mobile/app/src/main/AndroidManifest.xml: Added CAMERA permission and uses-feature
Details: `changes/2026-02-06-1000-pht.md`

## 2026-02-04 12:00 PHT
Summary: Google Maps Platform migration — replace OSMDroid + Nominatim + Photon + OSRM with Google APIs.
Changes:
- apps/api/.env.example: Removed NOMINATIM_API_URL, PHOTON_API_URL, OSRM_API_URL; added GOOGLE_MAPS_API_KEY
- apps/api/src/location/location.service.ts: Rewrote geocode, reverseGeocode, getPlaceAutocomplete, getPlaceDetails, getDistanceMatrix to use Google APIs; Haversine block preserved byte-for-byte
- apps/api/src/location/dto/place-autocomplete.dto.ts: Updated 4 comments (Photon → Google Places); optional lat/lng fields retained for DTO compatibility
- apps/mobile/app/build.gradle.kts: Swapped osmdroid:6.1.18 for play-services-maps:18.2.0 + maps-compose:4.2.0
- apps/mobile/app/src/main/AndroidManifest.xml: Added <meta-data> with Google Maps API key
- apps/mobile/.../ui/components/map/OpenStreetMap.kt: Full rewrite — OSMDroid AndroidView → GoogleMap composable (maps-compose); renamed OpenStreetMapView → GoogleMapView
- apps/mobile/.../ui/screens/home/HomeScreen.kt: Import + composable name swap (OpenStreetMapView → GoogleMapView); all parameters unchanged
Details: `changes/2026-02-04-1200-pht.md`

## 2026-01-31 17:50 PHT
Summary: Critical OTP verification fixes - Backend response structure, URL encoding, and UX improvements.
Changes:
- apps/api/src/auth/auth.service.ts: Fixed response structure to match mobile expectations (lines 55-77)
  - RIDER: Returns `{accessToken, refreshToken, user: {id, phoneNumber, role, isActive, createdAt}}`
  - DRIVER: Same structure + biometric fields (biometricRequired, biometricToken, biometricEnrolled, driverStatus)
- apps/api/src/auth/auth.controller.ts: Added debug logging for verify-otp requests (phone number, role, code length)
- apps/mobile/.../data/models/auth/AuthModels.kt: Made accessToken nullable, added driver-specific optional fields
- apps/mobile/.../data/auth/TokenManager.kt: Updated saveTokens() to handle nullable accessToken (biometric drivers)
- apps/mobile/.../data/repository/AuthRepository.kt: Added null check before saving tokens
- apps/mobile/.../ui/navigation/Routes.kt: Fixed URL encoding - phone number `+` preserved via URLEncoder (was becoming space)
- apps/mobile/.../ui/screens/auth/OtpVerificationViewModel.kt: Don't clear OTP on error (allow backspace correction)
Details: Fixed critical authentication flow issues. Root causes: (1) Backend returned `{userId, role, accessToken}` but mobile expected `{accessToken, user: {...}}` causing JSON parsing failures. (2) Navigation URL encoding converted `+639...` to ` 639...` (+ is URL space character). (3) OTP cleared on error prevented backspace. All issues resolved.

## 2026-01-31 14:00 PHT
Summary: Week 3 Integration - Connect mobile UI with backend authentication APIs (OTP/JWT).
Changes:
- apps/mobile/.../data/auth/TokenManager.kt: NEW - DataStore-based JWT token storage
- apps/mobile/.../data/network/AuthInterceptor.kt: NEW - OkHttp interceptor for JWT auth headers
- apps/mobile/.../data/network/DriverApi.kt: NEW - Retrofit interface for driver endpoints
- apps/mobile/.../data/repository/AuthRepository.kt: NEW - Repository layer for auth operations
- apps/mobile/.../data/network/ApiClient.kt: Fixed AuthApi endpoints (request-otp, verify-otp), added interceptor
- apps/mobile/.../ui/screens/auth/PhoneInputViewModel.kt: Replaced mock delay with AuthRepository API calls
- apps/mobile/.../ui/screens/auth/OtpVerificationViewModel.kt: Replaced mock delay with AuthRepository API calls
- apps/mobile/.../ui/screens/driver/DocumentUploadViewModel.kt: Added KYC API integration with graceful fallback
- apps/mobile/.../WheelsOnGoApplication.kt: NEW - Application class for ApiClient initialization
- apps/mobile/app/src/main/AndroidManifest.xml: Added Application class reference
- apps/mobile/.../data/models/driver/DriverModels.kt: Added type aliases for API compatibility
Details: Week 3 authentication flow integration with backend. KYC upload gracefully handles 503 (service unavailable).

## 2026-01-31 10:00 PHT
Summary: Free Maps Migration - Replace Google Maps with free alternatives (OSMDroid + Nominatim + Photon + OSRM).
Changes:
- apps/api/.env.example: Added free API URLs (NOMINATIM_API_URL, PHOTON_API_URL, OSRM_API_URL)
- apps/api/src/location/location.service.ts: Replaced Google APIs with Nominatim (geocoding), Photon (autocomplete), OSRM (routing)
- apps/mobile/app/build.gradle.kts: Replaced Google Maps Compose with OSMDroid dependency
- apps/mobile/.../ui/components/map/OpenStreetMap.kt: NEW - OSMDroid-based map composable
- apps/mobile/.../ui/screens/home/HomeScreen.kt: Updated to use OpenStreetMapView
- apps/mobile/.../ui/screens/home/HomeViewModel.kt: Removed Google LatLng dependency
- apps/mobile/.../data/models/location/LocationModels.kt: Added lat/lng to PlacePrediction
Details: Complete migration from Google Maps (requires billing) to free alternatives. Device GPS remains on FusedLocationProvider (already free).

## 2026-01-29 00:30 PHT
Summary: Implement comprehensive data privacy setup with PII encryption, audit logging, and security headers (Week 2 Backlog).
Changes:
- apps/api/src/encryption/*: AES-256-GCM encryption service with HMAC-SHA256 searchable hashing
- apps/api/src/prisma/prisma.service.ts: Transparent encryption middleware for 5 PII fields (User.phoneNumber, User.email, EmergencyContact.phoneNumber, DriverWallet.accountNumber, RiderPaymentMethod.cardToken)
- apps/api/src/audit/audit.service.ts: Enhanced with 51 audit actions and 7 convenience methods for GDPR compliance
- apps/api/src/main.ts: Helmet security headers (CSP, HSTS) + enhanced CORS configuration
- apps/api/prisma/schema.prisma: Added phoneNumberHash and emailHash columns for searchable encryption
- apps/api/prisma/migrations/20260128162228_*: Migration for hash columns
- apps/api/scripts/backfill-encrypt-pii.ts: Backfill script for encrypting existing unencrypted PII data
- apps/api/.env.example: Added ENCRYPTION_KEY and CORS_ORIGINS configuration
- docs/data-privacy-policy.md: Comprehensive 13-section GDPR/CCPA compliance documentation
- docs/database-schema.md: Updated with encryption implementation details and PII field mapping
- apps/api/src/encryption/__tests__/encryption.service.spec.ts: 22 unit tests for encryption service
Details: `changes/2026-01-29-0030-pht.md`

## 2026-01-28 14:00 PHT
Summary: Complete database schema implementation for full ride-sharing platform (40+ models, 25+ enums).
Changes:
- apps/api/prisma/schema.prisma: Extended User and DriverProfile models, added 34 new models across 8 domains
- apps/api/prisma/backfill.sql: Created backfill script for existing data defaults
- apps/api/migration_preview.sql: Generated 37KB migration SQL preview
- docs/database-schema.md: Updated with comprehensive Phase 2-7 schema documentation
Details: `changes/2026-01-28-1400-pht.md`

## 2026-01-19 04:00 PHT
Summary: Initial monorepo scaffold created for Android app + NestJS API with Prisma and JWT skeletons.
Changes:
- Root: workspace scripts, README, gitignore, Render deploy, bootstrap script, change log.
- API: NestJS modules, health endpoint, auth stubs, Prisma scaffolding, env example.
- Shared: contract placeholder.
- Mobile: Android Gradle project, Compose nav + screens, Retrofit client placeholder.
Details: `changes/2026-01-19-0400-pht.md`
