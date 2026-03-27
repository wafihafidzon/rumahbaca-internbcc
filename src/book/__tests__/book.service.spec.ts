import { Test, TestingModule } from '@nestjs/testing';
import { BookService } from '../book.service';
import { BookRepository } from '../book.repository';
import { CustomLoggerService } from '../../common/logger/logger.service';
import { CacheService } from '../../common/cache/cache.service';

const mockBookRepository = {
  findByNormalizedTitleAuthor: jest.fn(),
  create: jest.fn(),
  search: jest.fn(),
  countSearch: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
};

describe('BookService', () => {
  let service: BookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookService,
        { provide: BookRepository, useValue: mockBookRepository },
        { provide: CustomLoggerService, useValue: mockLogger },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<BookService>(BookService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('returns existing book when normalized title+author matches', async () => {
      const existing = {
        id: 'book-1',
        title: 'atomic habits',
        author: 'james clear',
        totalPages: 320,
        coverUrl: null,
        createdByUserId: 'user-1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      mockBookRepository.findByNormalizedTitleAuthor.mockResolvedValue(
        existing,
      );

      const result = await service.create(
        {
          title: '  Atomic Habits  ',
          author: ' James Clear ',
          totalPages: 320,
        },
        'user-1',
      );

      expect(
        mockBookRepository.findByNormalizedTitleAuthor,
      ).toHaveBeenCalledWith('atomic habits', 'james clear');
      expect(mockBookRepository.create).not.toHaveBeenCalled();
      expect(result.id).toBe(existing.id);
    });

    it('creates a new normalized book when no dedup match exists', async () => {
      mockBookRepository.findByNormalizedTitleAuthor.mockResolvedValue(null);
      mockBookRepository.create.mockResolvedValue({
        id: 'book-2',
        title: 'atomic habits',
        author: 'james clear',
        totalPages: 320,
        coverUrl: null,
        createdByUserId: 'user-2',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });

      await service.create(
        {
          title: 'Atomic Habits',
          author: 'James Clear',
          totalPages: 320,
        },
        'user-2',
      );

      expect(mockBookRepository.create).toHaveBeenCalledWith({
        title: 'atomic habits',
        author: 'james clear',
        totalPages: 320,
        coverUrl: undefined,
        createdBy: { connect: { id: 'user-2' } },
      });
      expect(mockCacheService.reset).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('returns paginated response shape and uses skip/take', async () => {
      mockBookRepository.search.mockResolvedValue([
        {
          id: 'book-1',
          title: 'atomic habits',
          author: 'james clear',
          totalPages: 320,
          coverUrl: null,
          createdByUserId: 'user-1',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ]);
      mockBookRepository.countSearch.mockResolvedValue(23);

      const result = await service.search({ q: 'atomic', page: 2, limit: 10 });

      expect(mockBookRepository.search).toHaveBeenCalledWith('atomic', 10, 10);
      expect(mockBookRepository.countSearch).toHaveBeenCalledWith('atomic');
      expect(result.meta).toEqual({
        total: 23,
        page: 2,
        limit: 10,
      });
      expect(result.data).toHaveLength(1);
    });
  });
});
