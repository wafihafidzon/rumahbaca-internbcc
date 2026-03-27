import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class RoomProgressResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  pagesRead: number;

  @ApiProperty({ nullable: true })
  duration: number | null;

  @ApiProperty({ nullable: true })
  roomId: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class RoomProgressDto {
  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentPage: number;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagesRead: number;

  @ApiProperty({ required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;
}
