# Docker & Deployment Guide

This guide covers how to run the project with Docker, manage database migrations, and seed initial data.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running
- [Bun](https://bun.sh) installed (for running local CLI commands against the DB)
- `.env.app` configured (see [Environment Setup](#environment-setup))

---

## Environment Setup

The API container reads its environment from `.env.app` (not `.env`).
`.env` is for local development only (outside Docker).

Make sure `.env.app` contains all required variables. At minimum:

```env
# App
NODE_ENV="production"
HOST=0.0.0.0
PORT=3000
ENABLE_SWAGGER=true

# Database (Docker internal hostname)
DATABASE_URL="postgresql://foo:your-secure-password@db-nestjs-boilerplate:5432/nestjs-boilerplate"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_REFRESH_EXPIRATION="7d"

# Redis (Docker internal hostname)
REDIS_HOST="redis-nestjs-boilerplate"
REDIS_PORT=6379
REDIS_PASSWORD="redis_dev_pass"

# Google OAuth (use real credentials to enable Google login)
GOOGLE_CLIENT_ID="placeholder"
GOOGLE_CLIENT_SECRET="placeholder"
GOOGLE_CALLBACK_URL="http://localhost:3001/auth/google/callback"

# S3 / MinIO
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_ENDPOINT="http://minio-nestjs-boilerplate:9000"
S3_BUCKET="nestjs-boilerplate"
S3_FORCE_PATH_STYLE=true
```

> **Note:** `.env.app` is in `.dockerignore` so it is never baked into the image — it is mounted at container runtime only.

---

## Port Map

| Port  | Service              |
|-------|----------------------|
| 3001  | API                  |
| 5434  | PostgreSQL           |
| 6380  | Redis                |
| 9000  | MinIO S3 API         |
| 9001  | MinIO Console        |
| 3002  | Grafana              |
| 3100  | Loki                 |
| 3200  | Tempo                |
| 9090  | Prometheus           |
| 9465  | Prometheus metrics (API) |
| 5051  | pgAdmin4             |
| 12345 | Grafana Alloy        |

---

## Starting the Project

### 1. Start all infrastructure services

```bash
docker compose up -d
```

This starts: PostgreSQL, Redis, MinIO, Prometheus, Grafana, Loki, Tempo, Alloy, pgAdmin4, and the API.

### 2. Start only the API (if infra is already running)

```bash
docker compose up nestjs-boilerplate -d
```

### 3. View API logs

```bash
docker compose logs -f nestjs-boilerplate
```

### 4. Stop everything

```bash
docker compose down
```

---

## Building the Docker Image

Rebuild the image after any code change:

```bash
docker compose build nestjs-boilerplate
docker compose up nestjs-boilerplate -d
```

> **Important:** Always rebuild after changing source files, migrations, or Prisma schema. The running container uses a baked image — it does not hot-reload.

---

## Database Migrations

### How it works

The container entrypoint automatically runs `prisma migrate deploy` on every startup. You do **not** need to run migrations manually in normal flow.

### Creating a new migration (local)

```bash
bun run prisma migrate dev --name describe_your_change
```

Then rebuild and restart the container to apply it:

```bash
docker compose build nestjs-boilerplate
docker compose up nestjs-boilerplate -d
```

### Applying migrations manually (against Docker DB)

```bash
DATABASE_URL="postgresql://foo:your-secure-password@localhost:5434/nestjs-boilerplate" \
  bun run prisma migrate deploy
```

### Checking migration status

```bash
DATABASE_URL="postgresql://foo:your-secure-password@localhost:5434/nestjs-boilerplate" \
  bun run prisma migrate status
```

---

## Resolving a Stuck Migration

If the container restart-loops with `P3009 migrate found failed migrations`, a previous migration left a failed record in `_prisma_migrations`.

**Step 1 — Stop the container** (prevent new failed records from being written):

```bash
docker compose stop nestjs-boilerplate
```

**Step 2 — Delete the failed record:**

```bash
PGPASSWORD="your-secure-password" psql -h localhost -p 5434 -U foo -d nestjs-boilerplate \
  -c "DELETE FROM _prisma_migrations WHERE finished_at IS NULL;"
```

**Step 3 — Verify only successfully applied migrations remain:**

```bash
PGPASSWORD="your-secure-password" psql -h localhost -p 5434 -U foo -d nestjs-boilerplate \
  -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;"
```

**Step 4 — Rebuild and restart:**

```bash
docker compose build nestjs-boilerplate
docker compose up nestjs-boilerplate -d
```

> This situation usually happens when a migration file is deleted/replaced while a container built from the old image is still running. Always rebuild the image after replacing migrations.

---

## Seeding the Database

The seed script creates the required roles (`ADMIN`, `MODERATOR`, `USER`) and an initial admin user.

> **Run seed after the first deployment** or whenever the DB is wiped.

```bash
DATABASE_URL="postgresql://foo:your-secure-password@localhost:5434/nestjs-boilerplate" \
  bun run prisma:seed
```

Expected output:

```
🌱 Starting database seeding...
✅ Seed complete
Users: 6
Roles: 3
Refresh Tokens: 6
```

### Default admin credentials

| Field    | Value               |
|----------|---------------------|
| Email    | admin@example.com   |
| Password | Admin123!           |

> Change the admin password after first login in any non-local environment.

---

## Verifying the Project is Running

### 1. Check container status

```bash
docker compose ps
```

The `nestjs-boilerplate` container should show `Up` (not `Restarting`).

### 2. Health check

```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok", ...}` with all indicators green.

### 3. API root

```bash
curl http://localhost:3001
```

Expected: `Hello World!`

### 4. Swagger UI

Open `http://localhost:3001/docs` in your browser.

All endpoint groups should be visible: **App**, **Auth**, **Users**, **Books**, **Reading Trackers**, **Reading Sessions**, **reading-streak**, **Reading Dashboard**, **Health**.

---

## Full First-Run Checklist

```
[ ] docker compose up -d
[ ] Wait for nestjs-boilerplate to show "Nest application successfully started" in logs
[ ] Run: bun run prisma:seed (with DATABASE_URL pointing to localhost:5434)
[ ] Open http://localhost:3001/health  → status: ok
[ ] Open http://localhost:3001/docs    → Swagger UI loads
[ ] Register or login with admin@example.com / Admin123!
```

---

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Container restart-loops with `P3009` | Stale failed migration record in DB | See [Resolving a Stuck Migration](#resolving-a-stuck-migration) |
| `GOOGLE_CLIENT_ID is required` | Missing Google OAuth vars in `.env.app` | Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` to `.env.app` |
| `No 'Role' record found` on register | DB not seeded | Run `bun run prisma:seed` |
| TS build errors (`TS1272`) | `import type` missing for type-only imports used in decorators | Change `import { X }` to `import type { X }` for types only used in method signatures |
| `injecting env (0) from .env` in logs | `.env` not present inside container (expected) | Env is loaded from `.env.app` via `env_file` in compose — this log line is normal |
