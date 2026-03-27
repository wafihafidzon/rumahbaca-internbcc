import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReadingTrackerStatus } from '@prisma/client';
import { BookRepository } from '../../book/book.repository';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { ReadingTrackerRepository } from '../reading-tracker.repository';
import { ReadingTrackerService } from '../reading-tracker.service';

const mockReadingTrackerRepository = {
  findByUserAndBook: jest.fn(),
  create: jest.fn(),
  findManyByUser: jest.fn(),
  countByUser: jest.fn(),
  findByIdAndUser: jest.fn(),
  update: jest.fn(),
};

const mockBookRepository = {
  findById: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('ReadingTrackerService', () => {
  let service: ReadingTrackerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingTrackerService,
        {
          provide: ReadingTrackerRepository,
          useValue: mockReadingTrackerRepository,
        },
        { provide: BookRepository, useValue: mockBookRepository },
        { provide: CustomLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ReadingTrackerService>(ReadingTrackerService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws NotFoundException when book does not exist', async () => {
      mockBookRepository.findById.mockResolvedValue(null);

      await expect(
        service.create('user-1', { bookId: 'missing-book' }),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockReadingTrackerRepository.findByUserAndBook,
      ).not.toHaveBeenCalled();
    });

    it('throws ConflictException when tracker already exists for user+book', async () => {
      mockBookRepository.findById.mockResolvedValue({ id: 'book-1' });
      mockReadingTrackerRepository.findByUserAndBook.mockResolvedValue({
        id: 'tracker-1',
      });

      await expect(
        service.create('user-1', { bookId: 'book-1' }),
      ).rejects.toThrow(ConflictException);
      expect(mockReadingTrackerRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when tracker does not belong to user', async () => {
      mockReadingTrackerRepository.findByIdAndUser.mockResolvedValue(null);

      await expect(service.findOne('tracker-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('sets completedAt when status changes to COMPLETED', async () => {
      mockReadingTrackerRepository.findByIdAndUser.mockResolvedValue({
        id: 'tracker-1',
        userId: 'user-1',
        status: ReadingTrackerStatus.ACTIVE,
        book: { id: 'book-1', totalPages: 200 },
      });
      mockReadingTrackerRepository.update.mockResolvedValue({
        id: 'tracker-1',
        userId: 'user-1',
        bookId: 'book-1',
        currentPage: 100,
        status: ReadingTrackerStatus.COMPLETED,
        startedAt: new Date('2026-03-20'),
        completedAt: new Date('2026-03-21'),
        targetEndDate: null,
        dailyPageGoal: null,
        createdAt: new Date('2026-03-20'),
        updatedAt: new Date('2026-03-21'),
        book: {
          id: 'book-1',
          title: 'book',
          author: 'author',
          totalPages: 200,
          coverUrl: null,
          createdByUserId: 'user-1',
          createdAt: new Date('2026-03-20'),
          updatedAt: new Date('2026-03-20'),
        },
      });

      await service.update('tracker-1', 'user-1', {
        status: ReadingTrackerStatus.COMPLETED,
      });

      const updateData = mockReadingTrackerRepository.update.mock.calls[0][1];
      expect(updateData.status).toBe(ReadingTrackerStatus.COMPLETED);
      expect(updateData.completedAt).toBeInstanceOf(Date);
    });

    it('rejects invalid status transition from COMPLETED to ACTIVE', async () => {
      mockReadingTrackerRepository.findByIdAndUser.mockResolvedValue({
        id: 'tracker-1',
        userId: 'user-1',
        status: ReadingTrackerStatus.COMPLETED,
        book: { id: 'book-1', totalPages: 200 },
      });

      await expect(
        service.update('tracker-1', 'user-1', {
          status: ReadingTrackerStatus.ACTIVE,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockReadingTrackerRepository.update).not.toHaveBeenCalled();
    });
  });
});
