import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReadingTrackerStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { PaginationMetaDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ReadingStreakService } from '../reading-streak/reading-streak.service';
import { ReadingTrackerRepository } from '../reading-tracker/reading-tracker.repository';
import { CreateReadingSessionDto } from './dto/create-reading-session.dto';
import { ReadingSessionQueryDto } from './dto/reading-session-query.dto';
import {
  ReadingSessionListResponseDto,
  ReadingSessionResponseDto,
} from './dto/reading-session-response.dto';
import { ReadingSessionRepository } from './reading-session.repository';

@Injectable()
export class ReadingSessionService {
  constructor(
    private readonly readingSessionRepository: ReadingSessionRepository,
    private readonly readingTrackerRepository: ReadingTrackerRepository,
    private readonly readingStreakService: ReadingStreakService,
    private readonly prisma: PrismaService,
  ) {}

  private toReadingSessionResponseDto(
    session: Record<string, unknown>,
  ): ReadingSessionResponseDto {
    return plainToInstance(ReadingSessionResponseDto, session, {
      excludeExtraneousValues: true,
    });
  }

  async create(
    trackerId: string,
    userId: string,
    dto: CreateReadingSessionDto,
  ): Promise<ReadingSessionResponseDto> {
    const tracker = await this.readingTrackerRepository.findByIdAndUser(
      trackerId,
      userId,
    );

    if (!tracker) {
      throw new NotFoundException(
        `Reading tracker with ID "${trackerId}" not found for current user`,
      );
    }

    if (tracker.status !== ReadingTrackerStatus.ACTIVE) {
      throw new BadRequestException('Reading tracker is not active');
    }

    if (dto.startPage < tracker.currentPage) {
      throw new BadRequestException('Cannot go backward');
    }

    if (dto.endPage <= dto.startPage) {
      throw new BadRequestException('Must read at least 1 page');
    }

    if (dto.endPage > tracker.book.totalPages) {
      throw new BadRequestException('Cannot exceed total pages');
    }

    const now = new Date();
    const shouldComplete = dto.endPage === tracker.book.totalPages;

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.readingSession.create({
        data: {
          tracker: { connect: { id: tracker.id } },
          trackedAt: now,
          startPage: dto.startPage,
          endPage: dto.endPage,
          durationMinutes: dto.durationMinutes,
          insight: dto.insight,
          photoUrl: dto.photoUrl,
        },
      });

      await tx.readingTracker.update({
        where: { id: tracker.id },
        data: {
          currentPage: dto.endPage,
          ...(shouldComplete && {
            status: ReadingTrackerStatus.COMPLETED,
            completedAt: now,
          }),
        },
      });

      return created;
    });

    await this.readingStreakService.recordActivity(userId, session.trackedAt);

    return this.toReadingSessionResponseDto(session);
  }

  async findAll(
    trackerId: string,
    userId: string,
    query: ReadingSessionQueryDto,
  ): Promise<ReadingSessionListResponseDto> {
    const tracker = await this.readingTrackerRepository.findByIdAndUser(
      trackerId,
      userId,
    );

    if (!tracker) {
      throw new NotFoundException(
        `Reading tracker with ID "${trackerId}" not found for current user`,
      );
    }

    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.readingSessionRepository.findManyByTracker(trackerId, skip, limit),
      this.readingSessionRepository.countByTracker(trackerId),
    ]);

    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      data: sessions.map((session) =>
        this.toReadingSessionResponseDto(session),
      ),
      meta,
    };
  }
}
