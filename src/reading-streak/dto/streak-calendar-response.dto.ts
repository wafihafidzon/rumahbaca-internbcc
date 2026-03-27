import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class StreakCalendarDayDto {
  @Expose()
  @IsString()
  date: string;

  @Expose()
  @IsIn(['read', 'freeze', 'miss', 'reset', 'future'])
  status: string;

  @Expose()
  @IsInt()
  @Min(0)
  pagesRead: number;
}

export class StreakCalendarResponseDto {
  @Expose()
  @Type(() => StreakCalendarDayDto)
  @IsArray()
  @ValidateNested({ each: true })
  days: StreakCalendarDayDto[];
}
