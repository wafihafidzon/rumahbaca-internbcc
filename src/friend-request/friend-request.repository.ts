import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendRequestStatus } from '@prisma/client';

@Injectable()
export class FriendRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(senderId: string, receiverId: string) {
    return this.prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findBySenderAndReceiver(senderId: string, receiverId: string) {
    return this.prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId,
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.friendRequest.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findPendingByReceiver(receiverId: string, skip: number, take: number) {
    const [requests, total] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where: {
          receiverId,
          status: 'PENDING' as FriendRequestStatus,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.friendRequest.count({
        where: {
          receiverId,
          status: 'PENDING' as FriendRequestStatus,
        },
      }),
    ]);

    return { requests, total };
  }

  async findPendingBySender(senderId: string, skip: number, take: number) {
    const [requests, total] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where: {
          senderId,
          status: 'PENDING' as FriendRequestStatus,
        },
        include: {
          receiver: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.friendRequest.count({
        where: {
          senderId,
          status: 'PENDING' as FriendRequestStatus,
        },
      }),
    ]);

    return { requests, total };
  }

  async updateStatus(id: string, status: FriendRequestStatus) {
    return this.prisma.friendRequest.update({
      where: { id },
      data: { status },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async createFriendship(userId1: string, userId2: string) {
    // Canonicalize IDs (lexicographic sort)
    const [id1, id2] = [userId1, userId2].sort();
    return this.prisma.friendship.create({
      data: {
        userId1: id1,
        userId2: id2,
      },
    });
  }

  async checkFriendship(userId1: string, userId2: string) {
    const [id1, id2] = [userId1, userId2].sort();
    return this.prisma.friendship.findUnique({
      where: {
        userId1_userId2: {
          userId1: id1,
          userId2: id2,
        },
      },
    });
  }

  async acceptAndCreateFriendship(
    requestId: string,
    senderId: string,
    receiverId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' as FriendRequestStatus },
      });

      // Create friendship with canonicalized IDs
      const [id1, id2] = [senderId, receiverId].sort();
      await tx.friendship.create({
        data: {
          userId1: id1,
          userId2: id2,
        },
      });

      return updated;
    });
  }
}
