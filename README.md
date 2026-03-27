# RumahBaca Backend (API)

Backend service untuk aplikasi RumahBaca, dibangun dengan NestJS + Prisma + PostgreSQL.

README ini mendeskripsikan kondisi project saat ini (bukan lagi template boilerplate umum).

## Ringkasan

Project ini menyediakan fondasi API untuk fitur inti RumahBaca:

- autentikasi JWT (access + refresh token)
- manajemen user dan avatar
- manajemen post
- RBAC (role + permission)
- cache Redis, rate limiting, dan health check
- observability (OpenTelemetry, Prometheus, Grafana, Loki, Tempo)

Status saat ini: domain utama yang sudah berjalan di codebase adalah `auth`, `users`, dan `posts`. Kontrak endpoint produk yang lebih luas ada di [docs/api-schema.md](./docs/api-schema.md).

## Tech Stack

- NestJS 11 (Express)
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- Bun (runtime/script runner)
- Swagger (opsional via env)
- OpenTelemetry + Prometheus + Grafana + Loki + Tempo
- MinIO / S3-compatible object storage

## Fitur yang Sudah Ada

- Register, login, refresh token, logout
- Refresh token via HttpOnly cookie
- Authorization dengan JWT Guard + ACL Guard
- CRUD user (dengan permission-based access)
- Upload avatar user (`multipart/form-data`)
- CRUD post + pagination/filter/search
- Global validation pipe + unified exception filter
- Request logging (Winston + rotate file)
- Redis cache + custom cache interceptor/decorator
- Hybrid rate limiter storage (Redis + fallback)
- Health check untuk PostgreSQL, Redis, memory, disk
- Endpoint metrics OpenTelemetry/Prometheus

## Endpoint Utama yang Aktif

Saat ini controller yang aktif:

- `GET /`
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `POST /users/:id/avatar`
- `GET /posts`
- `GET /posts/:id`
- `POST /posts`
- `PATCH /posts/:id`
- `DELETE /posts/:id`

Catatan:

- Tidak ada global API prefix saat ini (bukan `/api/v1` di runtime saat ini).
- Swagger aktif jika `ENABLE_SWAGGER=true`, tersedia di `/docs`.

## Menjalankan Project (Local)

### 1) Setup

```bash
bun install
cp .env.example .env
```

### 2) Generate Prisma Client + Migrasi + Seed

```bash
bun run prisma generate
bun run prisma:migrate:deploy
bun run prisma:seed
```

### 3) Jalankan API

```bash
bun run start:dev
```

API default berjalan di `http://127.0.0.1:3000` (tergantung `HOST` dan `PORT` di env).

## Testing

```bash
bun run test
bun run test:e2e
bun run test:cov
```

## Docker Compose

Untuk menjalankan full stack (API + DB + Redis + observability):

```bash
docker-compose up -d
```

Service utama dari `docker-compose.yml`:

- API: `localhost:3001`
- Metrics exporter: `localhost:9465`
- PostgreSQL: `localhost:5434`
- Redis: `localhost:6380`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`
- Grafana: `localhost:3002`
- Prometheus: `localhost:9090`
- Loki: `localhost:3100`
- Tempo: `localhost:3200`

## Struktur Direktori Penting

- `src/auth` - auth, JWT, refresh token, ACL
- `src/user` - user service/controller/DTO + upload avatar
- `src/post` - post service/controller/DTO
- `src/common` - cache, logger, redis, health, observability, filters, middleware
- `src/config` - typed configuration service
- `src/prisma` - prisma integration service/module
- `prisma/schema.prisma` - skema database
- `prisma/seed.ts` - seeder data awal (roles, permissions, users, posts)
- `docs/api-schema.md` - kontrak API produk RumahBaca
- `docs/architecture.md` - catatan arsitektur backend

## Environment Variables (Kunci)

Lihat `.env.example` untuk referensi lengkap. Variabel penting:

- `DATABASE_URL`
- `JWT_SECRET`, `JWT_EXPIRATION`
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `ENABLE_SWAGGER`, `CORS_ALLOWED_ORIGINS`, `COOKIE_SECURE`
- `ENABLE_TRACING`, `ENABLE_METRICS`, `OTEL_EXPORTER_OTLP_ENDPOINT`

## Referensi Docs Internal

- [Arsitektur](./docs/architecture.md)
- [Kontrak API RumahBaca](./docs/api-schema.md)
- [Rencana MVP Backend](./docs/mvp-backend-feature-plan.md)
