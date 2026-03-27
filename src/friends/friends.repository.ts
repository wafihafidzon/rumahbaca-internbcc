import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(userId: string, skip: number, limit: number) {
    const where = {
      OR: [{ userId1: userId }, { userId2: userId }],
    };

    const [friendships, total] = await Promise.all([
      this.prisma.friendship.findMany({
        where,
        skip,
        take: limit,
        include: {
          user1: {
            select: { id: true, username: true, name: true, avatarUrl: true },
          },
          user2: {
            select: { id: true, username: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.friendship.count({ where }),
    ]);

    return { friendships, total };
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

  async deleteFriendship(id: string) {
    return this.prisma.friendship.delete({ where: { id } });
  }
}
