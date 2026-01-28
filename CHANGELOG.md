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
