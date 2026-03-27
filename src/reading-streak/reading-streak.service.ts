import { Injectable } from '@nestjs/common';
import { StreakDayStatus, StreakStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { ReadingStreakResponseDto } from './dto/reading-streak-response.dto';
import {
  StreakCalendarDayDto,
  StreakCalendarResponseDto,
} from './dto/streak-calendar-response.dto';
import { ReadingStreakRepository } from './reading-streak.repository';

const JAKARTA_TZ = 'Asia/Jakarta';
const INITIAL_FREEZES = 2;

type StreakState = {
  currentCount: number;
  status: StreakStatus;
  availableFreezes: number;
  lastActiveDate: Date | null;
  lastCountedDate: Date | null;
  consecutivePreStreakDays: number;
};

@Injectable()
export class ReadingStreakService {
  constructor(
    private readonly readingStreakRepository: ReadingStreakRepository,
    private readonly prisma: PrismaService,
  ) {}

  private toJakartaDate(date: Date): Date {
    return new Date(
      date.toLocaleDateString('en-CA', {
        timeZone: JAKARTA_TZ,
      }),
    );
  }

  private getTodayJakarta(): Date {
    return this.toJakartaDate(new Date());
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private toDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private normalizeState(record: Partial<StreakState> | null): StreakState {
    return {
      currentCount: record?.currentCount ?? 0,
      status: record?.status ?? StreakStatus.INACTIVE,
      availableFreezes: record?.availableFreezes ?? INITIAL_FREEZES,
      lastActiveDate: record?.lastActiveDate ?? null,
      lastCountedDate: record?.lastCountedDate ?? null,
      consecutivePreStreakDays: record?.consecutivePreStreakDays ?? 0,
    };
  }

  private async processGapTx(
    tx: PrismaService,
    userId: string,
    state: StreakState,
    endDate: Date,
  ): Promise<void> {
    if (!state.lastActiveDate || state.status === StreakStatus.INACTIVE) {
      return;
    }

    let cursor = this.addDays(state.lastActiveDate, 1);

    while (cursor <= endDate) {
      if (state.availableFreezes > 0) {
        state.availableFreezes -= 1;
        state.status = StreakStatus.FROZEN;

        await tx.userReadingStreakDay.upsert({
          where: {
            userId_date: {
              userId,
              date: cursor,
            },
          },
          create: {
            user: { connect: { id: userId } },
            streak: { connect: { userId } },
            date: cursor,
            status: StreakDayStatus.FREEZE,
          },
          update: {
            status: StreakDayStatus.FREEZE,
          },
        });
      } else {
        state.currentCount = 0;
        state.status = StreakStatus.INACTIVE;
        state.availableFreezes = INITIAL_FREEZES;
        state.consecutivePreStreakDays = 0;

        await tx.userReadingStreakDay.upsert({
          where: {
            userId_date: {
              userId,
              date: cursor,
            },
          },
          create: {
            user: { connect: { id: userId } },
            streak: { connect: { userId } },
            date: cursor,
            status: StreakDayStatus.RESET,
          },
          update: {
            status: StreakDayStatus.RESET,
          },
        });

        state.lastActiveDate = cursor;
        state.lastCountedDate = cursor;
        return;
      }

      state.lastActiveDate = cursor;
      state.lastCountedDate = cursor;
      cursor = this.addDays(cursor, 1);
    }
  }

  async recordActivity(userId: string, date: Date): Promise<void> {
    const activityDate = this.toJakartaDate(date);

    await this.prisma.$transaction(async (tx) => {
      const streak = await tx.userReadingStreak.upsert({
        where: { userId },
        create: {
          user: { connect: { id: userId } },
        },
        update: {},
      });

      const existingDay = await tx.userReadingStreakDay.findUnique({
        where: {
          userId_date: {
            userId,
            date: activityDate,
          },
        },
      });

      await tx.userReadingStreakDay.upsert({
        where: {
          userId_date: {
            userId,
            date: activityDate,
          },
        },
        create: {
          user: { connect: { id: userId } },
          streak: { connect: { userId } },
          date: activityDate,
          status: StreakDayStatus.READ,
          pagesRead: 1,
          sourceSessionCount: 1,
        },
        update: {
          status: StreakDayStatus.READ,
          pagesRead: {
            increment: 1,
          },
          sourceSessionCount: {
            increment: 1,
          },
        },
      });

      const state = this.normalizeState(streak);

      if (existingDay?.status === StreakDayStatus.READ) {
        await tx.userReadingStreak.update({
          where: { userId },
          data: {
            lastActiveDate: activityDate,
            lastCountedDate: activityDate,
          },
        });
        return;
      }

      if (
        state.status === StreakStatus.ACTIVE ||
        state.status === StreakStatus.FROZEN
      ) {
        const gapEnd = this.addDays(activityDate, -1);
        await this.processGapTx(
          tx as unknown as PrismaService,
          userId,
          state,
          gapEnd,
        );
      }

      if (state.status === StreakStatus.INACTIVE) {
        const lastCounted = state.lastCountedDate;
        if (lastCounted && this.addDays(lastCounted, 1) < activityDate) {
          state.consecutivePreStreakDays = 0;
        }

        state.consecutivePreStreakDays += 1;
        if (state.consecutivePreStreakDays >= 2) {
          state.status = StreakStatus.ACTIVE;
          state.currentCount = 2;
        }
      } else {
        state.currentCount += 1;
        state.status = StreakStatus.ACTIVE;
      }

      state.lastActiveDate = activityDate;
      state.lastCountedDate = activityDate;

      await tx.userReadingStreak.update({
        where: { userId },
        data: {
          currentCount: state.currentCount,
          status: state.status,
          availableFreezes: state.availableFreezes,
          consecutivePreStreakDays: state.consecutivePreStreakDays,
          lastActiveDate: state.lastActiveDate,
          lastCountedDate: state.lastCountedDate,
        },
      });
    });
  }

  async processGap(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const streak = await tx.userReadingStreak.findUnique({
        where: { userId },
      });

      if (!streak?.lastActiveDate) {
        return;
      }

      const today = this.getTodayJakarta();
      const yesterday = this.addDays(today, -1);
      if (yesterday < streak.lastActiveDate) {
        return;
      }

      const state = this.normalizeState(streak);
      await this.processGapTx(
        tx as unknown as PrismaService,
        userId,
        state,
        yesterday,
      );

      await tx.userReadingStreak.update({
        where: { userId },
        data: {
          currentCount: state.currentCount,
          status: state.status,
          availableFreezes: state.availableFreezes,
          consecutivePreStreakDays: state.consecutivePreStreakDays,
          lastActiveDate: state.lastActiveDate,
          lastCountedDate: state.lastCountedDate,
        },
      });
    });
  }

  async getStreak(userId: string): Promise<ReadingStreakResponseDto | null> {
    await this.processGap(userId);

    const streak = await this.readingStreakRepository.findByUserId(userId);
    if (!streak) {
      return null;
    }

    return plainToInstance(ReadingStreakResponseDto, streak, {
      excludeExtraneousValues: true,
    });
  }

  async getCalendar(
    userId: string,
    days: number,
  ): Promise<StreakCalendarResponseDto> {
    const today = this.getTodayJakarta();
    const startDate = this.addDays(today, -days);

    const streakDays = await this.readingStreakRepository.getStreakDays(
      userId,
      startDate,
      today,
    );

    const byDate = new Map(
      streakDays.map((day) => [
        this.toDateKey(day.date),
        {
          status: day.status.toLowerCase(),
          pagesRead: day.pagesRead,
        },
      ]),
    );

    const responseDays: StreakCalendarDayDto[] = [];
    for (
      let cursor = new Date(startDate);
      cursor <= today;
      cursor = this.addDays(cursor, 1)
    ) {
      const key = this.toDateKey(cursor);
      const entry = byDate.get(key);

      responseDays.push({
        date: key,
        status: entry?.status ?? (cursor > today ? 'future' : 'miss'),
        pagesRead: entry?.pagesRead ?? 0,
      });
    }

    return plainToInstance(
      StreakCalendarResponseDto,
      { days: responseDays },
      { excludeExtraneousValues: true },
    );
  }

  async recalculateFromDays(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existingDays = await tx.userReadingStreakDay.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      });

      const readDays = existingDays.filter(
        (day) => day.status === StreakDayStatus.READ,
      );

      await tx.userReadingStreak.upsert({
        where: { userId },
        create: {
          user: { connect: { id: userId } },
          currentCount: 0,
          status: StreakStatus.INACTIVE,
          availableFreezes: INITIAL_FREEZES,
          consecutivePreStreakDays: 0,
          lastActiveDate: null,
          lastCountedDate: null,
        },
        update: {
          currentCount: 0,
          status: StreakStatus.INACTIVE,
          availableFreezes: INITIAL_FREEZES,
          consecutivePreStreakDays: 0,
          lastActiveDate: null,
          lastCountedDate: null,
        },
      });

      const rebuiltDays: Array<{
        date: Date;
        status: StreakDayStatus;
        pagesRead: number;
        sourceSessionCount: number;
      }> = [];

      const state: StreakState = {
        currentCount: 0,
        status: StreakStatus.INACTIVE,
        availableFreezes: INITIAL_FREEZES,
        consecutivePreStreakDays: 0,
        lastActiveDate: null,
        lastCountedDate: null,
      };

      for (const readDay of readDays) {
        if (
          state.lastCountedDate &&
          this.addDays(state.lastCountedDate, 1) < readDay.date
        ) {
          if (
            state.status === StreakStatus.ACTIVE ||
            state.status === StreakStatus.FROZEN
          ) {
            let gapCursor = this.addDays(state.lastCountedDate, 1);
            const gapEnd = this.addDays(readDay.date, -1);

            while (gapCursor <= gapEnd) {
              if (state.availableFreezes > 0) {
                state.availableFreezes -= 1;
                state.status = StreakStatus.FROZEN;
                rebuiltDays.push({
                  date: gapCursor,
                  status: StreakDayStatus.FREEZE,
                  pagesRead: 0,
                  sourceSessionCount: 0,
                });
              } else {
                state.currentCount = 0;
                state.status = StreakStatus.INACTIVE;
                state.availableFreezes = INITIAL_FREEZES;
                state.consecutivePreStreakDays = 0;
                rebuiltDays.push({
                  date: gapCursor,
                  status: StreakDayStatus.RESET,
                  pagesRead: 0,
                  sourceSessionCount: 0,
                });
                break;
              }

              state.lastActiveDate = gapCursor;
              state.lastCountedDate = gapCursor;
              gapCursor = this.addDays(gapCursor, 1);
            }
          } else {
            state.consecutivePreStreakDays = 0;
          }
        }

        if (state.status === StreakStatus.INACTIVE) {
          state.consecutivePreStreakDays += 1;
          if (state.consecutivePreStreakDays >= 2) {
            state.status = StreakStatus.ACTIVE;
            state.currentCount = 2;
          }
        } else {
          state.currentCount += 1;
          state.status = StreakStatus.ACTIVE;
        }

        state.lastActiveDate = readDay.date;
        state.lastCountedDate = readDay.date;

        rebuiltDays.push({
          date: readDay.date,
          status: StreakDayStatus.READ,
          pagesRead: readDay.pagesRead,
          sourceSessionCount: readDay.sourceSessionCount,
        });
      }

      await tx.userReadingStreakDay.deleteMany({ where: { userId } });

      if (rebuiltDays.length > 0) {
        await tx.userReadingStreakDay.createMany({
          data: rebuiltDays.map((day) => ({
            userId,
            date: day.date,
            status: day.status,
            pagesRead: day.pagesRead,
            sourceSessionCount: day.sourceSessionCount,
          })),
        });
      }

      await tx.userReadingStreak.update({
        where: { userId },
        data: {
          currentCount: state.currentCount,
          status: state.status,
          availableFreezes: state.availableFreezes,
          lastActiveDate: state.lastActiveDate,
          lastCountedDate: state.lastCountedDate,
          consecutivePreStreakDays: state.consecutivePreStreakDays,
        },
      });
    });
  }
}
