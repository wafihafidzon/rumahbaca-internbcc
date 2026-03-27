## Project Overview

A **production-ready NestJS boilerplate** featuring JWT authentication with refresh tokens, role-based access control (RBAC), Redis integration, comprehensive observability (OpenTelemetry + Grafana stack), and S3 file storage.

- **Runtime:** Node.js (Bun-optimized; npm/Node.js compatible)
- **Framework:** NestJS 11 with Express
- **Language:** TypeScript (ES2023)
- **Database:** PostgreSQL with Prisma ORM
- **Testing:** Jest with E2E support
- **Observability:** OpenTelemetry, Prometheus, Grafana, Loki, Tempo
- **Caching:** Redis with cache-manager
- **File Storage:** S3-compatible (AWS S3, MinIO, etc.)
- **Logging:** Winston with daily rotation

## Architecture Overview

### Module Structure
The application is organized into **functional domain modules** plus a **common utilities layer**:

#### Core Modules
- **AuthModule** (`src/auth/`) — JWT auth, refresh tokens, login/register, password reset, role-based guards
  - Controllers, services, repositories, strategies (JWT Passport), decorators, DTOs, constants
  - Implements `@Public()`, `@RequireRoles()`, `@CurrentUser()` decorators
  - Refresh token management via Prisma

- **UserModule** (`src/user/`) — User profile management, CRUD operations
  - User service with business logic
  - DTOs for profile updates

- **PostModule** (`src/post/`) — Main domain feature (can adapt for reading platform)
  - Post creation, retrieval, filtering
  - Integrates with auth and storage modules

#### Common Utilities (`src/common/`)
- **CacheModule** — Redis-backed caching via `@nestjs/cache-manager`
- **LoggerModule** — Custom Winston logger with daily file rotation, context support
- **RedisModule** — Redis client injection, ioredis-based
- **HealthModule** — Health checks with `@nestjs/terminus` (database + Redis probes)
- **StorageModule** — S3 file upload/download via `@aws-sdk/client-s3`
- **MetricsModule** — Prometheus exporter on port 9464
- **ThrottlerModule** — Hybrid throttler storage (Redis + in-memory fallback)
- **Middleware** — LoggingMiddleware for request/response logging
- **Filters** — AllExceptionsFilter for unified error handling
- **Interceptors** — HttpActiveRequestsInterceptor for metrics

#### Configuration (`src/config/`)
- **AppConfigService** — Centralized config from environment variables
- **appConfig** — Type-safe config object (used by ConfigModule)

#### Supporting
- **PrismaModule** (`src/prisma/`) — Prisma client wrapper and seeding
- **OTel** (`src/otel.ts`) — OpenTelemetry SDK initialization (traces, metrics, logging)

### Data Model (Prisma)
**Core entities:**
- `User` — Email, username, hashed password, roles, permissions, posts, refresh tokens
- `Role` — RBAC: role names linked to permissions and users
- `Permission` — Discrete permission identifiers for RBAC
- `RefreshToken` — User refresh tokens with expiry
- `Post` — User-generated content (can be adapted for reading activities)
- `UserRole`, `UserPermission`, `RolePermission` — Junction tables for many-to-many relationships

IDs use CUID for better distributed generation. Timestamps include `createdAt` and `updatedAt` with UTC timezone support.

### Request Flow & Middleware
1. **Request Entry** — Express with cookie-parser
2. **LoggingMiddleware** — Logs all requests with trace context
3. **Global ValidationPipe** — Validates and transforms DTOs (whitelist, forbidNonWhitelisted)
4. **ThrottlerGuard** — Rate limiting (default: 100 req/60s, backed by Redis)
5. **Controller/Handler** — Route logic
6. **HttpActiveRequestsInterceptor** — Tracks active requests for metrics
7. **AllExceptionsFilter** — Unified error responses
8. **Response** — Serialized with CamelCase (class-transformer)

### Environment & Configuration
Environment variables are declared in `.env` (copied from `.env.example`). **Key sections:**

