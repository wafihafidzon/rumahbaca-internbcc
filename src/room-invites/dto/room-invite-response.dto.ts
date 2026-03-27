import { ApiProperty } from '@nestjs/swagger';
import { RoomInviteStatus } from '@prisma/client';

export class RoomInviteRoomDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  bookId: string;
}

export class RoomInviteUserDto {
  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;
}

export class RoomInviteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  roomId: string;

  @ApiProperty({ type: RoomInviteRoomDto })
  room: RoomInviteRoomDto;

  @ApiProperty({ type: RoomInviteUserDto })
  invitee: RoomInviteUserDto;

  @ApiProperty({ enum: RoomInviteStatus })
  status: RoomInviteStatus;

  @ApiProperty()
  createdAt: Date;
}
