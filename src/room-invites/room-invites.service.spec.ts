import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoomInviteStatus } from '@prisma/client';
import { RoomsService } from '../rooms/rooms.service';
import { RoomsRepository } from '../rooms/rooms.repository';
import { RoomInvitesService } from './room-invites.service';
import { RoomInvitesRepository } from './room-invites.repository';
import { CustomLoggerService } from '../common/logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoomInviteAction } from './dto/respond-invite.dto';
import type { JwtPayload } from '../auth/interfaces/auth.interface';

// ─── Mocks for RoomsService (inviteMember tests) ─────────────────────────────

const mockRoomsRepo = {
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

const mockRoomInvitesServiceForRooms = {
  findFriendship: jest.fn(),
  findMembership: jest.fn(),
  findPendingByRoomAndInvitee: jest.fn(),
  create: jest.fn(),
};

// ─── Mocks for RoomInvitesService (respond tests) ────────────────────────────

const mockInvitesRepo = {
  findById: jest.fn(),
  findPendingByRoomAndInvitee: jest.fn(),
  findPendingByInvitee: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  acceptAndCreateMember: jest.fn(),
  findMembership: jest.fn(),
  findFriendship: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

// ─── Users ────────────────────────────────────────────────────────────────────

const hostUser: JwtPayload = {
  sub: 'host-1',
  email: 'host@example.com',
  username: 'host',
  roles: ['USER'],
};

const callerUser: JwtPayload = {
  sub: 'user-1',
  email: 'user@example.com',
  username: 'user1',
  roles: ['USER'],
};

const inviteeUser: JwtPayload = {
  sub: 'invitee-1',
  email: 'invitee@example.com',
  username: 'invitee',
  roles: ['USER'],
};

// ─── RoomsService > inviteMember() ───────────────────────────────────────────

describe('RoomsService > inviteMember()', () => {
  let roomsService: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: RoomsRepository, useValue: mockRoomsRepo },
        { provide: CustomLoggerService, useValue: mockLogger },
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: RoomInvitesService,
          useValue: mockRoomInvitesServiceForRooms,
        },
      ],
    }).compile();

    roomsService = module.get<RoomsService>(RoomsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should throw ForbiddenException if caller is not the host', async () => {
    mockPrisma.readingRoom.findUnique.mockResolvedValue({
      id: 'room-1',
      hostId: 'other-host',
    });

    await expect(
      roomsService.inviteMember(callerUser, 'room-1', {
        inviteeId: inviteeUser.sub,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if invitee is not a friend', async () => {
    mockPrisma.readingRoom.findUnique.mockResolvedValue({
      id: 'room-1',
      hostId: callerUser.sub,
    });
    mockRoomInvitesServiceForRooms.findFriendship.mockResolvedValue(null);

    await expect(
      roomsService.inviteMember(callerUser, 'room-1', {
        inviteeId: inviteeUser.sub,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ConflictException if invitee is already a member', async () => {
    mockPrisma.readingRoom.findUnique.mockResolvedValue({
      id: 'room-1',
      hostId: callerUser.sub,
    });
    mockRoomInvitesServiceForRooms.findFriendship.mockResolvedValue({
      id: 'friendship-1',
    });
    mockRoomInvitesServiceForRooms.findMembership.mockResolvedValue({
      id: 'member-1',
    });

    await expect(
      roomsService.inviteMember(callerUser, 'room-1', {
        inviteeId: inviteeUser.sub,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw ConflictException if invitee has a pending invite', async () => {
    mockPrisma.readingRoom.findUnique.mockResolvedValue({
      id: 'room-1',
      hostId: callerUser.sub,
    });
    mockRoomInvitesServiceForRooms.findFriendship.mockResolvedValue({
      id: 'friendship-1',
    });
    mockRoomInvitesServiceForRooms.findMembership.mockResolvedValue(null);
    mockRoomInvitesServiceForRooms.findPendingByRoomAndInvitee.mockResolvedValue(
      { id: 'invite-1', status: RoomInviteStatus.PENDING },
    );

    await expect(
      roomsService.inviteMember(callerUser, 'room-1', {
        inviteeId: inviteeUser.sub,
      }),
    ).rejects.toThrow(ConflictException);
  });
});

// ─── RoomInvitesService > respond() ──────────────────────────────────────────

describe('RoomInvitesService > respond()', () => {
  let invitesService: RoomInvitesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomInvitesService,
        { provide: RoomInvitesRepository, useValue: mockInvitesRepo },
        { provide: CustomLoggerService, useValue: mockLogger },
      ],
    }).compile();

    invitesService = module.get<RoomInvitesService>(RoomInvitesService);
  });

  afterEach(() => jest.clearAllMocks());

  const pendingInvite = {
    id: 'invite-1',
    inviteeId: inviteeUser.sub,
    status: RoomInviteStatus.PENDING,
    room: { id: 'room-1', title: 'Room 1', bookId: 'book-1' },
    invitee: { id: inviteeUser.sub, username: 'invitee', avatarUrl: null },
  };

  describe('accept', () => {
    it('should throw ForbiddenException if caller is not the invitee', async () => {
      mockInvitesRepo.findById.mockResolvedValue(pendingInvite);

      await expect(
        invitesService.respond(hostUser, 'invite-1', {
          action: RoomInviteAction.ACCEPT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create RoomMember and upsert ReadingTracker in transaction', async () => {
      const acceptedInvite = {
        ...pendingInvite,
        status: RoomInviteStatus.ACCEPTED,
      };
      mockInvitesRepo.findById.mockResolvedValue(pendingInvite);
      mockInvitesRepo.acceptAndCreateMember.mockResolvedValue(acceptedInvite);

      const result = await invitesService.respond(inviteeUser, 'invite-1', {
        action: RoomInviteAction.ACCEPT,
      });

      expect(mockInvitesRepo.acceptAndCreateMember).toHaveBeenCalledWith(
        'invite-1',
        inviteeUser.sub,
        'book-1',
      );
      expect(result).toBe(acceptedInvite);
    });
  });

  describe('reject', () => {
    it('should throw ForbiddenException if caller is not the invitee', async () => {
      mockInvitesRepo.findById.mockResolvedValue(pendingInvite);

      await expect(
        invitesService.respond(hostUser, 'invite-1', {
          action: RoomInviteAction.REJECT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update invite status to REJECTED and not create a RoomMember', async () => {
      const rejectedInvite = {
        ...pendingInvite,
        status: RoomInviteStatus.REJECTED,
      };
      mockInvitesRepo.findById.mockResolvedValue(pendingInvite);
      mockInvitesRepo.updateStatus.mockResolvedValue(rejectedInvite);

      const result = await invitesService.respond(inviteeUser, 'invite-1', {
        action: RoomInviteAction.REJECT,
      });

      expect(mockInvitesRepo.updateStatus).toHaveBeenCalledWith(
        'invite-1',
        RoomInviteStatus.REJECTED,
      );
      expect(mockInvitesRepo.acceptAndCreateMember).not.toHaveBeenCalled();
      expect(result).toBe(rejectedInvite);
    });
  });

  it('should throw NotFoundException when invite does not exist', async () => {
    mockInvitesRepo.findById.mockResolvedValue(null);

    await expect(
      invitesService.respond(inviteeUser, 'nonexistent-invite', {
        action: RoomInviteAction.ACCEPT,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
