import { ApiProperty } from '@nestjs/swagger';

export class UserSearchItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty({
    enum: ['none', 'friends', 'request_sent', 'request_received'],
  })
  relationshipStatus: 'none' | 'friends' | 'request_sent' | 'request_received';
}
