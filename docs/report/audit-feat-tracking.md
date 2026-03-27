# Deploy Issue Report

**Date:** 2026-03-27
**Branch:** feature/tracking
**Environment:** Docker (local)

---

## Summary

The API container (`nestjs-boilerplate`) failed to start while all infrastructure services (PostgreSQL, Redis, Grafana, Loki, Tempo, Prometheus, MinIO, etc.) were running healthy.

Three separate root causes were identified and resolved.

---

## Issue 1 — Stale Failed Migration Record in `_prisma_migrations`

### Symptom

Container entered a restart loop with:

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20260221215519_init` migration started at ... failed
```

### Root Cause

The migration `20260221215519_init` was previously replaced by a baseline reset (`20260326235000_reset_baseline`). However, an earlier Docker image build had already baked the old migration file into the image. When that old image ran `prisma migrate deploy`, it attempted to apply the removed migration against a DB that already had the schema, causing error code `42710` (`type "Role" already exists`). Prisma recorded this as a failed migration in `_prisma_migrations` and blocked all future deploys.

### Resolution

1. Stopped the container to prevent new failed records from being written.
2. Deleted the stale record directly from the database:
   ```sql
   DELETE FROM _prisma_migrations WHERE migration_name = '20260221215519_init';
   ```
3. Rebuilt the Docker image so the current migrations folder (2 migrations only) is baked into the new image.

---

## Issue 2 — TypeScript Build Errors (TS1272) in Controllers

### Symptom

Docker image build failed during `nest build`:

```
error TS1272: A type referenced in a decorated signature must be imported
with 'import type' or a namespace import when 'isolatedModules' and
'emitDecoratorMetadata' are enabled.
```

Affected files:
- `src/book/book.controller.ts`
- `src/reading-session/reading-session.controller.ts`
- `src/reading-streak/reading-streak.controller.ts`
- `src/reading-tracker/reading-tracker.controller.ts`
- `src/reading-dashboard/reading-dashboard.controller.ts`

### Root Cause

`JwtPayload` was imported as a value import (`import { JwtPayload }`) in all five controllers but is only used as a type in `@CurrentUser()` decorated method parameters. The TypeScript compiler requires `import type` for types used in decorator metadata under `isolatedModules + emitDecoratorMetadata`.

This was not caught during local development because Bun's dev server (`bun run start:dev`) is more permissive than the production `nest build` (which runs the full TypeScript compiler).

### Resolution

Changed all five imports from:
```typescript
import { JwtPayload } from '../auth/interfaces/auth.interface';
```
to:
```typescript
import type { JwtPayload } from '../auth/interfaces/auth.interface';
```

---

## Issue 3 — Missing Google OAuth Environment Variables in `.env.app`

### Symptom

Container started, ran migrations successfully, but crashed at NestJS bootstrap:

```
Error: GOOGLE_CLIENT_ID is required for Google OAuth configuration
```

Dotenv log also showed: `injecting env (0) from .env` — indicating no env vars were loaded from the internal `.env` file.

### Root Cause

The Docker compose service uses `env_file: .env.app` to inject runtime environment variables. The `.env.app` file was missing the Google OAuth section entirely (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`), even though these values existed in the local `.env` file.

The app config (`src/config/app.config.ts`) calls `getRequiredEnv('GOOGLE_CLIENT_ID')` which throws if the variable is absent or empty.

### Resolution

Added the missing Google OAuth variables to `.env.app`:

```env
GOOGLE_CLIENT_ID="placeholder"
GOOGLE_CLIENT_SECRET="placeholder"
GOOGLE_CALLBACK_URL="http://localhost:3001/auth/google/callback"
```

> **Note:** Replace placeholder values with real Google OAuth credentials to enable Google login in production.

---

## Final State

After all three fixes:

- `prisma migrate deploy` completes cleanly (2 migrations, no pending)
- Docker image builds without TypeScript errors
- NestJS bootstraps successfully, all routes mapped
- API accessible at `http://localhost:3001`
- Swagger UI accessible at `http://localhost:3001/docs`

---

## Prevention Recommendations

| # | Recommendation |
|---|---------------|
| 1 | When resetting migrations with a baseline, also clean the `_prisma_migrations` table in any long-lived dev/staging DB before rebuilding the image |
| 2 | Run `bun run build` (not just `start:dev`) before pushing to catch TS1272 and similar strict-mode errors |
| 3 | Keep `.env.app` in sync with `.env.example` — add a CI check or use a shared template script to diff them |
