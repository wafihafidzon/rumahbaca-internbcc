import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';

export class FriendRequestUserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;
}

export class FriendRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  receiverId: string;

  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: FriendRequestUserSummaryDto, required: false })
  sender?: FriendRequestUserSummaryDto;

  @ApiProperty({ type: FriendRequestUserSummaryDto, required: false })
  receiver?: FriendRequestUserSummaryDto;
}

export class FriendRequestListResponseDto {
  @ApiProperty({ type: [FriendRequestResponseDto] })
  data: FriendRequestResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination: PaginationMetaDto;
}
