import { BadRequestException } from '@nestjs/common';
import { ReadingTrackerStatus } from '@prisma/client';
import { ReadingSessionService } from '../reading-session.service';
import { CreateReadingSessionDto } from '../dto/create-reading-session.dto';

type Mocked<T> = { [K in keyof T]: jest.Mock };

describe('ReadingSessionService', () => {
  const trackerId = 'tracker-1';
  const userId = 'user-1';

  let readingSessionRepository: {
    findManyByTracker: jest.Mock;
    countByTracker: jest.Mock;
  };
  let readingTrackerRepository: {
    findByIdAndUser: jest.Mock;
  };
  let readingStreakService: {
    recordActivity: jest.Mock;
  };
  let prisma: {
    $transaction: jest.Mock;
  };
  let service: ReadingSessionService;

  beforeEach(() => {
    readingSessionRepository = {
      findManyByTracker: jest.fn(),
      countByTracker: jest.fn(),
    };

    readingTrackerRepository = {
      findByIdAndUser: jest.fn(),
    };

    readingStreakService = {
      recordActivity: jest.fn(),
    };

    prisma = {
      $transaction: jest.fn(),
    };

    service = new ReadingSessionService(
      readingSessionRepository as unknown as Mocked<any>,
      readingTrackerRepository as unknown as Mocked<any>,
      readingStreakService as unknown as Mocked<any>,
      prisma as unknown as Mocked<any>,
    );
  });

  const buildTracker = (overrides: Record<string, unknown> = {}) => ({
    id: trackerId,
    status: ReadingTrackerStatus.ACTIVE,
    currentPage: 10,
    book: { totalPages: 200 },
    ...overrides,
  });

  it('throws when tracker status is not ACTIVE', async () => {
    readingTrackerRepository.findByIdAndUser.mockResolvedValue(
      buildTracker({ status: ReadingTrackerStatus.PAUSED }),
    );

    const dto: CreateReadingSessionDto = {
      startPage: 10,
      endPage: 20,
    };

    await expect(service.create(trackerId, userId, dto)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(readingStreakService.recordActivity).not.toHaveBeenCalled();
  });

  it('throws when startPage is less than currentPage', async () => {
    readingTrackerRepository.findByIdAndUser.mockResolvedValue(buildTracker());

    const dto: CreateReadingSessionDto = {
      startPage: 9,
      endPage: 20,
    };

    await expect(service.create(trackerId, userId, dto)).rejects.toThrow(
      'Cannot go backward',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(readingStreakService.recordActivity).not.toHaveBeenCalled();
  });

  it('throws when endPage is not greater than startPage', async () => {
    readingTrackerRepository.findByIdAndUser.mockResolvedValue(buildTracker());

    const dto: CreateReadingSessionDto = {
      startPage: 10,
      endPage: 10,
    };

    await expect(service.create(trackerId, userId, dto)).rejects.toThrow(
      'Must read at least 1 page',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(readingStreakService.recordActivity).not.toHaveBeenCalled();
  });

  it('throws when endPage exceeds total pages', async () => {
    readingTrackerRepository.findByIdAndUser.mockResolvedValue(buildTracker());

    const dto: CreateReadingSessionDto = {
      startPage: 10,
      endPage: 201,
    };

    await expect(service.create(trackerId, userId, dto)).rejects.toThrow(
      'Cannot exceed total pages',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(readingStreakService.recordActivity).not.toHaveBeenCalled();
  });

  it('auto-completes tracker when endPage equals totalPages', async () => {
    const tracker = buildTracker({
      currentPage: 150,
      book: { totalPages: 200 },
    });
    readingTrackerRepository.findByIdAndUser.mockResolvedValue(tracker);

    const session = {
      id: 'session-1',
      readingTrackerId: tracker.id,
      trackedAt: new Date(),
      startPage: 150,
      endPage: 200,
      durationMinutes: null,
      insight: null,
      photoUrl: null,
      createdAt: new Date(),
    };

    const tx = {
      readingSession: {
        create: jest.fn().mockResolvedValue(session),
      },
      readingTracker: {
        update: jest.fn().mockResolvedValue(tracker),
      },
    };

    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => {
        await callback(tx);
        return session;
      },
    );
    readingStreakService.recordActivity.mockResolvedValue(undefined);

    const dto: CreateReadingSessionDto = {
      startPage: 150,
      endPage: 200,
    };

    const result = await service.create(trackerId, userId, dto);

    expect(tx.readingSession.create).toHaveBeenCalled();
    expect(tx.readingTracker.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: tracker.id },
        data: expect.objectContaining({
          currentPage: 200,
          status: ReadingTrackerStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      }),
    );
    expect(readingStreakService.recordActivity).toHaveBeenCalledWith(
      userId,
      session.trackedAt,
    );
    expect(result.id).toBe('session-1');
  });
});