**App & Networking**
- `NODE_ENV`, `HOST`, `PORT` — Runtime, bind address, server port (default: 3000)
- `COOKIE_SECURE`, `CORS_ALLOWED_ORIGINS`, `ENABLE_SWAGGER`

**Database & ORM**
- `DATABASE_URL` — PostgreSQL connection string
- Prisma applies migrations automatically on startup (configure via `prisma.config.ts`)

**Auth**
- `JWT_SECRET`, `JWT_EXPIRATION` — Access token (15m default)
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION` — Refresh token (7d default)

**Redis & Caching**
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` — Connection credentials
- `CACHE_TTL` — Cache expiration in seconds
- `THROTTLER_TTL`, `THROTTLER_LIMIT` — Rate limit window (seconds) and max requests

**File Storage**
- `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — S3 credentials
- `S3_ENDPOINT` — Blank for AWS, or MinIO/compatible endpoint
- `S3_BUCKET`, `S3_FORCE_PATH_STYLE`

**Logging**
- `LOG_LEVEL`, `LOG_DIR`, `LOG_APP_MAX_SIZE`, `LOG_APP_MAX_FILES` — Log rotation policies
- `LOG_TEST_MODE` — If true, spams logs every 2s for rotation testing

**Observability**
- `OTEL_SERVICE_NAME` — Service identifier in traces/metrics
- `ENABLE_TRACING`, `ENABLE_METRICS` — Enable OpenTelemetry exporters
- `OTEL_EXPORTER_OTLP_ENDPOINT` — Collector endpoint (default: localhost:4318)
- `METRICS_PORT`, `DB_SLOW_QUERY_THRESHOLD_MS` — Prometheus port and slow query threshold

## Common Commands

### Development
```bash
bun install                  # Install dependencies (or npm install)
cp .env.example .env        # Setup environment
bun run prisma generate     # Generate Prisma Client
bun run prisma:migrate:deploy  # Apply pending migrations
bun run prisma:seed         # Run seeder (populate initial data)
bun run start:dev           # Run with hot reload
bun run start:debug         # Debug mode with --inspect-brk
```

### Building & Production
```bash
bun run build               # Compile TypeScript to dist/
bun run start:prod          # Run compiled app (uses Bun)
npm run start:prod          # Alternative with Node (node dist/src/main)
```

### Code Quality
```bash
bun run format              # Format with Prettier
bun run lint                # Lint with ESLint (auto-fix)
```

### Testing
```bash
bun run test                # Run unit tests (matches **/*.spec.ts in src/)
bun run test:watch          # Watch mode
bun run test:cov            # Coverage report
bun run test:debug          # Debug unit tests with Node inspector
bun run test:e2e            # Run E2E tests (config: test/jest-e2e.json)

