import { StreakStatus } from '@prisma/client';
import { Expose } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReadingStreakResponseDto {
  @ApiProperty()
  @Expose()
  @IsUUID()
  id: string;

  @ApiProperty()
  @Expose()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @Expose()
  @IsInt()
  @Min(0)
  currentCount: number;

  @ApiProperty({ enum: StreakStatus })
  @Expose()
  @IsEnum(StreakStatus)
  status: string;

  @ApiProperty()
  @Expose()
  @IsInt()
  @Min(0)
  availableFreezes: number;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  @IsOptional()
  @IsDate()
  lastActiveDate: Date | null;

  @ApiProperty()
  @Expose()
  @IsInt()
  @Min(0)
  consecutivePreStreakDays: number;
}
