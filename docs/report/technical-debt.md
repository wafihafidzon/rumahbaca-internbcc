# Technical Debt Report - RumahBaca Backend

| Field | Detail |
|-------|--------|
| **Tanggal Audit** | 31 Maret 2026 |
| **Auditor** | Senior Code Auditor |
| **Status Project** | Bootstrap / Scaffolding |
| **Framework** | NestJS 11.0.1 |
| **Language** | TypeScript 5.7.3 |
| **Database (Target)** | PostgreSQL + Prisma |
| **Entry Point** | `src/main.ts` |

---

## URGENT - Harus Segera Diperbaiki

Debt yang masuk kategori **urgent** adalah item yang akan menyebabkan masalah keamanan, crash di production, atau menghambat development jika tidak ditangani sebelum fitur baru dikembangkan.

---

### U-01: Tidak Ada Error Handling di Bootstrap

| Field | Detail |
|-------|--------|
| **File** | `src/main.ts` |
| **Impact** | HIGH - Aplikasi crash tanpa log jika bootstrap gagal |

**Deskripsi:**
Fungsi `bootstrap()` di `main.ts` tidak memiliki `try-catch`. Jika `NestFactory.create()` atau `app.listen()` gagal (misalnya port sudah dipakai), proses akan terminate tanpa error message yang jelas.

