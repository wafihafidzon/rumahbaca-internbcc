import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFriendRequestDto {
  @ApiProperty({ example: 'cuid123' })
  @IsString()
  @IsNotEmpty()
  receiverId: string;
}
