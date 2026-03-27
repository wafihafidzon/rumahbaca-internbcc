import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondFriendRequestDto {
  @ApiProperty({ enum: ['accept', 'reject', 'cancel'] })
  @IsEnum(['accept', 'reject', 'cancel'])
  action: 'accept' | 'reject' | 'cancel';
}
