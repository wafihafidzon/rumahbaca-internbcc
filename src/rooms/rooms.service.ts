import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomLoggerService } from '../common/logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { RoomDetailDto, RoomListResponseDto } from './dto/room-response.dto';
import { RoomsRepository } from './rooms.repository';

@Injectable()
export class RoomsService {
  constructor(
    private readonly repo: RoomsRepository,
    private readonly logger: CustomLoggerService,
    private readonly prisma: PrismaService,
  ) {}

  async create(user: JwtPayload, dto: CreateRoomDto) {
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId },
      select: { id: true },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (dto.startDate && dto.endDate) {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      if (endDate < startDate) {
        throw new BadRequestException('endDate cannot be before startDate');
      }
    }

    const room = await this.repo.createWithHostAndTracker(user.sub, dto);

    this.logger.log(
      `Reading room ${room.id} created by ${user.sub}`,
      'RoomsService',
    );

    return {
      id: room.id,
      title: room.title,
      bookId: room.bookId,
      status: room.status,
      host: {
        id: room.host.id,
        username: room.host.username,
        avatarUrl: room.host.avatarUrl,
      },
      createdAt: room.createdAt,
    };
  }

  async findAll(
    user: JwtPayload,
    query: RoomQueryDto,
  ): Promise<RoomListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const { data, total } = await this.repo.findAllByMember(user.sub, {
      status: query.status,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((room) => ({
        id: room.id,
        title: room.title,
        bookId: room.bookId,
        status: room.status,
        host: {
          id: room.host.id,
          username: room.host.username,
          avatarUrl: room.host.avatarUrl,
        },
        createdAt: room.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(user: JwtPayload, roomId: string): Promise<RoomDetailDto> {
    const membership = await this.repo.findMembership(roomId, user.sub);

    if (!membership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const room = await this.repo.findDetailById(roomId);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return {
      id: room.id,
      title: room.title,
      bookId: room.bookId,
      status: room.status,
      host: {
        id: room.host.id,
        username: room.host.username,
        avatarUrl: room.host.avatarUrl,
      },
      members: room.members.map((member) => ({
        userId: member.user.id,
        username: member.user.username,
        avatarUrl: member.user.avatarUrl,
        currentPage:
          member.user.readingTrackers.find(
            (tracker) => tracker.bookId === room.bookId,
          )?.currentPage ?? 0,
      })),
      createdAt: room.createdAt,
    };
  }
}
