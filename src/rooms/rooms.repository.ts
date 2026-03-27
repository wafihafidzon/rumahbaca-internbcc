import { Injectable } from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithHostAndTracker(hostId: string, dto: CreateRoomDto) {
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate ? new Date(dto.endDate) : startDate;

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.readingRoom.create({
        data: {
          hostId,
          bookId: dto.bookId,
          title: dto.title,
          description: dto.description,
          startDate,
          endDate,
        },
        include: {
          host: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      });

      await tx.roomMember.create({
        data: {
          roomId: room.id,
          userId: hostId,
        },
      });

      await tx.readingTracker.upsert({
        where: {
          userId_bookId: {
            userId: hostId,
            bookId: dto.bookId,
          },
        },
        create: {
          userId: hostId,
          bookId: dto.bookId,
          currentPage: 0,
        },
        update: {},
      });

      return room;
    });
  }

  async findAllByMember(
    userId: string,
    query: { status?: RoomStatus; skip: number; take: number },
  ) {
    const where = {
      status: query.status,
      members: {
        some: { userId },
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.readingRoom.findMany({
        where,
        include: {
          host: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.readingRoom.count({ where }),
    ]);

    return { data, total };
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

  async findDetailById(roomId: string) {
    return this.prisma.readingRoom.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                readingTrackers: {
                  select: {
                    bookId: true,
                    currentPage: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
  }
}
