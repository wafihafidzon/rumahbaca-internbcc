import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StreakCalendarQueryDto {
  @ApiPropertyOptional({ enum: [7, 30], default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 30])
  range?: number = 7;
}
