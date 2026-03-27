import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ROLES } from '../auth/constants/acl.constant';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateInviteDto } from '../room-invites/dto/create-invite.dto';
import { RoomInviteResponseDto } from '../room-invites/dto/room-invite-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { CommentDto, CommentListResponseDto } from './dto/comment-response.dto';
import { CommentLikeResponseDto } from './dto/comment-like-response.dto';
import { RoomProgressDto } from './dto/room-progress.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import {
  RoomDetailDto,
  RoomListResponseDto,
  RoomSummaryDto,
} from './dto/room-response.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Post()
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Create room' })
  @ApiResponse({ status: 201, type: RoomSummaryDto })
  @ApiResponse({ status: 404, description: 'Book not found' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRoomDto,
  ): Promise<RoomSummaryDto> {
    return this.service.create(user, dto);
  }

  @Get()
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: "List current user's rooms" })
  @ApiResponse({ status: 200, type: RoomListResponseDto })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: RoomQueryDto,
  ): Promise<RoomListResponseDto> {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Get room detail (members only)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, type: RoomDetailDto })
  @ApiResponse({ status: 403, description: 'Not a room member' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<RoomDetailDto> {
    return this.service.findOne(user, id);
  }

  @Post(':id/progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: "Update current user's room reading progress" })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({
    status: 201,
    description: 'Reading session created and tracker progress updated',
  })
  @ApiResponse({ status: 403, description: 'Not a room member' })
  async updateProgress(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RoomProgressDto,
  ): Promise<{
    id: string;
    pagesRead: number;
    duration: number | null;
    roomId: string | null;
    createdAt: Date;
  }> {
    return this.service.updateProgress(user, id, dto);
  }

  @Post(':id/invites')
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Invite a friend to a room (host only)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 201, type: RoomInviteResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invitee is invalid or not a friend',
  })
  @ApiResponse({ status: 403, description: 'Only host can invite' })
  @ApiResponse({
    status: 409,
    description: 'Invitee is already a member or has a pending invite',
  })
  async inviteMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateInviteDto,
  ): Promise<RoomInviteResponseDto> {
    return this.service.inviteMember(user, id, dto);
  }

  @Get(':id/comments')
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'List room comments (members only)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, type: CommentListResponseDto })
  @ApiResponse({ status: 403, description: 'Not a room member' })
  async listComments(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() query: RoomQueryDto,
  ): Promise<CommentListResponseDto> {
    return this.service.listComments(user, id, query);
  }

  @Post(':id/comments')
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Add room comment (members only)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 201, type: CommentDto })
  @ApiResponse({ status: 403, description: 'Not a room member' })
  async addComment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return this.service.addComment(user, id, dto);
  }

  @Post('comments/:id/likes')
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Like a room comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 201, type: CommentLikeResponseDto })
  @ApiResponse({ status: 403, description: 'Not a room member' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiResponse({ status: 409, description: 'Already liked' })
  async likeComment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<CommentLikeResponseDto> {
    return this.service.likeComment(user, id);
  }

  @Delete('comments/:id/likes')
  @Roles(ROLES.USER, ROLES.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a room comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 204, description: 'Like removed' })
  @ApiResponse({ status: 403, description: 'Not a room member' })
  @ApiResponse({ status: 404, description: 'Comment or like not found' })
  async unlikeComment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.service.unlikeComment(user, id);
  }
}
