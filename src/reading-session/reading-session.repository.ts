import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReadingSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ReadingSessionCreateInput,
  ): Promise<Prisma.ReadingSessionGetPayload<object>> {
    return this.prisma.readingSession.create({ data });
  }

  async findManyByTracker(
    trackerId: string,
    skip: number,
    take: number,
  ): Promise<Prisma.ReadingSessionGetPayload<object>[]> {
    return this.prisma.readingSession.findMany({
      where: { readingTrackerId: trackerId },
      skip,
      take,
      orderBy: { trackedAt: 'desc' },
    });
  }

  async countByTracker(trackerId: string): Promise<number> {
    return this.prisma.readingSession.count({
      where: { readingTrackerId: trackerId },
    });
  }

  async findById(
    id: string,
  ): Promise<Prisma.ReadingSessionGetPayload<object> | null> {
    return this.prisma.readingSession.findUnique({ where: { id } });
  }
}
