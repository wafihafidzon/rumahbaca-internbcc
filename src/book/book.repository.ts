import { Injectable } from '@nestjs/common';
import { Book, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const bookInclude = {} as const;

@Injectable()
export class BookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByNormalizedTitleAuthor(
    title: string,
    author: string,
  ): Promise<Book | null> {
    return this.prisma.book.findFirst({
      where: {
        title,
        author,
      },
      include: bookInclude,
    });
  }

  async create(data: Prisma.BookCreateInput): Promise<Book> {
    return this.prisma.book.create({
      data,
      include: bookInclude,
    });
  }

  async search(q: string, skip: number, take: number): Promise<Book[]> {
    return this.prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { author: { contains: q, mode: 'insensitive' } },
        ],
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: bookInclude,
    });
  }

  async countSearch(q: string): Promise<number> {
    return this.prisma.book.count({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { author: { contains: q, mode: 'insensitive' } },
        ],
      },
    });
  }
}
