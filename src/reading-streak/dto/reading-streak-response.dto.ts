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

export class ReadingStreakResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsUUID()
  userId: string;

  @Expose()
  @IsInt()
  @Min(0)
  currentCount: number;

  @Expose()
  @IsEnum(StreakStatus)
  status: string;

  @Expose()
  @IsInt()
  @Min(0)
  availableFreezes: number;

  @Expose()
  @IsOptional()
  @IsDate()
  lastActiveDate: Date | null;

  @Expose()
  @IsInt()
  @Min(0)
  consecutivePreStreakDays: number;
}
