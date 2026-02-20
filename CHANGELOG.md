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
