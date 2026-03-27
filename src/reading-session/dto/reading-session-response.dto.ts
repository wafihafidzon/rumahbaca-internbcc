import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';

export class ReadingSessionResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  readingTrackerId: string;

  @ApiProperty()
  @Expose()
  trackedAt: Date;

  @ApiProperty()
  @Expose()
  startPage: number;

  @ApiProperty()
  @Expose()
  endPage: number;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  durationMinutes: number | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  insight: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  photoUrl: string | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

export class ReadingSessionListResponseDto {
  @ApiProperty({ type: [ReadingSessionResponseDto] })
  data: ReadingSessionResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
