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
