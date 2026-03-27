import { ApiProperty } from '@nestjs/swagger';

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
