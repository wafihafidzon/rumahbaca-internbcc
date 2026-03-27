import { ApiProperty } from '@nestjs/swagger';

export class CommentLikeResponseDto {
  @ApiProperty()
  commentId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;
}
