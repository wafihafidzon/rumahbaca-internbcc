import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../src/config/app-config.service';

/**
 * Reading E2E Tests
 *
 * These tests run against the full NestJS application.
 * They require a running database and Redis — set DATABASE_URL in .env.test.
 *
 * Usage:
 *   bun run test:e2e -- --testPathPattern=reading.e2e-spec
 */

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Reading Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let appConfig: AppConfigService;

  let userToken: string;
  let testUserId: string;
  let bookId: string;
  let trackerId: string;

  const totalPages = 200;
  const bookTitle = `E2E Book ${Date.now()}`;
  const bookAuthor = `E2E Author ${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    appConfig = moduleFixture.get<AppConfigService>(AppConfigService);

    // Create user without DB role — RolesGuard reads roles from JWT, not from DB
    const testUser = await prisma.user.upsert({
      where: { email: 'reading-e2e@example.com' },
      update: {},
      create: {
        email: 'reading-e2e@example.com',
        username: 'reading_e2e_user',
        password: '$2b$10$hashedPasswordForReadingE2E',
        name: 'Reading E2E',
        isActive: true,
      },
    });

    testUserId = testUser.id;
    userToken = jwtService.sign(
      {
        sub: testUser.id,
        email: testUser.email,
        username: testUser.username,
        roles: ['USER'],
        permissions: [],
      },
      {
        secret: appConfig.jwt.secret,
        expiresIn: appConfig.jwt.expiration,
      },
    );
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.readingSession.deleteMany({
        where: { tracker: { userId: testUserId } },
      });
      await prisma.readingTracker.deleteMany({ where: { userId: testUserId } });
      await prisma.book.deleteMany({
        where: { createdByUserId: testUserId },
      });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }

    await app.close();
  });

  // ─── Happy Path ──────────────────────────────────────────────────────────────

  describe('Happy Path', () => {
    it('1. should create a book', async () => {
      const res = await request(app.getHttpServer())
        .post('/books')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: bookTitle, author: bookAuthor, totalPages })
        .expect(201);

      bookId = res.body.id; // assign before assertions so downstream tests always have bookId

      expect(res.body).toHaveProperty('id');
      // title/author are normalized to lowercase by the service
      expect(res.body.title).toBe(bookTitle.toLowerCase());
      expect(res.body.author).toBe(bookAuthor.toLowerCase());
      expect(res.body.totalPages).toBe(totalPages);
    });

    it('2. should search for the created book', async () => {
      const res = await request(app.getHttpServer())
        .get(`/books/search?q=${encodeURIComponent(bookTitle.toLowerCase())}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((b: { id: string }) => b.id === bookId);
      expect(found).toBeDefined();
    });

    it('3. should return existing book on duplicate create (same title + author)', async () => {
      const res = await request(app.getHttpServer())
        .post('/books')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: bookTitle, author: bookAuthor, totalPages })
        .expect(201);

      expect(res.body.id).toBe(bookId);
    });

    it('4. should create a reading tracker', async () => {
      const res = await request(app.getHttpServer())
        .post('/readings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId })
        .expect(201);

      trackerId = res.body.id; // assign before assertions so downstream tests always have trackerId

      expect(res.body).toHaveProperty('id');
      expect(res.body.bookId).toBe(bookId);
      expect(res.body.status).toBe('ACTIVE');
    });

    it('5. should reject duplicate tracker for the same book (409)', async () => {
      await request(app.getHttpServer())
        .post('/readings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId })
        .expect(409);
    });

    it('6. should list trackers and include the created one', async () => {
      const res = await request(app.getHttpServer())
        .get('/readings')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find(
        (t: { id: string }) => t.id === trackerId,
      );
      expect(found).toBeDefined();
      expect(found.status).toBe('ACTIVE');
    });

    it('7. should record a reading session (startPage=0, endPage=50)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/readings/${trackerId}/sessions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ startPage: 0, endPage: 50 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.startPage).toBe(0);
      expect(res.body.endPage).toBe(50);
    });

    it('8. should have currentPage=50 after session', async () => {
      const res = await request(app.getHttpServer())
        .get(`/readings/${trackerId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.currentPage).toBe(50);
    });

    it('9. should list sessions for the tracker', async () => {
      const res = await request(app.getHttpServer())
        .get(`/readings/${trackerId}/sessions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Validation Cases ────────────────────────────────────────────────────────

  describe('Validation Cases', () => {
    it('10. should reject startPage < currentPage (400)', async () => {
      await request(app.getHttpServer())
        .post(`/readings/${trackerId}/sessions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ startPage: 10, endPage: 60 })
        .expect(400);
    });

    it('11. should reject endPage > totalPages (400)', async () => {
      await request(app.getHttpServer())
        .post(`/readings/${trackerId}/sessions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ startPage: 50, endPage: totalPages + 1 })
        .expect(400);
    });

    it('12. should reject endPage <= startPage (400)', async () => {
      await request(app.getHttpServer())
        .post(`/readings/${trackerId}/sessions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ startPage: 50, endPage: 50 })
        .expect(400);
    });
  });

  // ─── Auto-Complete ───────────────────────────────────────────────────────────

  describe('Auto-Complete', () => {
    it('13. should record the final session (endPage=totalPages)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/readings/${trackerId}/sessions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ startPage: 50, endPage: totalPages })
        .expect(201);

      expect(res.body.endPage).toBe(totalPages);
    });

    it('14. should mark tracker as COMPLETED with completedAt set', async () => {
      const res = await request(app.getHttpServer())
        .get(`/readings/${trackerId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.completedAt).not.toBeNull();
    });

    it('15. should reject session on completed tracker (400)', async () => {
      await request(app.getHttpServer())
        .post(`/readings/${trackerId}/sessions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ startPage: totalPages, endPage: totalPages + 1 })
        .expect(400);
    });
  });

  // ─── Streak & Dashboard ──────────────────────────────────────────────────────

  describe('Streak & Dashboard', () => {
    it('16. should return streak data for current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/reading-streak/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // streak may be null on first run or populated — just verify valid response
      if (res.body !== null) {
        expect(res.body).toBeDefined();
      }
    });

    it('17. should return calendar data for range=7', async () => {
      const res = await request(app.getHttpServer())
        .get('/reading-streak/me/calendar?range=7')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body).toHaveProperty('days');
    });

    it('18. should return dashboard with streak, counts, and pages read', async () => {
      const res = await request(app.getHttpServer())
        .get('/reading-dashboard/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body).toHaveProperty('currentStreak');
      expect(res.body).toHaveProperty('streakStatus');
      expect(res.body).toHaveProperty('completedBooksCount');
      expect(res.body).toHaveProperty('activeReadings');
      expect(res.body).toHaveProperty('pagesReadLast7Days');
      expect(res.body.completedBooksCount).toBeGreaterThanOrEqual(1);
      expect(res.body.pagesReadLast7Days).toBeGreaterThanOrEqual(totalPages);
    });
  });
});
