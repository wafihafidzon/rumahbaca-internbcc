import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateInviteDto {
  @ApiProperty()
  @IsUUID()
  inviteeId: string;
}
