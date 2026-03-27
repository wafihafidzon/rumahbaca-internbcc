import { ApiProperty } from '@nestjs/swagger';
import { ReadingTrackerStatus } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';
import { BookResponseDto } from '../../book/dto/book-response.dto';

export class ReadingTrackerResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  userId: string;

  @ApiProperty()
  @Expose()
  bookId: string;

  @ApiProperty()
  @Expose()
  currentPage: number;

  @ApiProperty({ enum: ReadingTrackerStatus })
  @Expose()
  status: ReadingTrackerStatus;

  @ApiProperty()
  @Expose()
  startedAt: Date;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  completedAt: Date | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  targetEndDate: Date | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  dailyPageGoal: number | null;

  @ApiProperty({ type: BookResponseDto })
  @Expose()
  @Type(() => BookResponseDto)
  book: BookResponseDto;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}

export class ReadingTrackerListResponseDto {
  @ApiProperty({ type: [ReadingTrackerResponseDto] })
  data: ReadingTrackerResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
