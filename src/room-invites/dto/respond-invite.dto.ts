import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum RoomInviteAction {
  ACCEPT = 'accept',
  REJECT = 'reject',
}

export class RespondInviteDto {
  @ApiProperty({ enum: RoomInviteAction })
  @IsEnum(RoomInviteAction)
  action: RoomInviteAction;
}
