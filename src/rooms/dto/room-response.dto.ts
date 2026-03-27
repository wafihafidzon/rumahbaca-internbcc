import { ApiProperty } from '@nestjs/swagger';
import { RoomStatus } from '@prisma/client';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';

export class RoomHostDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;
}

export class RoomMemberDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty()
  currentPage: number;
}

export class RoomSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  bookId: string;

  @ApiProperty({ enum: RoomStatus })
  status: RoomStatus;

  @ApiProperty({ type: RoomHostDto })
  host: RoomHostDto;

  @ApiProperty()
  createdAt: Date;
}

export class RoomDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  bookId: string;

  @ApiProperty({ enum: RoomStatus })
  status: RoomStatus;

  @ApiProperty({ type: RoomHostDto })
  host: RoomHostDto;

  @ApiProperty({ type: [RoomMemberDto] })
  members: RoomMemberDto[];

  @ApiProperty()
  createdAt: Date;
}

export class RoomListResponseDto {
  @ApiProperty({ type: [RoomSummaryDto] })
  data: RoomSummaryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
