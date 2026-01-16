# Wheels On Go Platform

Monorepo scaffold for an Android app and a NestJS REST API. This repo is intentionally high level and ready for the team to fill in detailed requirements later.

## Prerequisites
- Node.js 18+
- npm 9+
- Android Studio (Kotlin + Jetpack Compose)
- A managed PostgreSQL connection string

## Structure
- /apps/api        NestJS REST API (Node.js 18+, Prisma, JWT skeleton)
- /apps/mobile     Android app (Kotlin + Jetpack Compose)
- /packages/shared Shared contracts placeholders
- /scripts         Developer convenience scripts

## Backend (NestJS API)
### Setup
1) Create an env file:
   - Copy `apps/api/.env.example` to `apps/api/.env` and fill in values.
2) Install dependencies:
   - `npm install`
3) Generate Prisma client:
   - `npm run prisma:generate`

### Run (no Docker)
- `npm run dev:api`

### Build and start
- `npm run build:api`
- `npm run start:api`

### Migrations
- `npm run prisma:migrate`

## Android app
Open `apps/mobile` in Android Studio and let it sync the Gradle project. The base API URL placeholder is in `apps/mobile/app/src/main/java/com/wheelsongo/app/AppConfig.kt`. If you plan to use the CLI, make sure the Gradle wrapper jar is present (Android Studio sync will fetch it).

## Environment variables
Backend environment variables live in `apps/api/.env`.
- `DATABASE_URL`  Required. Managed Postgres connection string.
- `JWT_SECRET`    Required. Placeholder for future JWT config.
- `PORT`          Optional. Defaults to 3000.
- `NODE_ENV`      Optional. Defaults to development.

## Deployment
- Render: `render.yaml` at repo root. Uses `DATABASE_URL` from the hosting provider.

## Pending low-level inputs
- Database schema details and migrations
- Auth logic (hashing, JWT strategy/guards)
- Business entities and API contracts
- Mobile app flows and UI requirements
