# RumahBaca Backend

## Overview

RumahBaca is a social reading platform backend built with NestJS, offering features such as tracking reading progress, setting reading goals, creating reading rooms, and discussing books with friends within a room.

## Tech Stack

- Runtime: Node.js 22 (Docker image based on `node:22-alpine`)
- Framework: NestJS 11
- Language: TypeScript
- Testing: Jest
- ORM: Prisma (PostgreSQL target)

## Installation

1. Install Node.js 22 (or the latest Node 22.x LTS) and npm if you plan to run the API locally outside of containers.
2. Clone the repository and install dependencies when working locally:

   ```bash
   npm install
   ```

3. Start the development server with hot reload:

   ```bash
   npm run start:dev
   ```

4. The API will be available at `http://localhost:3000` (default).

5. If you prefer to work inside Docker instead of installing Node locally, skip steps 1–3 and rely on `docker compose up --build` (see next section): both dependency installation and the production build happen inside the multi-stage Dockerfile so no manual `npm install` is required for the containerized service.

## Environment

- Copy `.env.example` to `.env` (or set the same variables through your tooling) before running Prisma or the API. The example file already matches the Docker stack: `DATABASE_URL=postgresql://postgres:postgres@db:5432/rumahbaca?schema=public` and `NODE_ENV=development`, so Prisma migrations inside the container use the same credentials as Postgres.
- If you override credentials in `docker-compose.yml`, keep the `DATABASE_URL` in sync so Prisma clients and CLI commands point at the correct host, port, and schema.
- Prisma 7 now reads `prisma.schema` from `package.json` and the code-based `prisma.config.ts`, so migrations will automatically target `prisma/schema.prisma`. If you still see schema lookup errors when running `npx prisma migrate dev`, explicitly add `--schema=prisma/schema.prisma` or make sure `prisma.config.ts` is bundled into the container so Prisma can load it.

## Scripts

```bash
# build the project
npm run build

# run in various environments
npm run start
npm run start:dev
npm run start:prod

# lint
npm run lint

# tests
npm run test
npm run test:cov
npm run test:e2e
npm run test:watch
npm run test:debug
```

## Running with Docker + PostgreSQL

- The provided `Dockerfile` builds a production-ready image using Node 22, installs dependencies, compiles the Nest app, and packages just the compiled `dist/` output with production deps so the runtime image stays lean.
- Run `docker compose up --build` to start the API (exposed on port 3000) plus PostgreSQL 18.3.
- The `db` service uses the latest PostgreSQL 18.3 image (latest patch release as of February 26, 2026) with the credentials defined in `docker-compose.yml`. The `pgdata` volume now mounts at `/var/lib/postgresql` to match the PostgreSQL 18+ layout, which keeps your data between restarts and lets pg_upgrade work correctly.
- Set `DATABASE_URL` to match the container credentials (e.g., `postgres://postgres:postgres@db:5432/rumahbaca`) before starting Prisma migrations.
- After Docker starts, run Prisma maintenance commands if the schema changes:

  ```bash
  docker compose run api npx prisma migrate dev
  docker compose run api npx prisma generate
  ```

- The production container uses `npm run start:prod`, which now resolves to `node dist/src/main` so the compiled Nest entry point is found at its actual output path.

## Status

The backend is still in bootstrap phase. Refer to `docs/PRD Kelompok 1.txt` when requirements change.
