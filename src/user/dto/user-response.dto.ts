import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  username: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ required: false })
  @Expose()
  name: string;

  @ApiProperty({ type: [String], example: ['USER'] })
  @Expose()
  roles: string[];

  @ApiProperty({ required: false })
  @Expose()
  bio: string | null;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty({ required: false })
  @Expose()
  avatarUrl: string | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty()
  meta: any; // Using simplified meta for now or can reuse PaginationMetaDto if extracted
}
