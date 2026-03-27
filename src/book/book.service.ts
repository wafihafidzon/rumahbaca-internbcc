import { Injectable } from '@nestjs/common';
import { Book } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { CacheService } from '../common/cache/cache.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { BookRepository } from './book.repository';
import { CreateBookDto } from './dto/create-book.dto';
import { BookQueryDto } from './dto/book-query.dto';
import { BookListResponseDto, BookResponseDto } from './dto/book-response.dto';

@Injectable()
export class BookService {
  constructor(
    private readonly bookRepository: BookRepository,
    private readonly logger: CustomLoggerService,
    private readonly cacheService: CacheService,
  ) {}

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }

  private toBookResponseDto(book: Book): BookResponseDto {
    return plainToInstance(BookResponseDto, book, {
      excludeExtraneousValues: true,
    });
  }

  async create(
    dto: CreateBookDto,
    createdByUserId: string,
  ): Promise<BookResponseDto> {
    const normalizedTitle = this.normalize(dto.title);
    const normalizedAuthor = this.normalize(dto.author);

    const existing = await this.bookRepository.findByNormalizedTitleAuthor(
      normalizedTitle,
      normalizedAuthor,
    );

    if (existing) {
      this.logger.log(
        `Book dedup hit for "${normalizedTitle}" by "${normalizedAuthor}"`,
        'BookService',
      );
      return this.toBookResponseDto(existing);
    }

    const book = await this.bookRepository.create({
      title: normalizedTitle,
      author: normalizedAuthor,
      totalPages: dto.totalPages,
      coverUrl: dto.coverUrl,
      createdBy: {
        connect: { id: createdByUserId },
      },
    });

    await this.cacheService.reset();
    return this.toBookResponseDto(book);
  }

  async search(query: BookQueryDto): Promise<BookListResponseDto> {
    const { q, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      this.bookRepository.search(q, skip, limit),
      this.bookRepository.countSearch(q),
    ]);

    return {
      data: books.map((book) => this.toBookResponseDto(book)),
      meta: {
        total,
        page,
        limit,
      },
    };
  }
}
