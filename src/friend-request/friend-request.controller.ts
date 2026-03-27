import {
  Controller,
  UseGuards,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FriendRequestService } from './friend-request.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { FriendRequestQueryDto } from './dto/friend-request-query.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';
import {
  FriendRequestListResponseDto,
  FriendRequestResponseDto,
} from './dto/friend-request-response.dto';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { ROLES } from '../auth/constants/acl.constant';

@ApiTags('friend-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('friend-requests')
export class FriendRequestController {
  constructor(private readonly service: FriendRequestService) {}

  @Post()
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Send a friend request' })
  @ApiResponse({ status: 201, type: FriendRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Cannot send request to yourself' })
  @ApiResponse({ status: 404, description: 'Receiver not found' })
  @ApiResponse({
    status: 409,
    description: 'Already friends or pending request exists',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFriendRequestDto,
  ): Promise<FriendRequestResponseDto> {
    return this.service.create(user, dto);
  }

  @Get()
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'List sent or received pending friend requests' })
  @ApiResponse({ status: 200, type: FriendRequestListResponseDto })
  async findByType(
    @CurrentUser() user: JwtPayload,
    @Query() query: FriendRequestQueryDto,
  ): Promise<FriendRequestListResponseDto> {
    return this.service.findByType(user, query);
  }

  @Patch(':id/respond')
  @Roles(ROLES.USER, ROLES.ADMIN)
  @ApiOperation({ summary: 'Accept, reject, or cancel a friend request' })
  @ApiParam({ name: 'id', description: 'Friend request ID' })
  @ApiResponse({ status: 200, type: FriendRequestResponseDto })
  @ApiResponse({ status: 403, description: 'Action not allowed for this user' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  @ApiResponse({
    status: 409,
    description: 'Request is no longer pending',
  })
  async respond(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RespondFriendRequestDto,
  ): Promise<FriendRequestResponseDto> {
    return this.service.respond(user, id, dto);
  }
}
