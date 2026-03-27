import { ApiProperty } from '@nestjs/swagger';
import { ReadingTrackerStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateReadingTrackerDto {
  @ApiProperty({
    required: false,
    enum: ReadingTrackerStatus,
    example: ReadingTrackerStatus.PAUSED,
  })
  @IsOptional()
  @IsEnum(ReadingTrackerStatus)
  status?: ReadingTrackerStatus;

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
