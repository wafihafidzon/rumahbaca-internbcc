# NestJS boilerplate
Production-ready NestJS 11 API — JWT auth with refresh tokens, RBAC, Redis
caching, PostgreSQL via Prisma ORM, S3 file storage, and full OpenTelemetry
observability (Prometheus + Grafana + Loki + Tempo).

## Stack
- Runtime:    Bun (ALWAYS use Bun — never npm or node directly)
- Framework:  NestJS 11 + Express, TypeScript ES2023
- Database:   PostgreSQL 18 · Prisma ORM (migrations in prisma/migrations/)
- Cache:      Redis via ioredis + cache-manager
- Auth:       JWT access tokens (15 min) + refresh tokens in HttpOnly cookies (7d)
- Storage:    S3-compatible (AWS S3 or MinIO via @aws-sdk/client-s3)
- Testing:    Jest unit (src/**/*.spec.ts) + Jest E2E (test/)
- Logging:    Winston with daily rotation → Loki via Grafana Alloy
- Observability: OpenTelemetry → Prometheus (port 9464) + Grafana + Tempo

## Key folders
- src/auth/         JWT strategies, refresh tokens, guards, @Public/@RequireRoles/@CurrentUser decorators
- src/user/         User profile CRUD
- src/post/         Main domain (adapt for your feature)
- src/common/       Shared: cache, logger, redis, health, storage, metrics, throttler
- src/config/       AppConfigService — all env vars typed here, read from here
- src/prisma/       Prisma client wrapper + seeder
- src/otel.ts       OpenTelemetry SDK bootstrap (init before NestJS)
- prisma/           schema.prisma, migrations/, seed.ts
- observability/    Grafana dashboards, OTel collector config, k6 load test

## Commands
# Dev
- Start dev:        bun run start:dev
- Debug:            bun run start:debug

# Quality — run both after every change
- Lint:             bun run lint
- Format:           bun run format

# Test
- Unit tests:       bun run test
- Single test:      bun run test -- auth.service.spec.ts
- E2E tests:        bun run test:e2e
- Coverage:         bun run test:cov

# Build
- Build:            bun run build
- Production:       bun run start:prod

# Database
- Generate client:  bun run prisma generate
- New migration:    bun run prisma migrate dev
- Apply migrations: bun run prisma migrate deploy
- Seed:             bun run prisma:seed
- Studio:           bun run prisma studio

# Docker
- Start all:        docker-compose up -d
- Stop all:         docker-compose down
- API logs:         docker-compose logs -f api

## Rules
# Runtime
- MUST use Bun for all commands — never npm, npx, or node directly
- MUST run `bun run lint` and `bun run test` after every set of changes before marking done

# Architecture
- MUST place business logic in Services — never in Controllers or Repositories
- MUST place all database queries in Models/Repositories — never in Services directly
- MUST read all config from AppConfigService (src/config/) — never process.env directly
- MUST follow the module pattern: Controller → Service → Repository

# Database
- MUST use Prisma query builder for all DB operations
- MUST wrap writes touching more than one table in a Prisma transaction
- MUST run `bun run prisma generate` after any schema.prisma change
- NEVER write raw SQL — use Prisma query builder only
- NEVER edit files inside prisma/migrations/ directly

# Auth & security
- MUST apply auth guard by default — use @Public() explicitly for unauthenticated endpoints
- MUST use @RequireRoles() for role-gated endpoints, @CurrentUser() to inject user in handlers
- MUST add class-validator decorators to every DTO (whitelist + forbidNonWhitelisted is global)
- NEVER bypass the global ValidationPipe — add proper DTOs instead
- NEVER store secrets in code — use AppConfigService which reads from .env

# TypeScript
- NEVER use `any` type — use proper types or `unknown` with type guards
- MUST use typed properties in all classes (no implicit any)

# Observability
- MUST inject Logger (LoggerModule) — never use console.log
- OTel is initialized in src/otel.ts before NestJS bootstrap — do not move or re-init

## Git workflow
- Branch format:  feature/short-description or fix/issue-description
- Commits:        conventional commits — feat(scope): description / fix / chore / refactor
- Before commit:  lint + tests must pass
- NEVER force push to main or develop

## Port map
- 3000  API
- 9464  Prometheus metrics exporter
- 3001  Grafana
- 3100  Loki
- 3200  Tempo
- 5432  PostgreSQL
- 6379  Redis

## Lessons learned
# Add a line here every time Claude makes a mistake — one mistake = one rule
# Format: - Do NOT [what Claude did wrong] — [correct approach]
