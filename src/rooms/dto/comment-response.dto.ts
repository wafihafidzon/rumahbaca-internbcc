import { ApiProperty } from '@nestjs/swagger';

export class CommentAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;
}

export class CommentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: CommentAuthorDto })
  author: CommentAuthorDto;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  createdAt: Date;
}

export class CommentListMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class CommentListResponseDto {
  @ApiProperty({ type: [CommentDto] })
  data: CommentDto[];

  @ApiProperty({ type: CommentListMetaDto })
  meta: CommentListMetaDto;
}
