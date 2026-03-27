import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';

export class FriendResponseDto {
  @ApiProperty()
  friendId: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty()
  friendsSince: Date;
}

export class FriendListResponseDto {
  @ApiProperty({ type: [FriendResponseDto] })
  data: FriendResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
