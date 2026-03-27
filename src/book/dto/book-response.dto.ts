import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class BookResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  title: string;

  @ApiProperty()
  @Expose()
  author: string;

  @ApiProperty()
  @Expose()
  totalPages: number;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  coverUrl: string | null;

  @ApiProperty()
  @Expose()
  createdByUserId: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}

export class BookListResponseDto {
  @ApiProperty({ type: [BookResponseDto] })
  data: BookResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}
