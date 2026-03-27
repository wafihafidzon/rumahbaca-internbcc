import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReadingTrackerStatus } from '@prisma/client';
import { RoomsService } from './rooms.service';
import { RoomsRepository } from './rooms.repository';
import { CustomLoggerService } from '../common/logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoomInvitesService } from '../room-invites/room-invites.service';
import type { JwtPayload } from '../auth/interfaces/auth.interface';

const mockRepo = {
  createWithHostAndTracker: jest.fn(),
  findAllByMember: jest.fn(),
  findMembership: jest.fn(),
  findDetailById: jest.fn(),
  findCommentsByRoom: jest.fn(),
  createComment: jest.fn(),
  findCommentById: jest.fn(),
  createCommentLike: jest.fn(),
  findCommentLike: jest.fn(),
  deleteCommentLike: jest.fn(),
};

const mockPrisma = {
  book: { findUnique: jest.fn() },
  readingRoom: { findUnique: jest.fn() },
  readingTracker: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

const mockRoomInvitesService = {
  findFriendship: jest.fn(),
  findMembership: jest.fn(),
  findPendingByRoomAndInvitee: jest.fn(),
  create: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

const user: JwtPayload = {
  sub: 'user-1',
  email: 'user@example.com',
  username: 'user1',
  roles: ['USER'],
};

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: RoomsRepository, useValue: mockRepo },
        { provide: CustomLoggerService, useValue: mockLogger },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RoomInvitesService, useValue: mockRoomInvitesService },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should throw NotFoundException when book does not exist', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(null);

      await expect(
        service.create(user, { bookId: 'book-1', title: 'Room 1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create room, host member, and tracker in transaction', async () => {
      const mockRoom = {
        id: 'room-1',
        title: 'Room 1',
        bookId: 'book-1',
        status: 'ACTIVE',
        host: { id: user.sub, username: 'user1', avatarUrl: null },
        createdAt: new Date(),
      };
      mockPrisma.book.findUnique.mockResolvedValue({ id: 'book-1' });
      mockRepo.createWithHostAndTracker.mockResolvedValue(mockRoom);

      const result = await service.create(user, {
        bookId: 'book-1',
        title: 'Room 1',
      });

      expect(mockRepo.createWithHostAndTracker).toHaveBeenCalledWith(
        user.sub,
        expect.objectContaining({ bookId: 'book-1', title: 'Room 1' }),
      );
      expect(result.id).toBe('room-1');
      expect(result.host.id).toBe(user.sub);
    });
  });

  // ─── findAll() ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    const baseRoom = {
      id: 'room-1',
      title: 'Room 1',
      bookId: 'book-1',
      status: 'ACTIVE',
      host: { id: 'host-1', username: 'host', avatarUrl: null },
      createdAt: new Date(),
    };

    it('should return only rooms where caller is a RoomMember', async () => {
      mockRepo.findAllByMember.mockResolvedValue({ data: [baseRoom], total: 1 });

      const result = await service.findAll(user, { page: 1, limit: 10 });

      expect(mockRepo.findAllByMember).toHaveBeenCalledWith(
        user.sub,
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status when provided', async () => {
      mockRepo.findAllByMember.mockResolvedValue({ data: [baseRoom], total: 1 });

      await service.findAll(user, {
        page: 1,
        limit: 10,
        status: 'ACTIVE' as Parameters<typeof service.findAll>[1]['status'],
      });

      expect(mockRepo.findAllByMember).toHaveBeenCalledWith(
        user.sub,
        expect.objectContaining({ status: 'ACTIVE' }),
      );
    });
  });

  // ─── findOne() ───────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should throw ForbiddenException for non-members', async () => {
      mockRepo.findMembership.mockResolvedValue(null);

      await expect(service.findOne(user, 'room-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return room with member list and their progress', async () => {
      const mockRoom = {
        id: 'room-1',
        title: 'Room 1',
        bookId: 'book-1',
        status: 'ACTIVE',
        host: { id: 'host-1', username: 'host', avatarUrl: null },
        members: [
          {
            user: {
              id: user.sub,
              username: 'user1',
              avatarUrl: null,
              readingTrackers: [{ bookId: 'book-1', currentPage: 42 }],
            },
          },
        ],
        createdAt: new Date(),
      };
      mockRepo.findMembership.mockResolvedValue({ id: 'member-1' });
      mockRepo.findDetailById.mockResolvedValue(mockRoom);

      const result = await service.findOne(user, 'room-1');

      expect(result.members).toHaveLength(1);
      expect(result.members[0].currentPage).toBe(42);
    });
  });

  // ─── updateProgress() ────────────────────────────────────────────────────────

  describe('updateProgress()', () => {
    it('should throw ForbiddenException for non-members', async () => {
      mockRepo.findMembership.mockResolvedValue(null);

      await expect(
        service.updateProgress(user, 'room-1', { currentPage: 10, pagesRead: 10 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create ReadingSession with correct roomId and update tracker', async () => {
      const now = new Date();
      const mockSession = { id: 'session-1', createdAt: now, roomId: 'room-1' };
      const mockTx = {
        readingSession: { create: jest.fn().mockResolvedValue(mockSession) },
        readingTracker: { update: jest.fn().mockResolvedValue({}) },
      };

      mockRepo.findMembership.mockResolvedValue({ id: 'member-1' });
      mockPrisma.readingRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        bookId: 'book-1',
      });
      mockPrisma.readingTracker.findUnique.mockResolvedValue({
        id: 'tracker-1',
        currentPage: 0,
        status: ReadingTrackerStatus.ACTIVE,
        book: { totalPages: 300 },
      });
      mockPrisma.$transaction.mockImplementation(
        (fn: (tx: typeof mockTx) => Promise<typeof mockSession>) => fn(mockTx),
      );

      const result = await service.updateProgress(user, 'room-1', {
        currentPage: 10,
        pagesRead: 10,
      });

      expect(mockTx.readingSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roomId: 'room-1' }),
        }),
      );
      expect(result.roomId).toBe('room-1');
    });
  });

  // ─── listComments() ──────────────────────────────────────────────────────────

  describe('listComments()', () => {
    it('should throw ForbiddenException for non-members', async () => {
      mockRepo.findMembership.mockResolvedValue(null);

      await expect(
        service.listComments(user, 'room-1', { page: 1, limit: 10 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return paginated comments ordered by createdAt ASC', async () => {
      const mockComment = {
        id: 'comment-1',
        content: 'Hello',
        author: { id: user.sub, username: 'user1', avatarUrl: null },
        _count: { likes: 3 },
        createdAt: new Date(),
      };
      mockRepo.findMembership.mockResolvedValue({ id: 'member-1' });
      mockRepo.findCommentsByRoom.mockResolvedValue({
        data: [mockComment],
        total: 1,
      });

      const result = await service.listComments(user, 'room-1', {
        page: 1,
        limit: 10,
      });

      expect(mockRepo.findCommentsByRoom).toHaveBeenCalledWith(
        'room-1',
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].likeCount).toBe(3);
    });
  });

  // ─── addComment() ────────────────────────────────────────────────────────────

  describe('addComment()', () => {
    it('should throw ForbiddenException for non-members', async () => {
      mockRepo.findMembership.mockResolvedValue(null);

      await expect(
        service.addComment(user, 'room-1', { content: 'Hello' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create comment and return it with author details', async () => {
      const mockComment = {
        id: 'comment-1',
        content: 'Hello',
        author: { id: user.sub, username: 'user1', avatarUrl: null },
        _count: { likes: 0 },
        createdAt: new Date(),
      };
      mockRepo.findMembership.mockResolvedValue({ id: 'member-1' });
      mockRepo.createComment.mockResolvedValue(mockComment);

      const result = await service.addComment(user, 'room-1', {
        content: 'Hello',
      });

      expect(mockRepo.createComment).toHaveBeenCalledWith(
        'room-1',
        user.sub,
        'Hello',
      );
      expect(result.author.id).toBe(user.sub);
    });
  });

  // ─── likeComment() ───────────────────────────────────────────────────────────

  describe('likeComment()', () => {
    it('should throw ConflictException on duplicate like', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      mockRepo.findCommentById.mockResolvedValue({
        id: 'comment-1',
        roomId: 'room-1',
      });
      mockRepo.findMembership.mockResolvedValue({ id: 'member-1' });
      mockRepo.createCommentLike.mockRejectedValue(prismaError);

      await expect(service.likeComment(user, 'comment-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── unlikeComment() ─────────────────────────────────────────────────────────

  describe('unlikeComment()', () => {
    it('should throw NotFoundException when like does not exist', async () => {
      mockRepo.findCommentById.mockResolvedValue({
        id: 'comment-1',
        roomId: 'room-1',
      });
      mockRepo.findMembership.mockResolvedValue({ id: 'member-1' });
      mockRepo.findCommentLike.mockResolvedValue(null);

      await expect(service.unlikeComment(user, 'comment-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
