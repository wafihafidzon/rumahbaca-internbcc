import { StreakDayStatus, StreakStatus } from '@prisma/client';
import { ReadingStreakService } from '../reading-streak.service';

describe('ReadingStreakService', () => {
  const userId = 'user-1';

  let tx: any;
  let prisma: { $transaction: jest.Mock };
  let readingStreakRepository: {
    findByUserId: jest.Mock;
    getStreakDays: jest.Mock;
  };
  let service: ReadingStreakService;

  beforeEach(() => {
    tx = {
      userReadingStreak: {
        upsert: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      userReadingStreakDay: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn((cb: (trx: any) => unknown) => cb(tx)),
    };

    readingStreakRepository = {
      findByUserId: jest.fn(),
      getStreakDays: jest.fn(),
    };

    service = new ReadingStreakService(
      readingStreakRepository as any,
      prisma as any,
    );

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-27T10:00:00+07:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const streakBase = (overrides: Record<string, unknown> = {}) => ({
    currentCount: 0,
    status: StreakStatus.INACTIVE,
    availableFreezes: 2,
    lastActiveDate: null,
    lastCountedDate: null,
    consecutivePreStreakDays: 0,
    ...overrides,
  });

  it('Day 1 reading -> consecutivePreStreakDays=1, status=INACTIVE', async () => {
    tx.userReadingStreak.upsert.mockResolvedValue(streakBase());
    tx.userReadingStreakDay.findUnique.mockResolvedValue(null);

    await service.recordActivity(userId, new Date('2026-03-27T08:00:00+07:00'));

    expect(tx.userReadingStreak.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
        data: expect.objectContaining({
          status: StreakStatus.INACTIVE,
          consecutivePreStreakDays: 1,
        }),
      }),
    );
  });

  it('2 consecutive reading days -> status=ACTIVE, currentCount=2', async () => {
    tx.userReadingStreak.upsert.mockResolvedValue(
      streakBase({
        consecutivePreStreakDays: 1,
        lastCountedDate: new Date('2026-03-26T00:00:00.000Z'),
      }),
    );
    tx.userReadingStreakDay.findUnique.mockResolvedValue(null);

    await service.recordActivity(userId, new Date('2026-03-27T08:00:00+07:00'));

    expect(tx.userReadingStreak.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StreakStatus.ACTIVE,
          currentCount: 2,
        }),
      }),
    );
  });

  it('Miss before activation -> no freeze consumed, consecutivePreStreakDays reset to 0 then incremented', async () => {
    tx.userReadingStreak.upsert.mockResolvedValue(
      streakBase({
        consecutivePreStreakDays: 1,
        lastCountedDate: new Date('2026-03-24T00:00:00.000Z'),
      }),
    );
    tx.userReadingStreakDay.findUnique.mockResolvedValue(null);

    await service.recordActivity(userId, new Date('2026-03-27T08:00:00+07:00'));

    const lastUpdate = tx.userReadingStreak.update.mock.calls.at(-1)[0].data;
    expect(lastUpdate.availableFreezes).toBe(2);
    expect(lastUpdate.consecutivePreStreakDays).toBe(1);
  });

  it('Miss during active + availableFreezes > 0 -> auto-freeze, currentCount stays same', async () => {
    tx.userReadingStreak.findUnique.mockResolvedValue(
      streakBase({
        status: StreakStatus.ACTIVE,
        currentCount: 5,
        availableFreezes: 2,
        lastActiveDate: new Date('2026-03-25T00:00:00.000Z'),
        lastCountedDate: new Date('2026-03-25T00:00:00.000Z'),
      }),
    );

    await service.processGap(userId);

    expect(tx.userReadingStreakDay.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: StreakDayStatus.FREEZE }),
      }),
    );

    expect(tx.userReadingStreak.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentCount: 5,
          availableFreezes: 1,
        }),
      }),
    );
  });

  it("Freeze day doesn't increment currentCount", async () => {
    tx.userReadingStreak.findUnique.mockResolvedValue(
      streakBase({
        status: StreakStatus.ACTIVE,
        currentCount: 4,
        availableFreezes: 1,
        lastActiveDate: new Date('2026-03-25T00:00:00.000Z'),
      }),
    );

    await service.processGap(userId);

    const data = tx.userReadingStreak.update.mock.calls[0][0].data;
    expect(data.currentCount).toBe(4);
  });

  it('Miss during active + availableFreezes === 0 -> reset streak', async () => {
    tx.userReadingStreak.findUnique.mockResolvedValue(
      streakBase({
        status: StreakStatus.ACTIVE,
        currentCount: 7,
        availableFreezes: 0,
        lastActiveDate: new Date('2026-03-25T00:00:00.000Z'),
      }),
    );

    await service.processGap(userId);

    expect(tx.userReadingStreakDay.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: StreakDayStatus.RESET }),
      }),
    );

    const data = tx.userReadingStreak.update.mock.calls[0][0].data;
    expect(data.status).toBe(StreakStatus.INACTIVE);
    expect(data.currentCount).toBe(0);
  });

  it('Reset restores availableFreezes to 2', async () => {
    tx.userReadingStreak.findUnique.mockResolvedValue(
      streakBase({
        status: StreakStatus.ACTIVE,
        currentCount: 7,
        availableFreezes: 0,
        lastActiveDate: new Date('2026-03-25T00:00:00.000Z'),
      }),
    );

    await service.processGap(userId);

    const data = tx.userReadingStreak.update.mock.calls[0][0].data;
    expect(data.availableFreezes).toBe(2);
  });

  it('Multiple sessions same day -> counted as one day for streak', async () => {
    tx.userReadingStreak.upsert.mockResolvedValue(
      streakBase({
        status: StreakStatus.ACTIVE,
        currentCount: 2,
        lastActiveDate: new Date('2026-03-27T00:00:00.000Z'),
        lastCountedDate: new Date('2026-03-27T00:00:00.000Z'),
      }),
    );
    tx.userReadingStreakDay.findUnique.mockResolvedValue({
      status: StreakDayStatus.READ,
    });

    await service.recordActivity(userId, new Date('2026-03-27T12:00:00+07:00'));

    expect(tx.userReadingStreak.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastCountedDate: expect.any(Date),
        }),
      }),
    );

    const updateData = tx.userReadingStreak.update.mock.calls[0][0].data;
    expect(updateData.currentCount).toBeUndefined();
  });

  it('Sessions from different books same day -> counted as one day', async () => {
    tx.userReadingStreak.upsert.mockResolvedValue(
      streakBase({
        status: StreakStatus.ACTIVE,
        currentCount: 3,
        lastActiveDate: new Date('2026-03-27T00:00:00.000Z'),
        lastCountedDate: new Date('2026-03-27T00:00:00.000Z'),
      }),
    );
    tx.userReadingStreakDay.findUnique.mockResolvedValue({
      status: StreakDayStatus.READ,
    });

    await service.recordActivity(userId, new Date('2026-03-27T20:30:00+07:00'));

    expect(tx.userReadingStreak.update).toHaveBeenCalledTimes(1);
    expect(
      tx.userReadingStreak.update.mock.calls[0][0].data.currentCount,
    ).toBeUndefined();
  });
});
