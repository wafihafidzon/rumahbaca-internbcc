import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/constants/acl.constant';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { BookQueryDto } from './dto/book-query.dto';
import { BookListResponseDto, BookResponseDto } from './dto/book-response.dto';

@ApiTags('Books')
@Controller('books')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN)
@ApiBearerAuth()
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @ApiOperation({
    summary: 'Create a new book or return existing deduplicated book',
  })
  @ApiResponse({ status: 201, type: BookResponseDto })
  @Post()
  async create(
    @Body() dto: CreateBookDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BookResponseDto> {
    return this.bookService.create(dto, user.sub);
  }

  @ApiOperation({ summary: 'Search books by title or author' })
  @ApiResponse({ status: 200, type: BookListResponseDto })
  @Get('search')
  async search(@Query() query: BookQueryDto): Promise<BookListResponseDto> {
    return this.bookService.search(query);
  }
}
