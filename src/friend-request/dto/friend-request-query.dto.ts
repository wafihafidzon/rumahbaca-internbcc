import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FriendRequestQueryDto {
  @ApiProperty({
    enum: ['received', 'sent'],
    required: false,
    default: 'received',
  })
  @IsOptional()
  @IsEnum(['received', 'sent'])
  type?: 'received' | 'sent' = 'received';

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
