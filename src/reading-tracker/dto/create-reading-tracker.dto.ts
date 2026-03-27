import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateReadingTrackerDto {
  @ApiProperty()
  @IsString()
  bookId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  targetEndDate?: string;

  @ApiProperty({ required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dailyPageGoal?: number;
}
