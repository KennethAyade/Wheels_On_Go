# Contracts (Phase 1 – Auth/KYC)

Lightweight contract notes for OTP auth, driver KYC, and admin review flows. Full OpenAPI spec TBD.

## Auth
- `POST /auth/request-otp`
  - Body: `{ phoneNumber: "+639XXXXXXXXX", role: "RIDER" | "DRIVER" | "ADMIN" }`
  - 200: `{ message, expiresAt }`
  - 429: rate limit
- `POST /auth/verify-otp`
  - Body: `{ phoneNumber, role, code }`
  - Rider: `{ accessToken, biometricRequired: false, role, userId }`
  - Driver w/ profile photo: `{ biometricRequired: true, biometricToken, role, userId }`
  - Driver w/o photo: `{ accessToken, biometricRequired: false, biometricEnrolled: false }`
- `POST /auth/biometric/verify`
  - Auth: `Authorization: Bearer <biometricToken>`
  - Body: `{ liveImageBase64 }`
  - 200: `{ accessToken, match, confidence }`
- `GET /auth/me`
  - Auth: Bearer access token
  - 200: user with driver profile/documents if applicable

## Driver (auth: DRIVER)
- `GET /drivers/kyc` – returns driver profile + documents
- `POST /drivers/kyc/presign`
  - Body: `{ type: "LICENSE"|"ORCR"|"GOVERNMENT_ID"|"PROFILE_PHOTO", fileName, mimeType, size? }`
  - 200: `{ uploadUrl, key, expiresIn }`
- `POST /drivers/kyc/confirm`
  - Body: `{ type, key, size? }`
  - 200: DriverDocument

## Admin (auth: ADMIN)
- `GET /admin/drivers/pending` – list pending driver profiles + docs
- `POST /admin/drivers/:driverId/approve` – sets status to APPROVED
- `POST /admin/drivers/:driverId/reject` – Body `{ reason }`, sets status to REJECTED

## Health
- `GET /health` → `{ status: "ok" }`

## Error shape
- Uses NestJS default HTTP exceptions (JSON: `{ statusCode, message, error }`). Rate-limited routes return 429.
