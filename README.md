# RumahBaca Backend

Backend service untuk platform social reading RumahBaca.

RumahBaca membantu pengguna:
- melacak progress membaca
- membuat target membaca
- membaca bersama lewat reading room
- berdiskusi dengan teman dalam satu room

## Dokumentasi

Dokumentasi lengkap ada di folder `docs`:
- `docs/PRD Kelompok 1.txt` - sumber acuan utama PRD
- `docs/index.md` - daftar seluruh dokumen
- `docs/prd.md` - PRD markdown hasil turunan dari file acuan
- `docs/project-overview.md` - gambaran produk dan scope MVP
- `docs/architecture.md` - arsitektur backend
- `docs/domain-model.md` - model domain dan relasi inti
- `docs/functional-requirements.md` - kebutuhan fungsional
- `docs/non-functional-requirements.md` - kebutuhan non-fungsional
- `docs/api-guidelines.md` - standar desain API
- `docs/roadmap.md` - rencana iterasi pengembangan
- `docs/development-setup.md` - panduan setup development
- `docs/requirement-traceability.md` - pemetaan requirement PRD ke dokumen turunan

## Tech Stack

- Runtime: Node.js
- Framework: NestJS
- Language: TypeScript
- Testing: Jest
- Database (target): PostgreSQL
- ORM (target): Prisma

## Quick Start

```bash
npm install
npm run start:dev
```

Server default berjalan di `http://localhost:3000`.

## Scripts

```bash
# build
npm run build

# run
npm run start
npm run start:dev
npm run start:prod

# lint
npm run lint

# tests
npm run test
npm run test:e2e
npm run test:cov
```

## Status

Project saat ini berada pada tahap bootstrap backend. Dokumentasi sudah diselaraskan agar berkesinambungan dengan PRD acuan.

Aturan update dokumentasi:
1. Perubahan requirement dimulai dari `docs/PRD Kelompok 1.txt`.
2. Sinkronkan ke `docs/prd.md`.
3. Turunkan perubahan ke dokumen teknis lain (`functional`, `architecture`, `api`, `roadmap`, dst).