```typescript
// Current - tidak ada error handling
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

**Rekomendasi:**
- Tambahkan `try-catch` di `bootstrap()`
- Log error dengan jelas sebelum process exit
- Tambahkan graceful shutdown handler (`app.enableShutdownHooks()`)

---

### U-02: Tidak Ada Global Exception Filter

| Field | Detail |
|-------|--------|
| **File** | `src/main.ts`, `src/app.module.ts` |
| **Impact** | HIGH - Stack trace dan internal error bisa terexpose ke client |

**Deskripsi:**
Tidak ada custom exception filter yang terdaftar secara global. NestJS default exception handler akan mengirim raw error detail ke client, termasuk stack trace di development mode. Ini merupakan security risk (information disclosure).

**Rekomendasi:**
- Buat custom `HttpExceptionFilter` di `src/common/filters/`
- Register sebagai global filter di `main.ts` via `app.useGlobalFilters()`
- Standardisasi format error response (error code, message, timestamp)

---

### U-03: Tidak Ada Input Validation

| Field | Detail |
|-------|--------|
| **File** | `src/app.controller.ts`, `package.json` |
| **Impact** | CRITICAL - Endpoint rentan terhadap malformed/malicious input |

**Deskripsi:**
Package `class-validator` dan `class-transformer` belum terinstall. Tidak ada `ValidationPipe` yang terdaftar secara global. Semua request body akan diterima tanpa validasi apapun.

**Rekomendasi:**
- Install `class-validator` dan `class-transformer`
- Register `ValidationPipe` secara global di `main.ts`
- Buat DTO (Data Transfer Object) untuk setiap endpoint yang menerima input
- Aktifkan `whitelist: true` dan `forbidNonWhitelisted: true`

---

### U-04: Tidak Ada Security Middleware

| Field | Detail |
|-------|--------|
| **File** | `src/main.ts`, `package.json` |
| **Impact** | HIGH - Aplikasi rentan terhadap common web attacks |

**Deskripsi:**
Tiga security middleware kritis belum dikonfigurasi:

1. **CORS** - `app.enableCors()` belum dipanggil. Frontend dari domain berbeda tidak bisa mengakses API, atau jika CORS dimatikan secara salah, API terbuka untuk semua origin.
2. **Helmet** - Package `helmet` belum terinstall. Tidak ada security headers (CSP, X-Frame-Options, X-Content-Type-Options, dll).
3. **Rate Limiting** - Tidak ada `@nestjs/throttler` atau rate limiter lainnya. API rentan terhadap brute force dan DDoS.

**Rekomendasi:**
- Konfigurasi CORS dengan whitelist origin yang spesifik
- Install dan register `helmet` middleware
- Install `@nestjs/throttler` dan konfigurasi rate limit per endpoint

---

### U-05: Tidak Ada Environment Configuration Management

| Field | Detail |
|-------|--------|
| **File** | `src/main.ts`, `package.json` |
| **Impact** | HIGH - Konfigurasi tidak terkelola, rawan error di deployment |

**Deskripsi:**
- Package `@nestjs/config` belum terinstall
- Tidak ada file `.env.example` sebagai dokumentasi environment variables yang dibutuhkan
- `process.env.PORT` diakses langsung tanpa validasi (bisa jadi string non-numeric)
- Tidak ada validasi startup yang memastikan semua env vars tersedia

**Rekomendasi:**
- Install `@nestjs/config`
- Buat `.env.example` dengan semua variable yang dibutuhkan
- Gunakan schema validation (Joi/Zod) untuk validasi env vars saat startup
- Register `ConfigModule.forRoot()` di `AppModule`

---

### U-06: Tidak Ada Database Layer

| Field | Detail |
|-------|--------|
| **File** | `package.json`, `src/app.module.ts` |
| **Impact** | CRITICAL - Tidak bisa menyimpan data apapun |

**Deskripsi:**
README menyebutkan PostgreSQL + Prisma sebagai target, namun:
- Package `prisma` dan `@prisma/client` belum terinstall
- Tidak ada `schema.prisma`
- Tidak ada database module di `AppModule.imports`
- Tidak ada migration strategy
- Tidak ada connection pooling
- Tidak ada transaction management

**Rekomendasi:**
- Install Prisma: `npm install prisma @prisma/client`
- Inisialisasi: `npx prisma init`
- Buat schema awal dan jalankan migration
- Buat `PrismaModule` sebagai global module
- Konfigurasi connection pooling untuk production

---

### U-07: Tidak Ada Authentication & Authorization

| Field | Detail |
|-------|--------|
| **File** | `src/app.controller.ts` |
| **Impact** | CRITICAL - Semua endpoint bisa diakses siapapun tanpa login |

**Deskripsi:**
- Tidak ada JWT strategy atau session management
- Tidak ada `@UseGuards()` di controller manapun
- Tidak ada role-based access control (RBAC)
- Package `@nestjs/passport`, `@nestjs/jwt`, `passport-jwt` belum terinstall

**Rekomendasi:**
- Install `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-jwt`
- Buat `AuthModule` dengan JWT strategy
- Implementasi `JwtAuthGuard` sebagai global guard
- Buat decorator `@Public()` untuk endpoint yang tidak perlu auth
- Implementasi RBAC dengan `RolesGuard`

---

### U-08: Tidak Ada Logging

| Field | Detail |
|-------|--------|
| **File** | Seluruh codebase |
| **Impact** | HIGH - Tidak ada visibility saat terjadi masalah di production |

**Deskripsi:**
- Tidak ada structured logging library (Winston/Pino)
- Tidak ada request/response logging middleware
- Tidak ada error logging
- Tidak ada audit trail untuk operasi sensitif
- NestJS built-in Logger dipakai secara default tapi tidak dikonfigurasi

**Rekomendasi:**
- Install `nestjs-pino` atau `nest-winston` untuk structured logging
- Tambahkan request logging middleware (method, URL, status, duration)
- Konfigurasi log levels berdasarkan environment (debug di dev, warn/error di prod)
- Tambahkan correlation ID per request untuk tracing

---

### U-09: Tidak Ada Health Check Endpoint

| Field | Detail |
|-------|--------|
| **File** | `package.json`, `src/app.module.ts` |
| **Impact** | HIGH - Container orchestrator tidak bisa monitor status aplikasi |

**Deskripsi:**
Tidak ada endpoint `/health` atau `/ready`. Jika di-deploy ke Kubernetes atau container platform lain, tidak ada liveness/readiness probe yang bisa digunakan.

**Rekomendasi:**
- Install `@nestjs/terminus`
- Buat `HealthModule` dengan `HealthController`
- Tambahkan check: HTTP ping, database connection, memory usage
- Expose di `GET /health`

---

### U-10: TypeScript & ESLint Config Terlalu Longgar

| Field | Detail |
|-------|--------|
| **File** | `tsconfig.json`, `eslint.config.mjs` |
| **Impact** | MEDIUM - Bug yang bisa ditangkap compiler akan lolos ke runtime |

**Deskripsi:**

**tsconfig.json:**
- `noImplicitAny: false` - mengizinkan implicit `any`, mengurangi type safety
- `strictBindCallApply: false` - tidak strict untuk bind/call/apply
- `noFallthroughCasesInSwitch: false` - switch tanpa break tidak di-warn

**eslint.config.mjs:**
- `@typescript-eslint/no-explicit-any: 'off'` - `any` type diizinkan di mana saja
- `@typescript-eslint/no-unsafe-argument: 'warn'` - hanya warning, bukan error

**Rekomendasi:**
- Set `noImplicitAny: true`, `strictBindCallApply: true`, `noFallthroughCasesInSwitch: true`
- Set `no-explicit-any` minimal ke `warn`
- Set `no-unsafe-argument` ke `error`

---

## NON-URGENT - Perbaiki Sebelum Production

Item berikut penting tapi tidak blocking untuk development awal. Harus diselesaikan sebelum launch ke production.

---

### NU-01: Tidak Ada CI/CD Pipeline

| Field | Detail |
|-------|--------|
| **File** | `.github/workflows/` (belum ada) |
| **Impact** | MEDIUM - Tidak ada automated quality gate |

**Deskripsi:**
Tidak ada GitHub Actions atau CI/CD pipeline apapun. Artinya:
- Tidak ada automated test execution saat PR dibuat
- Tidak ada lint check otomatis
- Tidak ada build verification
- Tidak ada automated deployment

**Rekomendasi:**
- Buat `.github/workflows/ci.yml` dengan jobs: lint, test, build
- Tambahkan coverage threshold check
- Tambahkan deployment workflow untuk staging/production
- Set branch protection rule di `master` agar require CI pass

---

### NU-02: Tidak Ada Docker Support

| Field | Detail |
|-------|--------|
| **File** | `Dockerfile` (belum ada), `docker-compose.yml` (belum ada) |
| **Impact** | MEDIUM - Tidak bisa containerize, deployment jadi environment-dependent |

**Deskripsi:**
- Tidak ada `Dockerfile` untuk build container image
- Tidak ada `docker-compose.yml` untuk local development (app + PostgreSQL + Redis)
- Tidak ada `.dockerignore`

**Rekomendasi:**
- Buat multi-stage `Dockerfile` (build stage + production stage)
- Buat `docker-compose.yml` dengan service: app, postgres, redis
- Buat `.dockerignore` (exclude node_modules, .git, dist, coverage)

---

### NU-03: Test Coverage Sangat Minim

| Field | Detail |
|-------|--------|
| **File** | `src/app.controller.spec.ts`, `test/app.e2e-spec.ts` |
| **Impact** | MEDIUM - Tidak ada jaminan kualitas saat refactoring |

**Deskripsi:**
- Hanya 1 unit test (test trivial "Hello World" di controller)
- Hanya 1 e2e test (GET / returns "Hello World")
- `AppService` tidak punya test file
- Tidak ada test utilities, fixtures, atau factories
- Tidak ada coverage threshold yang di-enforce

**Rekomendasi:**
- Set coverage threshold minimum (misalnya 80%) di jest config
- Buat test utilities dan mock factories
- Setiap module baru harus include unit test dan integration test
- Tambahkan database test setup dengan test container

---

### NU-04: Tidak Ada API Documentation (Swagger)

| Field | Detail |
|-------|--------|
| **File** | `package.json` |
| **Impact** | MEDIUM - Frontend developer tidak punya reference API yang up-to-date |

**Deskripsi:**
Package `@nestjs/swagger` belum terinstall. Tidak ada auto-generated API documentation. Frontend developer harus membaca source code untuk tahu endpoint apa saja yang tersedia.

**Rekomendasi:**
- Install `@nestjs/swagger`
- Setup Swagger di `main.ts` dengan `SwaggerModule.setup()`
- Expose di `GET /api/docs`
- Tambahkan `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()` di setiap controller

---

### NU-05: Tidak Ada API Versioning

| Field | Detail |
|-------|--------|
| **File** | `src/app.controller.ts` |
| **Impact** | LOW - Breaking changes akan memaksa semua client upgrade sekaligus |

**Deskripsi:**
Controller saat ini di-mount di root `/` tanpa prefix versioning. Ketika ada breaking change di API, tidak ada mekanisme untuk support versi lama dan baru secara bersamaan.

**Rekomendasi:**
- Tambahkan global prefix `api/v1` di `main.ts` via `app.setGlobalPrefix('api/v1')`
- Atau gunakan NestJS URI versioning: `app.enableVersioning({ type: VersioningType.URI })`

---

### NU-06: Tidak Ada Caching Strategy

| Field | Detail |
|-------|--------|
| **File** | `package.json`, `src/app.module.ts` |
| **Impact** | LOW - Performance akan buruk saat data bertambah |

**Deskripsi:**
Tidak ada caching layer yang dikonfigurasi. Setiap request akan selalu query ke database. Untuk endpoint yang sering diakses dengan data yang jarang berubah, ini tidak efisien.

**Rekomendasi:**
- Install `@nestjs/cache-manager` dan `cache-manager`
- Konfigurasi Redis sebagai cache store untuk production
- Gunakan `@CacheInterceptor()` untuk endpoint yang appropriate
- Set TTL yang masuk akal per endpoint

---

### NU-07: Tidak Ada Compression Middleware

| Field | Detail |
|-------|--------|
| **File** | `src/main.ts` |
| **Impact** | LOW - Response size lebih besar dari yang diperlukan |

**Deskripsi:**
Tidak ada gzip/brotli compression untuk HTTP responses. Untuk response JSON yang besar, ini akan memperlambat transfer ke client.

**Rekomendasi:**
- Install `compression` package
- Register di `main.ts`: `app.use(compression())`

---

### NU-08: Tidak Ada Pre-commit Hooks

| Field | Detail |
|-------|--------|
| **File** | `package.json` |
| **Impact** | LOW - Code yang tidak lolos lint bisa ter-commit |

**Deskripsi:**
Tidak ada Husky atau pre-commit hook yang memastikan code sudah di-lint dan di-format sebelum commit.

**Rekomendasi:**
- Install `husky` dan `lint-staged`
- Konfigurasi pre-commit hook: run lint + format pada staged files
- Tambahkan commit message validation (conventional commits)

---

### NU-09: Tidak Ada Pagination Pattern

| Field | Detail |
|-------|--------|
| **File** | `src/app.controller.ts` |
| **Impact** | MEDIUM - List endpoint akan mengembalikan semua data sekaligus |

**Deskripsi:**
Belum ada pattern/utility untuk pagination. Ketika ada endpoint yang mengembalikan list data (buku, user, dll), tanpa pagination response bisa sangat besar.

**Rekomendasi:**
- Buat shared DTO untuk pagination (page, limit, sort)
- Buat utility function untuk generate paginated response
- Standardisasi format: `{ data: [], meta: { total, page, limit, totalPages } }`

---

### NU-10: Folder `/docs` di-exclude dari Git

| Field | Detail |
|-------|--------|
| **File** | `.gitignore` (line 55) |
| **Impact** | LOW - Dokumentasi eksternal tidak ter-version control |

**Deskripsi:**
File `.gitignore` meng-exclude folder `/docs`. Ini berarti dokumentasi project (PRD, API guidelines, architecture docs yang disebutkan di README) tidak masuk ke repository. Developer lain tidak bisa akses dokumentasi ini.

**Rekomendasi:**
- Hapus `/docs` dari `.gitignore`
- Atau pindahkan rule agar hanya exclude generated docs (misalnya `/docs/generated/`)

---

## Summary Table

| ID | Item | Kategori | Impact | File Utama |
|----|------|----------|--------|------------|
| U-01 | No Error Handling di Bootstrap | URGENT | HIGH | `src/main.ts` |
| U-02 | No Global Exception Filter | URGENT | HIGH | `src/main.ts` |
| U-03 | No Input Validation | URGENT | CRITICAL | `package.json` |
| U-04 | No Security Middleware | URGENT | HIGH | `src/main.ts` |
| U-05 | No Environment Config | URGENT | HIGH | `src/main.ts` |
| U-06 | No Database Layer | URGENT | CRITICAL | `package.json` |
| U-07 | No Auth/AuthZ | URGENT | CRITICAL | `src/app.controller.ts` |
| U-08 | No Logging | URGENT | HIGH | Seluruh codebase |
| U-09 | No Health Check | URGENT | HIGH | `package.json` |
| U-10 | TS/ESLint Config Longgar | URGENT | MEDIUM | `tsconfig.json`, `eslint.config.mjs` |
| NU-01 | No CI/CD Pipeline | NON-URGENT | MEDIUM | `.github/workflows/` |
| NU-02 | No Docker Support | NON-URGENT | MEDIUM | Root directory |
| NU-03 | Minimal Test Coverage | NON-URGENT | MEDIUM | `src/`, `test/` |
| NU-04 | No API Docs (Swagger) | NON-URGENT | MEDIUM | `package.json` |
| NU-05 | No API Versioning | NON-URGENT | LOW | `src/app.controller.ts` |
| NU-06 | No Caching Strategy | NON-URGENT | LOW | `package.json` |
| NU-07 | No Compression | NON-URGENT | LOW | `src/main.ts` |
| NU-08 | No Pre-commit Hooks | NON-URGENT | LOW | `package.json` |
| NU-09 | No Pagination Pattern | NON-URGENT | MEDIUM | `src/app.controller.ts` |
| NU-10 | `/docs` di .gitignore | NON-URGENT | LOW | `.gitignore` |

---

## Roadmap Rekomendasi

### Phase 1 - Foundation (Prioritas Tertinggi)
> Selesaikan sebelum mulai develop fitur apapun

1. Fix TypeScript & ESLint config (U-10)
2. Setup `@nestjs/config` + `.env.example` (U-05)
3. Tambahkan error handling di bootstrap (U-01)
4. Buat global exception filter (U-02)
5. Install & konfigurasi validation pipe (U-03)
6. Tambahkan security middleware: CORS, Helmet, Rate Limiting (U-04)
7. Setup structured logging (U-08)
8. Tambahkan health check endpoint (U-09)

### Phase 2 - Core Infrastructure
> Selesaikan saat mulai develop fitur pertama

9. Setup Prisma + PostgreSQL (U-06)
10. Implementasi authentication & authorization (U-07)
11. Setup Docker & docker-compose (NU-02)
12. Buat pagination utility (NU-09)

### Phase 3 - Quality & DevOps
> Selesaikan sebelum production

13. Setup CI/CD pipeline (NU-01)
14. Tambahkan pre-commit hooks (NU-08)
15. Tingkatkan test coverage (NU-03)
16. Setup Swagger documentation (NU-04)

### Phase 4 - Optimization
> Nice to have, bisa di-iterate setelah launch

17. Implementasi API versioning (NU-05)
18. Setup caching layer (NU-06)
19. Tambahkan compression middleware (NU-07)
20. Fix `.gitignore` untuk `/docs` (NU-10)
