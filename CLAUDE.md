# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack
- Runtime:    Bun (ALWAYS use Bun — never npm or node directly)
- Framework:  NestJS 11 + Express, TypeScript ES2023 (target/module: nodenext)
- Database:   PostgreSQL 18 · Prisma ORM 7 with @prisma/adapter-pg
- Cache:      Hybrid Redis + LRU (5000 items) via ioredis + cache-manager + Keyv
- Auth:       JWT access tokens (15 min) + refresh tokens in HttpOnly cookies (7d)
- Storage:    S3-compatible (AWS S3 or MinIO) or local filesystem (auto-detects)
- Testing:    Jest unit (src/**/*.spec.ts) + Jest E2E (test/*.e2e-spec.ts)
- Logging:    Winston with daily rotation + OTel trace context injection
- Observability: OpenTelemetry → Prometheus (port 9464) + Grafana + Loki + Tempo

## Commands
### Dev
- Start dev:        bun run start:dev
- Debug:            bun run start:debug

### Quality — run both after every change
- Lint:             bun run lint
- Format:           bun run format

### Test
- Unit tests:       bun run test
- Single test:      bun run test -- auth.service.spec.ts
- E2E tests:        bun run test:e2e  (requires running PostgreSQL + Redis)
- Coverage:         bun run test:cov

### Build
- Build:            bun run build  (runs prisma generate via prebuild hook)
- Production:       bun run start:prod

### Database
- Generate client:  bun run prisma generate
- New migration:    bun run prisma migrate dev
- Apply migrations: bun run prisma migrate deploy
- Seed:             bun run prisma:seed
- Studio:           bun run prisma studio

### Docker
- Start all:        docker-compose up -d
- Stop all:         docker-compose down
- API logs:         docker-compose logs -f api

## Architecture

### Request lifecycle
1. OTel SDK initializes BEFORE NestJS (src/otel.ts imported first in main.ts)
2. Global middleware: cookie-parser → LoggingMiddleware (all routes)
3. Global guards: ThrottlerGuard (rate limiting on all routes)
4. Per-route guards: JwtAuthGuard → AclGuard (permission check)
5. Global pipes: ValidationPipe (whitelist + transform + forbidNonWhitelisted)
6. Controller → Service → Repository
7. Global interceptor: HttpActiveRequestsInterceptor (metrics)
8. Global filter: AllExceptionsFilter (error metrics + normalized JSON response)

### Auth pattern (src/auth/)
There is NO global JWT guard — auth is applied per-route:
```typescript
@UseGuards(JwtAuthGuard, AclGuard)
@Permissions(PERMISSIONS.STORE_POST)
async create(@CurrentUser() user: JwtPayload) { }
```
- `@Permissions(...)` — sets required permissions (from src/auth/constants/acl.constant.ts)
- `@CurrentUser()` — injects JwtPayload (sub, email, username, roles[], permissions[])
- AclGuard: checks user has all required permissions; ADMIN role bypasses all checks
- No `@Public()` or `@RequireRoles()` decorators exist — do not use them

### Data model (prisma/schema.prisma)
User → Posts (1:many), User ↔ Roles (many:many via UserRole), User ↔ Permissions (many:many via UserPermission), Role ↔ Permissions (many:many via RolePermission), User → RefreshTokens (1:many)

### Key modules (src/common/)
- **cache/** — CacheService with hybrid Redis+LRU, CustomCacheInterceptor
- **redis/** — Global ioRedis client with metrics proxy (REDIS_CLIENT token)
- **logger/** — CustomLoggerService with Winston, auto-injects OTel trace/span IDs
- **health/** — GET /health with Redis, PostgreSQL, memory (150MB), disk (90%) checks
- **storage/** — Strategy pattern: LocalStorageProvider or S3StorageProvider (auto-detected)
- **observability/** — MetricsService with OTel instruments for DB, Redis, HTTP metrics
- **throttler/** — HybridThrottlerStorage: Redis-backed with memory fallback

### Config (src/config/)
AppConfigService wraps @nestjs/config with typed getters. All env vars are defined in app.config.ts. Access via injection — never use process.env directly.

### Swagger
Available at `/docs` when ENABLE_SWAGGER=true in env.

## Rules
### Runtime
- MUST use Bun for all commands — never npm, npx, or node directly
- MUST run `bun run lint` and `bun run test` after every set of changes before marking done

### Architecture
- MUST place business logic in Services — never in Controllers or Repositories
- MUST place all database queries in Repositories — never in Services directly
- MUST read all config from AppConfigService (src/config/) — never process.env directly
- MUST follow the module pattern: Controller → Service → Repository

### Database
- MUST use Prisma query builder for all DB operations
- MUST wrap writes touching more than one table in a Prisma transaction
- MUST run `bun run prisma generate` after any schema.prisma change
- NEVER write raw SQL — use Prisma query builder only
- NEVER edit files inside prisma/migrations/ directly

### Auth & security
- MUST apply JwtAuthGuard + AclGuard per-route for protected endpoints
- MUST use @Permissions() for permission-gated endpoints, @CurrentUser() to inject user
- MUST add class-validator decorators to every DTO (whitelist + forbidNonWhitelisted is global)
- NEVER bypass the global ValidationPipe — add proper DTOs instead
- NEVER store secrets in code — use AppConfigService which reads from .env

### TypeScript
- NEVER use `any` type — use proper types or `unknown` with type guards
- MUST use typed properties in all classes (no implicit any)

### Observability
- MUST inject Logger (LoggerModule) — never use console.log
- OTel is initialized in src/otel.ts before NestJS bootstrap — do not move or re-init

## Git workflow
- Branch format:  feature/short-description or fix/issue-description
- Commits:        conventional commits — feat(scope): description / fix / chore / refactor
- Before commit:  lint + tests must pass
- NEVER force push to main or develop

## Port map (docker-compose)
| Port  | Service                        |
|-------|--------------------------------|
| 3000  | API (internal), mapped to 3001 |
| 9464  | Prometheus metrics exporter    |
| 3002  | Grafana                        |
| 3100  | Loki                           |
| 3200  | Tempo                          |
| 5434  | PostgreSQL (external)          |
| 6380  | Redis (external)               |
| 9000  | MinIO S3 API                   |
| 9001  | MinIO Console                  |

## Lessons learned
<!-- Add a line here every time Claude makes a mistake — one mistake = one rule -->
<!-- Format: - Do NOT [what Claude did wrong] — [correct approach] -->