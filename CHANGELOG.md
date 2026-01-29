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
