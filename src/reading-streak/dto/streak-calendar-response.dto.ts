import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StreakCalendarDayDto {
  @ApiProperty()
  @Expose()
  @IsString()
  date: string;

  @ApiProperty({ enum: ['read', 'freeze', 'miss', 'reset', 'future'] })
  @Expose()
  @IsIn(['read', 'freeze', 'miss', 'reset', 'future'])
  status: string;

  @ApiProperty()
  @Expose()
  @IsInt()
  @Min(0)
  pagesRead: number;
}

export class StreakCalendarResponseDto {
  @ApiProperty({ type: [StreakCalendarDayDto] })
  @Expose()
  @Type(() => StreakCalendarDayDto)
  @IsArray()
  @ValidateNested({ each: true })
  days: StreakCalendarDayDto[];
}
