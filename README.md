# RumahBaca Backend (API)

Backend service untuk aplikasi RumahBaca, dibangun dengan NestJS + Prisma + PostgreSQL.

## Ringkasan

Project ini menyediakan REST API untuk fitur inti RumahBaca:

- Autentikasi JWT (access + refresh token) + Google OAuth
- Manajemen user dan avatar
- Manajemen buku (katalog)
- Reading tracker, sesi baca, streak, dan dashboard
- Pertemanan (friend request + friends)
- Reading room (baca bareng) dengan invite, komentar, dan likes
- RBAC (role + permission)
- Cache Redis, rate limiting, dan health check
- Observability (OpenTelemetry, Prometheus, Grafana, Loki, Tempo)

## Tech Stack

- NestJS 11 (Express)
- TypeScript ES2023
- Prisma ORM 7 + PostgreSQL 18
- Redis (ioredis + cache-manager + Keyv)
- Bun (runtime & script runner)
- Swagger (opsional via `ENABLE_SWAGGER=true`, tersedia di `/docs`)
- OpenTelemetry → Prometheus + Grafana + Loki + Tempo
- MinIO / S3-compatible object storage

## Fitur yang Sudah Ada

### Auth
- Register, login, logout
- Refresh token via HttpOnly cookie
- Google OAuth2 login
- JWT Guard + ACL Guard (role + permission based)

### Users
- CRUD user (permission-based)
- Upload avatar (`multipart/form-data`)
- Search user

### Books
- Tambah buku
- Cari buku

### Reading
- Buat & kelola reading tracker per buku
- Catat sesi baca (halaman, durasi)
- Reading streak harian + kalender streak
- Dashboard progres baca

### Friends
- Kirim, terima, tolak, batalkan friend request
- List teman, hapus pertemanan

### Rooms (Reading Room)
- Buat reading room (terhubung ke buku)
- List & detail room (khusus anggota)
- Invite teman ke room, terima/tolak invite
- Catat progres baca dalam room
- Komentar dalam room + likes komentar

## Endpoint Aktif

### General
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/` | Root |
| GET | `/health` | Health check |

### Auth
| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/auth/register` | Daftar akun baru |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout |
| GET | `/auth/google` | Redirect ke Google OAuth |
| GET | `/auth/google/callback` | Callback Google OAuth |

### Users
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/users` | List semua user |
| GET | `/users/search` | Cari user |
| GET | `/users/:id` | Detail user |
| POST | `/users` | Buat user |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Hapus user |
| POST | `/users/:id/avatar` | Upload avatar |

### Books
| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/books` | Tambah buku |
| GET | `/books/search` | Cari buku |

### Reading
| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/readings` | Buat reading tracker |
| GET | `/readings` | List reading tracker |
| GET | `/readings/:id` | Detail reading tracker |
| PATCH | `/readings/:id` | Update reading tracker |
| POST | `/readings/:id/sessions` | Catat sesi baca |
| GET | `/readings/:id/sessions` | List sesi baca |
| GET | `/reading-streak/me` | Streak aktif user |
| GET | `/reading-streak/me/calendar` | Kalender streak bulanan |
| GET | `/reading-dashboard/me` | Dashboard progres baca |

### Friends
| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/friend-requests` | Kirim friend request |
| GET | `/friend-requests` | List friend request |
| PATCH | `/friend-requests/:id/respond` | Terima / tolak / batalkan |
| GET | `/friends` | List teman |
| DELETE | `/friends/:friendId` | Hapus pertemanan |

### Rooms
| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/rooms` | Buat reading room |
| GET | `/rooms` | List room milik user |
| GET | `/rooms/:id` | Detail room (khusus anggota) |
| POST | `/rooms/:id/progress` | Catat progres baca dalam room |
| POST | `/rooms/:id/invites` | Invite teman ke room |
| GET | `/rooms/:id/comments` | List komentar room |
| POST | `/rooms/:id/comments` | Tambah komentar |
| POST | `/rooms/comments/:id/likes` | Like komentar |
| DELETE | `/rooms/comments/:id/likes` | Unlike komentar |

### Room Invites
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/room-invites` | List invite pending user |
| PATCH | `/room-invites/:id/respond` | Terima / tolak invite |

> Swagger UI tersedia di `/docs` jika `ENABLE_SWAGGER=true`.

## Menjalankan Project (Local)

### 1. Setup

```bash
bun install
cp .env.example .env
```

### 2. Generate Prisma Client + Migrasi + Seed

```bash
bun run prisma generate
bun run prisma migrate deploy
bun run prisma:seed
```

### 3. Jalankan API

```bash
bun run start:dev
```

API berjalan di `http://127.0.0.1:3000` (sesuai `HOST` dan `PORT` di env).

## Testing

```bash
# Unit tests
bun run test

# Satu file
bun run test -- auth.service.spec.ts

# E2E tests (butuh PostgreSQL + Redis aktif)
bun run test:e2e

# Coverage
bun run test:cov
```

## Docker Compose

Untuk menjalankan full stack (API + DB + Redis + observability):

```bash
docker-compose up -d
```

| Port | Service |
|------|---------|
| 3001 | API |
| 9464 | Prometheus metrics exporter |
| 5434 | PostgreSQL |
| 6380 | Redis |
| 9000 | MinIO S3 API |
| 9001 | MinIO Console |
| 3002 | Grafana |
| 9090 | Prometheus |
| 3100 | Loki |
| 3200 | Tempo |

## Struktur Direktori

```
src/
├── auth/                  # JWT, refresh token, Google OAuth, ACL
├── user/                  # User CRUD + avatar upload
├── book/                  # Katalog buku
├── reading-tracker/       # Tracker buku per user
├── reading-session/       # Sesi baca
├── reading-streak/        # Streak harian + kalender
├── reading-dashboard/     # Dashboard progres
├── friend-request/        # Kirim/terima/tolak friend request
├── friends/               # List & hapus teman
├── rooms/                 # Reading room + komentar + likes
├── room-invites/          # Invite anggota ke room
├── common/                # Cache, logger, Redis, health, observability
├── config/                # Typed configuration service
└── prisma/                # Prisma integration

prisma/
├── schema.prisma          # Skema database
└── seed.ts                # Seeder (roles, permissions, users)
```

## Environment Variables (Kunci)

Lihat `.env.example` untuk referensi lengkap. Variabel penting:

| Variable | Keterangan |
|----------|------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_EXPIRATION` | Access token config |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION` | Refresh token config |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis config |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Storage config |
| `ENABLE_SWAGGER` | Aktifkan Swagger UI di `/docs` |
| `CORS_ALLOWED_ORIGINS`, `COOKIE_SECURE` | Security config |
| `ENABLE_TRACING`, `ENABLE_METRICS`, `OTEL_EXPORTER_OTLP_ENDPOINT` | Observability config |

## Referensi Docs Internal

- [Arsitektur](./docs/architecture.md)
- [Kontrak API RumahBaca](./docs/api-schema.md)
- [Rencana MVP Backend](./docs/mvp-backend-feature-plan.md)
