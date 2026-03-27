import { Injectable } from '@nestjs/common';
import { Prisma, StreakDayStatus, StreakStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const THIRTY_DAYS_WINDOW = 30;

type UserReadingStreakWithDays = Prisma.UserReadingStreakGetPayload<{
  include: {
    days: true;
  };
}>;

type UpsertStreakInput = {
  currentCount?: number;
  status?: StreakStatus;
  availableFreezes?: number;
  lastActiveDate?: Date | null;
  lastCountedDate?: Date | null;
  consecutivePreStreakDays?: number;
};

type UpsertStreakDayInput = {
  status: StreakDayStatus;
  pagesRead?: number;
  sourceSessionCount?: number;
};

@Injectable()
export class ReadingStreakRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(
    userId: string,
  ): Promise<UserReadingStreakWithDays | null> {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (THIRTY_DAYS_WINDOW - 1));

    return this.prisma.userReadingStreak.findUnique({
      where: { userId },
      include: {
        days: {
          where: {
            date: {
              gte: startDate,
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });
  }

  async upsertStreak(
    userId: string,
    data: UpsertStreakInput,
  ): Promise<Prisma.UserReadingStreakGetPayload<object>> {
    return this.prisma.userReadingStreak.upsert({
      where: { userId },
      create: {
        user: { connect: { id: userId } },
        ...data,
      },
      update: data,
    });
  }

  async findStreakDayByDate(
    userId: string,
    date: Date,
  ): Promise<Prisma.UserReadingStreakDayGetPayload<object> | null> {
    return this.prisma.userReadingStreakDay.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });
  }

  async upsertStreakDay(
    userId: string,
    date: Date,
    data: UpsertStreakDayInput,
  ): Promise<Prisma.UserReadingStreakDayGetPayload<object>> {
    return this.prisma.userReadingStreakDay.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      create: {
        user: { connect: { id: userId } },
        streak: { connect: { userId } },
        date,
        status: data.status,
        pagesRead: data.pagesRead ?? 0,
        sourceSessionCount: data.sourceSessionCount ?? 0,
      },
      update: data,
    });
  }

  async getStreakDays(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Prisma.UserReadingStreakDayGetPayload<object>[]> {
    return this.prisma.userReadingStreakDay.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async resetStreak(
    userId: string,
  ): Promise<Prisma.UserReadingStreakGetPayload<object>> {
    return this.prisma.userReadingStreak.update({
      where: { userId },
      data: {
        currentCount: 0,
        status: StreakStatus.INACTIVE,
        availableFreezes: 2,
        consecutivePreStreakDays: 0,
      },
    });
  }
}