# Run single test
bun run test -- auth.service.spec.ts
```

### Database Operations
```bash
bun run prisma generate           # Regenerate Prisma Client
bun run prisma migrate dev        # Create & apply new migration interactively
bun run prisma migrate deploy     # Apply pending migrations (CI-safe)
bun run prisma:seed               # Run seeder
bun run prisma studio            # Open Prisma Studio UI (localhost:5555)
```

### Docker & Observability
```bash
docker-compose up -d              # Start API, PostgreSQL, Redis, observability stack
docker-compose down               # Stop all services
docker-compose logs -f api        # Stream API logs
docker-compose run api bun run prisma migrate deploy  # Run migrations in container
```

## Docker Stack

### Services
- **api** (port 3000) — NestJS application
- **db** (port 5432) — PostgreSQL 18
- **redis** (port 6379) — Redis cache
- **otel-collector** (port 4317/4318) — OpenTelemetry Collector (gRPC/HTTP)
- **prometheus** (port 9090) — Metrics scraper
- **grafana** (port 3001) — Visualization dashboard
- **loki** (port 3100) — Log aggregation
- **tempo** (port 3200) — Distributed tracing backend
- **alloy** (port 12345) — Grafana agent for log/trace collection

### Setup Notes
Before `docker-compose up -d`, ensure observability data directories have correct ownership:
```bash
sudo chown -R 10001:10001 ./docker-data/loki
sudo chown -R 10001:10001 ./docker-data/tempo
sudo chown -R 65534:65534 ./docker-data/prometheus
```

Import Grafana dashboards from:
- `observability/grafana/dashboard-metrics.json` — Prometheus metrics
- `observability/grafana/dashboard-logs.json` — Loki logs

## Key Features

### Authentication & Authorization
- **JWT Access Tokens** (short-lived, 15m default) sent in Authorization header
- **Refresh Tokens** (long-lived, 7d default) stored as HttpOnly cookies
- **RBAC** — Users have roles, roles have permissions (many-to-many)
- **Guards** — Use `@RequireRoles('admin')` on controllers/methods
- **Decorators** — `@Public()` for unauthenticated endpoints, `@CurrentUser()` for user injection

### Observability Stack
- **Traces** — OpenTelemetry SDK instruments HTTP, NestJS, database (Prisma), Redis calls
- **Metrics** — Prometheus exporter at `/metrics` (port 9464) tracks HTTP requests, active connections, cache hits
- **Logs** — Winston rotates daily; Alloy ships to Loki; trace IDs injected for correlation
- **Dashboards** — Pre-built Grafana boards for metrics, logs, and traces

### Performance & Reliability
- **Rate Limiting** — ThrottlerGuard with Redis-backed storage (hybrid fallback)
- **Caching** — Redis via cache-manager; `@Cacheable()` decorator support
- **Health Checks** — `/health` endpoint probes DB and Redis
- **Graceful Shutdown** — Flushes traces, closes connections, respects SIGINT/SIGTERM
- **Slow Query Detection** — Threshold-based alerts (default 200ms)

### Load Testing
Script: `observability/k6/load-test.js`
```bash
BASE_URL=http://localhost:3000 k6 run observability/k6/load-test.js
```

## Critical Files

| File | Purpose |
|------|---------|
| `src/main.ts` | Bootstrap: initializes NestJS, OpenTelemetry, Swagger, graceful shutdown |
| `src/app.module.ts` | Root module: imports all domains, configures throttler, middleware, guards, filters |
| `src/config/app-config.ts` | Type-safe config object from env vars |
| `src/otel.ts` | OpenTelemetry SDK setup: traces, metrics, logging spans |
| `prisma/schema.prisma` | Data model: User, Role, Permission, Post, RefreshToken, etc. |
| `prisma/seed.ts` | Seeder: creates initial roles, permissions, test users |
| `docker-compose.yml` | Full stack: API, PostgreSQL, Redis, observability services |
| `observability/otel-collector/otel-collector-config.yaml` | OTLP receiver, Prometheus exporter, Loki/Tempo processors |

## Development Notes

- **Port 3000** — Default API port (configurable via `PORT` env var)
- **Port 9464** — Prometheus metrics exporter
- **Port 3001** — Grafana dashboard
- **Uploads** — Served from `uploads/` directory; configurable via ServeStaticModule
- **Source Maps** — Enabled in both dev and production for debugging
- **Prisma Client** — Generated to `@prisma/client` via prebuild hook
- **Hot Reload** — `start:dev` watches `src/` for changes
- **CORS** — Whitelist configured via `CORS_ALLOWED_ORIGINS`; HttpOnly cookies require explicit credentials
- **Trace Context** — Trace IDs automatically injected into Winston logs for request correlation
- **Seeding** — Runs on-demand with `prisma:seed`; safe for repeated execution (uses upsert patterns)
- **Error Handling** — Global AllExceptionsFilter logs structured errors with trace context
- **Validation** — class-validator + class-transformer: DTO validation, type coercion, forbid unknown properties
- **Logging Levels** — DEBUG (dev), INFO (prod); configurable via `LOG_LEVEL`
