import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReadingTrackerStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { BookRepository } from '../book/book.repository';
import { PaginationMetaDto } from '../common/dto/pagination.dto';
import { CustomLoggerService } from '../common/logger/logger.service';
import { CreateReadingTrackerDto } from './dto/create-reading-tracker.dto';
import { ReadingTrackerQueryDto } from './dto/reading-tracker-query.dto';
import {
  ReadingTrackerListResponseDto,
  ReadingTrackerResponseDto,
} from './dto/reading-tracker-response.dto';
import { UpdateReadingTrackerDto } from './dto/update-reading-tracker.dto';
import { ReadingTrackerRepository } from './reading-tracker.repository';

@Injectable()
export class ReadingTrackerService {
  constructor(
    private readonly readingTrackerRepository: ReadingTrackerRepository,
    private readonly bookRepository: BookRepository,
    private readonly logger: CustomLoggerService,
  ) {}

  private toReadingTrackerResponseDto(
    tracker: Record<string, unknown>,
  ): ReadingTrackerResponseDto {
    return plainToInstance(ReadingTrackerResponseDto, tracker, {
      excludeExtraneousValues: true,
    });
  }

  private assertStatusTransition(
    from: ReadingTrackerStatus,
    to: ReadingTrackerStatus,
  ): void {
    if (from === to) {
      return;
    }

    const isAllowed =
      (from === ReadingTrackerStatus.ACTIVE &&
        (to === ReadingTrackerStatus.COMPLETED ||
          to === ReadingTrackerStatus.PAUSED)) ||
      (from === ReadingTrackerStatus.PAUSED &&
        to === ReadingTrackerStatus.ACTIVE);

    if (!isAllowed) {
      throw new BadRequestException(
        `Invalid status transition from ${from} to ${to}`,
      );
    }
  }

  private buildGoalSummary(tracker: ReadingTrackerResponseDto): {
    pagesPerDayFromTargetDate?: number;
    dailyGoalStatus?: 'on_track' | 'behind' | 'ahead';
  } {
    const goalSummary: {
      pagesPerDayFromTargetDate?: number;
      dailyGoalStatus?: 'on_track' | 'behind' | 'ahead';
    } = {};

    if (tracker.targetEndDate) {
      const totalPages = tracker.book.totalPages;
      const remainingPages = Math.max(totalPages - tracker.currentPage, 0);

      const now = new Date();
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysRemaining = Math.ceil(
        (new Date(tracker.targetEndDate).getTime() - now.getTime()) / msPerDay,
      );

      goalSummary.pagesPerDayFromTargetDate =
        daysRemaining > 0 ? remainingPages / daysRemaining : remainingPages;
    }

    if (tracker.dailyPageGoal) {
      const pagesReadToday = 0;
      if (pagesReadToday > tracker.dailyPageGoal) {
        goalSummary.dailyGoalStatus = 'ahead';
      } else if (pagesReadToday < tracker.dailyPageGoal) {
        goalSummary.dailyGoalStatus = 'behind';
      } else {
        goalSummary.dailyGoalStatus = 'on_track';
      }
    }

    return goalSummary;
  }

  async create(
    userId: string,
    dto: CreateReadingTrackerDto,
  ): Promise<ReadingTrackerResponseDto> {
    const book = await this.bookRepository.findById(dto.bookId);
    if (!book) {
      throw new NotFoundException(`Book with ID "${dto.bookId}" not found`);
    }

    const existing = await this.readingTrackerRepository.findByUserAndBook(
      userId,
      dto.bookId,
    );
    if (existing) {
      throw new ConflictException(
        `Reading tracker for this book already exists for user "${userId}"`,
      );
    }

    const tracker = await this.readingTrackerRepository.create({
      user: { connect: { id: userId } },
      book: { connect: { id: dto.bookId } },
      status: ReadingTrackerStatus.ACTIVE,
      currentPage: 0,
      targetEndDate: dto.targetEndDate
        ? new Date(dto.targetEndDate)
        : undefined,
      dailyPageGoal: dto.dailyPageGoal,
    });

    this.logger.log(
      `Reading tracker created: ${tracker.id}`,
      'ReadingTrackerService',
    );
    return this.toReadingTrackerResponseDto(tracker);
  }

  async findAll(
    userId: string,
    query: ReadingTrackerQueryDto,
  ): Promise<ReadingTrackerListResponseDto> {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;
    const where = {
      ...(status && { status }),
    };

    const [trackers, total] = await Promise.all([
      this.readingTrackerRepository.findManyByUser(userId, where, skip, limit),
      this.readingTrackerRepository.countByUser(userId, where),
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
      data: trackers.map((tracker) =>
        this.toReadingTrackerResponseDto(tracker),
      ),
      meta,
    };
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<
    ReadingTrackerResponseDto & { goalSummary?: Record<string, unknown> }
  > {
    const tracker = await this.readingTrackerRepository.findByIdAndUser(
      id,
      userId,
    );
    if (!tracker) {
      throw new NotFoundException(
        `Reading tracker with ID "${id}" not found for current user`,
      );
    }

    const response = this.toReadingTrackerResponseDto(tracker);
    const goalSummary = this.buildGoalSummary(response);

    if (
      !goalSummary.pagesPerDayFromTargetDate &&
      !goalSummary.dailyGoalStatus
    ) {
      return response;
    }

    return { ...response, goalSummary };
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateReadingTrackerDto,
  ): Promise<ReadingTrackerResponseDto> {
    const existing = await this.readingTrackerRepository.findByIdAndUser(
      id,
      userId,
    );
    if (!existing) {
      throw new NotFoundException(
        `Reading tracker with ID "${id}" not found for current user`,
      );
    }

    if (dto.status) {
      this.assertStatusTransition(existing.status, dto.status);
    }

    const updated = await this.readingTrackerRepository.update(id, {
      ...(dto.status && { status: dto.status }),
      ...(dto.targetEndDate !== undefined && {
        targetEndDate: dto.targetEndDate ? new Date(dto.targetEndDate) : null,
      }),
      ...(dto.dailyPageGoal !== undefined && {
        dailyPageGoal: dto.dailyPageGoal,
      }),
      ...(dto.status === ReadingTrackerStatus.COMPLETED && {
        completedAt: new Date(),
      }),
    });

    this.logger.log(`Reading tracker updated: ${id}`, 'ReadingTrackerService');
    return this.toReadingTrackerResponseDto(updated);
  }
}
