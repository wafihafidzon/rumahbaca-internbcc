import { ApiProperty } from '@nestjs/swagger';
import { ReadingTrackerStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ReadingTrackerQueryDto {
  @ApiProperty({ required: false, enum: ReadingTrackerStatus })
  @IsOptional()
  @IsEnum(ReadingTrackerStatus)
  status?: ReadingTrackerStatus;

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
