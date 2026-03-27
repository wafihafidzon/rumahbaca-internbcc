import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReadingTrackerStatus } from '@prisma/client';
import { CustomLoggerService } from '../common/logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { CommentDto, CommentListResponseDto } from './dto/comment-response.dto';
import {
  RoomProgressDto,
  RoomProgressResponseDto,
} from './dto/room-progress.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { RoomDetailDto, RoomListResponseDto } from './dto/room-response.dto';
import { CommentLikeResponseDto } from './dto/comment-like-response.dto';
import { RoomsRepository } from './rooms.repository';
import { CreateInviteDto } from '../room-invites/dto/create-invite.dto';
import { RoomInvitesService } from '../room-invites/room-invites.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly repo: RoomsRepository,
    private readonly logger: CustomLoggerService,
    private readonly prisma: PrismaService,
    private readonly roomInvitesService: RoomInvitesService,
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

  async updateProgress(
    user: JwtPayload,
    roomId: string,
    dto: RoomProgressDto,
  ): Promise<RoomProgressResponseDto> {
    const membership = await this.repo.findMembership(roomId, user.sub);

    if (!membership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const room = await this.prisma.readingRoom.findUnique({
      where: { id: roomId },
      select: { id: true, bookId: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const tracker = await this.prisma.readingTracker.findUnique({
      where: {
        userId_bookId: {
          userId: user.sub,
          bookId: room.bookId,
        },
      },
      select: {
        id: true,
        currentPage: true,
        status: true,
        book: { select: { totalPages: true } },
      },
    });

    if (!tracker) {
      throw new NotFoundException(
        `Reading tracker not found for user "${user.sub}" and room book`,
      );
    }

    if (tracker.status !== ReadingTrackerStatus.ACTIVE) {
      throw new BadRequestException('Reading tracker is not active');
    }

    if (dto.currentPage < tracker.currentPage) {
      throw new BadRequestException('Cannot go backward');
    }

    if (dto.currentPage > tracker.book.totalPages) {
      throw new BadRequestException('Cannot exceed total pages');
    }

    if (dto.currentPage - tracker.currentPage !== dto.pagesRead) {
      throw new BadRequestException(
        'currentPage must increase exactly by pagesRead',
      );
    }

    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const session = await tx.readingSession.create({
        data: {
          readingTrackerId: tracker.id,
          trackedAt: now,
          startPage: tracker.currentPage,
          endPage: dto.currentPage,
          durationMinutes: dto.duration,
          roomId: room.id,
        },
        select: {
          id: true,
          createdAt: true,
          roomId: true,
        },
      });

      await tx.readingTracker.update({
        where: { id: tracker.id },
        data: { currentPage: dto.currentPage },
      });

      return session;
    });

    return {
      id: created.id,
      pagesRead: dto.pagesRead,
      duration: dto.duration ?? null,
      roomId: created.roomId,
      createdAt: created.createdAt,
    };
  }

  async inviteMember(user: JwtPayload, roomId: string, dto: CreateInviteDto) {
    const room = await this.prisma.readingRoom.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.hostId !== user.sub) {
      throw new ForbiddenException('Only the host can invite members');
    }

    if (dto.inviteeId === user.sub) {
      throw new BadRequestException('You cannot invite yourself');
    }

    const friendship = await this.roomInvitesService.findFriendship(
      user.sub,
      dto.inviteeId,
    );
    if (!friendship) {
      throw new BadRequestException('Invitee is not your friend');
    }

    const membership = await this.roomInvitesService.findMembership(
      roomId,
      dto.inviteeId,
    );
    if (membership) {
      throw new ConflictException('User is already a room member');
    }

    const pendingInvite =
      await this.roomInvitesService.findPendingByRoomAndInvitee(
        roomId,
        dto.inviteeId,
      );
    if (pendingInvite) {
      throw new ConflictException('A pending invite already exists');
    }

    return this.roomInvitesService.create(roomId, dto.inviteeId);
  }

  async listComments(
    user: JwtPayload,
    roomId: string,
    query: RoomQueryDto,
  ): Promise<CommentListResponseDto> {
    const membership = await this.repo.findMembership(roomId, user.sub);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const { data, total } = await this.repo.findCommentsByRoom(roomId, {
      skip,
      take: limit,
    });

    return {
      data: data.map((comment) => ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author.id,
          username: comment.author.username,
          avatarUrl: comment.author.avatarUrl,
        },
        likeCount: comment._count.likes,
        createdAt: comment.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async addComment(
    user: JwtPayload,
    roomId: string,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    const membership = await this.repo.findMembership(roomId, user.sub);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const comment = await this.repo.createComment(
      roomId,
      user.sub,
      dto.content,
    );

    return {
      id: comment.id,
      content: comment.content,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        avatarUrl: comment.author.avatarUrl,
      },
      likeCount: comment._count.likes,
      createdAt: comment.createdAt,
    };
  }

  async likeComment(
    user: JwtPayload,
    commentId: string,
  ): Promise<CommentLikeResponseDto> {
    const comment = await this.repo.findCommentById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const membership = await this.repo.findMembership(comment.roomId, user.sub);

    if (!membership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    try {
      return await this.repo.createCommentLike(commentId, user.sub);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Already liked');
      }

      throw error;
    }
  }

  async unlikeComment(user: JwtPayload, commentId: string): Promise<void> {
    const comment = await this.repo.findCommentById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const membership = await this.repo.findMembership(comment.roomId, user.sub);

    if (!membership) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const existingLike = await this.repo.findCommentLike(commentId, user.sub);

    if (!existingLike) {
      throw new NotFoundException('Like not found');
    }

    await this.repo.deleteCommentLike(existingLike.id);
  }
}
