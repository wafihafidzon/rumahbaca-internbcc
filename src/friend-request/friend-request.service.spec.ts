import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FriendRequestService } from './friend-request.service';
import { FriendRequestRepository } from './friend-request.repository';
import { CustomLoggerService } from '../common/logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/auth.interface';

const mockRepo = {
  checkFriendship: jest.fn(),
  findBySenderAndReceiver: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
  acceptAndCreateFriendship: jest.fn(),
  findPendingByReceiver: jest.fn(),
  findPendingBySender: jest.fn(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

const senderUser: JwtPayload = {
  sub: 'sender-id',
  email: 'sender@example.com',
  username: 'sender',
  roles: ['USER'],
};

const receiverUser: JwtPayload = {
  sub: 'receiver-id',
  email: 'receiver@example.com',
  username: 'receiver',
  roles: ['USER'],
};

describe('FriendRequestService', () => {
  let service: FriendRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendRequestService,
        { provide: FriendRequestRepository, useValue: mockRepo },
        { provide: CustomLoggerService, useValue: mockLogger },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FriendRequestService>(FriendRequestService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should throw BadRequestException when senderId === receiverId', async () => {
      await expect(
        service.create(senderUser, { receiverId: senderUser.sub }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when receiver does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(senderUser, { receiverId: receiverUser.sub }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when already friends', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: receiverUser.sub });
      mockRepo.checkFriendship.mockResolvedValue({ id: 'friendship-id' });

      await expect(
        service.create(senderUser, { receiverId: receiverUser.sub }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when a pending request already exists (either direction)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: receiverUser.sub });
      mockRepo.checkFriendship.mockResolvedValue(null);
      mockRepo.findBySenderAndReceiver.mockResolvedValue({
        id: 'req-id',
        status: 'PENDING',
      });

      await expect(
        service.create(senderUser, { receiverId: receiverUser.sub }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return a FriendRequest when all checks pass', async () => {
      const mockRequest = {
        id: 'req-id',
        senderId: senderUser.sub,
        receiverId: receiverUser.sub,
        status: 'PENDING',
      };
      mockPrisma.user.findUnique.mockResolvedValue({ id: receiverUser.sub });
      mockRepo.checkFriendship.mockResolvedValue(null);
      mockRepo.findBySenderAndReceiver.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(mockRequest);

      const result = await service.create(senderUser, {
        receiverId: receiverUser.sub,
      });

      expect(result).toBe(mockRequest);
      expect(mockRepo.create).toHaveBeenCalledWith(
        senderUser.sub,
        receiverUser.sub,
      );
    });
  });

  // ─── respond() ───────────────────────────────────────────────────────────────

  describe('respond()', () => {
    it('should throw NotFoundException when request not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.respond(receiverUser, 'req-id', { action: 'accept' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when request status is not PENDING', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'req-id',
        senderId: senderUser.sub,
        receiverId: receiverUser.sub,
        status: 'ACCEPTED',
      });

      await expect(
        service.respond(receiverUser, 'req-id', { action: 'accept' }),
      ).rejects.toThrow(ConflictException);
    });

    describe('accept', () => {
      it('should throw ForbiddenException when acceptor is not the receiver', async () => {
        mockRepo.findById.mockResolvedValue({
          id: 'req-id',
          senderId: senderUser.sub,
          receiverId: receiverUser.sub,
          status: 'PENDING',
        });

        await expect(
          service.respond(senderUser, 'req-id', { action: 'accept' }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should call acceptAndCreateFriendship and return updated request', async () => {
        const mockUpdated = {
          id: 'req-id',
          senderId: senderUser.sub,
          receiverId: receiverUser.sub,
          status: 'ACCEPTED',
        };
        mockRepo.findById.mockResolvedValue({
          id: 'req-id',
          senderId: senderUser.sub,
          receiverId: receiverUser.sub,
          status: 'PENDING',
        });
        mockRepo.acceptAndCreateFriendship.mockResolvedValue(mockUpdated);

        const result = await service.respond(receiverUser, 'req-id', {
          action: 'accept',
        });

        expect(result).toBe(mockUpdated);
        expect(mockRepo.acceptAndCreateFriendship).toHaveBeenCalledWith(
          'req-id',
          senderUser.sub,
          receiverUser.sub,
        );
      });
    });

    describe('reject', () => {
      it('should throw ForbiddenException when rejector is not the receiver', async () => {
        mockRepo.findById.mockResolvedValue({
          id: 'req-id',
          senderId: senderUser.sub,
          receiverId: receiverUser.sub,
          status: 'PENDING',
        });

        await expect(
          service.respond(senderUser, 'req-id', { action: 'reject' }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should update status to REJECTED and not create a Friendship', async () => {
        const mockRejected = {
          id: 'req-id',
          senderId: senderUser.sub,
          receiverId: receiverUser.sub,
          status: 'REJECTED',
        };
        mockRepo.findById.mockResolvedValue({
          id: 'req-id',
          senderId: senderUser.sub,
          receiverId: receiverUser.sub,
          status: 'PENDING',
        });
        mockRepo.updateStatus.mockResolvedValue(mockRejected);

        const result = await service.respond(receiverUser, 'req-id', {
          action: 'reject',
        });

        expect(result).toBe(mockRejected);
        expect(mockRepo.updateStatus).toHaveBeenCalledWith(
          'req-id',
          'REJECTED',
        );
        expect(mockRepo.acceptAndCreateFriendship).not.toHaveBeenCalled();
      });
    });

    describe('cancel', () => {
      it('should throw ForbiddenException when canceller is not the sender', async () => {
        mockRepo.findById.mockResolvedValue({
          id: 'req-id',
          senderId: senderUser.sub,
          receiverId: receiverUser.sub,
          status: 'PENDING',
        });

        await expect(
          service.respond(receiverUser, 'req-id', { action: 'cancel' }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should update status to CANCELLED', async () => {
        const mockCancelled = {
          id: 'req-id',
          senderId: senderUser.sub,
          receiverId: receiverUser.sub,
          status: 'CANCELLED',
        };
        mockRepo.findById.mockResolvedValue({
          id: 'req-id',
          senderId: senderUser.sub,
          receiverId: receiverUser.sub,
          status: 'PENDING',
        });
        mockRepo.updateStatus.mockResolvedValue(mockCancelled);

        const result = await service.respond(senderUser, 'req-id', {
          action: 'cancel',
        });

        expect(result).toBe(mockCancelled);
        expect(mockRepo.updateStatus).toHaveBeenCalledWith(
          'req-id',
          'CANCELLED',
        );
      });
    });
  });
});
