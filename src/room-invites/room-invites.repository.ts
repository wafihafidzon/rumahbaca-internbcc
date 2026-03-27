import { Injectable } from '@nestjs/common';
import { RoomInviteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const roomInviteInclude = {
  room: {
    select: {
      id: true,
      title: true,
      bookId: true,
    },
  },
  invitee: {
    select: {
      id: true,
      username: true,
      avatarUrl: true,
    },
  },
} as const;

@Injectable()
export class RoomInvitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.roomInvite.findUnique({
      where: { id },
      include: roomInviteInclude,
    });
  }

  async findPendingByRoomAndInvitee(roomId: string, inviteeId: string) {
    return this.prisma.roomInvite.findFirst({
      where: {
        roomId,
        inviteeId,
        status: RoomInviteStatus.PENDING,
      },
    });
  }

  async findPendingByInvitee(inviteeId: string) {
    return this.prisma.roomInvite.findMany({
      where: {
        inviteeId,
        status: RoomInviteStatus.PENDING,
      },
      include: roomInviteInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(roomId: string, inviteeId: string) {
    return this.prisma.roomInvite.create({
      data: { roomId, inviteeId },
      include: roomInviteInclude,
    });
  }

  async updateStatus(id: string, status: RoomInviteStatus) {
    return this.prisma.roomInvite.update({
      where: { id },
      data: { status },
      include: roomInviteInclude,
    });
  }

  async acceptAndCreateMember(
    inviteId: string,
    userId: string,
    bookId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.roomInvite.update({
        where: { id: inviteId },
        data: { status: RoomInviteStatus.ACCEPTED },
        include: roomInviteInclude,
      });

      await tx.roomMember.create({
        data: {
          roomId: invite.roomId,
          userId,
        },
      });

      await tx.readingTracker.upsert({
        where: {
          userId_bookId: {
            userId,
            bookId,
          },
        },
        create: {
          userId,
          bookId,
          currentPage: 0,
        },
        update: {},
      });

      return invite;
    });
  }

  async findMembership(roomId: string, userId: string) {
    return this.prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });
  }

  async findFriendship(userAId: string, userBId: string) {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId1: userAId, userId2: userBId },
          { userId1: userBId, userId2: userAId },
        ],
      },
    });
  }
}
