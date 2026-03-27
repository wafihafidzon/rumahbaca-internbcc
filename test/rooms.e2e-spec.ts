import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../src/config/app-config.service';

/**
 * Rooms E2E Tests
 *
 * Covers: room CRUD, invites, progress, comments, comment likes
 * Requires a running PostgreSQL + Redis — set DATABASE_URL in .env.test.
 *
 * Usage:
 *   bun run test:e2e -- --testPathPattern=rooms.e2e-spec
 */

describe('Rooms Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let appConfig: AppConfigService;

  let userAId: string;
  let userBId: string;
  let userCId: string;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let bookId: string;

  // Shared state across tests
  let roomId: string;
  let inviteId: string;
  let commentId: string;

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

    // Create User A (host)
    const userA = await prisma.user.upsert({
      where: { email: `rooms-e2e-a-${ts}@example.com` },
      update: {},
      create: {
        email: `rooms-e2e-a-${ts}@example.com`,
        username: `rooms_e2e_a_${ts}`,
        password: '$2b$10$hashedPasswordForRoomsE2EA',
        name: `Rooms E2E User A ${ts}`,
        isActive: true,
      },
    });

    // Create User B (invited friend)
    const userB = await prisma.user.upsert({
      where: { email: `rooms-e2e-b-${ts}@example.com` },
      update: {},
      create: {
        email: `rooms-e2e-b-${ts}@example.com`,
        username: `rooms_e2e_b_${ts}`,
        password: '$2b$10$hashedPasswordForRoomsE2EB',
        name: `Rooms E2E User B ${ts}`,
        isActive: true,
      },
    });

    // Create User C (non-friend, non-member)
    const userC = await prisma.user.upsert({
      where: { email: `rooms-e2e-c-${ts}@example.com` },
      update: {},
      create: {
        email: `rooms-e2e-c-${ts}@example.com`,
        username: `rooms_e2e_c_${ts}`,
        password: '$2b$10$hashedPasswordForRoomsE2EC',
        name: `Rooms E2E User C ${ts}`,
        isActive: true,
      },
    });

    userAId = userA.id;
    userBId = userB.id;
    userCId = userC.id;
    tokenA = signToken(userA);
    tokenB = signToken(userB);
    tokenC = signToken(userC);

    // Create friendship between A and B
    await prisma.friendship.upsert({
      where: { userId1_userId2: { userId1: userAId, userId2: userBId } },
      update: {},
      create: { userId1: userAId, userId2: userBId },
    });

    // Create a book for the room
    const book = await prisma.book.create({
      data: {
        title: `Rooms E2E Book ${ts}`,
        author: 'Test Author',
        totalPages: 300,
        createdByUserId: userAId,
      },
    });
    bookId = book.id;
  });

  afterAll(async () => {
    // Clean up in dependency order
    if (roomId) {
      await prisma.roomCommentLike
        .deleteMany({ where: { comment: { roomId } } })
        .catch(() => {});
      await prisma.roomComment
        .deleteMany({ where: { roomId } })
        .catch(() => {});
      await prisma.readingSession
        .deleteMany({ where: { roomId } })
        .catch(() => {});
      await prisma.roomInvite.deleteMany({ where: { roomId } }).catch(() => {});
      await prisma.roomMember.deleteMany({ where: { roomId } }).catch(() => {});
      await prisma.readingRoom
        .delete({ where: { id: roomId } })
        .catch(() => {});
    }

    if (userAId && bookId) {
      await prisma.readingTracker
        .deleteMany({
          where: {
            bookId,
            userId: { in: [userAId, userBId] },
          },
        })
        .catch(() => {});
    }

    if (bookId) {
      await prisma.book.delete({ where: { id: bookId } }).catch(() => {});
    }

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
    }

    await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userCId } }).catch(() => {});

    await app.close();
  });

  // ─── Room CRUD ─────────────────────────────────────────────────────────────

  it('1. Create room → 201, host is RoomMember, ReadingTracker exists with currentPage=0', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: `E2E Room ${ts}`,
        bookId,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.bookId).toBe(bookId);
    expect(res.body.host.id).toBe(userAId);

    roomId = res.body.id;

    // Verify host is a RoomMember
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: userAId } },
    });
    expect(member).toBeDefined();

    // Verify ReadingTracker exists with currentPage=0
    const tracker = await prisma.readingTracker.findUnique({
      where: { userId_bookId: { userId: userAId, bookId } },
    });
    expect(tracker).toBeDefined();
    expect(tracker!.currentPage).toBe(0);
  });

  it("2. List rooms → only caller's rooms are returned", async () => {
    const resA = await request(app.getHttpServer())
      .get('/rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(resA.body).toHaveProperty('data');
    const foundA = resA.body.data.find((r: { id: string }) => r.id === roomId);
    expect(foundA).toBeDefined();

    // User B is not a member yet — room should not appear in their list
    const resB = await request(app.getHttpServer())
      .get('/rooms')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(resB.body).toHaveProperty('data');
    const foundB = resB.body.data.find((r: { id: string }) => r.id === roomId);
    expect(foundB).toBeUndefined();
  });

  it('3. Get room detail as member → 200 with members and progress', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.id).toBe(roomId);
    expect(res.body).toHaveProperty('members');
    expect(Array.isArray(res.body.members)).toBe(true);
    const hostMember = res.body.members.find(
      (m: { userId: string }) => m.userId === userAId,
    );
    expect(hostMember).toBeDefined();
    expect(hostMember.currentPage).toBe(0);
  });

  it('4. Get room detail as non-member → 403', async () => {
    await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(403);
  });

  // ─── Room Invites ──────────────────────────────────────────────────────────

  it('5. Host invites friend → 201, RoomInvite created with PENDING status', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rooms/${roomId}/invites`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ inviteeId: userBId })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('PENDING');

    inviteId = res.body.id;

    const invite = await prisma.roomInvite.findUnique({
      where: { id: inviteId },
    });
    expect(invite).toBeDefined();
    expect(invite!.status).toBe('PENDING');
  });

  it('6. Non-friend invite → 400', async () => {
    await request(app.getHttpServer())
      .post(`/rooms/${roomId}/invites`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ inviteeId: userCId })
      .expect(400);
  });

  it('7. Duplicate invite → 409', async () => {
    await request(app.getHttpServer())
      .post(`/rooms/${roomId}/invites`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ inviteeId: userBId })
      .expect(409);
  });

  it('8. Invitee accepts → 200, RoomMember created, ReadingTracker upserted', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/room-invites/${inviteId}/respond`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ action: 'accept' })
      .expect(200);

    expect(res.body.status).toBe('ACCEPTED');

    // Verify RoomMember created
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: userBId } },
    });
    expect(member).toBeDefined();

    // Verify ReadingTracker upserted for User B
    const tracker = await prisma.readingTracker.findUnique({
      where: { userId_bookId: { userId: userBId, bookId } },
    });
    expect(tracker).toBeDefined();
  });

  it('9. Invitee rejects a second invite → 200, RoomMember NOT created, invite status is REJECTED', async () => {
    // Create a fresh invite to reject (need a separate non-member user)
    // We'll create a second friend for User A, then test rejection
    const ts2 = Date.now();
    const userD = await prisma.user.create({
      data: {
        email: `rooms-e2e-d-${ts2}@example.com`,
        username: `rooms_e2e_d_${ts2}`,
        password: '$2b$10$hashedPasswordForRoomsE2ED',
        name: `Rooms E2E User D ${ts2}`,
        isActive: true,
      },
    });

    // Make user D a friend of user A
    await prisma.friendship.create({
      data: { userId1: userAId, userId2: userD.id },
    });

    const tokenD = jwtService.sign(
      {
        sub: userD.id,
        email: userD.email,
        username: userD.username,
        roles: ['USER'],
        permissions: [],
      },
      {
        secret: appConfig.jwt.secret,
        expiresIn: appConfig.jwt.expiration,
      },
    );

    // Send invite to User D
    const inviteRes = await request(app.getHttpServer())
      .post(`/rooms/${roomId}/invites`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ inviteeId: userD.id })
      .expect(201);

    const rejectInviteId = inviteRes.body.id;

    // User D rejects
    const res = await request(app.getHttpServer())
      .patch(`/room-invites/${rejectInviteId}/respond`)
      .set('Authorization', `Bearer ${tokenD}`)
      .send({ action: 'reject' })
      .expect(200);

    expect(res.body.status).toBe('REJECTED');

    // Verify RoomMember NOT created
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: userD.id } },
    });
    expect(member).toBeNull();

    // Cleanup User D
    await prisma.friendship
      .deleteMany({
        where: {
          OR: [
            { userId1: userAId, userId2: userD.id },
            { userId1: userD.id, userId2: userAId },
          ],
        },
      })
      .catch(() => {});
    await prisma.roomInvite
      .delete({ where: { id: rejectInviteId } })
      .catch(() => {});
    await prisma.user.delete({ where: { id: userD.id } }).catch(() => {});
  });

  it('10. Non-invitee tries to respond → 403', async () => {
    // Create yet another invite to test this
    const ts3 = Date.now();
    const userE = await prisma.user.create({
      data: {
        email: `rooms-e2e-e-${ts3}@example.com`,
        username: `rooms_e2e_e_${ts3}`,
        password: '$2b$10$hashedPasswordForRoomsE2EE',
        name: `Rooms E2E User E ${ts3}`,
        isActive: true,
      },
    });

    await prisma.friendship.create({
      data: { userId1: userAId, userId2: userE.id },
    });

    const inviteRes = await request(app.getHttpServer())
      .post(`/rooms/${roomId}/invites`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ inviteeId: userE.id })
      .expect(201);

    const eInviteId = inviteRes.body.id;

    // User C (not the invitee) tries to respond
    await request(app.getHttpServer())
      .patch(`/room-invites/${eInviteId}/respond`)
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ action: 'accept' })
      .expect(403);

    // Cleanup User E
    await prisma.friendship
      .deleteMany({
        where: {
          OR: [
            { userId1: userAId, userId2: userE.id },
            { userId1: userE.id, userId2: userAId },
          ],
        },
      })
      .catch(() => {});
    await prisma.roomInvite
      .delete({ where: { id: eInviteId } })
      .catch(() => {});
    await prisma.user.delete({ where: { id: userE.id } }).catch(() => {});
  });

  // ─── Room Progress ─────────────────────────────────────────────────────────

  it('11. Member posts progress → 201, ReadingSession.roomId equals room ID', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rooms/${roomId}/progress`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ currentPage: 10, pagesRead: 10 })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.roomId).toBe(roomId);
    expect(res.body.pagesRead).toBe(10);
  });

  it('12. Non-member posts progress → 403', async () => {
    await request(app.getHttpServer())
      .post(`/rooms/${roomId}/progress`)
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ currentPage: 10, pagesRead: 10 })
      .expect(403);
  });

  // ─── Room Comments ─────────────────────────────────────────────────────────

  it('13. Member adds comment → 201', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rooms/${roomId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Great book so far!' })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.content).toBe('Great book so far!');
    expect(res.body.author.id).toBe(userAId);

    commentId = res.body.id;
  });

  it('14. List comments → paginated response, ordered oldest-first', async () => {
    // Add a second comment so we can verify ordering
    await request(app.getHttpServer())
      .post(`/rooms/${roomId}/comments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'I agree!' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/rooms/${roomId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    // Verify oldest-first ordering
    const timestamps = res.body.data.map((c: { createdAt: string }) =>
      new Date(c.createdAt).getTime(),
    );
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it('15. Non-member lists comments → 403', async () => {
    await request(app.getHttpServer())
      .get(`/rooms/${roomId}/comments`)
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(403);
  });

  it('15b. Non-member adds comment → 403', async () => {
    await request(app.getHttpServer())
      .post(`/rooms/${roomId}/comments`)
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ content: 'Sneaking in!' })
      .expect(403);
  });

  // ─── Comment Likes ─────────────────────────────────────────────────────────

  it('16. Member likes comment → 201', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rooms/comments/${commentId}/likes`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    expect(res.body.commentId).toBe(commentId);
    expect(res.body.userId).toBe(userAId);
  });

  it('17. Duplicate like → 409', async () => {
    await request(app.getHttpServer())
      .post(`/rooms/comments/${commentId}/likes`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(409);
  });

  it('18. Unlike comment → 204', async () => {
    await request(app.getHttpServer())
      .delete(`/rooms/comments/${commentId}/likes`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);
  });

  it('19. Unlike non-existent like → 404', async () => {
    await request(app.getHttpServer())
      .delete(`/rooms/comments/${commentId}/likes`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('20. Non-member likes comment → 403', async () => {
    await request(app.getHttpServer())
      .post(`/rooms/comments/${commentId}/likes`)
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(403);
  });
});
