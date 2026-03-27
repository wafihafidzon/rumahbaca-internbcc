import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const readingTrackerInclude = { book: true } as const;

type ReadingTrackerWithBook = Prisma.ReadingTrackerGetPayload<{
  include: typeof readingTrackerInclude;
}>;

@Injectable()
export class ReadingTrackerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndBook(
    userId: string,
    bookId: string,
  ): Promise<ReadingTrackerWithBook | null> {
    return this.prisma.readingTracker.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      include: readingTrackerInclude,
    });
  }

  async create(
    data: Prisma.ReadingTrackerCreateInput,
  ): Promise<ReadingTrackerWithBook> {
    return this.prisma.readingTracker.create({
      data,
      include: readingTrackerInclude,
    });
  }

  async findManyByUser(
    userId: string,
    where: Prisma.ReadingTrackerWhereInput,
    skip = 0,
    take = 100,
  ): Promise<ReadingTrackerWithBook[]> {
    return this.prisma.readingTracker.findMany({
      where: {
        userId,
        ...where,
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: readingTrackerInclude,
    });
  }

  async countByUser(
    userId: string,
    where: Prisma.ReadingTrackerWhereInput,
  ): Promise<number> {
    return this.prisma.readingTracker.count({
      where: {
        userId,
        ...where,
      },
    });
  }

  async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<ReadingTrackerWithBook | null> {
    return this.prisma.readingTracker.findFirst({
      where: {
        id,
        userId,
      },
      include: readingTrackerInclude,
    });
  }

  async update(
    id: string,
    data: Prisma.ReadingTrackerUpdateInput,
  ): Promise<ReadingTrackerWithBook> {
    return this.prisma.readingTracker.update({
      where: { id },
      data,
      include: readingTrackerInclude,
    });
  }
}
