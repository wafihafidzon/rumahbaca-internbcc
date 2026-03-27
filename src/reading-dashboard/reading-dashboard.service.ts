import { Injectable } from '@nestjs/common';
import { ReadingTrackerStatus } from '@prisma/client';
import { CacheService } from '../common/cache/cache.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReadingStreakService } from '../reading-streak/reading-streak.service';
import { ReadingTrackerRepository } from '../reading-tracker/reading-tracker.repository';
import {
  DashboardActiveReadingDto,
  DashboardGoalSummaryDto,
  DashboardResponseDto,
  DashboardStreakCalendarItemDto,
} from './dto/dashboard-response.dto';

const DASHBOARD_CACHE_TTL_SECONDS = 60;
const JAKARTA_TZ = 'Asia/Jakarta';

@Injectable()
export class ReadingDashboardService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: CustomLoggerService,
    private readonly readingTrackerRepository: ReadingTrackerRepository,
    private readonly readingStreakService: ReadingStreakService,
    private readonly prisma: PrismaService,
  ) {}

  private cacheKey(userId: string): string {
    return `reading-dashboard:${userId}`;
  }

  private getDateKey(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: JAKARTA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }

  private getJakartaDayStart(date: Date): Date {
    const day = this.getDateKey(date);
    return new Date(`${day}T00:00:00+07:00`);
  }

  private buildGoalSummary(
    tracker: {
      currentPage: number;
      totalPages: number;
      targetEndDate: Date | null;
      dailyPageGoal: number | null;
    },
    pagesReadToday: number,
  ): DashboardGoalSummaryDto | null {
    const hasTargetEndDate = !!tracker.targetEndDate;
    const hasDailyPageGoal = tracker.dailyPageGoal !== null;

    if (!hasTargetEndDate && !hasDailyPageGoal) {
      return null;
    }

    const goalSummary: DashboardGoalSummaryDto = {};

    if (tracker.targetEndDate) {
      const todayStart = this.getJakartaDayStart(new Date());
      const targetDateStart = this.getJakartaDayStart(tracker.targetEndDate);
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysRemaining = Math.ceil(
        (targetDateStart.getTime() - todayStart.getTime()) / msPerDay,
      );
      const remainingPages = Math.max(
        tracker.totalPages - tracker.currentPage,
        0,
      );

      goalSummary.targetEndDate = targetDateStart.toISOString().slice(0, 10);
      goalSummary.pagesPerDayNeeded =
        daysRemaining > 0 ? remainingPages / daysRemaining : remainingPages;

      if (daysRemaining <= 0) {
        goalSummary.status = 'behind';
      }
    }

    if (tracker.dailyPageGoal !== null) {
      goalSummary.dailyPageGoal = tracker.dailyPageGoal;

      if (pagesReadToday >= tracker.dailyPageGoal) {
        goalSummary.status = 'ahead';
      } else if (pagesReadToday >= tracker.dailyPageGoal * 0.8) {
        goalSummary.status = 'on_track';
      } else {
        goalSummary.status = 'behind';
      }
    }

    return goalSummary;
  }

  private async getPagesReadInRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const sessions = await this.prisma.readingSession.findMany({
      where: {
        tracker: { userId },
        trackedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        startPage: true,
        endPage: true,
      },
    });

    return sessions.reduce((total, session) => {
      const pages = Math.max(session.endPage - session.startPage, 0);
      return total + pages;
    }, 0);
  }

  async getMeDashboard(userId: string): Promise<DashboardResponseDto> {
    const key = this.cacheKey(userId);
    const cached = await this.cacheService.get<DashboardResponseDto>(key);
    if (cached) {
      this.logger.log(
        `Cache HIT for reading dashboard: ${userId}`,
        'ReadingDashboardService',
      );
      return cached;
    }

    const now = new Date();
    const todayStart = this.getJakartaDayStart(now);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    todayEnd.setMilliseconds(todayEnd.getMilliseconds() - 1);

    const sevenDayStart = new Date(todayStart);
    sevenDayStart.setDate(sevenDayStart.getDate() - 6);

    const [
      streak,
      calendar,
      activeTrackers,
      completedBooksCount,
      pagesReadToday,
      pagesReadLast7Days,
    ] = await Promise.all([
      this.readingStreakService.getStreak(userId),
      this.readingStreakService.getCalendar(userId, 7),
      this.readingTrackerRepository.findManyByUser(userId, {
        status: ReadingTrackerStatus.ACTIVE,
      }),
      this.readingTrackerRepository.countByUser(userId, {
        status: ReadingTrackerStatus.COMPLETED,
      }),
      this.getPagesReadInRange(userId, todayStart, todayEnd),
      this.getPagesReadInRange(userId, sevenDayStart, todayEnd),
    ]);

    const streakCalendar: DashboardStreakCalendarItemDto[] = calendar.days.map(
      (day) => ({
        date: day.date,
        status: day.status,
        pagesRead: day.pagesRead,
      }),
    );

    const activeReadings: DashboardActiveReadingDto[] = activeTrackers.map(
      (tracker) => ({
        trackerId: tracker.id,
        bookTitle: tracker.book.title,
        currentPage: tracker.currentPage,
        totalPages: tracker.book.totalPages,
        goalSummary: this.buildGoalSummary(
          {
            currentPage: tracker.currentPage,
            totalPages: tracker.book.totalPages,
            targetEndDate: tracker.targetEndDate,
            dailyPageGoal: tracker.dailyPageGoal,
          },
          pagesReadToday,
        ),
      }),
    );

    const response: DashboardResponseDto = {
      currentStreak: streak?.currentCount ?? 0,
      streakStatus:
        (streak?.status?.toLowerCase() as 'inactive' | 'active' | 'frozen') ??
        'inactive',
      freezeLeft: streak?.availableFreezes ?? 2,
      streakCalendar,
      pagesReadToday,
      pagesReadLast7Days,
      activeReadings,
      completedBooksCount,
    };

    await this.cacheService.set(key, response, DASHBOARD_CACHE_TTL_SECONDS);
    return response;
  }
}
