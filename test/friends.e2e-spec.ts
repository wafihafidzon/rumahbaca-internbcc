import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../src/config/app-config.service';

/**
 * Friends E2E Tests
 *
 * Covers the full flow: search → send → accept → list → unfriend
 * Requires a running PostgreSQL + Redis — set DATABASE_URL in .env.test.
 *
 * Usage:
 *   bun run test:e2e -- --testPathPattern=friends.e2e-spec
 */

describe('Friends Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let appConfig: AppConfigService;

  let userAId: string;
  let userBId: string;
  let tokenA: string;
  let tokenB: string;
  let friendRequestId: string;

  const ts = Date.now();

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

    const signToken = (user: { id: string; email: string; username: string }) =>
      jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          username: user.username,
          roles: ['USER'],
          permissions: [],
        },
        {
          secret: appConfig.jwt.secret,
          expiresIn: appConfig.jwt.expiration,
        },
      );

    const userA = await prisma.user.upsert({
      where: { email: `friends-e2e-a-${ts}@example.com` },
      update: {},
      create: {
        email: `friends-e2e-a-${ts}@example.com`,
        username: `friends_e2e_a_${ts}`,
        password: '$2b$10$hashedPasswordForFriendsE2EA',
        name: `Friends E2E User A ${ts}`,
        isActive: true,
      },
    });

    const userB = await prisma.user.upsert({
      where: { email: `friends-e2e-b-${ts}@example.com` },
      update: {},
      create: {
        email: `friends-e2e-b-${ts}@example.com`,
        username: `friends_e2e_b_${ts}`,
        password: '$2b$10$hashedPasswordForFriendsE2EB',
        name: `Friends E2E User B ${ts}`,
        isActive: true,
      },
    });

    userAId = userA.id;
    userBId = userB.id;
    tokenA = signToken(userA);
    tokenB = signToken(userB);
  });

  afterAll(async () => {
    if (userAId && userBId) {
      await prisma.friendship
        .deleteMany({
          where: {
            OR: [
              { userId1: userAId, userId2: userBId },
              { userId1: userBId, userId2: userAId },
            ],
          },
        })
        .catch(() => {});
      await prisma.friendRequest
        .deleteMany({
          where: {
            OR: [
              { senderId: userAId, receiverId: userBId },
              { senderId: userBId, receiverId: userAId },
            ],
          },
        })
        .catch(() => {});
      await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
    }

    await app.close();
  });

  // ─── Full flow ────────────────────────────────────────────────────────────────

  it('1. userA searches for userB — relationshipStatus should be none', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/search?q=${encodeURIComponent(`friends_e2e_b_${ts}`)}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    const found = res.body.data.find((u: { id: string }) => u.id === userBId);
    expect(found).toBeDefined();
    expect(found.relationshipStatus).toBe('none');
  });

  it('2. userA sends friend request to userB — 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/friend-requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ receiverId: userBId })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.senderId).toBe(userAId);
    expect(res.body.receiverId).toBe(userBId);
    expect(res.body.status).toBe('PENDING');

    friendRequestId = res.body.id;
  });

  it('3. userA searches for userB — relationshipStatus should be request_sent', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/search?q=${encodeURIComponent(`friends_e2e_b_${ts}`)}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const found = res.body.data.find((u: { id: string }) => u.id === userBId);
    expect(found).toBeDefined();
    expect(found.relationshipStatus).toBe('request_sent');
  });

  it('4. userB searches for userA — relationshipStatus should be request_received', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/search?q=${encodeURIComponent(`friends_e2e_a_${ts}`)}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const found = res.body.data.find((u: { id: string }) => u.id === userAId);
    expect(found).toBeDefined();
    expect(found.relationshipStatus).toBe('request_received');
  });

  it('5. userA tries to send another request to userB — 409', async () => {
    await request(app.getHttpServer())
      .post('/friend-requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ receiverId: userBId })
      .expect(409);
  });

  it('6. userB accepts the request — 200, status = ACCEPTED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/friend-requests/${friendRequestId}/respond`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ action: 'accept' })
      .expect(200);

    expect(res.body.status).toBe('ACCEPTED');
  });

  it('7. userA searches for userB — relationshipStatus should be friends', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/search?q=${encodeURIComponent(`friends_e2e_b_${ts}`)}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const found = res.body.data.find((u: { id: string }) => u.id === userBId);
    expect(found).toBeDefined();
    expect(found.relationshipStatus).toBe('friends');
  });

  it('8. GET /friends as userA — userB appears in list', async () => {
    const res = await request(app.getHttpServer())
      .get('/friends')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    const found = res.body.data.find(
      (f: { friendId: string }) => f.friendId === userBId,
    );
    expect(found).toBeDefined();
  });

  it('9. GET /friends as userB — userA appears in list', async () => {
    const res = await request(app.getHttpServer())
      .get('/friends')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    const found = res.body.data.find(
      (f: { friendId: string }) => f.friendId === userAId,
    );
    expect(found).toBeDefined();
  });

  it('10. userA unfriends userB — 204', async () => {
    await request(app.getHttpServer())
      .delete(`/friends/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);
  });

  it('11. GET /friends as userA — list is empty', async () => {
    const res = await request(app.getHttpServer())
      .get('/friends')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    const found = res.body.data.find(
      (f: { friendId: string }) => f.friendId === userBId,
    );
    expect(found).toBeUndefined();
  });

  it('12. userA unfriends userB again — 404', async () => {
    await request(app.getHttpServer())
      .delete(`/friends/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('POST /friend-requests to self — 400', async () => {
      await request(app.getHttpServer())
        .post('/friend-requests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ receiverId: userAId })
        .expect(400);
    });

    it('PATCH /friend-requests/:id/respond with wrong user — 403', async () => {
      // userA sends a new request to userB
      const createRes = await request(app.getHttpServer())
        .post('/friend-requests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ receiverId: userBId })
        .expect(201);

      const reqId = createRes.body.id;

      // userA (the sender) tries to accept — only receiver (userB) can accept
      await request(app.getHttpServer())
        .patch(`/friend-requests/${reqId}/respond`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ action: 'accept' })
        .expect(403);

      // Clean up: cancel the request
      await request(app.getHttpServer())
        .patch(`/friend-requests/${reqId}/respond`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ action: 'cancel' })
        .expect(200);
    });
  });
});
