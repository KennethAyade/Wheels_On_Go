# Wheels On Go / Valet&Go (Backend, Phase 1)

NestJS + Prisma API for the mobile app authentication/KYC flow (OTP login for riders/drivers, driver KYC uploads with S3 presigned URLs, biometric face check for drivers, and lightweight admin approvals).

## Stack
- Node.js 18+, NestJS 10
- Prisma + PostgreSQL
- JWT auth (OTP-first)
- S3-compatible object storage for uploads
- Optional AWS Rekognition for biometric comparison (mock mode supported)

## Repo structure
- `apps/api` – NestJS REST API (this phase)
- `apps/mobile` – Android app scaffold
- `packages/shared` – Contracts notes
- `assets/brand` – Logo/icon placeholders

## Quickstart (local)
1) Copy env file: `cp apps/api/.env.example apps/api/.env` and fill values (see below).
2) Install deps: `npm install`
3) Generate Prisma client: `npm run prisma:generate`
4) Apply migration: `cd apps/api && npx prisma migrate dev --name init` (requires `DATABASE_URL`).
5) Run the API: `npm run dev:api` (default port 3000)
6) Tests: `npm run test:api`

## Environment variables (apps/api/.env)
- Core: `DATABASE_URL`, `PORT` (default 3000), `NODE_ENV`, `JWT_SECRET`, `ACCESS_TOKEN_TTL` (default 15m), `BIOMETRIC_TOKEN_TTL` (default 5m)
- OTP/SMS: `OTP_CODE_TTL_SECONDS` (default 300), `OTP_REQUESTS_PER_HOUR` (default 5), `SMS_PROVIDER` (`twilio`|`console`), `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- Storage: `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT` (optional for S3-compatible), `STORAGE_FORCE_PATH_STYLE`
- AWS/Biometric: `BIOMETRIC_MODE` (`mock`|`rekognition`), `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BIOMETRIC_MIN_CONFIDENCE` (default 90)

## Database & migrations
- Prisma schema: `apps/api/prisma/schema.prisma`
- First migration: `apps/api/prisma/migrations/0001_init/migration.sql`
- Apply in prod: `npm run prisma:migrate` (runs `prisma migrate deploy`)
- Dev diff-only: `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`

## API highlights (Phase 1)
- `POST /auth/request-otp` → send OTP (rate-limited)
- `POST /auth/verify-otp` → issue rider token or driver biometric challenge token
- `POST /auth/biometric/verify` → driver selfie check, issues access token
- `GET /auth/me` → current user
- Driver KYC: `POST /drivers/kyc/presign`, `POST /drivers/kyc/confirm`, `GET /drivers/kyc`
- Admin review: `GET /admin/drivers/pending`, `POST /admin/drivers/:id/approve`, `POST /admin/drivers/:id/reject`
- Health: `GET /health`

## Biometric notes
- Default `BIOMETRIC_MODE=mock` for local/dev (always matches, logs verification).
- Production: set `BIOMETRIC_MODE=rekognition` with AWS credentials; compares live selfie bytes vs stored profile photo bytes and logs confidence.
- Drivers without an enrolled profile photo receive an onboarding token after OTP; biometric is enforced once a profile photo is uploaded.

## Storage/KYC
- Presigned PUT URLs via S3-compatible storage (`StorageService`). Keys follow `drivers/{driverId}/{documentType}/...`.
- Confirm uploads to persist metadata and, for profile photos, link to the driver profile for biometric checks.

## Deployment (Railway/Render)
- Render config: `render.yaml`. Set `DATABASE_URL`, `JWT_SECRET`, storage keys, SMS provider keys, and AWS creds (if using Rekognition). `NODE_VERSION` pinned to 18.
- Railway: create a Node service, set the same env vars, and use `npm install && npm run prisma:generate && npm run build:api` as build, `npm run start:api` as start. Service is stateless; Postgres is managed.

## Brand assets
- Place logo/icon files in `assets/brand/logo` and `assets/brand/icons`. See `assets/brand/README.md` for naming conventions.
