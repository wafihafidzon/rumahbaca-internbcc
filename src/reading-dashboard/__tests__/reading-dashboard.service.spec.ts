import { ReadingDashboardService } from '../reading-dashboard.service';

describe('ReadingDashboardService', () => {
  let service: ReadingDashboardService;

  const cacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const readingTrackerRepository = {
    findManyByUser: jest.fn(),
    countByUser: jest.fn(),
  };

  const readingStreakService = {
    getStreak: jest.fn(),
    getCalendar: jest.fn(),
  };

  const prisma = {
    readingSession: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new ReadingDashboardService(
      cacheService as any,
      logger as any,
      readingTrackerRepository as any,
      readingStreakService as any,
      prisma as any,
    );

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-27T10:00:00+07:00'));

    cacheService.get.mockResolvedValue(undefined);
    cacheService.set.mockResolvedValue(undefined);
    readingStreakService.getStreak.mockResolvedValue({
      currentCount: 3,
      status: 'ACTIVE',
      availableFreezes: 1,
    });
    readingStreakService.getCalendar.mockResolvedValue({ days: [] });
    readingTrackerRepository.countByUser.mockResolvedValue(2);
    prisma.readingSession.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('computes targetEndDate goal summary and marks behind when daysRemaining <= 0', async () => {
    readingTrackerRepository.findManyByUser.mockResolvedValue([
      {
        id: 'tracker-1',
        currentPage: 100,
        targetEndDate: new Date('2026-03-26T00:00:00+07:00'),
        dailyPageGoal: null,
        book: {
          title: 'Atomic Habits',
          totalPages: 320,
        },
      },
    ]);

    const result = await service.getMeDashboard('user-1');

    expect(result.activeReadings[0].goalSummary).toEqual(
      expect.objectContaining({
        targetEndDate: '2026-03-25',
        pagesPerDayNeeded: 220,
        status: 'behind',
      }),
    );
  });

  it('computes dailyPageGoal status as ahead, on_track, and behind', async () => {
    readingTrackerRepository.findManyByUser.mockResolvedValue([
      {
        id: 'tracker-ahead',
        currentPage: 10,
        targetEndDate: null,
        dailyPageGoal: 20,
        book: {
          title: 'Book A',
          totalPages: 200,
        },
      },
      {
        id: 'tracker-track',
        currentPage: 10,
        targetEndDate: null,
        dailyPageGoal: 25,
        book: {
          title: 'Book B',
          totalPages: 250,
        },
      },
      {
        id: 'tracker-behind',
        currentPage: 10,
        targetEndDate: null,
        dailyPageGoal: 30,
        book: {
          title: 'Book C',
          totalPages: 300,
        },
      },
    ]);

    prisma.readingSession.findMany
      .mockResolvedValueOnce([
        { startPage: 1, endPage: 22 },
        { startPage: 22, endPage: 24 },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.getMeDashboard('user-1');

    const summaries = result.activeReadings.map(
      (item) => item.goalSummary?.status,
    );
    expect(summaries).toEqual(['ahead', 'on_track', 'behind']);
  });

  it('returns cached response when available', async () => {
    cacheService.get.mockResolvedValue({
      currentStreak: 1,
      streakStatus: 'active',
      freezeLeft: 1,
      streakCalendar: [],
      pagesReadToday: 12,
      pagesReadLast7Days: 50,
      activeReadings: [],
      completedBooksCount: 1,
    });

    const result = await service.getMeDashboard('user-1');

    expect(result.pagesReadToday).toBe(12);
    expect(readingTrackerRepository.findManyByUser).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
  });
});
