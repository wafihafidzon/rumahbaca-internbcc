import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ example: 'Atomic Habits' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'James Clear' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({ example: 320, minimum: 1 })
  @IsInt()
  @Min(1)
  totalPages: number;

  @ApiProperty({ required: false, example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  @IsUrl()
  coverUrl?: string;
}
